# BFX Manager - Comandos automatizados
.PHONY: up down build migrate sync-vendas sync-vendas-hoje import-all

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
