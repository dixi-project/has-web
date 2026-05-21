###############################################################################
# Cognito PreSignUp trigger Lambda
#
# Se invoca antes de crear el usuario en el pool. Rechaza cualquier signup
# self-service que intente auto-asignarse un `custom:role` fuera de la whitelist
# (cierra el hueco de escalada a `super_admin` — tarea S6.3).
#
# No accede a BD ni a secrets: sólo permisos básicos de ejecución / logs.
###############################################################################

locals {
  cognito_pre_signup_name = "has-cognito-pre-signup"
}

data "archive_file" "cognito_pre_signup" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-cognito-pre-signup"
  output_path = "${path.module}/lambda-cognito-pre-signup.zip"
}

resource "aws_iam_role" "cognito_pre_signup" {
  name = "${local.cognito_pre_signup_name}-role"

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

resource "aws_iam_role_policy_attachment" "cognito_pre_signup_basic" {
  role       = aws_iam_role.cognito_pre_signup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "cognito_pre_signup" {
  function_name    = local.cognito_pre_signup_name
  role             = aws_iam_role.cognito_pre_signup.arn
  filename         = data.archive_file.cognito_pre_signup.output_path
  source_code_hash = data.archive_file.cognito_pre_signup.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 5

  tags = {
    Component = "has-admin"
    Module    = "auth-rbac"
  }
}

resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.platform.arn
}

# CloudWatch log group con retención manejada (default = nunca expira)
resource "aws_cloudwatch_log_group" "cognito_pre_signup" {
  name              = "/aws/lambda/${aws_lambda_function.cognito_pre_signup.function_name}"
  retention_in_days = 30
}
