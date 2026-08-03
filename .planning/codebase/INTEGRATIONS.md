# External Integrations

**Analysis Date:** 2026-08-03

## APIs & External Services

**Delivery/Logistics:**
- Uber Direct - Shipping quote API
  - SDK/Client: Direct fetch (no SDK)
  - Configuration: `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN`, `UBER_PICKUP_ADDRESS_JSON`
  - Implementation: `src/lib/uber.ts` with type-safe request/response
  - Endpoints: `src/app/api/frete/uber/*` (quote and status)

**Payment Processing:**
- Asaas - Invoice/boleto generation and payment tracking
  - SDK/Client: Direct fetch (no SDK)
  - Configuration: `ASAAS_API_KEY`, `ASAAS_ENV` (sandbox/production)
  - Implementation: `src/lib/asaas.ts` with customer and payment types
  - UI: `src/app/(app)/boletos/page.tsx` for boleto management

**WhatsApp/Messaging:**
- Evolution API - WhatsApp integration
  - Image/SDK: `atendai/evolution-api:latest` (Docker image)
  - Configuration: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
  - Implementation: `src/lib/evolution.ts`, `src/lib/whatsapp.ts`
  - Deployment: Kubernetes deployment + service + persistent volume in `deploy/bfx/evolution-api.yaml`
  - Database: Separate PostgreSQL schema (evolution) via `DATABASE_CONNECTION_URI`
  - Webhooks: `src/app/api/webhooks/evolution/route.ts` for incoming WhatsApp messages
  - Endpoints: `src/app/api/whatsapp/*` for instance management and diagnostics

**AI/Language Models:**
- Google Generative AI (Gemini) - Default AI provider
  - SDK/Client: `@ai-sdk/google`, `@google/generative-ai`, `@google/genai`
  - Configuration: `GOOGLE_GENERATIVE_AI_API_KEY`
  - Implementation: `src/lib/ai.ts` with model selection (gemini-2.5-flash)

- OpenAI (GPT) - Alternative AI provider
  - SDK/Client: `@ai-sdk/openai`, `openai`
  - Configuration: `OPENAI_API_KEY`
  - Implementation: `src/lib/ai.ts` (model: gpt-4o-mini)

- LiteLLM - Multi-provider AI proxy
  - SDK/Client: Custom HTTP client (CreateOpenAI with custom baseURL)
  - Configuration: `LITELLM_URL`, `LITELLM_KEY`, `LITELLM_MODEL`, `LITELLM_ENABLE_THINKING`
  - Implementation: `src/lib/ai.ts` with provider options for extended thinking
  - Used by: BFX Intelligence chat component (`src/components/intelligence-chat-client.tsx`)

**Email/SMTP:**
- Custom SMTP Client (no external mail service)
  - Implementation: `src/lib/email.ts` with native Node.js net/tls modules
  - Configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - Supports: STARTTLS (port 587) and TLS (port 465)
  - Auth: PLAIN or LOGIN mechanism with base64 encoding
  - No nodemailer dependency (custom implementation)

## Data Storage

