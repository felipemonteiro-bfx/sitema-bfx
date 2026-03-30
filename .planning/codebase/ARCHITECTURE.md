# Architecture

**Analysis Date:** 2026-03-30

## Pattern Overview

**Overall:** Next.js 15 App Router with server-centric architecture, combining Server Components for data fetching, Server Actions for mutations, and Client Components for interactivity.

**Key Characteristics:**
- Server-first data architecture with `"use server"` boundaries
- PostgreSQL + Prisma ORM for persistence
- AI-powered intelligent actions via runAiWithActions pattern
- Multi-provider AI support (Gemini, OpenAI, LiteLLM)
- Role-based access control (admin/vendedor)
- Real-time table rendering with markdown parser integration
- Signal-based caching invalidation with revalidatePath

## Layers

**Presentation Layer:**
- Purpose: UI components and page rendering
- Location: `src/app/`, `src/components/`
- Contains: Page components (both server and client), UI component library (shadcn/ui), form components with hooks
- Depends on: `src/lib/` utilities, Prisma client, session management
- Used by: Browser clients, API consumers

**Server Action Layer:**
- Purpose: Boundary between client and server for mutations
- Location: `src/lib/*-actions.ts`, inline `"use server"` in pages
- Contains: `gerarBoletoAsaas()` (boleto generation), `askAi()` (AI invocation), form submission handlers
- Depends on: Prisma, external APIs (Asaas, Whatsapp, Evolution, S3)
- Used by: Client components via FormAction or direct calls

**AI/Actions Layer:**
- Purpose: Intelligent agent layer with tool execution
- Location: `src/lib/ai.ts`, `src/lib/ai-actions.ts`, `src/lib/mcp.ts`
- Contains: `runAiWithActions()` (orchestrator), action definitions with schemas, MCP tool integration
- Depends on: Prisma, AI SDKs, database search utilities
- Used by: Intelligence chat pages, form builders

**API Layer:**
- Purpose: HTTP endpoints for external integrations and data retrieval
- Location: `src/app/api/`
- Contains: REST routes (GET/POST), webhooks, file uploads, report generation
- Depends on: Prisma, domain utilities, file storage (MinIO/S3)
- Used by: Frontend forms, mobile clients, third-party webhooks

**Data Layer:**
- Purpose: Database models and persistence
- Location: `prisma/schema.prisma`, `src/generated/prisma/`, `src/lib/db.ts`
- Contains: 14 models (Cliente, Venda, ItemVenda, Produto, Documento, etc.), Prisma Client singleton
- Depends on: PostgreSQL 16, environment configuration
- Used by: All layers above

**Integration Layer:**
- Purpose: External service clients and utilities
- Location: `src/lib/asaas.ts`, `src/lib/whatsapp.ts`, `src/lib/evolution.ts`, `src/lib/minio.ts`, `src/lib/uber.ts`
- Contains: SDK wrappers, API clients, configuration loaders
- Depends on: External service SDKs, environment variables
- Used by: Server actions, API routes, cron jobs

## Data Flow

**Sales Creation Flow:**

1. User enters data in `src/components/venda-rapida-form-client.tsx` (client)
2. Form submission → FormAction → Server Action in page.tsx
3. Server Action validates data, saves to Prisma, triggers effects:
   - `revalidatePath("/historico")` invalidates cache
   - Calls `enviarWhatsAppTexto()` if auto-enabled
   - Generates AI suggestions via `runAiWithActions()` if applicable
4. Response returned with ActionResponse<{vendaId: number}> pattern
5. Component shows toast notification and resets form

**AI Interaction Flow:**

1. User types prompt in `src/components/intelligence-chat-client.tsx`
2. Page.tsx `askAi()` Server Action invoked
3. `runAiWithActions(prompt, provider, context)` executes:
   - Loads available tools from `aiActions` array
   - Sends to AI model (Gemini/OpenAI/LiteLLM) with schema validation
   - AI chooses tools to execute
   - `buildToolSummary()` formats results as markdown + tables
   - Returns `{text, actions, links}` response
4. Response stored in `ai_mensagens` table for history
5. Client renders via `MarkdownContent` component with inline table parsing

**Report Generation Flow:**

1. API route (e.g., `/api/relatorios/vendas/route.ts`) receives GET request
2. Query parameters parsed for filtering (date range, company)
3. Prisma query with include/select for nested data
4. Data transformed to CSV/PDF format
5. HTTP Response with Content-Disposition attachment header

**State Management Flow:**

