# External Integrations

**Analysis Date:** 2026-03-30

## APIs & External Services

**AI/LLM Providers:**
- Google Generative AI (Gemini) - Primary AI provider for sales intelligence
  - SDK/Client: `@ai-sdk/google` 3.0.20 + `@google/generative-ai` 0.21.0
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` (env var)
  - Model: `gemini-2.5-flash` (via `ai` SDK)
  - Fallback: OpenAI if Gemini rate limit reached

- OpenAI (GPT-4o-mini) - Secondary AI provider
  - SDK/Client: `@ai-sdk/openai` 3.0.25 + `openai` 6.22.0
  - Auth: `OPENAI_API_KEY` (env var, `sk-...` format)
  - Model: `gpt-4o-mini` (default), supports custom models via config

- LiteLLM - Proxy/gateway for local or third-party LLM models
  - SDK/Client: `@ai-sdk/openai` with custom `baseURL`
  - Auth: `LITELLM_URL`, `LITELLM_KEY` (env vars or DB config)
  - Model: `LITELLM_MODEL` (env var, default: `gpt-4o`)
  - Features: Extended thinking support via `LITELLM_ENABLE_THINKING`
  - Implementation: `src/lib/ai.ts` → `runAiWithActions()`

**Payment Gateway (Boleto):**
- Asaas - Billing and boleto generation
  - SDK/Client: Custom wrapper in `src/lib/asaas.ts` (fetch-based)
  - Auth: `ASAAS_API_KEY` (env var)
  - Endpoints: `/v3/customers`, `/v3/payments`, `/v3/payments?billingType=BOLETO`
  - Environment: `ASAAS_ENV` (sandbox or production, default: sandbox)
  - Base URLs:
    - Sandbox: `https://api-sandbox.asaas.com`
    - Production: `https://api.asaas.com`
  - Features: Customer creation, boleto creation, payment listing
  - DB Storage: `asaasCustomerId` stored on `Cliente` model

**WhatsApp Integration:**
- Evolution API - WhatsApp message delivery
  - SDK/Client: Custom wrapper in `src/lib/whatsapp.ts` (fetch-based)
  - Auth: `EVOLUTION_API_KEY` (env var or DB config)
  - Endpoints: `/message/sendText/{instance}`, `/message/sendMedia/{instance}`
  - Base URL: `EVOLUTION_API_URL` (env var or DB config, default instance: `bfx`)
  - Features:
    - Text message delivery: `enviarWhatsAppTexto()`
    - File/media delivery: `enviarWhatsAppArquivo()` (documents, PDFs)
    - Automatic message triggers:
      - `whatsappAutoRecibo` - Send receipt after sale
      - `whatsappAutoBoleto` - Send boleto link
      - `whatsappAutoLembrete` - Send payment reminder
      - `whatsappAutoReativacao` - Send reactivation message
      - `whatsappAutoAniversario` - Birthday greetings
      - `whatsappAutoInadimplencia` - Overdue payment notices
      - `whatsappAutoNPS` - NPS surveys
      - `whatsappAutoBoasVindas` - Welcome messages
      - `whatsappAutoAgradecimento` - Thank you messages
      - `whatsappDiasInativo` - Days threshold for reactivation (default: 60)
  - Docker Support: `docker-compose.evolution.yml` for local Evolution API server

**Delivery Quotes:**
- Uber Direct API - Freight quote calculation
  - SDK/Client: Custom wrapper in `src/lib/uber.ts` (fetch-based)
  - Auth: Bearer token via `UBER_DIRECT_TOKEN` (env var)
  - Endpoint: `https://api.uber.com/v1/customers/{customerId}/delivery_quotes`
  - Required Env Vars:
    - `UBER_DIRECT_CUSTOMER_ID` - Uber customer account ID
    - `UBER_DIRECT_TOKEN` - API authorization token
    - `UBER_PICKUP_ADDRESS_JSON` - Pickup location (JSON: street_address, city, state, zip_code, country)
  - Features: Delivery quote with fee (centavos), ETA (minutes), dropoff time

## Data Storage

**Databases:**
- PostgreSQL 16 (Alpine)
  - Provider: `postgresql` in Prisma datasource
  - Connection: `DATABASE_URL` env var (format: `postgresql://user:pass@host:5432/db?schema=public`)
  - Client: `@prisma/client` 6.5.0
  - ORM: Prisma 6.5.0
  - Location: Docker service `db` or Kubernetes StatefulSet `bfx-db`
  - Storage: PVC `bfx-db` (10Gi, `microk8s-hostpath`)
  - Persistence: Protected against ArgoCD deletion via `argocd.argoproj.io/sync-options: Delete=false`