**Databases:**
- PostgreSQL 16 (primary application database)
  - Deployment: Kubernetes StatefulSet `bfx-db` in `deploy/bfx/postgres.yaml`
  - Connection: `DATABASE_URL` (postgresql://postgres:postgres@bfx-db:5432/bfx)
  - ORM: Prisma 6.5.0 (`prisma/schema.prisma`)
  - Storage: 10Gi persistent volume via microk8s-hostpath storageClass

- PostgreSQL (Evolution API schema)
  - Schema: Separate `evolution` database on same PostgreSQL instance
  - Connection: `DATABASE_CONNECTION_URI` in evolution-api ConfigMap
  - Storage: Part of same 10Gi persistent volume

**File Storage:**
- MinIO/S3 (object storage for product images)
  - SDK/Client: `@aws-sdk/client-s3`
  - Configuration: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL`
  - Implementation: `src/lib/minio.ts` with bucket creation and public policy
  - Usage: `src/app/api/produtos/upload/route.ts` (preferred) with local filesystem fallback
  - **Gap Alert:** No MinIO/S3 manifest in `deploy/bfx/kustomization.yaml` and no MINIO_* env vars in K8s secrets — MinIO not currently deployed in production Kubernetes

- Local filesystem (fallback for object storage + logo uploads)
  - Location: `public/uploads/` and `public/uploads/produtos/`
  - Usage: Product images fallback in `src/app/api/produtos/upload/route.ts`; logo uploads in `src/app/api/upload-logo/route.ts`
  - **Gap Alert:** Logo upload has no S3 fallback, always writes to pod filesystem — data loss on pod restart

**Caching:**
- None detected (no Redis or memcached)

## Authentication & Identity

**Auth Provider:**
- Custom session-based authentication
  - Secret: `SESSION_SECRET` (used by Next.js)
  - Implementation: Next.js built-in authentication via middleware and route handlers

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- Console logging (`console.error`, `console.log`)
- No centralized logging service configured

## CI/CD & Deployment

**Hosting:**
- Kubernetes cluster (AWS EKS implied)
- Namespace: `bfx` (created by `deploy/bfx/namespace.yaml`)
- Replicas: 1 (single instance in `deploy/bfx/app.yaml`)
- Image repository: ECR sa-east-1 (`730335375436.dkr.ecr.sa-east-1.amazonaws.com/bfx/bfx-shop`)

**Orchestration:**
- ArgoCD (managed via `.argocd-source-sistema-bfx.yaml`)
- Kustomize (manifests in `deploy/bfx/kustomization.yaml`)
- Resources: 1 Deployment, 1 Service, 1 StatefulSet (postgres), 1 ConfigMap (evolution), 1 PersistentVolumeClaim (evolution)

**CI Pipeline:**
- Not detected in codebase (build/push likely external via CI/CD platform)
- ECR credentials renewal: CronJob `ecr-creds-renew` in `deploy/bfx/ecr-creds-renew.yaml`

**Deployment Strategy:**
- Rolling update (maxSurplus: 1, maxUnavailable: 0)
- Init containers: Wait for PostgreSQL readiness
- Health checks: readinessProbe (httpGet /, 5s period) and livenessProbe (httpGet /, 10s period)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key (min 32 chars in production)

**Critical optional vars:**
- `NEXT_PUBLIC_APP_URL` / `APP_URL` / `BASE_URL` - Application URL for redirects
- `CRON_SECRET` - Bearer token for scheduled tasks (`/api/cron/*` endpoints)

**Integration env vars:**
- MinIO: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL`
- Asaas: `ASAAS_API_KEY`, `ASAAS_ENV`
- Evolution: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
- Uber: `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN`, `UBER_PICKUP_ADDRESS_JSON`
- AI: `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `LITELLM_URL`, `LITELLM_KEY`, `LITELLM_MODEL`, `LITELLM_ENABLE_THINKING`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Secrets location:**
- Kubernetes: `bfx-app-secrets` and `bfx-db-secrets` in `deploy/bfx/secrets.yaml` (plaintext YAML — requires encryption at rest in production)
- Local dev: `.env` file (not committed)

## Webhooks & Callbacks

**Incoming:**
- Evolution API webhooks: `src/app/api/webhooks/evolution/route.ts`
  - Receives incoming WhatsApp messages and delivery status updates
  - Requires `EVOLUTION_API_KEY` authentication header
  - Stores events in Evolution API's PostgreSQL schema

- Scheduled cleanup job: `src/app/api/cron/cleanup-uploads/route.ts`
  - Invoked by Kubernetes CronJob `bfx-cleanup-uploads` (Sundays 03:00 UTC)
  - Runs `curl` with `CRON_SECRET` Bearer token authentication
  - Deletes old files from `public/uploads/` filesystem

**Outgoing:**
- SMTP email via `src/lib/email.ts` (custom SMTP client, no external mail service)
- Asaas API calls for boleto generation
- Uber Direct API calls for delivery quotes
- Evolution API calls for WhatsApp message sending
- Google/OpenAI/LiteLLM API calls for AI operations

## Storage & Persistence

**Volumes:**
- PostgreSQL data: 10Gi persistent volume (microk8s-hostpath)
- Evolution API data: 2Gi persistent volume (microk8s-hostpath) in `deploy/bfx/evolution-api.yaml`
- Pod filesystem uploads: Ephemeral (lost on pod restart) in `public/uploads/` and `public/uploads/produtos/`

## Known Configuration Gaps

1. **MinIO/S3 Production Gap:**
   - No MinIO service deployed in `deploy/bfx/kustomization.yaml`
   - No MINIO_* env vars in `deploy/bfx/secrets.yaml`
   - Product uploads fallback to pod filesystem (addressed in code)
   - Logo uploads have no S3 fallback — writes only to pod filesystem
   - Recommendation: Add MinIO deployment or use AWS S3; implement S3 fallback for logo endpoint

2. **File Cleanup Approach:**
   - CronJob calls HTTP endpoint instead of kubectl commands
   - Endpoint authentication via bearer token in env var (adequate but less secure than RBAC)

3. **Email Infrastructure:**
   - Custom SMTP client with native Node.js modules
   - No templating library (Handlebars, EJS, etc.) detected
   - Credentials stored in plaintext in secrets.yaml

4. **Legacy k8s/ Directory:**
   - `k8s/` directory contains legacy manifests and examples (deployment.yaml, secret.yaml.example, etc.)
   - Production uses `deploy/bfx/` with ArgoCD and Kustomize
   - `k8s/README.md` references manual kubectl workflow (superseded by ArgoCD)

---

*Integration audit: 2026-08-03*
