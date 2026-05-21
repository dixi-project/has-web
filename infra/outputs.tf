output "route53_nameservers" {
  description = "NS records to set on your domain registrar so Route53 can serve the zone."
  value       = aws_route53_zone.main.name_servers
}

output "s3_bucket_name" {
  description = "S3 bucket name where the static site lives."
  value       = aws_s3_bucket.web.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used for cache invalidations."
  value       = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  description = "CloudFront default domain (xxx.cloudfront.net). Useful for testing before DNS propagation."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate covering the apex and aliases."
  value       = aws_acm_certificate.web.arn
}

output "budget_warning" {
  description = "Warning budget name (alerts when monthly spend crosses the warning threshold)."
  value       = aws_budgets_budget.warning.name
}

output "budget_critical" {
  description = "Critical budget name (panic ceiling)."
  value       = aws_budgets_budget.critical.name
}

###############################################################################
# has-admin outputs
###############################################################################

output "admin_acm_certificate_arn" {
  description = "ARN del cert ACM para admin.haslife.org (us-east-1 — usable por CloudFront)."
  value       = aws_acm_certificate.admin.arn
}

output "cognito_user_pool_id" {
  description = "User pool ID de haslife-platform-users."
  value       = aws_cognito_user_pool.platform.id
}

output "cognito_user_pool_arn" {
  description = "ARN del user pool (necesario para Lambda triggers y JWT verification)."
  value       = aws_cognito_user_pool.platform.arn
}

output "cognito_user_pool_client_id" {
  description = "App client ID público (se inyecta en has-admin/.env como NEXT_PUBLIC_COGNITO_CLIENT_ID)."
  value       = aws_cognito_user_pool_client.platform_spa.id
}

output "cognito_user_pool_domain" {
  description = "Dominio Cognito (haslife-auth.auth.us-east-1.amazoncognito.com) para token refresh y JWKS."
  value       = aws_cognito_user_pool_domain.platform.domain
}

output "admin_s3_bucket" {
  description = "S3 bucket que sirve assets estáticos de has-admin."
  value       = aws_s3_bucket.admin_assets.id
}

output "admin_lambda_name" {
  description = "Nombre de la Lambda SSR de has-admin (para `aws lambda update-function-code`)."
  value       = aws_lambda_function.admin_server.function_name
}

output "admin_apigw_id" {
  description = "API Gateway HTTP API ID dedicado a has-admin."
  value       = aws_apigatewayv2_api.admin.id
}

output "admin_apigw_invoke_url" {
  description = "URL invocable directamente del API Gateway (debug). En prod usar admin.haslife.org."
  value       = aws_apigatewayv2_stage.admin_default.invoke_url
}

output "admin_cloudfront_distribution_id" {
  description = "CloudFront distribution ID de admin.haslife.org — para cache invalidations."
  value       = aws_cloudfront_distribution.admin.id
}

output "admin_cloudfront_domain" {
  description = "CloudFront default domain (xxx.cloudfront.net) para test pre-DNS."
  value       = aws_cloudfront_distribution.admin.domain_name
}

output "admin_url" {
  description = "URL pública final de has-admin."
  value       = "https://${local.admin_domain}"
}
