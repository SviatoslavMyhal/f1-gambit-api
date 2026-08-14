terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "alert_email" {
  type        = string
  description = "Confirm this subscription in SNS after apply or alarms stay silent"
}

module "networking" {
  source = "../../modules/networking"
}

module "rds" {
  source = "../../modules/rds"
  vpc_id = module.networking.vpc_id
}

module "lambda" {
  source      = "../../modules/lambda"
  alert_email = var.alert_email
}
