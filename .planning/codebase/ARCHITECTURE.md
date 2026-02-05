# Architecture

**Analysis Date:** 2026-02-05

## Pattern Overview

**Overall:** Next.js App Router with Server Components and Actions - Full-stack monolithic application

**Key Characteristics:**
- Server-side rendering with React Server Components for data fetching
- Client Components for interactivity and forms
- API routes (Route Handlers) for backend logic
- Database layer via Prisma ORM
- Role-based access control (Admin/Vendedor)
- JWT session tokens for authentication
- AI integration for intelligent features

## Layers

**Presentation Layer (UI):**
- Purpose: Render pages and interactive components to users
- Location: `src/app/` (page routes, layouts) and `src/components/`
- Contains: Page components (RSC), client components, UI primitives, forms
- Depends on: Session layer, API routes, Prisma queries (via server actions)
- Used by: Browser clients

**Application/Page Layer:**
- Purpose: Route-specific logic and page composition
- Location: `src/app/(app)/*/page.tsx` and `src/app/(auth)/login/page.tsx`
- Contains: Server Components with data fetching, role-based rendering, form handlers
- Depends on: `@/lib/guards` for auth, `@/lib/db` for queries, components
- Used by: Next.js routing system

**API Layer (Route Handlers):**
- Purpose: HTTP endpoints for client-side requests and external integrations
- Location: `src/app/api/*/route.ts`
- Contains: GET/POST handlers, CSV/PDF generation, autocomplete endpoints, authentication
- Depends on: Prisma client, session validation, file generation libraries
- Used by: Frontend fetch calls, third-party integrations

**Business Logic Layer:**
- Purpose: Core application logic separated from HTTP concerns
- Location: `src/lib/` (finance.ts, ai-actions.ts, credit.ts, etc.)
- Contains: DRE calculations, AI action definitions, credit analysis, data transformations
- Depends on: Prisma client, external AI APIs
- Used by: Page components, API routes, server actions

**Data Access Layer:**
- Purpose: Database connection and Prisma client management
- Location: `src/lib/db.ts` (Prisma singleton), `prisma/schema.prisma`
- Contains: Database models (Cliente, Venda, Produto, Usuario, etc.)
- Depends on: PostgreSQL database
- Used by: All data-fetching code

**Authentication & Session Layer:**
- Purpose: User authentication and session management
- Location: `src/lib/session.ts`, `src/app/api/auth/*/route.ts`
- Contains: JWT token creation/verification, session cookies, role-based guards
- Depends on: jose library for JWT, cookies middleware
- Used by: All protected pages and endpoints

**Shared Utilities:**
- Purpose: Common functions across layers
- Location: `src/lib/utils.ts`, `src/lib/ncm.ts`, `src/lib/mcp.ts`
- Contains: Formatting (BRL, CPF, CNPJ, phone), masking, NCM lookup helpers
- Depends on: Standard library, date-fns
- Used by: Components, pages, API routes

## Data Flow

**Authentication Flow:**

1. User visits `/login` (unauthenticated route)
2. Submits credentials to `/api/auth/login` (POST)
3. Route handler queries `prisma.usuario.findUnique()`
4. On success, creates JWT token via `createSessionToken()`
5. Sets httpOnly cookie with token
6. Redirects to `/dashboard`

**Protected Page Access:**

1. User requests protected page (e.g., `/dashboard`)
2. Page component calls `getSession()` from session.ts
3. `getSession()` reads token from cookies, verifies JWT
4. Returns `SessionPayload` or null
5. If null, page redirects to `/login`
6. If verified, page renders with user context

**Sales Data Flow (Example: Dashboard):**

1. Admin visits `/dashboard` → `page.tsx` server component executes
2. Page calls `requireAdmin()` guard → checks session role
3. Fetches `prisma.venda.findMany()` with date filters from search params
4. Calculates aggregates (total, freight, profit) in-memory
5. Renders table and charts with data
6. Charts component may trigger `dashboard-charts.tsx` client-side rendering

**AI Intelligence Flow:**

1. User submits prompt + optional file to `/inteligencia`
2. Server action `askAi()` receives form data
3. Calls `runAiWithActions()` from `ai.ts` library
4. AI parses prompt, identifies actions from `ai-actions.ts`
5. Executes read-only actions automatically or queues modifications
6. Returns response with executed results

**Import & Data Processing:**

1. User uploads CSV to `/importacao` page
2. `ImportacaoClient` parses CSV, sends batch to `/api/importacao/batch`
3. API route validates and inserts records via Prisma
4. Returns success/failure for each row
5. Frontend shows validation results in table

**State Management:**

- **URL Search Params:** Filters, date ranges, vendor selection (via `nuqs` library)
- **Form State:** Component-level with React `useState` (client components)
- **Database State:** Single source of truth in PostgreSQL
- **Session State:** JWT token in httpOnly cookie, verified per request
- **Server Cache:** Next.js cache, revalidated via `revalidatePath()`

## Key Abstractions

**Page Component Pattern:**

Purpose: Server-rendered pages with data fetching, role checks, and layout
Examples: `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/cadastros/page.tsx`
Pattern: Async server component → guard check → Prisma query → render UI

