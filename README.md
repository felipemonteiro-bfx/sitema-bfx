# BFX Manager (Next.js + Postgres)

## Desenvolvimento local

1. Copie o `.env.example` para `.env` e ajuste se necessario.
2. Suba o Postgres e a app:

```bash
docker compose up --build
```

Aplicacao: `http://localhost:3000`
Streamlit legado (via proxy + layout): `http://localhost:3000/streamlit`

Login inicial:
- usuario: `admin`
- senha: `admin`

## Streamlit dentro do Next.js

O Nginx faz proxy de `/_streamlit` para o container Streamlit (com suporte a WebSocket). A pagina `/streamlit` exibe dentro do layout do Next.

## Scripts

```bash
npm run dev
npm run build
npm run start
```

## Atualizacao automatica durante desenvolvimento

O Docker ja vai usar o `docker-compose.override.yml` e montar os volumes do projeto.  
Qualquer alteracao no codigo atualiza o Next.js automaticamente.

```bash
docker compose up --build
```

Se quiser rodar sem override (modo producao):

```bash
docker compose -f docker-compose.yml up --build
```

## Banco

- Prisma + Postgres.
- Migracoes em `prisma/migrations`.

## Importar dados do SQLite (Streamlit)

O banco legado do Streamlit fica em `streamlit/bfx_sistema.db`. Para importar tudo para o Postgres:

```bash
# dentro do container da app
docker exec bfx_app sh -lc "RESET=1 node prisma/import_sqlite.js"
```

Se preferir rodar fora do container:

```bash
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bfx?schema=public
set RESET=1
node prisma/import_sqlite.js
```
