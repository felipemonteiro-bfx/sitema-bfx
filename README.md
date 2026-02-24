# BFX Manager (Next.js + Postgres)

## Desenvolvimento local

1. Copie o `.env.example` para `.env` e ajuste se necessario.
2. Suba o Postgres e a app:

```bash
docker compose up --build
```

Aplicacao: `http://localhost:3008`
Streamlit legado (via proxy + layout): `http://localhost:3008/streamlit`

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

## Deploy na Vercel

**Projeto:** `prj_mzQzGftbcte2j1rdqwZtf80Fs2f8` (para `vercel link` ou referência no dashboard).

### Checklist: deixar tudo pronto na Vercel

| # | O que fazer | Onde |
|---|-------------|------|
| 1 | Garantir variáveis de ambiente | Vercel → **sitema-bfx** → **Settings** → **Environment Variables** |
| 2 | Definir `NEXT_PUBLIC_APP_URL` com a URL do app (ex.: `https://sitema-bfx.vercel.app`) | Mesmo lugar; use a URL que aparece em **Visit** no deploy |
| 3 | Rodar migrações **uma vez** no banco de produção | No seu PC: copiar `DATABASE_URL` da Vercel e rodar `npx prisma migrate deploy` (ver seção 3 abaixo) |
| 4 | Conferir branch de produção | **Settings** → **Git** → **Production Branch** (ex.: `main`) |
| 5 | Testar: login, uma venda com boleto, página 404 | Abrir a URL do deploy |

Depois disso, cada **push** no branch de produção gera um novo deploy automaticamente.

---

### 1. Conectar repositório

- [vercel.com](https://vercel.com) → **Add New** → **Project** → importe o repositório (ex.: `felipemonteiro-bfx/sitema-bfx`).
- Defina o branch de produção (ex.: `main` ou `nextjs-migration`).

### 2. Variáveis de ambiente

Em **Settings** → **Environment Variables** adicione (Production e Preview, se quiser):

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string Postgres (Vercel Postgres, Neon, Supabase). |
| `SESSION_SECRET` | Sim | Chave secreta longa (min 32 caracteres) para sessão JWT. |
| `ASAAS_API_KEY` | Não | Chave da API Asaas para geração de boleto. Sem isso, boleto fica desabilitado. |
| `ASAAS_ENV` | Não | `production` ou `sandbox` (default: sandbox). |
| `CRON_SECRET` | Não | Secret para o Cron de limpeza de uploads. Defina para o Cron da Vercel autorizar chamadas. |
| `NEXT_PUBLIC_APP_URL` | Não (recomendado) | URL pública do app (ex.: `https://sitema-bfx.vercel.app`). |

### 3. Banco e migrações

- Use um Postgres acessível pela internet (ex.: [Vercel Postgres](https://vercel.com/storage/postgres), [Neon](https://neon.tech), [Supabase](https://supabase.com)).

#### Atualizar o banco da Vercel (rodar migrações)

Sempre que houver novas migrações em `prisma/migrations`, rode **uma vez** no seu ambiente apontando para o banco de produção:

1. **Pegue a connection string do banco de produção**
   - Vercel: **Project** → **Settings** → **Environment Variables** → copie o valor de `DATABASE_URL` (Production).
   - Ou use a URL do painel do seu provedor (Neon, Supabase, Vercel Postgres, etc.).

2. **Na pasta do projeto**, rode as migrações com essa URL:

   **PowerShell (Windows):**
   ```powershell
   $env:DATABASE_URL = "postgresql://usuario:senha@host:5432/bfx?schema=public"
   npx prisma migrate deploy
   ```

   **Cmd (Windows):**
   ```cmd
   set DATABASE_URL=postgresql://usuario:senha@host:5432/bfx?schema=public
   npx prisma migrate deploy
   ```

   **Linux/macOS:**
   ```bash
   DATABASE_URL="postgresql://usuario:senha@host:5432/bfx?schema=public" npx prisma migrate deploy
   ```

   Substitua `postgresql://usuario:senha@host:5432/bfx?schema=public` pela sua `DATABASE_URL` real (a mesma que está na Vercel).

3. **Ou use o script** (com `DATABASE_URL` já definida no ambiente):
   ```bash
   npm run db:migrate
   ```

   Se der erro *"Could not find Prisma Schema"*, rode a partir da pasta do projeto (onde existe `prisma/schema.prisma`) ou use: `cd .next\standalone` e depois `npx prisma migrate deploy --schema prisma/schema.prisma` com a mesma `DATABASE_URL`.

### 4. Deploy

- Após o push no branch de produção, a Vercel faz o build (`npm run build`, que já roda `prisma generate`).
- O app fica em `https://seu-projeto.vercel.app`.

### Cron (limpeza de uploads)

O `vercel.json` define um Cron que chama `/api/cron/cleanup-uploads` todo domingo às 03:00 (UTC). Para a rota aceitar a chamada da Vercel, defina `CRON_SECRET` nas variáveis de ambiente do projeto.

**Nota:** O `output: "standalone"` do Next.js é ignorado na Vercel; o deploy usa o modo padrão da plataforma.

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
