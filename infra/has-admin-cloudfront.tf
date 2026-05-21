###############################################################################
# CloudFront distribution — admin.haslife.org
#
# Origins:
#   - S3 (haslife-admin-assets)        → assets estáticos via OAC
#   - API Gateway (has-admin-api)      → Lambda SSR (catch-all)
#
# Behaviors (orden de prioridad):
#   - /_next/static/* → S3 (1 año cache)
#   - /BUILD_ID       → S3 (corto)
#   - /_next/data/*   → API Gateway (no-cache)
#   - default         → API Gateway (no-cache, forward host/cookies)
###############################################################################

# Cache policies reutilizables
data "aws_cloudfront_cache_policy" "managed_caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "managed_caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "managed_all_viewer_except_host" {
  # AllViewerExceptHostHeader: forwards toda cookie, query y header excepto Host.
  # Necesario para que API Gateway acepte el request (Host = apigw domain).
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_response_headers_policy" "managed_security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

# OAC para que CloudFront acceda al S3 privado
resource "aws_cloudfront_origin_access_control" "admin_assets" {
  name                              = "has-admin-assets-oac"
  description                       = "OAC for has-admin S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "admin" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "admin.haslife.org — has-admin (Next.js SSR via OpenNext + APIGW + Lambda)"
  default_root_object = ""
  http_version        = "http2and3"
  price_class         = "PriceClass_100" # NA + EU. Otras regiones siguen sirviendo, solo cache local de NA/EU.
  aliases             = ["admin.${local.domain}"]

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.admin.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # ----- S3 origin (assets estáticos) -----
  origin {
    domain_name              = aws_s3_bucket.admin_assets.bucket_regional_domain_name
    origin_id                = "s3-admin-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.admin_assets.id
    origin_path              = "/_assets"
  }

  # ----- API Gateway origin (SSR) -----
  origin {
    domain_name = "${aws_apigatewayv2_api.admin.id}.execute-api.us-east-1.amazonaws.com"
    origin_id   = "apigw-admin-server"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ----- Default: catch-all → SSR Lambda -----
  default_cache_behavior {
    target_origin_id       = "apigw-admin-server"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.managed_security_headers.id
  }

  # ----- /_next/static/* → S3 (immutable, 1 año) -----
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "s3-admin-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = data.aws_cloudfront_cache_policy.managed_caching_optimized.id
  }

  # ----- /BUILD_ID → S3 (corto, lo lee el client para detectar new deploys) -----
  ordered_cache_behavior {
    path_pattern           = "/BUILD_ID"
    target_origin_id       = "s3-admin-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
  }

  # ----- /_next/data/* → SSR Lambda (data fetching) -----
  ordered_cache_behavior {
    path_pattern           = "/_next/data/*"
    target_origin_id       = "apigw-admin-server"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = data.aws_cloudfront_cache_policy.managed_caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.managed_all_viewer_except_host.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.managed_security_headers.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Component = "has-admin"
  }
}
