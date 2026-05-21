###############################################################################
# AWS SES — envío de emails transaccionales (contact form + donation notifications).
#
# - Domain identity: haslife.org con DKIM (3 CNAMEs en Route53).
# - SPF y DMARC TXT records para mejorar entregabilidad.
# - Production access concedido 2026-05-19 — cuota 50k/día, 14 msg/s.
# - Configuration set `has-default` con event destinations SNS para
#   bounces/complaints (ver sns-ses.tf).
###############################################################################

resource "aws_sesv2_email_identity" "haslife" {
  email_identity = local.domain
}

resource "aws_sesv2_email_identity" "admin" {
  email_identity = "acastillejos@dixi-project.com"
}

# DKIM tokens → CNAMEs en Route53. SES los genera; nosotros los publicamos.
resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = aws_route53_zone.main.zone_id
  name    = "${element(aws_sesv2_email_identity.haslife.dkim_signing_attributes[0].tokens, count.index)}._domainkey.${local.domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${element(aws_sesv2_email_identity.haslife.dkim_signing_attributes[0].tokens, count.index)}.dkim.amazonses.com"]
}

# SPF — autoriza a Amazon SES enviar en nombre del dominio.
resource "aws_route53_record" "ses_spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain
  type    = "TXT"
  ttl     = 1800
  records = ["v=spf1 include:amazonses.com -all"]
}

# DMARC — política de "monitoring only" para empezar; subir a quarantine/reject después.
resource "aws_route53_record" "ses_dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${local.domain}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=DMARC1; p=none; rua=mailto:acastillejos@dixi-project.com; fo=1"]
}

# MAIL FROM custom (mejora reputación: el sobre del correo usa el dominio propio en vez de amazonses.com).
resource "aws_sesv2_email_identity_mail_from_attributes" "haslife" {
  email_identity         = aws_sesv2_email_identity.haslife.email_identity
  mail_from_domain       = "mail.${local.domain}"
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "mail.${local.domain}"
  type    = "MX"
  ttl     = 1800
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "mail.${local.domain}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=spf1 include:amazonses.com -all"]
}

output "ses_admin_email_identity" {
  description = "Email identity verificada (legado del sandbox; sigue disponible para envíos de prueba)."
  value       = aws_sesv2_email_identity.admin.email_identity
}

output "ses_domain_identity" {
  description = "Dominio verificado en SES."
  value       = aws_sesv2_email_identity.haslife.email_identity
}
