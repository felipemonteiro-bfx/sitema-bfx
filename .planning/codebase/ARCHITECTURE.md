# Architecture

**Analysis Date:** 2026-02-19

## Pattern Overview

**Overall:** Server Components + Client Components with Server Actions

**Key Characteristics:**
- Next.js 16 App Router (with grouped routes for auth/app separation)
- Prisma ORM for database abstraction
- React Hook Form + Zod for client-side validation
- shadcn/ui components with semantic CSS tokens
- Server Actions for mutations with ActionResponse pattern
- Role-based access control (admin/vendedor)
- AI integration (OpenAI/Gemini) for suggestions and analysis

## Layers

**Presentation (UI):**
- Purpose: Render components and handle user interactions
- Location: `src/components/` and `src/app/`
- Contains: React Server Components (RSC), Client Components ("use client")
- Depends on: `src/lib/` utilities, design tokens, validation schemas
- Used by: Next.js App Router, browser clients

**Form & Validation:**
- Purpose: Validate user input before server processing
- Location: `src/lib/validations/` and `src/components/ui/form.tsx`
- Contains: Zod schemas (auth.ts, cliente.ts, produto.ts, venda.ts)
- Depends on: Zod library, React Hook Form
- Used by: Client forms and Server Actions

**API/Routes:**
- Purpose: Handle HTTP requests and data mutations
- Location: `src/app/api/`
- Contains: Route handlers (GET/POST), Server Actions (uploadImage, createVenda)
- Depends on: Prisma client, session management
- Used by: Client components, external integrations

**Business Logic:**
- Purpose: Database operations and domain rules
- Location: `src/app/*/actions.ts` (Server Actions) and API routes
- Contains: Prisma queries, data calculations, file I/O
- Depends on: Prisma client, guards, utilities
- Used by: Presentation layer, API routes

**Data Access:**
- Purpose: Database abstraction and connection pooling
- Location: `src/lib/db.ts` (Prisma client singleton)
- Contains: Prisma client configuration with dev-only caching
- Depends on: PostgreSQL database, environment config
- Used by: All business logic layers

**Authentication & Authorization:**
- Purpose: Session management and access control
- Location: `src/lib/session.ts`, `src/lib/guards.ts`, `src/app/api/auth/`
- Contains: JWT token handling, role-based checks
- Depends on: jose library, cookies, database
- Used by: Layout guards, page/API endpoint protection

**Utilities & Helpers:**
- Purpose: Reusable logic across application
- Location: `src/lib/` (utils.ts, finance.ts, ncm.ts, ai.ts, ai-actions.ts)
- Contains: Formatting (formatBRL), calculations, AI integrations
- Depends on: External APIs (OpenAI, Gemini), Prisma
- Used by: Components, Server Actions, API routes

## Data Flow

**User Authentication:**

1. User enters credentials on `src/app/(auth)/login/page.tsx`
2. Client submits to POST `/api/auth/login`
3. Route handler validates against `prisma.usuario` table
4. Server creates JWT token via `createSessionToken()`
5. Token set in HTTP-only cookie
6. Session retrieved via `getSession()` in subsequent requests

**Sales/Venda Creation (Primary Flow):**

1. User navigates to `/venda-rapida` (Server Component)
2. Server fetches vendors and last sale via Prisma
3. Page renders `<VendaRapidaFormClient>` with data
4. Client captures form data: date, vendor, products, customer, parcels
5. Client autocomplete queries: `/api/vendas/autocomplete/clientes`, `/api/vendas/autocomplete/produtos`
6. Client may trigger AI suggestions via `/api/vendas/sugestoes`
7. User submits form, calls `criarVendaV2()` Server Action
8. Server Action validates, calculates financials, writes to database
9. Returns `ActionResponse` (success/error)
10. Client displays toast notification and resets form
11. Page revalidates via `revalidatePath()` showing new sale

**Data Fetch & Display:**

1. Server Component fetches aggregated data (sales, metrics) from Prisma
2. Calculates summaries (total revenue, profit margin, per-vendor breakdown)
3. Renders UI with fetched data embedded
4. Client can filter/search using query params (nuqs library)
5. Pagination handled server-side, UI updates client-side

**State Management:**

- Server State: Database (Prisma), session cookies
- Form State: React Hook Form (uncontrolled until submit)
- UI State: React useState in client components (loading, suggestions, filters)
- Global State: None (no Redux/Zustand) - query params drive filtering

## Key Abstractions

**ActionResponse Pattern:**
- Purpose: Standardized success/error responses from Server Actions
- Examples: `src/lib/action-response.ts`, `src/app/(app)/venda-rapida/actions.ts`
- Pattern: Server Actions return `ActionResponse<T>` with `success`, `message`, `data`, or `error` fields
- Benefits: Type-safe error handling, predictable client behavior, toast notifications

