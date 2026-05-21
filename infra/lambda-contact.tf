###############################################################################
# Lambda has-contact-form — handler para form de contacto público.
# Valida reCAPTCHA v3, envía email a admin + agradecimiento al user vía SES.
# Expuesto vía la misma API Gateway HTTP API: POST /contact
###############################################################################

locals {
  lambda_contact_name    = "has-contact-form"
  lambda_contact_src_dir = "${path.module}/lambda-contact"
  lambda_contact_zip     = "${path.module}/lambda-contact.zip"
}

data "archive_file" "lambda_contact" {
  type        = "zip"
  source_dir  = local.lambda_contact_src_dir
  output_path = local.lambda_contact_zip
  excludes    = ["README.md", ".gitignore"]
}

data "aws_iam_policy_document" "lambda_contact_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_contact_ses" {
  statement {
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
    # Restringe a identidades del proyecto.
    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = ["*@${local.domain}"]
    }
  }
}

resource "aws_iam_role" "lambda_contact" {
  name               = "${local.lambda_contact_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_contact_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_contact_basic" {
  role       = aws_iam_role.lambda_contact.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_contact_ses" {
  name   = "${local.lambda_contact_name}-ses"
  role   = aws_iam_role.lambda_contact.id
  policy = data.aws_iam_policy_document.lambda_contact_ses.json
}

resource "aws_cloudwatch_log_group" "lambda_contact" {
  name              = "/aws/lambda/${local.lambda_contact_name}"
  retention_in_days = 30
}

resource "aws_lambda_function" "contact_form" {
  function_name = local.lambda_contact_name
  role          = aws_iam_role.lambda_contact.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 256
  timeout       = 15

  filename         = data.archive_file.lambda_contact.output_path
  source_code_hash = data.archive_file.lambda_contact.output_base64sha256

  environment {
    variables = {
      SES_REGION            = "us-east-1"
      FROM_ADDRESS          = "contact@${local.domain}"
      ADMIN_EMAIL           = "acastillejos@dixi-project.com"
      SES_CONFIGURATION_SET = aws_sesv2_configuration_set.default.configuration_set_name
      RECAPTCHA_SECRET      = "PLACEHOLDER_INJECT_VIA_AWS_CLI"
      RECAPTCHA_MIN_SCORE   = "0.5"
    }
  }

  lifecycle {
    ignore_changes = [environment]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_contact]
}

###############################################################################
# Integración con API Gateway HTTP API existente (la misma del módulo donations).
###############################################################################

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.stripe_checkout.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact_form.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 15000
}

resource "aws_apigatewayv2_route" "contact" {
  api_id    = aws_apigatewayv2_api.stripe_checkout.id
  route_key = "POST /contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_lambda_permission" "apigw_invoke_contact" {
  statement_id  = "AllowAPIGatewayInvokeContact"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact_form.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.stripe_checkout.execution_arn}/*/*"
}

output "contact_api_url" {
  description = "URL pública del endpoint del form de contacto."
  value       = "${aws_apigatewayv2_api.stripe_checkout.api_endpoint}/contact"
}
