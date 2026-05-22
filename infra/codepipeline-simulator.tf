###############################################################################
# CI — has-simulator: GitHub → CodePipeline → CodeBuild (ADR-026)
#
# El pipeline corre el quality gate (ruff + mypy + pytest) y, si pasa, construye
# la imagen Docker del worker y la publica en ECR como `:latest` (R2.3c). No hay
# stage de deploy aparte: el worker es una tarea Fargate one-shot que se lanza
# con `:latest` por cada job, así que el push de la imagen es el despliegue.
# Todo lo define `buildspec.yml`.
#
# Reemplaza el workflow GitHub Actions retirado (la org `dixi-project` migró
# todo su CI/CD a CodePipeline).
#
# Reusa la CodeConnection (`aws_codestarconnections_connection.github`) y el
# bucket de artefactos de has-web — una sola GitHub App cubre toda la cuenta.
###############################################################################

# --- IAM: rol de CodeBuild ---------------------------------------------------
resource "aws_iam_role" "simulator_codebuild" {
  name = "has-simulator-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "simulator_codebuild" {
  name = "has-simulator-codebuild-policy"
  role = aws_iam_role.simulator_codebuild.id

  # Quality gate + build/push de la imagen del worker a ECR (R2.3c).
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
        # Push de la imagen del worker al repositorio ECR has-simulator.
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = aws_ecr_repository.simulator.arn
      }
    ]
  })
}

# --- Proyecto CodeBuild ------------------------------------------------------
resource "aws_codebuild_project" "simulator" {
  name         = "has-simulator-ci"
  description  = "Quality gate de has-simulator (ruff + mypy + pytest)"
  service_role = aws_iam_role.simulator_codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    # MEDIUM + privileged: además del quality gate se construye la imagen
    # Docker del worker (numpy/scipy/pandas) y se publica en ECR.
    compute_type    = "BUILD_GENERAL1_MEDIUM"
    image           = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true

    environment_variable {
      name  = "ECR_REPOSITORY_URL"
      value = aws_ecr_repository.simulator.repository_url
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
      group_name = "/aws/codebuild/has-simulator-ci"
    }
  }
}

# --- IAM: rol de CodePipeline ------------------------------------------------
resource "aws_iam_role" "simulator_codepipeline" {
  name = "has-simulator-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "simulator_codepipeline" {
  name = "has-simulator-codepipeline-policy"
  role = aws_iam_role.simulator_codepipeline.id

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
        Resource = aws_codebuild_project.simulator.arn
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
resource "aws_codepipeline" "simulator" {
  name          = "has-simulator-pipeline"
  role_arn      = aws_iam_role.simulator_codepipeline.arn
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
        FullRepositoryId = var.github_simulator_repo
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
        ProjectName = aws_codebuild_project.simulator.name
      }
    }
  }
}

output "simulator_codepipeline_name" {
  description = "Nombre del pipeline de CI de has-simulator."
  value       = aws_codepipeline.simulator.name
}