1. Server components fetch data at render time
2. Client components use `useOptimistic()` for instant UI updates
3. Server Actions invalidate specific paths with `revalidatePath()`
4. Next.js revalidates ISR for static content
5. No centralized Redux/Zustand — per-page state via React hooks + Server Actions

## Key Abstractions

**ActionResponse Pattern:**
- Purpose: Consistent API for Server Action results
- Examples: `src/lib/action-response.ts`, all `*-actions.ts` files
- Pattern: `{ success: boolean, message?, data?, error? }`
- Usage: Enables client error handling without try/catch in components

**Zod Schema Validation:**
- Purpose: Runtime type safety for AI action parameters
- Examples: `actionParamSchemas` in `src/lib/ai-actions.ts` (50+ schemas)
- Pattern: Each AI action has corresponding Zod schema for coercion/validation
- Usage: Ensures type safety when AI calls execute actions

**Session Pattern:**
- Purpose: JWT-based stateless authentication
- Examples: `src/lib/session.ts`
- Pattern: Cookie → JWT verification → SessionPayload type
- Usage: 7-day expiration, role-based routing in layouts

**Markdown Table Parser:**
- Purpose: Render AI-generated markdown tables without remark-gfm
- Examples: `src/components/intelligence-chat-client.tsx`
- Pattern: Split text by `TABLE_BLOCK_RE`, parse pipe-delimited rows
- Usage: Avoids remark-gfm dependency (blocked by hook), enables custom styling

**Prisma Singleton:**
- Purpose: Prevent multiple Prisma Client instances in development
- Examples: `src/lib/db.ts`
- Pattern: `globalForPrisma.prisma ??= new PrismaClient()`
- Usage: Imported by all server-side code

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` (root), `src/app/(app)/layout.tsx` (authenticated)
- Triggers: Browser navigation to `/`
- Responsibilities: Theme setup, session verification, sidebar navigation, error boundaries

**API Routes:**
- Location: `src/app/api/` (40+ routes)
- Triggers: HTTP GET/POST requests
- Responsibilities: Data export, webhook handlers, file uploads, integrations

**Cron Jobs:**
- Location: `src/app/api/cron/*` routes (8 jobs)
- Triggers: External scheduler (GitHub Actions, k8s CronJob)
- Responsibilities: Automated messages, cleanup, reminders

**Login Flow:**
- Location: `src/app/(auth)/login/page.tsx`
- Triggers: GET /login or session expired
- Responsibilities: Credential verification, JWT creation, redirect to dashboard

## Error Handling

**Strategy:** Explicit error responses with user-friendly messages, no silent failures

**Patterns:**

- **Server Actions:** Return `{ success: false, error: "User message" }` from `gerarBoletoAsaas()`, page Server Actions
- **API Routes:** Return `new Response()` with status codes, or throw for 500s (caught by Next.js)
- **Validations:** Zod parse catches invalid AI parameters, returns validation error to user
- **Database:** Prisma errors caught in try/catch, wrapped in ActionResponse, logged to console
- **External APIs:** Fallback error messages (e.g., "Asaas não configurado. Configure em Configurações...")
- **Session:** Missing session → `redirect("/login")` in protected layouts

## Cross-Cutting Concerns

**Logging:**
- Prisma: Error-level only (`log: ["error"]`)
- Server Actions: Manual `console.error()` for debugging
- No centralized logging service (consider Winston/Pino for production)

**Validation:**
- Zod schemas for AI action parameters (strict coercion)
- React Hook Form for complex form validation
- Manual guardrails in Server Actions (e.g., CPF/CNPJ checks for Asaas customers)

**Authentication:**
- Session cookie with JWT verification
- `getSession()` called in layouts to check role
- `@/lib/guards.ts` utility for additional auth checks
- Role-based menu visibility (admin vs vendedor)

**Permissions:**
- Role check in AI action definitions via `roles?: []`
- Menu filtering in `src/app/(app)/layout.tsx` based on `session.role`
- API routes rely on caller to check session (no built-in auth middleware)

**Caching:**
- Next.js App Router ISR via `revalidatePath()`, `revalidateTag()`
- No query cache layer — direct Prisma queries on each render
- AI context stored in `ai_mensagens` table (session history)

**File Handling:**
- MinIO/S3 for object storage (logo uploads, PDFs)
- `src/lib/minio.ts` provides client wrapper
- Temporary uploads cleaned by `/api/cron/cleanup-uploads` CronJob

**External Integrations:**
- Asaas for boletos: Customer creation with de-duplication, payment link generation
- Evolution API for WhatsApp: Session management, message sending
- Uber Freight: Shipping quotes
- Transcription: `/api/transcribe` route (pending implementation details)

---

*Architecture analysis: 2026-03-30*
