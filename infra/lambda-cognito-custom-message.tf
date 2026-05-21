###############################################################################
# Cognito CustomMessage trigger Lambda
#
# Genera asunto + cuerpo HTML de los correos transaccionales de Cognito en el
# idioma del usuario (`locale`) — tarea S6.6. Reemplaza los templates únicos
# del pool por templates dedicados por idioma (es/en).
#
# No accede a BD ni a secrets: solo permisos básicos de ejecución / logs.
###############################################################################

locals {
  cognito_custom_message_name = "has-cognito-custom-message"
}

data "archive_file" "cognito_custom_message" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-cognito-custom-message"
  output_path = "${path.module}/lambda-cognito-custom-message.zip"
}

resource "aws_iam_role" "cognito_custom_message" {
  name = "${local.cognito_custom_message_name}-role"

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

resource "aws_iam_role_policy_attachment" "cognito_custom_message_basic" {
  role       = aws_iam_role.cognito_custom_message.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "cognito_custom_message" {
  function_name    = local.cognito_custom_message_name
  role             = aws_iam_role.cognito_custom_message.arn
  filename         = data.archive_file.cognito_custom_message.output_path
  source_code_hash = data.archive_file.cognito_custom_message.output_base64sha256
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 5

  tags = {
    Component = "has-admin"
    Module    = "auth"
  }
}

resource "aws_lambda_permission" "cognito_custom_message" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_custom_message.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.platform.arn
}

# CloudWatch log group con retención manejada (default = nunca expira)
resource "aws_cloudwatch_log_group" "cognito_custom_message" {
  name              = "/aws/lambda/${aws_lambda_function.cognito_custom_message.function_name}"
  retention_in_days = 30
}
