###############################################################################
# API Gateway HTTP API dedicado para has-admin
#
# Reemplaza el patrón Function URL (bloqueado en cuenta dixi por guard rail
# no identificado — ver ADR-015). El converter aws-apigw-v2 de OpenNext
# emite/consume APIGatewayProxyEventV2, totalmente compatible.
#
# Catch-all `ANY /{proxy+}` → server Lambda. No exponemos `/admin` prefix
# porque CloudFront enruta el host completo `admin.haslife.org` aquí.
###############################################################################

resource "aws_apigatewayv2_api" "admin" {
  name          = "has-admin-api"
  protocol_type = "HTTP"

  cors_configuration {
    # No es necesario CORS porque el CloudFront sirve desde el mismo origin,
    # pero lo dejamos permisivo para llamadas directas a la API durante debug.
    allow_origins = ["https://admin.${local.domain}", "http://localhost:3000"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 86400
  }

  tags = {
    Component = "has-admin"
  }
}

resource "aws_apigatewayv2_integration" "admin_server" {
  api_id                 = aws_apigatewayv2_api.admin.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin_server.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "admin_default" {
  api_id    = aws_apigatewayv2_api.admin.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.admin_server.id}"
}

resource "aws_apigatewayv2_stage" "admin_default" {
  api_id      = aws_apigatewayv2_api.admin.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 200
    throttling_rate_limit  = 100
  }
}

resource "aws_lambda_permission" "admin_apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvokeAdminServer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_server.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.admin.execution_arn}/*/*"
}
