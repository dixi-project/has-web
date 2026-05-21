###############################################################################
# CI/CD — has-admin: GitHub → CodePipeline → CodeBuild (ADR-026)
#
# Reusa la CodeConnection (`aws_codestarconnections_connection.github`) y el
# bucket de artefactos de has-web — una sola GitHub App cubre toda la cuenta.
#
# Build:  CodeBuild ejecuta `buildspec.yml` de has-admin → `pnpm build:open-next`
#         + patch de symlinks + sync S3 + `lambda update-function-code` +
#         invalidación CloudFront (lógica en `scripts/ci-deploy.sh`).
###############################################################################

# --- IAM: rol de CodeBuild ---------------------------------------------------
resource "aws_iam_role" "admin_codebuild" {
  name = "has-admin-codebuild-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "admin_codebuild" {
  name = "has-admin-codebuild-policy"
  role = aws_iam_role.admin_codebuild.id

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
        # Artefactos del pipeline
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:PutObject"]
        Resource = "${aws_s3_bucket.pipeline_artifacts.arn}/*"
      },
      {
        # Deploy: sync de assets estáticos de has-admin
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.admin_assets.arn,
          "${aws_s3_bucket.admin_assets.arn}/*"
        ]
      },
      {
        # Deploy: actualizar el código de la Lambda SSR + esperar a que propague
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = aws_lambda_function.admin_server.arn
      },
      {
        # Invalidación de CloudFront
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.admin.arn
      }
    ]
  })
}

# --- Proyecto CodeBuild ------------------------------------------------------
resource "aws_codebuild_project" "admin" {
  name         = "has-admin-deploy"
  description  = "Build OpenNext + deploy de has-admin (Lambda SSR + assets)"
  service_role = aws_iam_role.admin_codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    # MEDIUM: el build de OpenNext es más pesado que un static export.
    compute_type = "BUILD_GENERAL1_MEDIUM"
    image        = "aws/codebuild/amazonlinux-x86_64-standard:5.0"
    type         = "LINUX_CONTAINER"

    environment_variable {
      name  = "ADMIN_BUCKET"
      value = aws_s3_bucket.admin_assets.id
    }
    environment_variable {
      name  = "ADMIN_LAMBDA"
      value = aws_lambda_function.admin_server.function_name
    }
    environment_variable {
      name  = "ADMIN_CF_DIST_ID"
      value = aws_cloudfront_distribution.admin.id
    }

    # --- Variables consumidas por `next build` (OpenNext) --------------------
    # Las NEXT_PUBLIC_* se inlinean en el bundle del cliente en tiempo de build.
    # Las HAS_DB_* las exigen los módulos server (src/db/client.ts) cuando Next
    # recolecta la page data de las rutas API. Sin ellas el build falla.
    environment_variable {
      name  = "NEXT_PUBLIC_AWS_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "NEXT_PUBLIC_COGNITO_USER_POOL_ID"
      value = aws_cognito_user_pool.platform.id
    }
    environment_variable {
      name  = "NEXT_PUBLIC_COGNITO_CLIENT_ID"
      value = aws_cognito_user_pool_client.platform_spa.id
    }
    environment_variable {
      name  = "NEXT_PUBLIC_COGNITO_DOMAIN"
      value = aws_cognito_user_pool_domain.platform.domain
    }
    environment_variable {
      name  = "NEXT_PUBLIC_APP_URL"
      value = "https://${local.admin_domain}"
    }
    environment_variable {
      name  = "NEXT_PUBLIC_APP_NAME"
      value = "HAS"
    }
    environment_variable {
      name  = "HAS_DB_CLUSTER_ARN"
      value = "arn:aws:rds:us-east-1:712389989805:cluster:platform-postgres"
    }
    environment_variable {
      name  = "HAS_DB_SECRET_ARN"
      value = "arn:aws:secretsmanager:us-east-1:712389989805:secret:/has/platform/db-creds-OGPfmY"
    }
    environment_variable {
      name  = "HAS_DB_NAME"
      value = "has_platform"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/has-admin-deploy"
    }
  }
}

# --- IAM: rol de CodePipeline ------------------------------------------------
resource "aws_iam_role" "admin_codepipeline" {
  name = "has-admin-codepipeline-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "admin_codepipeline" {
  name = "has-admin-codepipeline-policy"
  role = aws_iam_role.admin_codepipeline.id

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
        Resource = aws_codebuild_project.admin.arn
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
resource "aws_codepipeline" "admin" {
  name          = "has-admin-pipeline"
  role_arn      = aws_iam_role.admin_codepipeline.arn
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
        FullRepositoryId = var.github_admin_repo
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
        ProjectName = aws_codebuild_project.admin.name
      }
    }
  }
}

output "admin_codepipeline_name" {
  description = "Nombre del pipeline de CI/CD de has-admin."
  value       = aws_codepipeline.admin.name
}
