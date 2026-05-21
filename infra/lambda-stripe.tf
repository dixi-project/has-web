###############################################################################
# Stripe Checkout Lambda — backend mínimo para crear sesiones de Stripe
# Checkout desde el static export en S3+CloudFront.
#
# Ver: 09-architecture/adr/ADR-014-stripe-checkout-via-lambda-function-url.md
#
# Arquitectura:
#   Browser → API Gateway HTTP API → Lambda → Stripe
###############################################################################

locals {
  lambda_stripe_name    = "has-stripe-checkout"
  lambda_stripe_src_dir = "${path.module}/lambda-stripe"
  lambda_stripe_zip     = "${path.module}/lambda-stripe.zip"
}

data "archive_file" "lambda_stripe" {
  type        = "zip"
  source_dir  = local.lambda_stripe_src_dir
  output_path = local.lambda_stripe_zip
  excludes    = ["README.md", ".gitignore"]
}

data "aws_iam_policy_document" "lambda_stripe_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_stripe" {
  name               = "${local.lambda_stripe_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_stripe_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_stripe_basic" {
  role       = aws_iam_role.lambda_stripe.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_stripe_ses" {
  statement {
    effect    = "Allow"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"]
    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = ["*@${local.domain}"]
    }
  }
}

resource "aws_iam_role_policy" "lambda_stripe_ses" {
  name   = "${local.lambda_stripe_name}-ses"
  role   = aws_iam_role.lambda_stripe.id
  policy = data.aws_iam_policy_document.lambda_stripe_ses.json
}

resource "aws_cloudwatch_log_group" "lambda_stripe" {
  name              = "/aws/lambda/${local.lambda_stripe_name}"
  retention_in_days = 30
}

resource "aws_lambda_function" "stripe_checkout" {
  function_name = local.lambda_stripe_name
  role          = aws_iam_role.lambda_stripe.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 256
  timeout       = 15

  filename         = data.archive_file.lambda_stripe.output_path
  source_code_hash = data.archive_file.lambda_stripe.output_base64sha256

  environment {
    variables = {
      SITE_ORIGIN           = "https://${local.domain}"
      STRIPE_SECRET_KEY     = "PLACEHOLDER_INJECT_VIA_AWS_CLI"
      STRIPE_WEBHOOK_SECRET = "PLACEHOLDER_INJECT_VIA_AWS_CLI"
      SES_REGION            = "us-east-1"
      FROM_ADDRESS          = "donations@${local.domain}"
      ADMIN_EMAIL           = "acastillejos@dixi-project.com"
      SES_CONFIGURATION_SET = aws_sesv2_configuration_set.default.configuration_set_name
    }
  }

  lifecycle {
    ignore_changes = [environment]
  }

  depends_on = [aws_cloudwatch_log_group.lambda_stripe]
}

###############################################################################
# API Gateway HTTP API — frente público a la Lambda
###############################################################################

resource "aws_apigatewayv2_api" "stripe_checkout" {
  name          = "has-donations-api"
  protocol_type = "HTTP"
  description   = "Public endpoint for HAS donation checkout sessions."

  cors_configuration {
    allow_origins  = ["https://${local.domain}", "https://${local.www_domain}"]
    allow_methods  = ["POST", "OPTIONS"]
    allow_headers  = ["content-type"]
    expose_headers = []
    max_age        = 3600
  }
}

resource "aws_apigatewayv2_integration" "stripe_checkout" {
  api_id             = aws_apigatewayv2_api.stripe_checkout.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.stripe_checkout.invoke_arn
  integration_method = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 15000
}

resource "aws_apigatewayv2_route" "donate" {
  api_id    = aws_apigatewayv2_api.stripe_checkout.id
  route_key = "POST /donate"
  target    = "integrations/${aws_apigatewayv2_integration.stripe_checkout.id}"
}

resource "aws_apigatewayv2_route" "webhook" {
  api_id    = aws_apigatewayv2_api.stripe_checkout.id
  route_key = "POST /webhook"
  target    = "integrations/${aws_apigatewayv2_integration.stripe_checkout.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.stripe_checkout.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 20
  }
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stripe_checkout.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.stripe_checkout.execution_arn}/*/*"
}

output "lambda_function_name" {
  description = "Nombre de la Lambda — usar para aws lambda update-function-configuration."
  value       = aws_lambda_function.stripe_checkout.function_name
}

output "donation_api_url" {
  description = "URL pública del endpoint de donaciones (API Gateway HTTP API)."
  value       = "${aws_apigatewayv2_api.stripe_checkout.api_endpoint}/donate"
}

output "stripe_webhook_url" {
  description = "URL pública del endpoint webhook de Stripe (configurar en dashboard.stripe.com)."
  value       = "${aws_apigatewayv2_api.stripe_checkout.api_endpoint}/webhook"
}
