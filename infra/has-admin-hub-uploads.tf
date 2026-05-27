###############################################################################
# Collaborator-hub uploads — almacenamiento de binarios de assets (PDF papers,
# datasets, código tar.gz, modelos pickle).
#
# S7.12-v2: el collaborator sube archivos asociados a un hub_asset. Patrón
# análogo al vault uploads (S7.3) pero menos sensible — no es PHI, no requiere
# tanta protección. Se mantienen las mismas best practices (KMS dedicada,
# bucket privado, presigned URLs) por consistencia y para el caso de assets
# con datasets pseudoanonimizados (consent de research).
###############################################################################

# --- KMS CMK dedicada para los binarios del hub ------------------------------
resource "aws_kms_key" "hub_uploads" {
  description             = "HAS collaborator-hub uploads — cifrado de binarios de assets"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  tags = {
    Component = "has-admin"
    Module    = "collaborator-hub"
  }
}

resource "aws_kms_alias" "hub_uploads" {
  name          = "alias/has-hub-uploads"
  target_key_id = aws_kms_key.hub_uploads.key_id
}

# --- Bucket S3 ----------------------------------------------------------------
resource "aws_s3_bucket" "hub_uploads" {
  bucket        = "haslife-hub-uploads"
  force_destroy = false

  tags = {
    Component = "has-admin"
    Module    = "collaborator-hub"
  }
}

resource "aws_s3_bucket_public_access_block" "hub_uploads" {
  bucket                  = aws_s3_bucket.hub_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Sin versioning — el delete físico para DSR/rectificación debe quedar
# definitivo (igual que el vault). Para hub los datasets pseudoanonimizados
# también participan del derecho al olvido del citizen origen.
resource "aws_s3_bucket_versioning" "hub_uploads" {
  bucket = aws_s3_bucket.hub_uploads.id
  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "hub_uploads" {
  bucket = aws_s3_bucket.hub_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.hub_uploads.arn
    }
    bucket_key_enabled = true
  }
}

# Lifecycle: a los 2 años pasa a Glacier (los papers tienen vida util larga).
resource "aws_s3_bucket_lifecycle_configuration" "hub_uploads" {
  bucket = aws_s3_bucket.hub_uploads.id

  rule {
    id     = "archive-to-glacier-after-2-years"
    status = "Enabled"
    filter {}
    transition {
      days          = 730
      storage_class = "GLACIER"
    }
  }
}

# CORS: el browser sube el archivo con PUT directo a S3 vía presigned URL.
resource "aws_s3_bucket_cors_configuration" "hub_uploads" {
  bucket = aws_s3_bucket.hub_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = ["https://admin.${local.domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- IAM: la Lambda has-admin-server opera sobre el bucket + CMK --------------
resource "aws_iam_role_policy" "admin_server_hub_uploads" {
  name = "${local.admin_lambda_name}-hub-uploads"
  role = aws_iam_role.admin_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.hub_uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.hub_uploads.arn
      }
    ]
  })
}

output "hub_uploads_bucket" {
  value = aws_s3_bucket.hub_uploads.bucket
}

output "hub_uploads_kms_key_arn" {
  value = aws_kms_key.hub_uploads.arn
}
