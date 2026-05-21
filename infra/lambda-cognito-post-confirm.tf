###############################################################################
# Cognito PostConfirmation trigger Lambda
#
# Se invoca tras confirmar el signup (verificación de email). Inserta el
# usuario en la tabla `users` de la database `has_platform` vía RDS Data API.
###############################################################################

locals {
  cognito_post_confirm_name = "has-cognito-post-confirm"
  has_db_cluster_arn        = "arn:aws:rds:us-east-1:712389989805:cluster:platform-postgres"
  has_db_secret_arn         = "arn:aws:secretsmanager:us-east-1:712389989805:secret:/has/platform/db-creds-OGPfmY"
}

data "archive_file" "cognito_post_confirm" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-cognito-post-confirm"
  output_path = "${path.module}/lambda-cognito-post-confirm.zip"
}

resource "aws_iam_role" "cognito_post_confirm" {
  name = "${local.cognito_post_confirm_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cognito_post_confirm_basic" {
  role       = aws_iam_role.cognito_post_confirm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "cognito_post_confirm_data_api" {
  name = "${local.cognito_post_confirm_name}-data-api"
  role = aws_iam_role.cognito_post_confirm.id

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
      }
    ]
  })
}

resource "aws_lambda_function" "cognito_post_confirm" {
  function_name    = local.cognito_post_confirm_name
  role             = aws_iam_role.cognito_post_confirm.arn
  filename         = data.archive_file.cognito_post_confirm.output_path
  source_code_hash = data.archive_file.cognito_post_confirm.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  memory_size      = 256
  timeout          = 10

  environment {
    variables = {
      HAS_DB_CLUSTER_ARN = local.has_db_cluster_arn
      HAS_DB_SECRET_ARN  = local.has_db_secret_arn
      HAS_DB_NAME        = "has_platform"
    }
  }

  tags = {
    Component = "has-admin"
    Module    = "auth-rbac"
  }
}

resource "aws_lambda_permission" "cognito_post_confirm" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_post_confirm.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.platform.arn
}

# CloudWatch log group para retención manejada (default = nunca expira)
resource "aws_cloudwatch_log_group" "cognito_post_confirm" {
  name              = "/aws/lambda/${aws_lambda_function.cognito_post_confirm.function_name}"
  retention_in_days = 30
}
