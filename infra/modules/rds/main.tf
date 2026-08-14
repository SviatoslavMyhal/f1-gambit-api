# RDS PostgreSQL + RDS Proxy + Secrets Manager — expand with subnet groups,
# security groups, and aws_db_instance / aws_db_proxy resources.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "vpc_id" {
  type = string
}

output "vpc_id_echo" {
  value = var.vpc_id
}
