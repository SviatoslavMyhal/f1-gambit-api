# Lambda + API Gateway wiring belongs here. placeholder.zip satisfies the first
# apply; CodePipeline deploys real artifacts — keep lifecycle.ignore_changes on
# code fields so Terraform never rolls back a pipeline release.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "alert_email" {
  type        = string
  description = "SNS alarm subscription — confirm the email in AWS after apply"
}

resource "aws_iam_role" "lambda" {
  name = "f1-gambit-api-lambda-placeholder"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "api" {
  function_name = "f1-gambit-api-placeholder"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/placeholder.zip"

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      last_modified,
    ]
  }
}

resource "aws_sns_topic" "alarms" {
  name = "f1-gambit-api-alarms"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

output "lambda_arn" {
  value = aws_lambda_function.api.arn
}
