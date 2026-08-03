<!-- refreshed: 2026-08-03 -->
# Architecture

**Analysis Date:** 2026-08-03

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      Next.js 15 App Router (Frontend)                    │
│                    Server Components + Client Components                  │
│  Layouts: (auth), (app)  │  Pages: venda-rapida, dashboard, etc          │
└──────────────────────────┬───────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Next.js Server Actions & API Routes                   │
│  criarVendaV2(), listar APIs  │  Upload: /api/produtos/upload            │
│  Auth: login/logout           │  Webhooks: Evolution, Asaas              │
│  Cron: cleanup-uploads, emails│  AI: /inteligencia (runAiWithActions)    │
└──────────────────────────────┬───────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Libraries & Business Logic Layer                       │
│  AI/MCP (ai.ts, mcp.ts, ai-actions.ts) → Tool system for chatbot        │
│  Validations (venda-item-validation.ts, credit.ts)                       │
│  Integrations: Asaas (boletos), Evolution (WhatsApp), MinIO (storage)   │
│  Session (JWT), Email, WhatsApp, Recibo generation                       │
└──────────────────────────────┬───────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  Prisma ORM + PostgreSQL (Data Layer)                    │
│  Models: Venda, Cliente, Produto, Usuario, Parcela, Config, etc.        │
│  Relationships: Venda→ItemVenda→Produto, Venda→ParcelaVencimento        │
└──────────────────────────────┬───────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Deployment Topology                        │
├──────────────────────┬─────────────────────┬──────────────────────────────┤
│   App Pod (1x)       │   PostgreSQL        │   Evolution API              │
│  Next.js Standalone  │   StatefulSet (1x)  │   (WhatsApp Gateway)         │
│  Port: 3000          │   Port: 5432        │   Port: 8080                 │
│  Image: ECR          │   PersistentVolume  │   Evolution DB (shared)      │
└──────────────────────┴─────────────────────┴──────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
  File uploads        Database schema         WhatsApp events
  public/uploads      Data persistence        Webhook callbacks
  (pod ephemeral)     (k8s persistent)        Message routing

┌──────────────────────────────────────────────────────────────────────────┐
│  Ingress (traefik) → bfx.softlive.dev → Service (bfx-app:80)           │
│  CronJob: cleanup-uploads (Sundays 03:00 UTC)                            │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Server Entry | Route handlers, page rendering | `src/app/(app)/venda-rapida/page.tsx` |
| Form Component | Client-side form state, input handling | `src/components/venda-rapida-form-v2.tsx` |
| Form Item | Individual product line editor | `src/components/produto-item-form.tsx` |
| Server Action | Form submission, DB writes | `src/app/(app)/venda-rapida/actions.ts` |
| Validation | Item-level venda integrity checks | `src/lib/venda-item-validation.ts` |
| Middleware | JWT auth for API routes | `src/middleware.ts` |
| AI Chat | Intelligence chat interface | `src/components/intelligence-chat-client.tsx` |
| AI Tools | Callable tools for agent | `src/lib/ai-actions.ts` |
| AI Engine | LLM orchestration + tool calling | `src/lib/ai.ts` |
| Database | Prisma client, schema definitions | `src/lib/db.ts`, `prisma/schema.prisma` |
| File Upload | Image/document storage routing | `src/app/api/produtos/upload/route.ts` |
| Cleanup | Cron job for orphaned files | `src/app/api/cron/cleanup-uploads/route.ts` |

## Pattern Overview

**Overall:** Next.js 15 with **output: "standalone"** → deployable Docker image; App Router with Server Components default, selective Client Components for interactivity.

**Key Characteristics:**
- **Server-first**: Pages render server-side; form data flows to Server Actions
- **Type-safe**: TypeScript, Zod validation at boundaries
- **State-on-URL**: nuqs for URL query state persistence (e.g., form data survives refresh)
- **JWT Sessions**: 7-day token in secure cookie, verified on API middleware
- **Tools-as-affordances**: AI has explicit tool definitions (listar_clientes, criar_venda, etc.) via MCP
- **Standalone deployment**: output: "standalone" in next.config.ts; Docker runs `next start`

## Layers

