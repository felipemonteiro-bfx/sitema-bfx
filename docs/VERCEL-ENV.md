# Variáveis de ambiente

**Lista completa para preencher na Vercel (checklist):** **[docs/VERCEL-TODAS-AS-CHAVES.md](VERCEL-TODAS-AS-CHAVES.md)**.

---

## Local (desenvolvimento)

Arquivo **`.env`** ou **`.env.local`** na raiz do projeto. Copie de `.env.example`.  
**Não commitar** `.env` nem `.env.local` (já estão no `.gitignore`).

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string Postgres (ex.: Docker: `postgresql://postgres:postgres@localhost:5432/bfx?schema=public`). |
| `SESSION_SECRET` | Sim | Chave secreta para sessão JWT (mín. 32 caracteres). |
| `NEXT_PUBLIC_APP_URL` | Não | URL pública do app (ex.: `http://localhost:3008` em dev). |
| `CRON_SECRET` | Não | Secret para o endpoint de Cron (limpeza de uploads). |
| `ASAAS_API_KEY` | Não | Chave API Asaas para geração de boleto. |
| `ASAAS_ENV` | Não | `sandbox` ou `production`. |
| `EVOLUTION_API_URL` | Não | URL da Evolution API (envio automático WhatsApp). Ex.: `http://localhost:8080` |
| `EVOLUTION_API_KEY` | Não | API Key da Evolution API (mesmo valor de AUTHENTICATION_API_KEY no container). |
| `EVOLUTION_INSTANCE` | Não | Nome da instância (default: `bfx`). |
| `OPENAI_API_KEY` | Não | Chave OpenAI (ou compatível) para rotas de AI/chat, se usadas. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Não | Chave Google Generative AI / Gemini para rotas de AI, se usadas. |

---

## Vercel (produção e preview)

Configure em **Vercel → sitema-bfx → Settings → Environment Variables**.

### Checklist

| # | Variável | Obrigatório | Descrição | Exemplo |
|---|----------|-------------|-----------|---------|
| 1 | `DATABASE_URL` | **Sim** | Connection string Postgres. Use pooler se disponível (Vercel Postgres, Neon, Supabase). | `postgresql://user:pass@host:5432/bfx?schema=public` ou `?pgbouncer=true` |
| 2 | `SESSION_SECRET` | **Sim** | Chave secreta para sessão JWT (mín. 32 caracteres). | String longa e aleatória |
| 3 | `NEXT_PUBLIC_APP_URL` | Recomendado | URL pública do app (links, e-mails, etc.). | `https://sitema-bfx.vercel.app` |
| 4 | `CRON_SECRET` | Não* | Secret para o Cron de limpeza de uploads (domingo 03:00 UTC). | String aleatória |
| 5 | `ASAAS_API_KEY` | Não | Chave API Asaas para geração de boleto. | Chave do painel Asaas |
| 6 | `ASAAS_ENV` | Não | Ambiente Asaas: `sandbox` ou `production`. | `sandbox` |
| 7 | `EVOLUTION_API_URL` | Não | URL da Evolution API (WhatsApp). | `http://seu-servidor:8080` |
| 8 | `EVOLUTION_API_KEY` | Não | API Key da Evolution API. | Mesmo do container Evolution |
| 9 | `EVOLUTION_INSTANCE` | Não | Nome da instância (ex.: `bfx`). | `bfx` |
| 10 | `OPENAI_API_KEY` | Não | Chave OpenAI (ou compatível) para rotas de AI/chat, se usadas. | `sk-...` |
| 11 | `GOOGLE_GENERATIVE_AI_API_KEY` | Não | Chave Google Generative AI / Gemini para rotas de AI, se usadas. | Do Google AI Studio |

\* Necessário para o Cron da Vercel chamar `/api/cron/cleanup-uploads` com sucesso.

### Conferir configuração

1. **Vercel** → projeto **sitema-bfx** → **Settings** → **Environment Variables**.
2. Para **Production** (e **Preview** se quiser): confira que existem **`DATABASE_URL`** e **`SESSION_SECRET`**.
3. Opcional: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `ASAAS_API_KEY`, `ASAAS_ENV`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.

### Onde obter valores

| Variável | Onde obter |
|----------|------------|
| `DATABASE_URL` | Vercel Postgres, Neon ou Supabase → connection string (com pooler para serverless). |
| `SESSION_SECRET` | Gere uma string aleatória (ex.: `openssl rand -base64 32`). |
| `NEXT_PUBLIC_APP_URL` | URL do deploy (ex.: **Visit** no último deploy na Vercel). |
| `CRON_SECRET` | Idem; use o mesmo valor se for chamar o Cron manualmente. |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) ou provedor compatível (ex.: Groq). |
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey). |

---

## CI (GitHub Actions)

O workflow `.github/workflows/ci.yml` usa apenas variáveis definidas no próprio workflow (não lê `.env`):

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Valor dummy para `prisma generate` e `next build`. |
| `SESSION_SECRET` | Valor dummy para o build não falhar por env ausente. |
| `SKIP_ENV_VALIDATION` | `1` para pular validação de env no build. |

Não é necessário configurar secrets no GitHub para o CI (lint + build); só para o app em produção (variáveis na Vercel).

---

## Referência

- **docs/VERCEL-TODAS-AS-CHAVES.md** — checklist com **todas as chaves** para completar na Vercel.
- **`.env.example`** — modelo com todas as variáveis e comentários.
- **README.md** — seção "Deploy na Vercel" e "Variáveis de ambiente".
- **docs/ONDE-ESTA-DATABASE-URL.md** — banco de dados, `DATABASE_URL` e migrações.

---

## Deploy

O deploy em produção é feito pela **integração Git da Vercel**: cada push no branch de produção (ex.: `main`) gera um novo deploy. O CI (`.github/workflows/ci.yml`) só roda lint e build para validar o código.
