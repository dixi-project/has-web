###############################################################################
# S3 bucket — has-admin assets (servidos por CloudFront vía OAC)
#
# Layout esperado por OpenNext:
#   _assets/_next/...   ← hashed assets (cache 1 año)
#   _assets/BUILD_ID    ← marker de build
#   _cache/...          ← ISR cache (no usado con `dummy` overrides)
###############################################################################

resource "aws_s3_bucket" "admin_assets" {
  bucket        = "haslife-admin-assets"
  force_destroy = false

  tags = {
    Component = "has-admin"
    Module    = "static-assets"
  }
}

resource "aws_s3_bucket_public_access_block" "admin_assets" {
  bucket                  = aws_s3_bucket.admin_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "admin_assets" {
  bucket = aws_s3_bucket.admin_assets.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "admin_assets" {
  bucket = aws_s3_bucket.admin_assets.id

  rule {
    id     = "expire-cache-after-90-days"
    status = "Enabled"
    filter {
      prefix = "_cache/"
    }
    expiration {
      days = 90
    }
  }
}

# Policy: solo CloudFront (via OAC) puede leer del bucket.
data "aws_iam_policy_document" "admin_assets" {
  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.admin_assets.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.admin.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "admin_assets" {
  bucket = aws_s3_bucket.admin_assets.id
  policy = data.aws_iam_policy_document.admin_assets.json
}
