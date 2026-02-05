# External Integrations

**Analysis Date:** 2026-02-05

## APIs & External Services

**AI/LLM Models:**
- **OpenAI** - GPT-4o-mini model for text generation and tool calling
  - SDK/Client: `@ai-sdk/openai` 3.0.25 (via Vercel AI SDK)
  - Legacy: `openai` 4.91.0 (fallback for backwards compatibility)
  - Configuration: API key stored in database `Config.openaiKey` field
  - Used in: `src/lib/ai.ts`, `src/lib/ai-actions.ts`
  - Purpose: Generate sales suggestions, process AI chat requests with tool execution

- **Google Generative AI** - Gemini 2.5 Flash model for text generation and tool calling
  - SDK/Client: `@ai-sdk/google` 3.0.20 (via Vercel AI SDK)
  - Legacy: `@google/generative-ai` 0.21.0, `@google/genai` 0.7.0 (fallback support)
  - Configuration: API key stored in database `Config.geminiKey` field
  - Used in: `src/lib/ai.ts`, `src/lib/ai-actions.ts`
  - Purpose: Generate sales suggestions, process AI chat requests with tool execution
  - Fallback: If Gemini fails or rate-limited, automatically falls back to OpenAI if configured

## Data Storage

**Databases:**
- **PostgreSQL**
  - Connection: `DATABASE_URL` environment variable (format: `postgresql://user:pass@host:port/database?schema=public`)
  - Client: `@prisma/client` 6.5.0
  - ORM: Prisma
  - Schema: `prisma/schema.prisma` defines 12 models:
    - `Cliente` - Customer/client information (CPF, CNPJ, contact, company affiliation)
    - `Produto` - Product catalog (cost, price, inventory, supplier)
    - `Venda` - Sales transactions (customer, product, pricing, financing, invoice status)
    - `Usuario` - User accounts (username, password, roles: admin/vendedor, commission config)
    - `Fornecedor` - Supplier/vendor information
    - `EmpresaParceira` - Partner company HR contacts
    - `Pagamento` - Commission/payment records
    - `Despesa` - Expense tracking (category, amount, date)
    - `Config` - Global configuration (API keys for OpenAI/Gemini, contract template, logo path)
    - `AuditLog` - System audit trail (action, user, timestamp, details)
    - `Aviso` - System announcements/notices
  - Migrations: `db:migrate` command runs pending Prisma migrations
  - Seeding: `db:seed` command runs `prisma/seed.js` for initial data population

**File Storage:**
- **Local Filesystem Only**
  - Product images: `public/uploads/produtos/` directory
  - Logo uploads: Stored in `public/` directory (path referenced in `Config.logoPath`)
  - Upload endpoint: `src/app/api/produtos/upload/route.ts` handles file writes
  - PDF generation: Temporary in-memory generation, streamed to client (no persistence by default)

**Caching:**
- None detected - Direct database queries on each request

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no OAuth/third-party auth)
- Implementation approach:
  - Password stored in `Usuario` table (plaintext - security concern, see CONCERNS.md)
  - Session tokens created with `jose` 6.1.3 using HMAC-HS256
  - Token format: JWT with payload containing user id, username, role, displayName
  - Token lifetime: 7 days
  - Storage: HTTP-only cookies with SameSite=Lax
  - Login endpoint: `POST /api/auth/login` - `src/app/api/auth/login/route.ts`
  - Logout endpoint: `POST /api/auth/logout` - `src/app/api/auth/logout/route.ts`
  - Session verification: `src/lib/session.ts` - `getSession()` function validates JWT from cookies
  - Key file: `src/lib/session.ts`

**Authorization:**
- Role-based access control (RBAC) with two roles: `admin`, `vendedor` (seller)
- Role enforcement in AI actions: `src/lib/ai-actions.ts` defines per-action role restrictions
- Admin-only actions: create/update users, create/update products, manage expenses, manage partners, SQL queries
- Vendor actions: limited to personal sales listing, creating sales/clients, viewing products/clients

## Monitoring & Observability

**Error Tracking:**
- None detected - No external error tracking service configured
- Basic error logging: Console error statements in API routes

**Logs:**
- Prisma logging: Configured to log only errors (`log: ["error"]` in `src/lib/db.ts`)
- Audit logging: Custom `AuditLog` table tracks all AI actions with status, user, timestamp, and details
- Format: JSON serialized action params and results in `detalhes` field
- Recorded in: `src/lib/ai-actions.ts` - `executeAiAction()` function logs all action executions

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured - Application structure supports Docker/Kubernetes
- Standalone mode enabled in Next.js config for containerized deployment
- Build: `NODE_ENV=production NEXT_DISABLE_TURBOPACK=1 next build`
- Start: `next start` (production mode)
- Dev: `next dev -H 0.0.0.0 -p 3000` (listens on all interfaces)

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI/CD configuration found

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (mandatory)
- `SESSION_SECRET` - JWT signing key (mandatory, must be changed from default)
- `NEXT_PUBLIC_APP_URL` - Public application URL (e.g., https://seu-dominio.com) for PDF links

**Optional env vars:**
- `NODE_ENV` - Set to "production" for builds (default: development)
- `NEXT_DISABLE_TURBOPACK` - Set to 1 in production builds (used in build script)

**Secrets location:**
- `.env` file (git-ignored, not committed)
- `.env.example` provides template
- API keys (OpenAI, Gemini) stored in database `Config` table rather than environment variables

## Webhooks & Callbacks

**Incoming:**
- Not configured - No external webhook receivers

**Outgoing:**
- Not configured - No external webhook notifications

## API Endpoints

**Internal API Routes:**

**Authentication:**
- `POST /api/auth/login` - User login with username/password credentials
- `POST /api/auth/logout` - Session termination

**AI/Chat:**
- `POST /api/mcp/route.ts` - Model Context Protocol (MCP) tool execution endpoint

**Sales & Data:**
- `GET /api/vendas/sugestoes` - AI-generated sales suggestions
- `POST /api/vendas/autocomplete/clientes` - Client autocomplete for sales form
- `POST /api/vendas/autocomplete/produtos` - Product autocomplete for sales form
- `GET /api/catalogo` - Generate product catalog PDF

**Search & Lookup:**
- `POST /api/search` - Global search endpoint
- `GET /api/produtos/autocomplete` - Product search with autocomplete
- `POST /api/ncm/search` - NCM code lookup (Brazilian product classification)

**Reporting:**
- `GET /api/relatorios/vendas` - Sales report data endpoint (filterable by date/company)
- `GET /api/relatorios/vendas/pdf` - Sales report PDF download
- `GET /api/relatorios/catalogo` - Catalog report PDF
- `GET /api/relatorios/antecipacao` - Advance/anticipation report
- `GET /api/recibo` - Individual sales receipt/invoice PDF generation (lookup by id or uuid)

**Commission/Financial:**
- `GET /api/comissoes` - Commission calculations and listing
- `GET /api/comissoes/detalhe` - Commission detail report
- `GET /api/comissoes/relatorio` - Commission reporting

**Client Management:**
- `GET /api/clientes/[id]/limite` - Client credit limit information

**Product Management:**
- `POST /api/produtos/upload` - Image file upload for products

**Other:**
- `POST /api/importacao/batch` - Batch data import (CSV/bulk operations)

---

*Integration audit: 2026-02-05*
