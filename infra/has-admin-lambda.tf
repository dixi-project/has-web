###############################################################################
# Lambda SSR has-admin (server function de OpenNext)
#
# Bundle: ../../has-admin/.open-next/server-functions/default/
# El primer apply usa el zip empaquetado por Terraform. Despues, el deploy
# script (`has-admin/scripts/deploy.sh`) hace `aws lambda update-function-code`
# con un zip fresco — el `lifecycle.ignore_changes` evita drift.
#
# Env vars sensibles (Cognito client IDs públicos, DB ARNs) van aquí.
# Los secrets se obtienen runtime via IAM (rds-data + secretsmanager).
###############################################################################

locals {
  admin_lambda_name = "has-admin-server"
  admin_root        = "${path.module}/../../has-admin"
  admin_bundle      = "${local.admin_root}/.open-next/server-functions/default"
}

# Placeholder zip — solo para el primer apply. El deploy.sh real overwrite.
# Si .open-next/ no existe (primer terraform apply antes de pnpm build:open-next),
# usamos un placeholder mínimo.
data "archive_file" "admin_server_placeholder" {
  type        = "zip"
  output_path = "${path.module}/has-admin-server-placeholder.zip"

  source {
    content  = <<-EOT
      export const handler = async () => ({
        statusCode: 503,
        body: JSON.stringify({ error: "Placeholder — deploy not yet run" })
      });
    EOT
    filename = "index.mjs"
  }
}

resource "aws_iam_role" "admin_server" {
  name = "${local.admin_lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "admin_server_basic" {
  role       = aws_iam_role.admin_server.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "admin_server_data_api" {
  name = "${local.admin_lambda_name}-data-api"
  role = aws_iam_role.admin_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-data:ExecuteStatement",
          "rds-data:BatchExecuteStatement",
          "rds-data:BeginTransaction",
          "rds-data:CommitTransaction",
          "rds-data:RollbackTransaction"
        ]
        Resource = local.has_db_cluster_arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = local.has_db_secret_arn
      },
      {
        # Gestión de usuarios desde la consola super-admin (S6.1):
        # cambiar custom:role y activar/desactivar cuentas en Cognito.
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.platform.arn
      }
    ]
  })
}

resource "aws_lambda_function" "admin_server" {
  function_name    = local.admin_lambda_name
  role             = aws_iam_role.admin_server.arn
  filename         = data.archive_file.admin_server_placeholder.output_path
  source_code_hash = data.archive_file.admin_server_placeholder.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  memory_size      = 1024
  timeout          = 30

  environment {
    variables = {
      # Cognito (públicos también, pero Lambda los necesita para verify JWT)
      NEXT_PUBLIC_AWS_REGION           = "us-east-1"
      NEXT_PUBLIC_COGNITO_USER_POOL_ID = aws_cognito_user_pool.platform.id
      NEXT_PUBLIC_COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.platform_spa.id
      NEXT_PUBLIC_COGNITO_DOMAIN       = aws_cognito_user_pool_domain.platform.domain
      NEXT_PUBLIC_APP_URL              = "https://admin.${local.domain}"
      NEXT_PUBLIC_APP_NAME             = "HAS"

      # DB
      HAS_DB_CLUSTER_ARN = local.has_db_cluster_arn
      HAS_DB_SECRET_ARN  = local.has_db_secret_arn
      HAS_DB_NAME        = "has_platform"

      # Citizen-vault uploads (S7.3) — bucket S3 + CMK KMS dedicados
      HAS_VAULT_BUCKET      = aws_s3_bucket.vault_uploads.bucket
      HAS_VAULT_KMS_KEY_ARN = aws_kms_key.vault_uploads.arn

      # OpenNext expects
      OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE = "true"
    }
  }

  lifecycle {
    # El deploy.sh actualiza el código fuera de Terraform; ignoramos el drift.
    ignore_changes = [filename, source_code_hash]
  }

  tags = {
    Component = "has-admin"
    Module    = "ssr"
  }
}

resource "aws_cloudwatch_log_group" "admin_server" {
  name              = "/aws/lambda/${aws_lambda_function.admin_server.function_name}"
  retention_in_days = 30
}