**UI Layer (Next.js Components):**
- Purpose: Render pages, forms, modal dialogs, data tables
- Location: `src/app/`, `src/components/`
- Contains: Server Components (default), Client Components ("use client"), shadcn/ui primitives, form components
- Depends on: Server Actions (form submission), API routes (searches), Session management
- Used by: Browser clients

**Server Actions & API Routes:**
- Purpose: Handle form submissions, list/search queries, file uploads, webhooks, cron triggers
- Location: `src/app/*/actions.ts`, `src/app/api/*/route.ts`
- Contains: "use server" functions, fetch handlers, request/response processing
- Depends on: Prisma (DB), Validations, Integrations (Asaas, Evolution)
- Used by: UI forms, client-side fetches, external webhooks/cron

**Business Logic & Integrations:**
- Purpose: Reusable domain logic, external service calls, computations
- Location: `src/lib/`
- Contains: `ai.ts` (LLM calls), `asaas.ts` (boletos), `evolution.ts` (WhatsApp), `venda-item-validation.ts` (venda rules), `credit.ts` (credit limits), email, session, audit
- Depends on: Environment variables, Prisma, external SDKs
- Used by: Server Actions, other lib functions

**Database Layer (Prisma):**
- Purpose: Define data models, handle migrations, execute queries
- Location: `prisma/schema.prisma`, `src/lib/db.ts`, `src/generated/prisma/`
- Contains: 14+ models (Venda, Cliente, Produto, Usuario, ItemVenda, ParcelaVencimento, Documento, Assinatura, etc.)
- Depends on: PostgreSQL 16 connection string (env)
- Used by: All server-side code

**Kubernetes/Deployment:**
- Purpose: Production container orchestration, service networking, persistent storage
- Location: `deploy/bfx/`, `k8s/`
- Contains: Deployments (app), StatefulSets (postgres), Services, Ingress, ConfigMaps, Secrets, CronJob
- Topology: 1x app pod (Next.js standalone), 1x postgres StatefulSet, evolution-api sidecar, cleanup cron job

## Data Flow

### Primary Request Path: Create Sale (PDV)

1. **User accesses page** (`src/app/(app)/venda-rapida/page.tsx`):
   - Server Component: fetches vendors, products, last sale from Prisma via Promise.all()
   - Passes data as props to VendaRapidaFormV2 (Client Component) along with onSubmit callback (criarVendaV2 Server Action)

2. **User fills form** (Client Component `venda-rapida-form-v2.tsx`):
   - useState: produtoItems array, cliente, vendedor, parcelas, etc.
   - nuqs: URL state sync (survives page refresh)
   - Form validation on blur/submit (client-side for UX feedback)
   - Renders ProdutoItemForm for each line item, handles add/remove item logic

3. **User submits form** (VendaRapidaFormV2):
   - Builds FormData object from state
   - Calls `criarVendaV2(formData)` — Server Action

4. **Server validates & creates sale** (`src/app/(app)/venda-rapida/actions.ts::criarVendaV2`):
   - Parse FormData: itens array, cliente id, vendedor, data, forma pagamento, etc.
   - Call `validarItensContraCatalogo(itens, catalog)` — check subtotals, cost floors vs catalog
   - Call `checkCredito(cliente, valor)` — verify customer credit limit
   - Prisma transaction:
     - Create Venda row
     - Create ItemVenda rows (one per line item)
     - Create ParcelaVencimento rows (payment schedule)
     - Create Assinatura if desconto_em_folha (signature tracking)
   - Call `createAuditLog()` — log user action to audit_logs table
   - If payment type is boleto: `createBoletoPayment()` via Asaas API
   - Fire async (void) email/WhatsApp notifications (fire-and-forget, no await)
   - Return `{ success: true, data: { vendaId, boletoUrl?, assinaturaToken? } }`

5. **Client handles response** (VendaRapidaFormV2):
   - Success: show success toast, clear form state, display "Last Sale" card with recibo/assinatura links
   - Error: show error toast, preserve form state
   - Generate shareable links: `/api/recibo?id=${vendaId}&sig=${signReciboId(vendaId)}`

### Secondary Flow: AI Intelligence Chat

1. **User opens BFX Intelligence** (`src/app/(app)/inteligencia/page.tsx`):
   - Server Component: loads chat session history from `ai_mensagens` table
   - Renders IntelligenceChatClient (Client Component)

