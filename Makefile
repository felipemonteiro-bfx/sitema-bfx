# BFX Manager - Comandos automatizados
.PHONY: up down build migrate k8s-rollout

# Sobe Docker (db + app) com migrate automático
up:
	docker compose up -d

# Para os containers
down:
	docker compose down

# Build das imagens
build:
	docker compose build

# Roda migrations no banco
migrate:
	npx prisma migrate deploy

# Força o K8s a puxar nova imagem (deploy/bfx)
k8s-rollout:
	kubectl rollout restart deployment/bfx-app -n bfx
	kubectl rollout status deployment/bfx-app -n bfx