```typescript
// Pattern example from dashboard/page.tsx
export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const ok = await requireAdmin();
  if (!ok) return <div>Acesso restrito.</div>;
  const sp = await searchParams;
  const vendas = await prisma.venda.findMany({ where: {...} });
  // render JSX
}
```

**Server Action (Form Submission):**

Purpose: Handle form submissions securely on server
Examples: `addCliente()`, `saveAviso()`, `askAi()`
Pattern: `"use server"` directive, FormData input, Prisma mutation, revalidate cache

```typescript
// Pattern from cadastros/page.tsx
async function addCliente(formData: FormData) {
  "use server";
  const nome = String(formData.get("nome") || "");
  await prisma.cliente.create({ data: { nome, ... } });
  revalidatePath("/cadastros");
}
```

**Client Component:**

Purpose: Interactive UI with state and event handling
Examples: `venda-rapida-form-client.tsx`, `intelligence-chat-client.tsx`
Pattern: `"use client"` directive, useState, fetch API routes, display results

```typescript
// Pattern from login/page.tsx
"use client";
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const res = await fetch("/api/auth/login", { method: "POST", ... });
}
```

**Guard Function:**

Purpose: Check authorization before rendering or executing
Examples: `requireAdmin()`, role checks in pages
Pattern: Get session, verify role, return boolean

```typescript
// From guards.ts
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return false;
  return true;
}
```

**API Route Handler:**

Purpose: HTTP endpoint for GET/POST requests
Examples: `/api/auth/login`, `/api/vendas/autocomplete/clientes`
Pattern: Extract params, query database, return JSON or file

```typescript
// Pattern from vendas/autocomplete/clientes/route.ts
export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q") || "";
  const clientes = await prisma.cliente.findMany({ where: {...} });
  return NextResponse.json(clientes);
}
```

**AI Action Definition:**

Purpose: Define actions that AI can execute
Examples: `listar_vendas`, `criar_venda`, etc. in `ai-actions.ts`
Pattern: Name, description, Zod schema for parameters, role restrictions

```typescript
// Pattern from ai-actions.ts
const actionParamSchemas: Record<string, z.ZodTypeAny> = {
  listar_vendas: z.object({
    from: optionalString(),
    to: optionalString(),
    vendedor: optionalString(),
    limit: optionalNumber(),
  }),
};
```

## Entry Points

**Web Application Root:**
- Location: `src/app/layout.tsx`
- Triggers: All HTTP requests
- Responsibilities: Setup fonts, metadata, root layout with NuqsAdapter

**Authentication Root:**
- Location: `src/app/(auth)/login/page.tsx`
- Triggers: Unauthenticated access to protected pages (via redirect)
- Responsibilities: Login form, credential submission, session creation

**Application Root:**
- Location: `src/app/(app)/layout.tsx`
- Triggers: Authenticated requests to `/dashboard` and sub-routes
- Responsibilities: Session verification, sidebar navigation, layout rendering
- Dynamic: Menu switches between admin/seller based on role

**Dashboard Entry:**
- Location: `src/app/(app)/dashboard/page.tsx`
- Triggers: Admin clicks dashboard link
- Responsibilities: Display sales metrics, vendor selection, date filtering

**API Entry Points:**
- Location: `src/app/api/*/route.ts`
- Triggers: Client-side fetch calls
- Responsibilities: Data retrieval, CSV/PDF generation, batch operations

## Error Handling

**Strategy:** Try-catch with fallback responses, graceful degradation

**Patterns:**

Authentication errors: Redirect to login, display error message on form
Database errors: Log error, return generic 500 response or empty state
API errors: Return `NextResponse.json({ error: "message" }, { status: 400 })`
Missing session: Return falsy from `getSession()`, pages redirect to login
AI errors: Catch in `runAiWithActions()`, return error in response object

Examples from code:
- `src/app/api/vendas/autocomplete/clientes/route.ts`: catch database error, log, return 500
- `src/app/(auth)/login/page.tsx`: catch fetch error, display "Erro ao conectar."
- `src/app/(app)/layout.tsx`: check session, redirect if null

## Cross-Cutting Concerns

**Logging:**
- Location: Console.log scattered in handlers (no unified logger)
- Example: `console.log()` in finance calculations, autocomplete routes
- Pattern: Direct console calls, mostly for debugging

**Validation:**
- Location: `src/lib/ai-actions.ts` (Zod schemas), guard functions
- Pattern: Zod for AI actions, string trimming in forms, manual checks in routes
- Examples: Email validation, required field checks

**Authentication:**
- Location: `src/lib/session.ts`, `src/lib/guards.ts`
- Pattern: JWT verification, role-based guards, httpOnly cookies
- Used by: All protected pages and some API routes

**Database Transaction Management:**
- Location: Prisma client in `src/lib/db.ts`
- Pattern: Singleton instance with connection pooling
- No explicit transactions in current code (implicit via single queries)

**File Upload/Generation:**
- Location: `/api/upload-logo`, `/api/relatorios/*/route.ts`
- Pattern: Handle file in request, process with pdf-lib or return CSV
- Examples: CSV export, PDF receipt generation

---

*Architecture analysis: 2026-02-05*