2. **User types prompt** (IntelligenceChatClient Client Component):
   - Client displays input box, shows loading spinner on submit
   - Calls `askAi(prompt, history)` Server Action

3. **Server processes prompt** (`runAiWithActions()` in `src/lib/ai.ts`):
   - Determine LLM provider: Gemini (default), OpenAI (fallback), LiteLLM
   - Build tools array from `aiActions` (filtered by user role via `roles: ["admin"]`)
   - Call `generateText()` from Vercel ai library with:
     - System prompt (Brazilian Portuguese, formatting rules)
     - Chat history (messages from session)
     - Tools (Zod schema passthrough, each tool has execute handler)
   - LLM processes prompt + selects tools to call
   - Each tool call → `callMcpTool()` adapter → tool handler executes (Prisma queries/writes)
   - Tool results accumulated in `executed[]` array
   - Build markdown summary via `buildToolSummary()`:
     - Clientes → table (Nome | Telefone | Email)
     - Produtos → table (Produto | Estoque | Preço)
     - Vendas → table (Cliente | Data | Valor | Status)
     - Etc. (max 15 rows per result type)
   - Generate action links (Recibo PDF, Catalog, etc.)
   - Return `{ text, actions: executed[], links }`

4. **Client renders response** (IntelligenceChatClient):
   - Parse markdown → split into text blocks and table blocks via `splitTextAndTables()`
   - Render text via `ReactMarkdown` + custom component map (MD_COMPONENTS)
   - Render tables via custom `MarkdownTable` component (pipe-delimited row parser)
   - Display action summary cards + download links
   - Save message to DB via `saveAiMessage()` Server Action (session history)

### File Upload Data Flow

1. **User uploads product image** (`src/app/api/produtos/upload/route.ts` POST handler):
   - Extract file from FormData
   - **If MinIO configured** (`isMinIOConfigured()`):
     - Call `uploadToMinIO(buffer, filename, contentType)` → returns public URL
     - Return `{ success, filePath: minio_url }`
   - **Fallback** (MinIO not configured):
     - Write file to `public/uploads/produtos/{timestamp}-{filename}` (pod ephemeral filesystem)
     - Return `{ success, filePath: "/uploads/produtos/..." }`

2. **Client stores filePath** in Produto model's `imagem` field via Server Action

3. **Pod restart** (ephemeral storage lost):
   - Files in `public/uploads/` disappear
   - References in DB remain (broken links until cleanup)

4. **Cleanup CronJob** (Kubernetes, Sundays 03:00 UTC):
   - StatefulSet trigger: curl to `/api/cron/cleanup-uploads`
   - Endpoint flow:
     - Fetch all referenced paths: Produto.imagem, Config.logoPath
     - Scan directories: `public/uploads/`, `public/uploads/produtos/`, `public/uploads/recibos/`
     - For each file: check if referenced AND file age > 90 days
     - Delete unreferenced + old files
     - Return JSON: `{ ok: true, deleted: N }`

**Architectural Gap:** Files on pod filesystem are ephemeral (lost on pod restart). MinIO fallback mitigates but is optional. Recommendation: make MinIO mandatory for production, configure S3-compatible storage path in environment.

### State Management

**Client-side:**
- React `useState` for form fields (produtoItems, cliente, etc.)
- nuqs for URL query parameters (e.g., `?cliente=123&data=2026-08-03`) → persists across refresh
- Toast notifications via sonner library

**Server-side:**
- Prisma queries per request (no in-memory cache layer)
- User session in JWT cookie (validated on each API request via middleware)
- No global state; each request is independent (functional)

**Database:**
- Single source of truth (PostgreSQL)
- Relationships via foreign keys (Venda.clienteId → Cliente.id, etc.)
- No ORM hooks for computed properties; calculations done in lib functions (e.g., `valorTotalVenda()`)

## Key Abstractions

**Venda (Sale):**
- Purpose: Main transaction record with legacy + modern structure
- Files: `prisma/schema.prisma`, `src/lib/venda-item-validation.ts`, `src/app/(app)/venda-rapida/actions.ts`
- Pattern: Deprecated fields (produtoNome, quantidade, valorVenda) for backward compatibility; new structure uses ItemVenda for line items, ParcelaVencimento for payment schedule
- Relationships: has one Cliente (who), has one Usuario (seller), has many ItemVenda (what), has many ParcelaVencimento (when paid)

