###############################################################################
# Route53 records — admin.haslife.org → CloudFront
###############################################################################

resource "aws_route53_record" "admin_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.admin_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = aws_cloudfront_distribution.admin.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "admin_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.admin_domain
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = aws_cloudfront_distribution.admin.hosted_zone_id
    evaluate_target_health = false
  }
}