**File Storage:**
- MinIO (S3-compatible)
  - Purpose: Product images and uploads
  - Connection: Configured via `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
  - Bucket: `MINIO_BUCKET` (default: `produtos`)
  - Public URL: `MINIO_PUBLIC_URL` (e.g., `http://localhost:9000`)
  - Client: `@aws-sdk/client-s3` 3.998.0 (AWS SDK used for S3-compatible APIs)
  - Implementation: `src/lib/minio.ts`
  - Features:
    - Auto-creates bucket if missing
    - Public read policy applied to bucket
    - Returns public URL: `{MINIO_PUBLIC_URL}/bucket/filename`
  - Docker: Service `minio` (image: `minio/minio:latest`)
  - Fallback: If MinIO not configured, uploads saved to `public/uploads/produtos`

**Caching:**
- Not detected

## Authentication & Identity

**Session Management:**
- JWT-based sessions
  - Secret: `SESSION_SECRET` env var (minimum 32 characters, required in production)
  - Implementation: `jose` 6.1.3 (JWT encoding/decoding)
  - Use case: User authentication and session persistence

**Auth Provider:**
- Custom/Built-in (no external OAuth provider detected)

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Console logging via `console.error()` and `console.log()`
- Evolution API errors logged in `src/lib/whatsapp.ts`
- Asaas API errors logged in `src/lib/asaas.ts`
- Uber Direct API errors logged in `src/lib/uber.ts`

**Telemetry:**
- Next.js telemetry disabled: `NEXT_TELEMETRY_DISABLED=1` in all deployment configurations

## CI/CD & Deployment

**Hosting:**
- Kubernetes clusters (on-premise: microk8s or similar)
- Container images: Docker (built and pushed to ECR)
- GitOps: ArgoCD for continuous deployment

**CI Pipeline:**
- GitHub Actions (implied by branch structure and automated commits)
- Pre-commit hooks: Security checks (blocks `RegExp exec` patterns)
- Automatic deployment to ECR on commit

**Deployment Configuration:**
- Dockerfile (multi-stage: deps → builder → runner)
- Dockerfile.dev (development with hot-reload)
- Kubernetes manifests: `deploy/bfx/`
  - `kustomization.yaml` - Kustomize configuration
  - `namespace.yaml` - Namespace isolation
  - `app.yaml` - Main application Deployment
  - `postgres.yaml` - PostgreSQL StatefulSet with PVC
  - `evolution-api.yaml` - Evolution API Deployment
  - `secrets.yaml` - Encrypted secrets (Sealed Secrets or ArgoCD format)
  - `ingress.yaml` - HTTP/HTTPS routing
  - `serviceaccount.yaml` - RBAC configuration

**Recommended Deployment:**
- Docker build: `yarn build` (outputs standalone Next.js app)
- Container push to ECR: `{account}.dkr.ecr.{region}.amazonaws.com/sistema-bfx:{hash}`
- ArgoCD Application: Syncs Kubernetes manifests from git repo

## Environment Configuration

**Required env vars (for basic operation):**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT session key (min. 32 chars)

**Recommended env vars (for production):**
- `NEXT_PUBLIC_APP_URL` - Public application URL (used in links, redirects)
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL` - MinIO configuration
- `ASAAS_API_KEY`, `ASAAS_ENV` - Asaas payment gateway
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` - WhatsApp (Evolution API)
- `GOOGLE_GENERATIVE_AI_API_KEY` or `OPENAI_API_KEY` - AI provider
- `LITELLM_URL`, `LITELLM_KEY`, `LITELLM_MODEL` - LiteLLM proxy
- `CRON_SECRET` - Authorizes `/api/cron/cleanup-uploads` (Vercel Cron)
- `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN`, `UBER_PICKUP_ADDRESS_JSON` - Uber Direct

**Secrets location:**
- Local development: `.env` or `.env.local` (git-ignored)
- CI/CD: GitHub Actions secrets
- Kubernetes: `deploy/bfx/secrets.yaml` (encrypted)
- Database config: `Config` table in PostgreSQL (for runtime overrides)

## Webhooks & Callbacks

**Incoming:**
- Cron endpoint: `GET /api/cron/cleanup-uploads` (Vercel Cron, or manual trigger)
  - Authorization: `CRON_SECRET` header
  - Purpose: Periodic cleanup of orphaned uploaded files

**Outgoing:**
- Asaas webhooks: Not configured (would require additional setup)
- Evolution API webhooks: Not detected in current implementation
- WhatsApp incoming messages: Not implemented (send-only model)

## Optional Features (Not Currently Detected)

**Features that could be integrated:**
- Database backups (no automated backup system detected)
- Error tracking (Sentry, DataDog, etc.)
- APM (Application Performance Monitoring)
- Redis caching layer
- Rate limiting/DDoS protection
- Analytics (Mixpanel, Amplitude, etc.)
- Email provider (SendGrid, Resend, etc.)
- SMS provider (Twilio, etc.)
- Document storage (AWS S3 only via MinIO)

---

*Integration audit: 2026-03-30*
