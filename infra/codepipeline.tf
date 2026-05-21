###############################################################################
# CI/CD — has-web: GitHub → CodePipeline → CodeBuild (ADR-026)
#
# Source:  CodeConnection a GitHub. Tras el primer `terraform apply` la conexión
#          nace en estado PENDING — hay que autorizar la GitHub App MANUALMENTE
#          en la consola: Developer Tools → Settings → Connections.
# Build:   un único stage CodeBuild que ejecuta `buildspec.yml` (format + lint +
#          build del static export + sync a S3 + invalidación CloudFront).
#
# Reemplaza el deploy manual (`scripts/deploy.sh`) y el workflow GitHub Actions.
###############################################################################

# --- Conexión a GitHub -------------------------------------------------------
resource "aws_codestarconnections_connection" "github" {
  name          = "has-web-github"
  provider_type = "GitHub"
}

# --- Bucket de artefactos del pipeline ---------------------------------------
resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket        = "${replace(var.domain, ".", "-")}-pipeline-artifacts"
  force_destroy = true

  tags = {
    Component = "cicd"
  }
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket                  = aws_s3_bucket.pipeline_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    id     = "expire-artifacts-after-30-days"
    status = "Enabled"
    filter {}
    expiration {
      days = 30
    }
  }
}

# --- IAM: rol de CodeBuild ---------------------------------------------------
resource "aws_iam_role" "codebuild" {
  name = "has-web-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = "has-web-codebuild-policy"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Logs de CloudWatch
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # Artefactos del pipeline (input/output entre stages)
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${aws_s3_bucket.pipeline_artifacts.arn}/*"
      },
      {
        # Deploy: sync del static export al bucket del sitio
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.web.arn,
          "${aws_s3_bucket.web.arn}/*"
        ]
      },
      {
        # Invalidación de CloudFront tras el deploy
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.web.arn
      }
    ]
  })
}

# --- Proyecto CodeBuild ------------------------------------------------------
resource "aws_codebuild_project" "web" {
  name         = "has-web-deploy"
  description  = "Build + deploy del sitio estático has-web"
  service_role = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"

    environment_variable {
      name  = "SITE_BUCKET"
      value = aws_s3_bucket.web.id
    }
    environment_variable {
      name  = "CF_DIST_ID"
      value = aws_cloudfront_distribution.web.id
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/has-web-deploy"
    }
  }
}

# --- IAM: rol de CodePipeline ------------------------------------------------
resource "aws_iam_role" "codepipeline" {
  name = "has-web-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "codepipeline" {
  name = "has-web-codepipeline-policy"
  role = aws_iam_role.codepipeline.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:GetBucketVersioning"
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts.arn,
          "${aws_s3_bucket.pipeline_artifacts.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["codebuild:BatchGetBuilds", "codebuild:StartBuild"]
        Resource = aws_codebuild_project.web.arn
      },
      {
        Effect   = "Allow"
        Action   = ["codestar-connections:UseConnection"]
        Resource = aws_codestarconnections_connection.github.arn
      }
    ]
  })
}

# --- Pipeline ----------------------------------------------------------------
resource "aws_codepipeline" "web" {
  name          = "has-web-pipeline"
  role_arn      = aws_iam_role.codepipeline.arn
  pipeline_type = "V2"

  artifact_store {
    type     = "S3"
    location = aws_s3_bucket.pipeline_artifacts.bucket
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repo
        BranchName       = var.github_branch
      }
    }
  }

  stage {
    name = "BuildAndDeploy"

    action {
      name            = "BuildAndDeploy"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = aws_codebuild_project.web.name
      }
    }
  }
}

output "codestar_connection_arn" {
  description = "ARN de la conexión GitHub. Nace en PENDING — autorizar en la consola: Developer Tools → Settings → Connections."
  value       = aws_codestarconnections_connection.github.arn
}

output "codepipeline_name" {
  description = "Nombre del pipeline de CI/CD de has-web."
  value       = aws_codepipeline.web.name
}
