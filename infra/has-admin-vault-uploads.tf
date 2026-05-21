###############################################################################
# Citizen-vault uploads — almacenamiento de binarios (PDF / DICOM / imágenes)
#
# S7.3: el citizen sube archivos médicos. El contenido vive en S3 cifrado con
# una CMK KMS dedicada (aísla el PHI del resto de la infra). La metadata se
# guarda en la tabla `vault_uploads` de `has_platform`.
#
# Acceso: la Lambda `has-admin-server` genera presigned URLs (PUT/GET) firmadas
# con su propio rol IAM. El bucket NO es público y no tiene bucket policy de
# lectura — solo la Lambda puede operar sobre él.
###############################################################################

# --- KMS CMK dedicada para el PHI del vault ----------------------------------
resource "aws_kms_key" "vault_uploads" {
  description             = "HAS citizen-vault uploads — cifrado de binarios médicos (PHI)"
  enable_key_rotation     = true # rotación anual automática (ADR-022)
  deletion_window_in_days = 30

  tags = {
    Component = "has-admin"
    Module    = "citizen-vault"
  }
}

resource "aws_kms_alias" "vault_uploads" {
  name          = "alias/has-vault-uploads"
  target_key_id = aws_kms_key.vault_uploads.key_id
}

# --- Bucket S3 ----------------------------------------------------------------
resource "aws_s3_bucket" "vault_uploads" {
  bucket        = "haslife-vault-uploads"
  force_destroy = false

  tags = {
    Component = "has-admin"
    Module    = "citizen-vault"
  }
}

resource "aws_s3_bucket_public_access_block" "vault_uploads" {
  bucket                  = aws_s3_bucket.vault_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning deshabilitado: el derecho al olvido (DSR erasure) exige borrado
# físico — versiones residuales lo impedirían.
resource "aws_s3_bucket_versioning" "vault_uploads" {
  bucket = aws_s3_bucket.vault_uploads.id
  versioning_configuration {
    status = "Disabled"
  }
}

# Cifrado en reposo por defecto con la CMK dedicada. Todo PutObject queda
# cifrado sin que el cliente tenga que enviar headers SSE.
resource "aws_s3_bucket_server_side_encryption_configuration" "vault_uploads" {
  bucket = aws_s3_bucket.vault_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.vault_uploads.arn
    }
    bucket_key_enabled = true
  }
}

# Lifecycle: tras 1 año los binarios pasan a Glacier (acceso esporádico).
resource "aws_s3_bucket_lifecycle_configuration" "vault_uploads" {
  bucket = aws_s3_bucket.vault_uploads.id

  rule {
    id     = "archive-to-glacier-after-1-year"
    status = "Enabled"
    filter {}
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# CORS: el browser sube el archivo con PUT directo a S3 vía presigned URL.
resource "aws_s3_bucket_cors_configuration" "vault_uploads" {
  bucket = aws_s3_bucket.vault_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = ["https://admin.${local.domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- IAM: la Lambda has-admin-server opera sobre el bucket + CMK --------------
resource "aws_iam_role_policy" "admin_server_vault_uploads" {
  name = "${local.admin_lambda_name}-vault-uploads"
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
        Resource = "${aws_s3_bucket.vault_uploads.arn}/*"
      },
      {
        # GenerateDataKey → cifrar en PutObject; Decrypt → descargar; el resto
        # lo necesita S3 para operar con la CMK.
        Effect = "Allow"
        Action = [
          "kms:GenerateDataKey",
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = aws_kms_key.vault_uploads.arn
      }
    ]
  })
}

output "vault_uploads_bucket" {
  value = aws_s3_bucket.vault_uploads.bucket
}

output "vault_uploads_kms_key_arn" {
  value = aws_kms_key.vault_uploads.arn
}
