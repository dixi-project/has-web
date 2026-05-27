# ---------------------------------------------------------------------------
# S7.4-extended — Job de recuperación del ETL FHIR -> OMOP.
#
# La Lambda `has-omop-etl-sync` se dispara cada 5 minutos vía EventBridge y
# POSTea a `https://admin.haslife.org/api/internal/omop/sync-pending` con un
# shared secret. El endpoint procesa hasta `SYNC_LIMIT` recursos FHIR sin
# `omop_synced_at` (los marca al sincronizar).
#
# El secret se genera aquí (random_password) y SOLO se inyecta como variable
# de entorno de la Lambda admin-server **fuera de Terraform** (porque
# admin-server tiene `lifecycle.ignore_changes = [environment]` para no
# sobreescribir las keys de Stripe/reCAPTCHA inyectadas a mano). El runbook:
#
#   1. terraform apply  -> crea Lambda + EventBridge + random secret
#   2. terraform output  -> ver `omop_etl_internal_secret`
#   3. aws lambda update-function-configuration --function-name has-admin-server \
#        --environment "Variables={..., HAS_INTERNAL_SECRET=<secret>}"
# ---------------------------------------------------------------------------

resource "random_password" "omop_etl_internal_secret" {
  length  = 48
  special = false
}

data "archive_file" "omop_etl_sync" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-omop-etl-sync"
  output_path = "${path.module}/.build/omop-etl-sync.zip"
}

resource "aws_iam_role" "omop_etl_sync" {
  name = "has-omop-etl-sync-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "omop_etl_sync_basic" {
  role       = aws_iam_role.omop_etl_sync.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "omop_etl_sync" {
  name              = "/aws/lambda/has-omop-etl-sync"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_lambda_function" "omop_etl_sync" {
  function_name = "has-omop-etl-sync"
  role          = aws_iam_role.omop_etl_sync.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 128
  timeout       = 120 # el endpoint procesa hasta 100 resources con varias queries Aurora

  filename         = data.archive_file.omop_etl_sync.output_path
  source_code_hash = data.archive_file.omop_etl_sync.output_base64sha256

  environment {
    variables = {
      SYNC_ENDPOINT       = "https://admin.haslife.org/api/internal/omop/sync-pending"
      SYNC_LIMIT          = "100"
      HAS_INTERNAL_SECRET = random_password.omop_etl_internal_secret.result
    }
  }

  depends_on = [aws_cloudwatch_log_group.omop_etl_sync]
  tags       = merge(var.tags, { Component = "has-admin" })
}

# --- EventBridge schedule: cada 5 minutos ----------------------------------

resource "aws_cloudwatch_event_rule" "omop_etl_sync" {
  name                = "has-omop-etl-sync-every-5m"
  description         = "Reprocesar fhir_resources sin omop_synced_at"
  schedule_expression = "rate(5 minutes)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "omop_etl_sync" {
  rule = aws_cloudwatch_event_rule.omop_etl_sync.name
  arn  = aws_lambda_function.omop_etl_sync.arn
}

resource "aws_lambda_permission" "omop_etl_sync_events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.omop_etl_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.omop_etl_sync.arn
}

# --- Output: inyectar el secret a mano en has-admin-server ---------------

output "omop_etl_internal_secret" {
  description = <<-EOT
    Shared secret de la Lambda has-omop-etl-sync. Inyéctalo en la Lambda
    has-admin-server:
      aws lambda update-function-configuration --profile dixi --region us-east-1 \
        --function-name has-admin-server --environment "Variables={...,HAS_INTERNAL_SECRET=...}"
  EOT
  value       = random_password.omop_etl_internal_secret.result
  sensitive   = true
}
