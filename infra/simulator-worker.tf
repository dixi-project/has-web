###############################################################################
# has-simulator — despacho asíncrono de corridas en ECS Fargate (R2.3c)
#
# Arquitectura (scale-to-zero, sin costo en reposo):
#
#   has-admin → SQS `simulator-jobs` → Lambda `has-simulator-dispatch`
#             → ECS RunTask (Fargate one-shot) → worker `has-sim worker`
#             → persiste en Aurora vía el RDS Data API
#
# El worker corre en subnets públicas de la VPC default con IP pública: alcanza
# SQS/ECR/Data API/Secrets por HTTPS, sin NAT Gateway (decisión R2.3c — opción
# A: persistencia vía Data API). Solo se paga Fargate por segundo mientras una
# corrida se ejecuta; SQS y ECR en reposo son ~$0.
#
# `local.has_db_cluster_arn` / `local.has_db_secret_arn` se definen en
# `lambda-cognito-post-confirm.tf`.
###############################################################################

locals {
  simulator_worker_name = "has-simulator-worker"
}

# --- Red: VPC default + subnets públicas -------------------------------------

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "simulator_worker" {
  name        = local.simulator_worker_name
  description = "Worker del simulador en Fargate - solo egress (SQS/ECR/Data API)."
  vpc_id      = data.aws_vpc.default.id

  egress {
    description = "Salida HTTPS hacia los servicios AWS."
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Component = "has-simulator" })
}

# --- ECR: imagen del worker --------------------------------------------------

resource "aws_ecr_repository" "simulator" {
  name                 = "has-simulator"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, { Component = "has-simulator" })
}

resource "aws_ecr_lifecycle_policy" "simulator" {
  repository = aws_ecr_repository.simulator.name

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

# --- SQS: cola de jobs + dead-letter queue -----------------------------------

resource "aws_sqs_queue" "simulator_jobs_dlq" {
  name                      = "simulator-jobs-dlq"
  message_retention_seconds = 1209600 # 14 días — para inspeccionar fallos
  tags                      = merge(var.tags, { Component = "has-simulator" })
}

resource "aws_sqs_queue" "simulator_jobs" {
  name                       = "simulator-jobs"
  message_retention_seconds  = 345600 # 4 días
  visibility_timeout_seconds = 180    # ≥ 6× el timeout del dispatcher (30 s)

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.simulator_jobs_dlq.arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, { Component = "has-simulator" })
}

# --- CloudWatch logs ---------------------------------------------------------

resource "aws_cloudwatch_log_group" "simulator_worker" {
  name              = "/ecs/${local.simulator_worker_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "simulator_dispatch" {
  name              = "/aws/lambda/has-simulator-dispatch"
  retention_in_days = 30
}

# --- ECS: cluster + task definition del worker -------------------------------

resource "aws_ecs_cluster" "simulator" {
  name = "has-simulator"
  tags = merge(var.tags, { Component = "has-simulator" })
}

# Rol de ejecución: ECS lo usa para hacer pull de ECR y escribir logs.
resource "aws_iam_role" "simulator_task_execution" {
  name = "has-simulator-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "simulator_task_execution" {
  role       = aws_iam_role.simulator_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Rol de la tarea: permisos del worker en runtime — Data API + el secret de BD.
resource "aws_iam_role" "simulator_task" {
  name = "has-simulator-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "simulator_task" {
  name = "has-simulator-task-policy"
  role = aws_iam_role.simulator_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["rds-data:ExecuteStatement", "rds-data:BatchExecuteStatement"]
        Resource = local.has_db_cluster_arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = local.has_db_secret_arn
      },
    ]
  })
}

resource "aws_ecs_task_definition" "simulator_worker" {
  family                   = local.simulator_worker_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512  # 0.5 vCPU
  memory                   = 1024 # 1 GB — holgado para numpy/scipy
  execution_role_arn       = aws_iam_role.simulator_task_execution.arn
  task_role_arn            = aws_iam_role.simulator_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "worker"
    image     = "${aws_ecr_repository.simulator.repository_url}:latest"
    essential = true
    # `has-sim` es el ENTRYPOINT de la imagen; el dispatcher sobrescribe el
    # command con `worker --run-id <uuid>` por cada corrida.
    command = ["worker"]
    environment = [
      { name = "HAS_SIM_DB_RESOURCE_ARN", value = local.has_db_cluster_arn },
      { name = "HAS_SIM_DB_SECRET_ARN", value = local.has_db_secret_arn },
      { name = "HAS_SIM_DB_NAME", value = "has_platform" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.simulator_worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])

  tags = merge(var.tags, { Component = "has-simulator" })
}

# --- Lambda dispatcher: SQS → ECS RunTask ------------------------------------

data "archive_file" "simulator_dispatch" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-simulator-dispatch"
  output_path = "${path.module}/lambda-simulator-dispatch.zip"
  excludes    = ["README.md", ".gitignore"]
}

resource "aws_iam_role" "simulator_dispatch" {
  name = "has-simulator-dispatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "simulator_dispatch_basic" {
  role       = aws_iam_role.simulator_dispatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "simulator_dispatch" {
  name = "has-simulator-dispatch-policy"
  role = aws_iam_role.simulator_dispatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Consumir la cola (lo exige el event source mapping).
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ]
        Resource = aws_sqs_queue.simulator_jobs.arn
      },
      {
        # Lanzar la tarea Fargate del worker (cualquier revisión de la family).
        Effect   = "Allow"
        Action   = ["ecs:RunTask"]
        Resource = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${local.simulator_worker_name}:*"
        Condition = {
          ArnEquals = { "ecs:cluster" = aws_ecs_cluster.simulator.arn }
        }
      },
      {
        # RunTask asume los roles de la tarea — hay que poder pasarlos.
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [
          aws_iam_role.simulator_task_execution.arn,
          aws_iam_role.simulator_task.arn,
        ]
      },
    ]
  })
}

resource "aws_lambda_function" "simulator_dispatch" {
  function_name = "has-simulator-dispatch"
  role          = aws_iam_role.simulator_dispatch.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 128
  timeout       = 30

  filename         = data.archive_file.simulator_dispatch.output_path
  source_code_hash = data.archive_file.simulator_dispatch.output_base64sha256

  environment {
    variables = {
      ECS_CLUSTER     = aws_ecs_cluster.simulator.arn
      TASK_DEFINITION = aws_ecs_task_definition.simulator_worker.arn
      SUBNETS         = join(",", data.aws_subnets.default.ids)
      SECURITY_GROUP  = aws_security_group.simulator_worker.id
    }
  }

  depends_on = [aws_cloudwatch_log_group.simulator_dispatch]
  tags       = merge(var.tags, { Component = "has-simulator" })
}

resource "aws_lambda_event_source_mapping" "simulator_dispatch" {
  event_source_arn = aws_sqs_queue.simulator_jobs.arn
  function_name    = aws_lambda_function.simulator_dispatch.arn
  batch_size       = 1
  enabled          = true
}

# --- Outputs -----------------------------------------------------------------

output "simulator_jobs_queue_url" {
  description = "URL de la cola SQS de jobs del simulador — la usa has-admin para encolar."
  value       = aws_sqs_queue.simulator_jobs.url
}

output "simulator_ecr_repository_url" {
  description = "URL del repositorio ECR — el CI hace push de la imagen del worker aquí."
  value       = aws_ecr_repository.simulator.repository_url
}
