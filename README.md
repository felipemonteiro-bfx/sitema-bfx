# BFX Manager (Next.js + Postgres)

## Desenvolvimento local

1. Copie o `.env.example` para `.env.local` e ajuste se necessário.
2. Suba MinIO (imagens) e Postgres:

```bash
yarn db:minio    # MinIO em localhost:9000 (console: 9001)
yarn db:start    # Postgres
```

3. Execute as migrações e suba a app:

```bash
yarn db:migrate
yarn dev
```

**Ou via Docker (stack completo):**

```bash
yarn docker:up
```

Aplicação: `http://localhost:3008`  
MinIO Console: `http://localhost:9001` (minioadmin/minioadmin)
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
| 1 | Completar **todas as chaves** de ambiente | **docs/VERCEL-TODAS-AS-CHAVES.md** (checklist) → Vercel → **sitema-bfx** → **Settings** → **Environment Variables** |
| 2 | Garantir `DATABASE_URL` e `SESSION_SECRET` (obrigatórias); opcional: `NEXT_PUBLIC_APP_URL`, Cron, Asaas, AI | Mesmo lugar |
| 3 | Rodar migrações **uma vez** no banco de produção | No seu PC: copiar `DATABASE_URL` da Vercel e rodar `npx prisma migrate deploy` (ver **docs/ONDE-ESTA-DATABASE-URL.md** e seção 3 abaixo) |
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
| `DATABASE_URL` | Sim | Connection string Postgres (Vercel Postgres, Neon, Supabase). Use pooler em produção se disponível. |
| `SESSION_SECRET` | Sim | Chave secreta para sessão JWT (mín. 32 caracteres). |
| `NEXT_PUBLIC_APP_URL` | Não (recomendado) | URL pública do app (ex.: `https://sitema-bfx.vercel.app`). |
| `CRON_SECRET` | Não | Secret para o Cron de limpeza de uploads (domingo 03:00 UTC). Defina para o Cron da Vercel autorizar. |
| `MINIO_ENDPOINT` | Não* | URL do MinIO (ex.: `http://localhost:9000`). Sem isso, imagens vão para `public/uploads/produtos`. |
| `MINIO_ACCESS_KEY` | Não* | Chave de acesso MinIO. |
| `MINIO_SECRET_KEY` | Não* | Chave secreta MinIO. |
| `MINIO_BUCKET` | Não | Bucket (default: `produtos`). |
| `MINIO_PUBLIC_URL` | Não | URL pública para acessar imagens (ex.: `http://localhost:9000`). |
| `ASAAS_API_KEY` | Não | Chave da API Asaas para geração de boleto. Sem isso, boleto fica desabilitado. |
| `ASAAS_ENV` | Não | `sandbox` ou `production` (default: sandbox). |
| `OPENAI_API_KEY` | Não | Chave OpenAI (ou compatível) para rotas de AI/chat, se usadas. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Não | Chave Google Generative AI / Gemini para rotas de AI, se usadas. |

Lista completa e detalhes: **docs/VERCEL-ENV.md** e **.env.example**.  
**Checklist para completar todas as chaves na Vercel:** **docs/VERCEL-TODAS-AS-CHAVES.md**.

### 3. Banco e migrações

- Use um Postgres acessível pela internet (ex.: [Vercel Postgres](https://vercel.com/storage/postgres), [Neon](https://neon.tech), [Supabase](https://supabase.com)).
- **Onde está a DATABASE_URL e como rodar migrações:** **docs/ONDE-ESTA-DATABASE-URL.md**.

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

### Kubernetes (k8s)

Manifests em **`k8s/`**: Namespace, Deployment, Service, Secret/ConfigMap (exemplo) e Ingress (exemplo). Ver **k8s/README.md** para aplicar no cluster e usar as mesmas variáveis de ambiente da Vercel (docs/VERCEL-TODAS-AS-CHAVES.md).

### Automação (CI e dependências)

- **GitHub Actions:** em todo push/PR roda lint e build (`.github/workflows/ci.yml`). O deploy em produção é feito pela integração Git da Vercel no push para o branch configurado.
- **Variáveis Vercel:** checklist em **docs/VERCEL-ENV.md** (obrigatórias: `DATABASE_URL`, `SESSION_SECRET`).
- **Dependabot:** abre PRs semanais (segunda-feira) para atualizar dependências npm e GitHub Actions (`.github/dependabot.yml`). Revise e faça merge quando quiser.

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
