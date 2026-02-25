# Todas as chaves na Vercel – lista completa

Configure em **Vercel → sitema-bfx → Settings → Environment Variables**.  
Marque cada linha após preencher. Use **Production** (e **Preview** se quiser os mesmos valores em deploys de branch).

---

## Lista para preencher (copie e use como checklist)

| # | Nome da variável | Obrigatório | O que colocar | Status |
|---|------------------|-------------|----------------|--------|
| 1 | `DATABASE_URL` | **Sim** | Connection string Postgres (com pooler). Ex.: Vercel Postgres → `POSTGRES_URL`, ou Neon/Supabase → URL pooled. | ☐ |
| 2 | `SESSION_SECRET` | **Sim** | String aleatória longa (mín. 32 caracteres). Ex.: `openssl rand -base64 32` | ☐ |
| 3 | `NEXT_PUBLIC_APP_URL` | Recomendado | URL do app. Ex.: `https://sitema-bfx.vercel.app` (a que aparece em **Visit** no deploy) | ☐ |
| 4 | `CRON_SECRET` | Não* | String aleatória (para o Cron domingo 03:00 UTC chamar `/api/cron/cleanup-uploads`) | ☐ |
| 5 | `ASAAS_API_KEY` | Não | Chave da API Asaas (painel Asaas → Integrações → API) | ☐ |
| 6 | `ASAAS_ENV` | Não | `sandbox` ou `production` | ☐ |
| 7 | `OPENAI_API_KEY` | Não | Chave OpenAI (ou Groq/compatível) se usar rotas de AI/chat | ☐ |
| 8 | `GOOGLE_GENERATIVE_AI_API_KEY` | Não | Chave Google AI Studio (Gemini) se usar rotas de AI | ☐ |

\* Necessário só se quiser que o Cron da Vercel execute a limpeza de uploads com sucesso.

---

## Valores sugeridos (onde obter)

| Variável | Onde obter / valor sugerido |
|----------|-----------------------------|
| **DATABASE_URL** | Vercel: **Storage** → Create Postgres → usar `POSTGRES_URL`. Ou Neon/Supabase → connection string **com pooler**. |
| **SESSION_SECRET** | Terminal: `openssl rand -base64 32` (ou gerador de senha com 32+ caracteres). |
| **NEXT_PUBLIC_APP_URL** | URL do deploy (ex.: `https://sitema-bfx.vercel.app`). |
| **CRON_SECRET** | Mesmo tipo que SESSION_SECRET; pode ser outra string aleatória. |
| **ASAAS_API_KEY** | [Asaas](https://www.asaas.com) → Conta → Integrações → API. |
| **ASAAS_ENV** | `sandbox` para testes; `production` para produção. |
| **OPENAI_API_KEY** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) ou provedor compatível. |
| **GOOGLE_GENERATIVE_AI_API_KEY** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). |

---

## Ordem recomendada ao cadastrar

1. **DATABASE_URL** e **SESSION_SECRET** (obrigatórias para o app subir).
2. **NEXT_PUBLIC_APP_URL** (recomendado para links e redirects).
3. **CRON_SECRET** (se for usar o Cron de limpeza).
4. **ASAAS_API_KEY** e **ASAAS_ENV** (se for usar boleto).
5. **OPENAI_API_KEY** e **GOOGLE_GENERATIVE_AI_API_KEY** (se for usar rotas de AI).

---

## Referência

- **docs/VERCEL-ENV.md** — descrição detalhada de cada variável.
- **.env.example** — modelo para desenvolvimento local.
- **docs/ONDE-ESTA-DATABASE-URL.md** — banco e migrações.