**ItemVenda (Sale Line Item):**
- Purpose: Represent one product line in a multi-item sale
- Pattern: produtoNome, custoProduto, valorVenda, quantidade → subtotal (calculated: amount × price)
- Validation: subtotal must match valorVenda × quantidade (within 0.01 tolerance); custoProduto must be ≥ catalog cost

**ParcelaVencimento (Installment):**
- Purpose: Payment schedule for installment sales
- Pattern: one row per due date, tracks paid/antecipada flags, data_pagamento timestamp
- Used for: calculate receivables, trigger WhatsApp reminders 2 days before due date

**AI Tool (MCP action):**
- Purpose: Callable operation (read query or write action) exposed to LLM agent
- Files: `src/lib/ai-actions.ts` (definitions), `src/lib/mcp.ts` (adapter)
- Pattern: `{ name, description, readOnly, roles? }` + async handler function
- Example tools: `listar_clientes` (readOnly, filters by name), `criar_venda` (write, admin only), `registrar_entrada_estoque` (write)

**Server Action (FormData → ActionResponse):**
- Purpose: Typed, secure mutation handler on server
- Pattern: Extract FormData fields → validate → query/mutate DB → return `{ success, data|error }`
- Used for: venda creation, product uploads, config updates, AI message saves

## Entry Points

**Browser Landing:**
- Location: `src/app/page.tsx`
- Logic: `getSession()` → if authenticated redirect /dashboard, else redirect /login

**Authentication Gate:**
- Location: `src/app/(auth)/login/page.tsx`, etc.
- Session creation: `createSessionToken(SessionPayload)` → JWT signed with HS256 → stored in "session" cookie (secure, httpOnly, 7-day expiry)

**Protected App Routes:**
- Location: `src/app/(app)/` (app layout guards via `getSession()` check + redirect)
- Layout: `src/app/(app)/layout.tsx` → renders SidebarNav (role-filtered), checks session, redirects if missing

**API Routes (Middleware Protection):**
- Location: `src/middleware.ts` matcher: `/api/:path*`
- PUBLIC paths (no auth required): `/api/auth/`, `/api/cron/`, `/api/assinatura/`, `/api/webhooks/`, `/api/catalogo/`
- PROTECTED paths: Require JWT token in session cookie, verified via `jwtVerify()`
- Special case: `/api/recibo` allows shareable access via id+sig query params (signed token check instead of JWT)

**AI Chat Entry:**
- Location: `src/app/(app)/inteligencia/page.tsx`
- Requirements: admin role, session present
- Initial load: server fetches chat history from `ai_mensagens` table, renders IntelligenceChatClient

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop. No explicit worker pools. Heavy async I/O (Prisma, API calls) managed via Promise concurrency and async/await.
- **Global state:** Prisma singleton in `src/lib/db.ts` (reused across requests). Session JWT in cookie (stateless). No shared mutable state across requests.
- **Circular imports:** None detected. Strict layering: UI → Actions → Lib → DB prevents cycles.
- **Database migrations:** Prisma Migrate. Dockerfile runs `prisma migrate deploy` at container startup (idempotent, safe for scaled deployments).
- **File system:** Pod ephemeral storage (lost on restart). Uploads to `public/uploads/` are temporary. MinIO fallback optional. **Recommendation:** Require S3/MinIO in production, configure via DATABASE_STORAGE_PATH env var.
- **Rate limiting:** None implemented at app layer. Evolution API and Asaas have built-in limits (typically 100-1000 req/min).
- **Caching:** No query cache layer or Redis. Prisma queries hit DB on every request. Consider Redis for dashboard aggregates (slow queries).
- **Secrets:** Environment variables only (DATABASE_URL, SESSION_SECRET, API keys). No key rotation mechanism. Dockerfile skips validation in build (`SKIP_ENV_VALIDATION=1`) but enforces at runtime (throws if SESSION_SECRET missing in prod).
- **Dependencies:** Next.js 15 (output: "standalone"), Prisma 6.5, React 18.3, TypeScript 5, Yarn 1.22.22 (pinned in package.json). No breaking upgrade plan tracked.

## Anti-Patterns

### Deprecated Field Patterns in Venda

