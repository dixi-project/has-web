###############################################################################
# CI — has-simulator: GitHub → CodePipeline → CodeBuild (ADR-026)
#
# has-simulator es research track y NO se despliega: este pipeline solo corre
# el quality gate (ruff + mypy + pytest) definido en `buildspec.yml`. No tiene
# stage de deploy — el stage `QualityGate` es la verificación completa.
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

  # Sin permisos de deploy: el quality gate no toca ningún recurso de runtime.
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
    # SMALL alcanza para lint + type-check + tests del engine bare.
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"
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