**Prisma Models:**
- Purpose: Database schema abstraction and type safety
- Examples: `prisma/schema.prisma` (Cliente, Produto, Venda, ItemVenda, ParcelaVencimento, Usuario, etc.)
- Pattern: Models with automatic migrations, relationships (Venda → Cliente, ItemVenda, ParcelaVencimento)
- Benefits: Strong typing, referential integrity, ORM-level validations

**Session Management:**
- Purpose: Stateless JWT-based auth without server sessions
- Examples: `src/lib/session.ts` (SessionPayload type, createSessionToken, verifySessionToken)
- Pattern: JWT stored in HTTP-only cookie, verified on each request
- Benefits: Scalable, no session storage, automatic expiration (7d)

**Form Validation Schemas:**
- Purpose: Single source of truth for form rules
- Examples: `src/lib/validations/venda.ts` (vendaRapidaSchema), auth.ts, cliente.ts, produto.ts
- Pattern: Zod schemas defining type, constraints, error messages
- Benefits: Client + Server validation consistency, type inference

**Design Tokens:**
- Purpose: Semantic color/spacing/typography constants
- Examples: `src/lib/design-tokens.ts` (spacing, typography, colors objects)
- Pattern: TypeScript objects mapping to Tailwind class names or CSS variables
- Benefits: Dark mode support, consistent visual language, easy refactoring

**Guards (Access Control):**
- Purpose: Authorization checks for sensitive operations
- Examples: `src/lib/guards.ts` (requireAdmin)
- Pattern: Async functions returning boolean, called at page/API level
- Benefits: Clear intent, reusable auth logic, prevents unauthorized access

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx`
- Triggers: HTTP request to domain root
- Responsibilities: Initialize theme provider, NuqsAdapter (query params), structure HTML

**Authentication:**
- Location: `src/app/(auth)/login/page.tsx`
- Triggers: Unauthenticated user or /login path
- Responsibilities: Form UI, credential submission, session creation

**Protected App:**
- Location: `src/app/(app)/layout.tsx`
- Triggers: Authenticated user accessing /dashboard, /historico, etc.
- Responsibilities: Session validation, sidebar navigation, role-based menu routing

**API Routes:**
- Location: `src/app/api/*/route.ts`
- Triggers: HTTP requests to /api/* paths
- Responsibilities: Handle autocomplete, file uploads, AI suggestions, auth endpoints

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: Root path /
- Responsibilities: Redirect to /dashboard (authenticated) or /login (anonymous)

## Error Handling

**Strategy:** Try-catch with ActionResponse pattern for Server Actions, HTTP status codes for API routes

**Patterns:**

1. **Server Actions (Business Logic):**
   ```typescript
   async function criarVendaV2(formData: FormData): Promise<ActionResponse<{ vendaId: number }>> {
     try {
       if (!clienteId) return errorResponse("Cliente obrigatório")
       const venda = await prisma.venda.create({ data })
       revalidatePath("/venda-rapida")
       return successResponse("Venda criada!", { vendaId: venda.id })
     } catch (error) {
       console.error("Error:", error)
       return errorResponse("Erro ao criar venda")
     }
   }
   ```

2. **API Routes (HTTP):**
   ```typescript
   export async function GET(request: NextRequest) {
     try {
       const data = await prisma.cliente.findMany(...)
       return NextResponse.json(data)
     } catch (error) {
       return NextResponse.json({ error: "..." }, { status: 500 })
     }
   }
   ```

3. **Client-Side Toast Notification:**
   - ActionForm component wraps submission, catches ActionResponse
   - On success: shows success toast, resets form
   - On error: shows error toast with message from server

4. **Validation Errors:**
   - Zod schema parsing in Server Actions
   - React Hook Form validation in client forms
   - FormMessage component displays field-level errors

5. **Authentication Errors:**
   - Missing session redirects to /login
   - Invalid JWT returns null from verifySessionToken
   - Unauthorized access returns error page or redirects

## Cross-Cutting Concerns

**Logging:**
- Approach: Browser console.log for errors, Prisma logs set to ["error"] in dev
- Files: Errors logged in catch blocks throughout codebase
- No external logging service configured

**Validation:**
- Client-side: React Hook Form + Zod schemas in forms
- Server-side: Zod schema validation in Server Actions + manual checks
- Database: Prisma enforces unique constraints, relationships, required fields

**Authentication:**
- Method: JWT tokens in HTTP-only cookies
- Protected pages: Check session via `getSession()`, redirect if null
- Protected API: Session validation in route handlers
- Role-based: Menu items and pages filtered by `session.role` (admin/vendedor)

**Styling:**
- Framework: Tailwind CSS v4 with CSS variables for semantic tokens
- Dark mode: Automatic via next-themes, CSS variable swapping
- Components: shadcn/ui wrapped with design-tokens configuration

**Performance Optimizations:**
- Server Components for initial data fetching
- Incremental Static Regeneration (ISR) via revalidatePath
- Client Components use React.memo and useCallback where needed
- Prisma with connection pooling (via Neon or environment-specific pooling)

---

*Architecture analysis: 2026-02-19*
