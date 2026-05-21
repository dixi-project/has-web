###############################################################################
# ACM cert + Route53 records para admin.haslife.org
#
# El subdominio servirá la app has-admin (Next.js SSR vía CloudFront + Lambda@Edge).
# El record A/AAAA al CloudFront se agrega cuando provisionemos la distribution
# en S4.x (ahora mismo solo creamos el cert + validación DNS).
###############################################################################

locals {
  admin_domain = "admin.${local.domain}"
}

resource "aws_acm_certificate" "admin" {
  provider = aws.us_east_1

  domain_name       = local.admin_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Component = "has-admin"
  }
}

resource "aws_route53_record" "admin_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.admin.domain_validation_options :
    dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.value]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "admin" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.admin.arn
  validation_record_fqdns = [for r in aws_route53_record.admin_cert_validation : r.fqdn]

  timeouts {
    create = "60m"
  }
}
