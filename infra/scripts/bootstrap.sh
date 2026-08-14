#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# bootstrap.sh
# Run ONCE manually before any `terraform init`.
# Creates the S3 remote state bucket + DynamoDB lock table.
# These resources are intentionally NOT managed by Terraform itself.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${AWS_REGION:-eu-west-1}"
STATE_BUCKET="f1-gambit-terraform-state"
LOCK_TABLE="f1-gambit-terraform-locks"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "▶ Bootstrapping Terraform remote state"
echo "  Account : $ACCOUNT_ID"
echo "  Region  : $REGION"
echo "  Bucket  : $STATE_BUCKET"
echo "  Table   : $LOCK_TABLE"
echo ""

# ─── S3 bucket ────────────────────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  echo "✓ S3 bucket already exists — skipping"
else
  echo "▶ Creating S3 bucket..."
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket \
      --bucket "$STATE_BUCKET" \
      --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$STATE_BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi

  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }]
    }'

  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "✓ S3 bucket created and hardened"
fi

# ─── DynamoDB lock table ───────────────────────────────────────────────────────
if aws dynamodb describe-table --table-name "$LOCK_TABLE" --region "$REGION" 2>/dev/null; then
  echo "✓ DynamoDB table already exists — skipping"
else
  echo "▶ Creating DynamoDB lock table..."
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

  aws dynamodb wait table-exists \
    --table-name "$LOCK_TABLE" \
    --region "$REGION"

  echo "✓ DynamoDB lock table ready"
fi

# ─── CodeBuild / CodePipeline IAM role (needed for Day 6 pipelines) ───────────
PIPELINE_ROLE_NAME="f1-gambit-codepipeline-role"
if aws iam get-role --role-name "$PIPELINE_ROLE_NAME" 2>/dev/null; then
  echo "✓ CodePipeline IAM role already exists — skipping"
else
  echo "▶ Creating CodePipeline IAM role..."
  aws iam create-role \
    --role-name "$PIPELINE_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": ["codepipeline.amazonaws.com", "codebuild.amazonaws.com"]
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }'

  aws iam attach-role-policy \
    --role-name "$PIPELINE_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess

  aws iam attach-role-policy \
    --role-name "$PIPELINE_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

  aws iam attach-role-policy \
    --role-name "$PIPELINE_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

  echo "✓ CodePipeline IAM role created"
fi

echo ""
echo "────────────────────────────────────────────────"
echo "✅ Bootstrap complete. Next steps:"
echo ""
echo "  cd infra/environments/dev"
echo "  terraform init -backend-config=backend.hcl"
echo "  terraform plan -var-file=terraform.tfvars"
echo "  terraform apply -var-file=terraform.tfvars"
echo "────────────────────────────────────────────────"
