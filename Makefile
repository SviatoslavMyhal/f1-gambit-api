.PHONY: init bootstrap install dev build start prod clean docker-up docker-down

init: bootstrap install

bootstrap:
	bash scripts/bootstrap.sh

install:
	npm install

dev:
	npm run start:dev

build:
	npm run build

start:
	npm run start

prod:
	npm run start:prod

clean:
	rm -rf dist

docker-up:
	docker compose up -d

docker-down:
	docker compose down
