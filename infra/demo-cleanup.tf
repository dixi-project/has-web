# ---------------------------------------------------------------------------
# Sprint 8 V2 — Cleanup automático de cuentas demo.
#
# La Lambda `has-demo-cleanup` se dispara cada 6 horas vía EventBridge y
# POSTea a `https://admin.haslife.org/api/internal/demo/cleanup`. El endpoint
# borra users `demo-%@haslife.org` cuyo `created_at > 24h`.
#
# Mismo patrón que `has-omop-etl-sync` (omop-etl-sync.tf):
#   - Lambda lee el shared secret de SSM SecureString (cero secrets en env).
#   - IAM con `ssm:GetParameter` + `kms:Decrypt` condicionado a SSM.
#   - Sin VPC — invoca el endpoint público via HTTPS.
# ---------------------------------------------------------------------------

data "archive_file" "demo_cleanup" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-demo-cleanup"
  output_path = "${path.module}/.build/demo-cleanup.zip"
}

resource "aws_iam_role" "demo_cleanup" {
  name = "has-demo-cleanup-role"
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

resource "aws_iam_role_policy_attachment" "demo_cleanup_basic" {
  role       = aws_iam_role.demo_cleanup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "demo_cleanup_ssm" {
  name = "ssm-internal-secret"
  role = aws_iam_role.demo_cleanup.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = aws_ssm_parameter.internal_secret.arn
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.us-east-1.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "demo_cleanup" {
  name              = "/aws/lambda/has-demo-cleanup"
  retention_in_days = 30
  tags              = var.tags
}

resource "aws_lambda_function" "demo_cleanup" {
  function_name = "has-demo-cleanup"
  role          = aws_iam_role.demo_cleanup.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 128
  timeout       = 60 # endpoint puede tardar varios segundos por user x cleanup

  filename         = data.archive_file.demo_cleanup.output_path
  source_code_hash = data.archive_file.demo_cleanup.output_base64sha256

  environment {
    variables = {
      CLEANUP_ENDPOINT          = "https://admin.haslife.org/api/internal/demo/cleanup"
      CLEANUP_TTL_HOURS         = "24"
      CLEANUP_LIMIT             = "100"
      HAS_INTERNAL_SECRET_PARAM = aws_ssm_parameter.internal_secret.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.demo_cleanup]
  tags       = merge(var.tags, { Component = "has-admin" })
}

# --- EventBridge schedule: cada 6 horas ------------------------------------

resource "aws_cloudwatch_event_rule" "demo_cleanup" {
  name                = "has-demo-cleanup-every-6h"
  description         = "Purgar cuentas demo viejas (>24h)"
  schedule_expression = "rate(6 hours)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "demo_cleanup" {
  rule = aws_cloudwatch_event_rule.demo_cleanup.name
  arn  = aws_lambda_function.demo_cleanup.arn
}

resource "aws_lambda_permission" "demo_cleanup_events" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.demo_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.demo_cleanup.arn
}
