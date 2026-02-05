# Codebase Structure

**Analysis Date:** 2026-02-05

## Directory Layout

```
sitema-bfx/
├── src/                          # Application source code
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout with fonts, metadata
│   │   ├── globals.css           # Global styles
│   │   ├── (auth)/               # Authentication routes (no layout wrapper)
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Login page
│   │   │   └── loading.tsx       # Auth fallback loader
│   │   ├── (app)/                # Protected app routes (with sidebar layout)
│   │   │   ├── layout.tsx        # App layout with sidebar & navigation
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      # Sales dashboard (admin)
│   │   │   ├── financeiro/       # Finance & DRE module
│   │   │   ├── prudent/          # Antecipação (credit facility) module
│   │   │   ├── inteligencia/     # AI intelligence chat module
│   │   │   ├── importacao/       # Batch CSV import module
│   │   │   ├── venda-rapida/     # Quick sales entry module
│   │   │   ├── historico/        # Sales history editor
│   │   │   ├── cadastros/        # Master data (clients, products)
│   │   │   ├── gestao-rh/        # HR management
│   │   │   ├── relatorios/       # Report generation & export
│   │   │   ├── comissoes/        # Commission dashboard
│   │   │   ├── configuracoes/    # Settings (admin)
│   │   │   ├── perfil/           # User profile (seller)
│   │   │   ├── error.tsx         # Error boundary for app routes
│   │   │   └── loading.tsx       # Suspense fallback for app routes
│   │   └── api/                  # Route Handlers (backend API)
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts  # POST /api/auth/login (auth)
│   │       │   └── logout/
│   │       │       └── route.ts  # POST /api/auth/logout
│   │       ├── vendas/
│   │       │   └── autocomplete/
│   │       │       └── clientes/
│   │       │           └── route.ts # GET autocomplete clients
│   │       ├── productos/         # Intentional naming variation
│   │       │   ├── autocomplete/  # Product search
│   │       │   └── upload/        # Bulk product upload
│   │       ├── comissoes/         # Commission calculations
│   │       ├── importacao/        # Batch import handler
│   │       ├── relatorios/        # Report generation
│   │       │   ├── vendas/        # Sales reports
│   │       │   │   ├── route.ts   # CSV export
│   │       │   │   └── pdf/       # PDF generation
│   │       │   ├── catalogo/      # Catalog reports
│   │       │   └── antecipacao/   # Credit facility reports
│   │       ├── ncm/search/        # NCM code lookup
│   │       ├── mcp/               # AI Model Context Protocol
│   │       ├── upload-logo/       # Logo upload
│   │       ├── recibo/            # Receipt generation
│   │       ├── catalogo/          # Catalog endpoint
│   │       ├── clientes/          # Client endpoints
│   │       │   └── [id]/
│   │       │       └── limite/    # Client credit limit
│   │       └── search/            # Global search
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── ... (20+ UI components)
│   │   ├── sidebar-nav.tsx       # Navigation menu component
│   │   ├── LogoutButton.tsx      # Logout action
│   │   │
│   │   # Page-specific client components
│   │   ├── dashboard-charts.tsx          # Charts on dashboard
│   │   ├── finance-charts.tsx            # Finance module charts
│   │   ├── DashboardCharts.tsx           # (duplicate naming)
│   │   ├── venda-rapida-form-client.tsx  # Quick sale form
│   │   ├── importacao-client.tsx         # CSV import form
│   │   ├── intelligence-chat-client.tsx  # AI chat interface
│   │   ├── intelligence-chat-composer.tsx # Chat input component
│   │   ├── commissions-dashboard-client.tsx # Commissions view
│   │   ├── antecipacao-client.tsx        # Credit facility form
│   │   ├── produto-form-client.tsx       # Product form
│   │   ├── receipt-editor-client.tsx     # Receipt editor
│   │   ├── receipt-preview.tsx           # Receipt display
│   │   │
│   │   # Reusable form components
│   │   ├── form-select.tsx               # Select wrapper
│   │   ├── vendor-multiselect.tsx        # Multi-select for vendors
│   │   ├── month-filter.tsx              # Date range picker
│   │   ├── query-tabs.tsx                # Tab switcher (query-based)
│   │   │
│   │   # Action components
│   │   ├── delete-user-button.tsx        # Delete user action
│   │   ├── delete-venda-button.tsx       # Delete sale action
│   │   ├── logo-upload-form.tsx          # Logo file upload
│   │   ├── chat-prompt-input.tsx         # Chat message input
│   │   └── ...
│   │
│   └── lib/                      # Business logic & utilities
│       ├── db.ts                 # Prisma client singleton
│       ├── session.ts            # JWT session management
│       ├── guards.ts             # Role-based authorization
│       ├── ai.ts                 # AI integration main
│       ├── ai-actions.ts         # AI action definitions & execution
│       ├── finance.ts            # DRE calculations
│       ├── credit.ts             # Credit analysis
│       ├── ncm.ts                # NCM code mappings
│       ├── mcp.ts                # MCP (Model Context Protocol)
│       ├── utils.ts              # Formatting & helper functions
│       ├── use-query-param.tsx   # URL query param hook
│       └── ...
│
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma             # Prisma ORM schema
│   ├── migrations/               # DB migration history
│   ├── seed.js                   # Initial data seeding
│   └── import_sqlite.js          # Data import from SQLite
│
├── public/                       # Static assets
├── design-system/                # Design tokens & system
├── deploy/                       # Deployment configs
├── scripts/                      # Build & utility scripts
├── skills/                       # Claude skills definitions
├── nginx/                        # Nginx reverse proxy config
├── streamlit/                    # Streamlit data app (separate)
│
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS plugins
├── eslint.config.mjs             # ESLint configuration
├── components.json               # shadcn component manifest
├── package.json                  # Dependencies & scripts
├── Dockerfile                    # Container build
├── docker-compose.yml            # Service orchestration
├── .env.example                  # Environment variables template
└── README.md                     # Project documentation
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router - handles routing, layouts, pages, and API routes
- Contains: Route segments, page components, error boundaries, API handlers
- Key structure: Route groups `(app)` and `(auth)` for layout isolation

**`src/app/(auth)/`:**
- Purpose: Unauthenticated pages without sidebar
- Contains: Login page only
- Note: Route group `(auth)` prevents layout sharing with `(app)` routes

**`src/app/(app)/`:**
- Purpose: Protected pages with authenticated layout
- Contains: Dashboard, sales, finance, reports, settings, HR, commerce features
- Layout: Includes sidebar navigation, header, role-based menu switching

**`src/app/api/`:**
- Purpose: Backend HTTP endpoints and server actions
- Org: Nested by domain (auth, vendas, relatorios, etc.)
- Pattern: RESTful GET/POST handlers, some with dynamic segments `[id]`

**`src/components/`:**
- Purpose: Reusable React components
- Organization:
  - `ui/`: Unstyled shadcn primitives (button, input, card, etc.)
  - Root level: Page-specific client components and form components
  - Naming: `-client.tsx` for client components, others can be either

**`src/lib/`:**
- Purpose: Business logic, database access, utilities
- Organization by concern:
  - `db.ts`: Data access layer
  - `session.ts`, `guards.ts`: Authentication
  - `ai.ts`, `ai-actions.ts`: AI features
  - `finance.ts`, `credit.ts`: Business calculations
  - `utils.ts`: Formatting and helpers

**`prisma/`:**
- Purpose: ORM schema and database management
- Contains: Schema definitions, migrations, seed scripts
- Important: `schema.prisma` defines all database models

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout (fonts, metadata, NuqsAdapter)
- `src/app/(auth)/login/page.tsx`: Login page (client component)
- `src/app/(app)/layout.tsx`: App layout (sidebar, auth check)
- `src/app/(app)/dashboard/page.tsx`: Main dashboard for admins

**Configuration:**

- `tsconfig.json`: TypeScript config with `@/*` alias pointing to `src/*`
- `next.config.ts`: Next.js config (output: "standalone")
- `tailwind.config.ts`: Tailwind CSS theme and plugins
- `eslint.config.mjs`: ESLint rules

**Core Logic:**

- `src/lib/db.ts`: Prisma client singleton
- `src/lib/session.ts`: JWT creation, verification, retrieval
- `src/lib/ai-actions.ts`: AI action definitions (100+ lines)
- `src/lib/finance.ts`: DRE calculation logic
- `src/lib/utils.ts`: Formatting (BRL, CPF, CNPJ, phone, CEP), masking

**Authentication:**

- `src/app/api/auth/login/route.ts`: Login handler (username/password)
- `src/app/api/auth/logout/route.ts`: Logout (cookie clearing)
- `src/lib/session.ts`: Token creation and verification
- `src/lib/guards.ts`: `requireAdmin()` function

**Database:**

- `prisma/schema.prisma`: Model definitions (Cliente, Venda, Produto, Usuario, etc.)
- `src/lib/db.ts`: Prisma client initialization

**Reporting:**

- `src/app/(app)/relatorios/page.tsx`: Report builder UI
- `src/app/api/relatorios/vendas/route.ts`: CSV export
- `src/app/api/relatorios/vendas/pdf/route.ts`: PDF generation

**Testing:**

- Not detected in current structure (no test files found)

## Naming Conventions

**Files:**

- `*.page.tsx`: Page components in app router
- `*-client.tsx`: Client components (use client directive)
- `route.ts`: API Route Handler (in app/api/*)
- `layout.tsx`: Layout component for route segment
- `loading.tsx`: Suspense fallback
- `error.tsx`: Error boundary
- `[param]`: Dynamic segment (e.g., `[id]`)
- `...`: Catch-all segments

**Directories:**

- `(groupName)`: Route group - groups routes without affecting URL
- `[dynamic]`: Dynamic segment in URL
- Lowercase with hyphens: Kebab case for directory names (venda-rapida, comissoes)

**Components:**

- PascalCase for component names and exported functions
- Descriptive names with domain context: `VendaRapidaFormClient`, `DashboardCharts`
- UI components: Simple names like `Button`, `Card`, `Input`

**Functions/Variables:**

- camelCase: `getSession()`, `requireAdmin()`, `formatBRL()`
- Functions: Verb-first when action: `create`, `update`, `delete`, `format`, `calculate`
- Constants: UPPER_SNAKE_CASE or camelCase depending on scope

**API Routes:**

- Path reflects resource: `/api/vendas/`, `/api/relatorios/`, `/api/auth/`
- Query params: snake_case or camelCase mixed
- Examples: `?from=`, `?to=`, `?q=`, `?empresa=`

## Where to Add New Code

**New Feature (e.g., new sales module):**

1. **Page:** Create `src/app/(app)/novo-modulo/page.tsx`
   - Async server component
   - Import layout components, guards, Prisma
   - Fetch data server-side
   - Call `requireAdmin()` if restricted

2. **UI Components:** Create `src/components/novo-modulo-client.tsx`
   - Client component for interactivity
   - Use shadcn/ui primitives
   - State management with `useState`

3. **API Routes:** Create `src/app/api/novo-modulo/route.ts`
   - Handle GET/POST requests
   - Query Prisma in handler
   - Return JSON or file response

4. **Business Logic:** Add to `src/lib/`
   - Create `novo-modulo.ts` if complex logic
   - Export functions used by components/routes

**New Component/Module:**

- Shared form components: `src/components/form-*.tsx`
- Layout/presentational: `src/components/section-*.tsx`
- Client-heavy: `src/components/*-client.tsx`
- UI primitives: Add to `src/components/ui/` from shadcn

**Utilities:**

- Formatting functions: `src/lib/utils.ts` (add to existing file)
- Domain-specific: Create `src/lib/domain-name.ts` (e.g., `src/lib/nuevo-modulo.ts`)
- Shared hooks: `src/lib/use-*.tsx` (e.g., `src/lib/use-query-param.tsx`)

**Database Changes:**

1. Update `prisma/schema.prisma` - add or modify models
2. Run `npx prisma migrate dev --name migration_name`
3. Commit migration file to version control
4. Update queries in `src/lib/db.ts` if new patterns needed

**API Endpoints:**

- Follow nested structure: `src/app/api/[domain]/[action]/route.ts`
- Example pattern: `/api/vendas/autocomplete/clientes/route.ts`
- Use dynamic segments for IDs: `src/app/api/clientes/[id]/limite/route.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: Unstyled shadcn components (generated by `shadcn`)
- Generated: Yes (via `shadcn add <component>`)
- Committed: Yes (components are source code)
- Maintenance: Customize for design system, update manually

**`public/`:**
- Purpose: Static assets served directly by Next.js
- Generated: No
- Committed: Yes
- Examples: Images, logos, favicons

**`.next/`:**
- Purpose: Build output and cache
- Generated: Yes (on `next build` or `next dev`)
- Committed: No (in .gitignore)
- Cleanup: Safe to delete, rebuilds automatically

**`prisma/migrations/`:**
- Purpose: SQL migration history
- Generated: Partially (auto-created on `prisma migrate dev`)
- Committed: Yes (required for deployment)
- Modification: Edit manually only if absolutely necessary

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (on `yarn install`)
- Committed: No (in .gitignore, uses yarn.lock)

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by GSD tools)
- Committed: Yes (reference for future work)
- Examples: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md

---

*Structure analysis: 2026-02-05*
