.PHONY: bootstrap init-dev plan-dev apply-dev destroy-dev fmt validate

bootstrap:
	bash scripts/bootstrap.sh

init-dev:
	cd environments/dev && terraform init -backend-config=backend.hcl

plan-dev:
	cd environments/dev && terraform plan -var-file=terraform.tfvars

apply-dev:
	cd environments/dev && terraform apply -var-file=terraform.tfvars

destroy-dev:
	cd environments/dev && terraform destroy -var-file=terraform.tfvars

fmt:
	terraform fmt -recursive .

validate:
	cd environments/dev && terraform init -backend-config=backend.hcl && terraform validate
