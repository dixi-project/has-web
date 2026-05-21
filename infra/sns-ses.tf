###############################################################################
# SES — Configuration Set + SNS event destinations.
#
# Después de salir del sandbox (2026-05-19), SES vigila la reputación: si los
# bounces superan ~5% o las quejas ~0.1%, regresa la cuenta al sandbox.
#
# El configuration set `has-default` se asocia a TODOS los envíos (contact form
# y donaciones cuando se reactiven). Los eventos `BOUNCE` y `COMPLAINT` se
# publican a SNS topics dedicados, y un email al admin garantiza señales en
# tiempo cuasi-real.
#
# Suppression: el account-level suppression list de SES está habilitado por
# defecto en us-east-1 — bounces hard y quejas se agregan automáticamente al
# bloqueo a nivel de cuenta sin trabajo adicional.
###############################################################################

locals {
  ses_admin_email = "acastillejos@dixi-project.com"
}

resource "aws_sesv2_configuration_set" "default" {
  configuration_set_name = "has-default"

  delivery_options {
    tls_policy = "REQUIRE"
  }

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }
}

###############################################################################
# SNS topics — uno por tipo de evento para poder suscribir distinto en el futuro.
###############################################################################

resource "aws_sns_topic" "ses_bounces" {
  name = "has-ses-bounces"
}

resource "aws_sns_topic" "ses_complaints" {
  name = "has-ses-complaints"
}

# Política para que SES pueda publicar en los topics.
data "aws_iam_policy_document" "sns_ses_publish" {
  for_each = {
    bounce    = aws_sns_topic.ses_bounces.arn
    complaint = aws_sns_topic.ses_complaints.arn
  }

  statement {
    sid     = "AllowSESPublish"
    effect  = "Allow"
    actions = ["SNS:Publish"]
    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }
    resources = [each.value]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_sns_topic_policy" "ses_bounces" {
  arn    = aws_sns_topic.ses_bounces.arn
  policy = data.aws_iam_policy_document.sns_ses_publish["bounce"].json
}

resource "aws_sns_topic_policy" "ses_complaints" {
  arn    = aws_sns_topic.ses_complaints.arn
  policy = data.aws_iam_policy_document.sns_ses_publish["complaint"].json
}

###############################################################################
# Suscripciones email — alertas inmediatas al admin.
#
# AWS envía un correo de confirmación; hay que aceptar el link para activar la
# suscripción (esto NO se puede automatizar via Terraform).
###############################################################################

resource "aws_sns_topic_subscription" "bounces_email" {
  topic_arn = aws_sns_topic.ses_bounces.arn
  protocol  = "email"
  endpoint  = local.ses_admin_email

  lifecycle {
    # AWS marca pending hasta confirmar el email; ignorar drift.
    ignore_changes = [confirmation_timeout_in_minutes]
  }
}

resource "aws_sns_topic_subscription" "complaints_email" {
  topic_arn = aws_sns_topic.ses_complaints.arn
  protocol  = "email"
  endpoint  = local.ses_admin_email

  lifecycle {
    ignore_changes = [confirmation_timeout_in_minutes]
  }
}

###############################################################################
# Event destinations — conectan configuration set → SNS topics.
###############################################################################

resource "aws_sesv2_configuration_set_event_destination" "bounces" {
  configuration_set_name = aws_sesv2_configuration_set.default.configuration_set_name
  event_destination_name = "bounces-to-sns"

  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE"]

    sns_destination {
      topic_arn = aws_sns_topic.ses_bounces.arn
    }
  }
}

resource "aws_sesv2_configuration_set_event_destination" "complaints" {
  configuration_set_name = aws_sesv2_configuration_set.default.configuration_set_name
  event_destination_name = "complaints-to-sns"

  event_destination {
    enabled              = true
    matching_event_types = ["COMPLAINT"]

    sns_destination {
      topic_arn = aws_sns_topic.ses_complaints.arn
    }
  }
}

###############################################################################
# Outputs
###############################################################################

output "ses_configuration_set" {
  description = "Nombre del configuration set a usar desde las Lambdas (env var SES_CONFIGURATION_SET)."
  value       = aws_sesv2_configuration_set.default.configuration_set_name
}

output "ses_bounces_topic_arn" {
  description = "ARN del SNS topic de bounces."
  value       = aws_sns_topic.ses_bounces.arn
}

output "ses_complaints_topic_arn" {
  description = "ARN del SNS topic de quejas."
  value       = aws_sns_topic.ses_complaints.arn
}
