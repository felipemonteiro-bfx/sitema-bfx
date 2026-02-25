# BFX Manager - Comandos automatizados
.PHONY: up down build migrate sync-vendas sync-vendas-hoje import-all k8s-rollout

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

# Sincroniza vendas de HOJE do SQLite para PostgreSQL
sync-vendas-hoje:
	node scripts/sync-vendas-hoje.js

# Substitui todas as vendas pelo conteúdo do SQLite
sync-vendas:
	node prisma/import-vendas-sqlite.js

# Importação completa do SQLite (clientes, produtos, vendas, etc)
import-all:
	node prisma/import_sqlite.js

# Força o K8s a puxar nova imagem (deploy/bfx)
k8s-rollout:
	kubectl rollout restart deployment/bfx-app -n bfx
	kubectl rollout status deployment/bfx-app -n bfx
