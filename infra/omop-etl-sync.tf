# ---------------------------------------------------------------------------
# S7.4-extended — Job de recuperación del ETL FHIR -> OMOP.
#
# La Lambda `has-omop-etl-sync` se dispara cada 5 minutos vía EventBridge y
# POSTea a `https://admin.haslife.org/api/internal/omop/sync-pending` con un
# shared secret. El endpoint procesa hasta `SYNC_LIMIT` recursos FHIR sin
# `omop_synced_at` (los marca al sincronizar).
#
# 2026-05-30: el shared secret ahora vive en SSM Parameter Store
# (SecureString cifrado con la AWS-managed KMS key `alias/aws/ssm`). Ambas
# Lambdas leen el secret de SSM al boot con cache (cero secrets en env
# vars). Un `terraform apply` completo ya NO pierde nada — el SSM parameter
# sobrevive al redeploy y las Lambdas siempre lo encuentran. Ver
# `src/lib/secret-config.ts` en has-admin para el cliente.
# ---------------------------------------------------------------------------

resource "random_password" "omop_etl_internal_secret" {
  length  = 48
  special = false
}

# SSM Parameter SecureString — fuente de verdad del shared secret. El valor
# sale del random_password y vive cifrado en SSM (no en env vars). Ambas
# Lambdas (has-admin-server + has-omop-etl-sync) lo leen con cache.
resource "aws_ssm_parameter" "internal_secret" {
  name        = "/has/admin/internal-secret"
  description = "Shared secret entre has-omop-etl-sync y has-admin-server (S7.4 recovery)"
  type        = "SecureString"
  value       = random_password.omop_etl_internal_secret.result
  tags        = var.tags
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

# Permite leer el SecureString del internal secret + descifrar con la
# AWS-managed KMS key de SSM.
resource "aws_iam_role_policy" "omop_etl_sync_ssm" {
  name = "ssm-internal-secret"
  role = aws_iam_role.omop_etl_sync.id
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
      SYNC_ENDPOINT             = "https://admin.haslife.org/api/internal/omop/sync-pending"
      SYNC_LIMIT                = "100"
      HAS_INTERNAL_SECRET_PARAM = aws_ssm_parameter.internal_secret.name
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

# --- Output (referencia para debug, ya NO requiere inyección manual) ---

output "internal_secret_ssm_param" {
  description = "Path SSM del shared secret (SecureString). Lo leen has-admin-server y has-omop-etl-sync en runtime con cache."
  value       = aws_ssm_parameter.internal_secret.name
}