**What happens:** Venda has both old fields (produtoNome, quantidade, valorVenda) and new (itemVenda array, parcelasVencimento array). Old fields used for legacy single-item sales; new fields for multi-item sales. Both coexist in DB schema and code paths.

**Why it's wrong:** Increases cognitive load; two representations for same concept; risk of stale/inconsistent data if not both updated; complicates migrations.

**Do this instead:** Migrate all old single-item sales to new structure (create ItemVenda record for each old Venda in a one-time script), then deprecate old fields. Remove fields after 6+ months deprecation window. New code always uses ItemVenda + ParcelaVencimento.

### Fire-and-Forget Async Side Effects

**What happens:** Server Actions spawn async tasks (send email, notify WhatsApp) without awaiting. If Node process crashes mid-task, notifications never send (no retry).

```typescript
void (async () => {
  await sendVendaNotification(...);
})();
```

**Why it's wrong:** No delivery guarantee. Customer may not receive recibo/payment link. Difficult to debug missing messages.

**Do this instead:** Move notifications to background job queue (Bull, Inngest, or k8s CronJob). Log intent to DB before triggering. Implement retry logic + dead-letter queue for failed sends.

### Validation Only on Client

**What happens:** ProdutoItemForm does input validation (blur handlers check subtotal), but Server Action also validates (validarItensContraCatalogo). If client validation bypassed (F12 dev tools), server validation catches it.

**Why it's wrong:** Defensive but doubles work. Creates confusion about source of truth.

**Do this instead:** Keep both (defense-in-depth for UX + security), but document: "Client validation provides instant feedback; server validation enforces business rules." Make server validation the single source of truth for critical rules.

### Prisma Queries Without Pagination

**What happens:** `listar_clientes` AI action fetches all clients into memory; displayed truncated (first 15 rows) in AI chat table. For 100k rows, OOM risk.

```typescript
const clients = await prisma.cliente.findMany();
```

**Why it's wrong:** Unbounded queries on large tables cause slowdowns and memory spikes under load.

**Do this instead:** Add `.skip().take()` pagination or `.findMany({ take: 100 })`. Return totalCount separately. Require explicit filtering (name prefix, date range) before listing all.

## Error Handling

**Strategy:** Layer-based (UI → Action → Lib → DB). Each layer catches, logs, re-throws with context.

**Patterns:**

1. **UI (Client Component):**
   - Catch response from Server Action
   - `if (!response.success) { toast.error(response.error); return; }`
   - User sees friendly message

2. **Server Action:**
   - Wrap Prisma/lib calls in try-catch
   - `catch (e) { return errorResponse(e.message || "Erro desconhecido"); }`
   - Log to console or DB via `createAuditLog()`

3. **Lib Functions (e.g., Asaas, Evolution):**
   - Return `{ error: string }` or throw Error
   - Server Action catches and converts to ActionResponse

4. **Middleware:**
   - Invalid JWT → `401 Unauthorized`
   - Missing token → `401`
   - Server error → `500`

5. **Database:**
   - Unique constraint violation → Prisma throws `PrismaClientKnownRequestError`
   - Server Action catches and returns user message (e.g., "Cliente já existe")

## Cross-Cutting Concerns

**Logging:** Console only (via `console.error()`, `console.log()`). No structured logging library. `createAuditLog()` writes user actions to `audit_logs` table for compliance/debugging.

**Validation:** 
- Zod at form schema level (vendaV2Schema in validations/)
- Custom validators in lib (venda-item-validation.ts, credit.ts)
- Prisma schema constraints (unique, required, @db.* type constraints)

**Authentication:** JWT in secure cookie. Middleware verifies on API routes. Pages check `getSession()` and redirect to /login if missing. 7-day token expiry, no refresh token.

**Authorization:** Role-based (admin vs. seller). Checked in page layouts (`src/app/(app)/layout.tsx` filters menu) and AI tool descriptors (`roles: ["admin"]`). No fine-grained permissions (all admins have same access).

**Audit Trail:** `createAuditLog()` writes: usuario_id, acao (criada_venda, atualizada_config), detalhes (JSON). Sample: `{ usuario_id: 1, acao: "criada_venda", detalhes: { venda_id: 123, valor: 1000.50 } }`. Stored in audit_logs table, indexed by usuarioId.

---

*Architecture analysis: 2026-08-03*
