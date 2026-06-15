###############################################################################
# CI — has-data: GitHub → CodePipeline → CodeBuild (ADR-026)
#
# El pipeline corre el quality gate (ruff + mypy + pytest) y, si pasa, construye
# la imagen Docker del ETL de ingesta poblacional y la publica en ECR como
# `:latest` y `:<commit-sha>`. No hay stage de deploy aparte: el ETL es una
# tarea Fargate on-demand que se lanza con `:latest`, así que el push de la
# imagen es el despliegue. Todo lo define `buildspec.yml`.
#
# Reusa la CodeConnection (`aws_codestarconnections_connection.github`) y el
# bucket de artefactos de has-web — una sola GitHub App cubre toda la cuenta.
###############################################################################

# --- ECR: imagen del ETL -----------------------------------------------------
resource "aws_ecr_repository" "data" {
  name                 = "has-data"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, { Component = "has-data" })
}

resource "aws_ecr_lifecycle_policy" "data" {
  repository = aws_ecr_repository.data.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Conservar solo las últimas 10 imágenes."
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# --- IAM: rol de CodeBuild ---------------------------------------------------
resource "aws_iam_role" "data_codebuild" {
  name = "has-data-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "data_codebuild" {
  name = "has-data-codebuild-policy"
  role = aws_iam_role.data_codebuild.id

  # Quality gate + build/push de la imagen del ETL a ECR.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        # Artefactos del pipeline (source de entrada).
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${aws_s3_bucket.pipeline_artifacts.arn}/*"
      },
      {
        # Token de login a ECR (la acción no admite recurso acotado).
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        # Push de la imagen del ETL al repositorio ECR has-data.
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = aws_ecr_repository.data.arn
      }
    ]
  })
}

# --- Proyecto CodeBuild ------------------------------------------------------
resource "aws_codebuild_project" "data" {
  name         = "has-data-ci"
  description  = "Quality gate de has-data (ruff + mypy + pytest) + imagen ECR"
  service_role = aws_iam_role.data_codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    # MEDIUM + privileged: además del quality gate se construye la imagen
    # Docker del ETL (numpy/scipy/pandas/pyarrow) y se publica en ECR.
    compute_type    = "BUILD_GENERAL1_MEDIUM"
    image           = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true

    environment_variable {
      name  = "ECR_REPOSITORY_URL"
      value = aws_ecr_repository.data.repository_url
    }
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/has-data-ci"
    }
  }
}

# --- IAM: rol de CodePipeline ------------------------------------------------
resource "aws_iam_role" "data_codepipeline" {
  name = "has-data-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "data_codepipeline" {
  name = "has-data-codepipeline-policy"
  role = aws_iam_role.data_codepipeline.id

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
        Resource = aws_codebuild_project.data.arn
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
resource "aws_codepipeline" "data" {
  name          = "has-data-pipeline"
  role_arn      = aws_iam_role.data_codepipeline.arn
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
        FullRepositoryId = var.github_data_repo
        BranchName       = var.github_branch
      }
    }
  }

  stage {
    name = "QualityGate"

    action {
      name            = "QualityGate"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = aws_codebuild_project.data.name
      }
    }
  }
}

output "data_codepipeline_name" {
  description = "Nombre del pipeline de CI de has-data."
  value       = aws_codepipeline.data.name
}
