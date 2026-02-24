# Codebase Structure

**Analysis Date:** 2026-02-19

## Directory Layout

```
sitema-bfx/
├── src/                          # Application source code
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout (theme provider, fonts)
│   │   ├── page.tsx             # Home redirect (/ → /dashboard or /login)
│   │   ├── globals.css          # Tailwind + CSS variables (semantic tokens)
│   │   ├── global-error.tsx     # Error boundary
│   │   │
│   │   ├── (auth)/              # Auth group (unauthenticated routes)
│   │   │   └── login/
│   │   │       └── page.tsx     # Login form (React Hook Form + Zod)
│   │   │
│   │   ├── (app)/               # App group (authenticated routes, role-based)
│   │   │   ├── layout.tsx       # App wrapper (sidebar, session guard)
│   │   │   ├── dashboard/       # Analytics, KPIs
│   │   │   ├── venda-rapida/    # POS terminal (primary sales feature)
│   │   │   ├── historico/       # Sales history (CRUD)
│   │   │   ├── cadastros/       # Client/Product/Vendor/Company data entry
│   │   │   ├── comissoes/       # Commission tracking (sellers)
│   │   │   ├── financeiro/      # P&L, DRE reports
│   │   │   ├── gestao-rh/       # HR management
│   │   │   ├── inteligencia/    # AI chat (BFX Intelligence)
│   │   │   ├── importacao/      # CSV/data import
│   │   │   ├── prudent/         # Receivables anticipation module
│   │   │   ├── relatorios/      # PDF exports, catalogs
│   │   │   ├── configuracoes/   # Settings, API keys
│   │   │   └── perfil/          # User profile
│   │   │
│   │   └── api/                 # REST API routes (HTTP)
│   │       ├── auth/
│   │       │   ├── login/route.ts      # POST - create session
│   │       │   └── logout/route.ts     # POST - clear session
│   │       ├── vendas/
│   │       │   ├── autocomplete/clientes/route.ts    # GET - client search
│   │       │   ├── autocomplete/produtos/route.ts    # GET - product search
│   │       │   └── sugestoes/route.ts  # GET - AI upsell/crosssell
│   │       ├── produtos/
│   │       │   ├── autocomplete/route.ts # GET - product search
│   │       │   └── upload/route.ts      # POST - product image
│   │       ├── clientes/
│   │       │   └── [id]/
│   │       │       └── limite/route.ts  # GET - credit limit info
│   │       ├── comissoes/
│   │       ├── relatorios/
│   │       │   ├── vendas/pdf/route.ts  # GET - PDF generation
│   │       │   └── catalogo/route.ts    # GET - product catalog
│   │       ├── importacao/
│   │       │   └── batch/route.ts       # POST - bulk data import
│   │       ├── search/route.ts          # GET - global search
│   │       ├── ncm/search/route.ts      # GET - NCM code lookup
│   │       ├── recibo/route.ts          # GET - receipt generation
│   │       └── upload-logo/route.ts     # POST - company logo upload
│   │
│   ├── components/                # React components (UI + features)
│   │   ├── ui/                   # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── form.tsx          # React Hook Form wrapper
│   │   │   ├── label.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── skeleton.tsx      # Loading placeholder
│   │   │   ├── date-input.tsx    # Date picker
│   │   │   └── [27 other base components]
│   │   │
│   │   ├── theme-provider.tsx    # next-themes setup
│   │   ├── theme-toggle.tsx      # Dark mode toggle button
│   │   ├── sidebar-nav.tsx       # Sidebar navigation menu
│   │   ├── mobile-menu-trigger.tsx # Mobile drawer menu
│   │   │
│   │   ├── venda-rapida-form-client.tsx     # POS form (multi-product, parcels)
│   │   ├── produto-form-client.tsx          # Product create/edit
│   │   ├── produto-item-form.tsx            # Line item in sale
│   │   ├── parcelas-vencimento-form.tsx    # Installment schedule UI
│   │   ├── antecipacao-client.tsx          # Receivables form
│   │   │
│   │   ├── delete-venda-button.tsx         # Delete sale confirmation dialog
│   │   ├── delete-user-button.tsx          # Delete user confirmation
│   │   ├── LogoutButton.tsx                # Session logout
│   │   │
│   │   ├── importacao-client.tsx           # CSV import uploader
│   │   ├── intelligence-chat-client.tsx   # AI chat interface
│   │   ├── intelligence-chat-composer.tsx # Message input for AI
│   │   ├── dashboard-charts.tsx           # Recharts visualizations
│   │   ├── finance-charts.tsx             # P&L charts
│   │   ├── commissions-dashboard-client.tsx # Commission metrics
│   │   ├── report-buttons-client.tsx      # PDF export buttons
│   │   │
│   │   ├── form-select.tsx                # Custom select with search
│   │   ├── query-tabs.tsx                 # Tabs with URL sync (nuqs)
│   │   ├── month-filter.tsx               # Month range picker
│   │   ├── receipt-editor-client.tsx      # Receipt preview/edit
│   │   ├── receipt-preview.tsx            # Receipt display
│   │   ├── logo-upload-form.tsx           # Company logo upload
│   │   ├── chat-prompt-input.tsx          # AI chat input field
│   │   └── [other feature components]
│   │
│   └── lib/                       # Utilities and helpers
│       ├── db.ts                 # Prisma client singleton
│       ├── session.ts            # JWT auth (createSessionToken, getSession)
│       ├── guards.ts             # Access control (requireAdmin)
│       ├── utils.ts              # Formatting (formatBRL, cn)
│       ├── action-response.ts    # Server Action response type + helpers
│       │
│       ├── design-tokens.ts      # Semantic tokens (spacing, colors, typography)
│       ├── finance.ts            # Financial calculations (margin, ROI, etc.)
│       ├── animations.ts         # Tailwind animation utilities
│       ├── ai.ts                 # AI model integration (OpenAI, Gemini)
│       ├── ai-actions.ts         # AI action definitions and execution
│       ├── credit.ts             # Credit limit and risk calculations
│       ├── ncm.ts                # NCM code utilities
│       ├── mcp.ts                # MCP (Multi-Client Protocol) tools
│       ├── use-query-param.tsx   # nuqs hook for URL state
│       │
│       └── validations/          # Zod schemas (form validation)
│           ├── auth.ts           # Login schema
│           ├── cliente.ts        # Customer form schema
│           ├── produto.ts        # Product form schema
│           └── venda.ts          # Sales form schema
│
├── prisma/                        # Database configuration
│   ├── schema.prisma             # Data models (11 models)
│   ├── seed.js                   # Database seeding
│   ├── import_sqlite.js          # Legacy SQLite migration
│   └── migrations/               # Prisma migrations
│
├── public/                        # Static assets
│   └── uploads/                  # User-uploaded files (receipts, logos)
│
├── .planning/                     # GSD planning artifacts
│   └── codebase/                 # Architecture/quality docs (you are here)
│
├── .github/                       # GitHub CI/CD workflows
├── .vscode/                       # IDE settings
├── design-system/                 # Design tokens documentation
├── scripts/                       # Utility scripts
├── deploy/                        # Docker/deployment configs
├── nginx/                         # Nginx reverse proxy config
├── tests/                         # Test files
├── package.json                   # Dependencies (React 18.3.1, Next 16.1.6)
├── tsconfig.json                  # TypeScript config (paths: @/*)
├── next.config.ts                 # Next.js configuration
└── tailwind.config.ts             # Tailwind CSS v4 config
```

## Directory Purposes

**`src/app/(auth)/`:**
- Purpose: Unauthenticated routes (login page)
- Contains: Login form, session creation
- Key files: `login/page.tsx` (React Hook Form + Zod validation)

**`src/app/(app)/`:**
- Purpose: Protected routes (require authenticated session)
- Contains: Business logic pages, forms, reports
- Key files: `layout.tsx` (session guard, sidebar, menu routing)
- Pattern: Each feature is a route directory with page.tsx, actions.ts, loading.tsx

**`src/app/api/`:**
- Purpose: HTTP API endpoints for client autocomplete, file uploads, webhooks
- Contains: Route handlers (GET/POST) following REST conventions
- Key files: Auth routes, autocomplete endpoints, PDF generation

**`src/components/ui/`:**
- Purpose: shadcn/ui base components (buttons, forms, cards, etc.)
- Contains: Unstyled Radix UI + Tailwind components
- Key files: form.tsx (React Hook Form wrapper), button.tsx (variants)

**`src/components/`:**
- Purpose: Feature-specific client components (forms, dialogs, charts)
- Contains: "use client" components for interactivity
- Key files: VendaRapidaFormClient, ProductFormClient, AI chat, charts

**`src/lib/`:**
- Purpose: Shared utilities, types, validation schemas
- Contains: Database client, session management, helpers, validators
- Key files: db.ts (Prisma), session.ts (JWT), validations/ (Zod schemas)

**`prisma/`:**
- Purpose: Database schema and migrations
- Contains: 11 Prisma models (Cliente, Produto, Venda, Usuario, etc.)
- Key files: schema.prisma, seed.js

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML structure, theme provider, fonts
- `src/app/page.tsx`: Home redirect (/ → /dashboard or /login)
- `src/app/(app)/layout.tsx`: App wrapper with sidebar, session validation
- `src/app/(auth)/login/page.tsx`: Login form with credentials input

**Configuration:**
- `tsconfig.json`: TypeScript config with `@/*` path alias
- `next.config.ts`: Next.js runtime config
- `tailwind.config.ts`: Tailwind CSS framework config
- `prisma/schema.prisma`: Database schema and relationships

**Core Logic:**
- `src/lib/db.ts`: Prisma client (database connection)
- `src/lib/session.ts`: JWT token management (create, verify)
- `src/lib/guards.ts`: Access control functions (requireAdmin)
- `src/lib/action-response.ts`: Server Action response standardization

**Testing:**
- `tests/`: Test files (not extensively documented in codebase)
- `test-results/`: Test output artifacts

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Server Component by default)
- Server Actions: `actions.ts` (in same directory as page)
- Loading states: `loading.tsx` (auto-shown by Next.js)
- Client components: `-client.tsx` suffix for clarity
- UI components: `kebab-case.tsx`
- API routes: `route.ts` (HTTP method exported from file)

**Directories:**
- Feature routes: lowercase-with-hyphens (venda-rapida, historico, gestao-rh)
- Component folders: PascalCase for features, lowercase for categories (ui/)
- Utility modules: Single word (lib, utils) or grouped (lib/validations/)

**Variables & Functions:**
- Constants: UPPER_SNAKE_CASE (API keys, configuration)
- Functions: camelCase (getSession, formatBRL, requireAdmin)
- Types/Interfaces: PascalCase (SessionPayload, ActionResponse, VendaFormData)
- CSS classes: kebab-case (via Tailwind utilities)
- Database columns: snake_case in schema, camelCase in ORM (dataVenda, produtoNome)

**Components:**
- Exported React components: PascalCase
- Props interfaces: Component name + "Props" (e.g., VendaRapidaFormClientProps)
- Variant/enum values: lowercase (variant="success", size="sm")

## Where to Add New Code

**New Feature (e.g., "Contratos"):**
1. Create route: `src/app/(app)/contratos/`
2. Add page: `src/app/(app)/contratos/page.tsx` (Server Component)
3. Add actions: `src/app/(app)/contratos/actions.ts` (Server Actions)
4. Add loading: `src/app/(app)/contratos/loading.tsx` (skeleton UI)
5. Add forms: `src/components/contrato-form-client.tsx` ("use client")
6. Add validation: `src/lib/validations/contrato.ts` (Zod schema)
7. Add API endpoints: `src/app/api/contratos/route.ts` if needed
8. Add menu item: Update `src/app/(app)/layout.tsx` adminMenu or sellerMenu array

**New Component/Module:**
- Reusable components: `src/components/component-name.tsx`
- UI base component: `src/components/ui/component-name.tsx` (from shadcn/ui)
- Feature-specific: `src/components/feature-name-xxx.tsx` with clear suffix

**New API Endpoint:**
- Structure: `src/app/api/[resource]/route.ts` or `src/app/api/[resource]/[action]/route.ts`
- Pattern: Export async `GET()` or `POST()` functions
- Example: `src/app/api/contratos/[id]/route.ts` for GET/PUT/DELETE by ID

**Shared Utilities:**
- Formatting/calculations: `src/lib/utils.ts` or new domain file (finance.ts, credit.ts)
- Validation schemas: `src/lib/validations/[domain].ts`
- Type definitions: Inside the schema file or dedicated `types.ts`

**Database Model Changes:**
1. Update `prisma/schema.prisma` (add model or field)
2. Run `npm run prisma:generate` (generate Prisma client types)
3. Create migration: `npx prisma migrate dev --name describe_change`
4. Seed if needed: Update `prisma/seed.js`

## Special Directories

**`src/app/api/`:**
- Purpose: HTTP API endpoints
- Generated: No (developer-created)
- Committed: Yes
- Pattern: Each route.ts file exports request handlers (GET, POST, PUT, DELETE)
- Dynamic routes: Use `[id]` or `[...slug]` syntax for path parameters

**`prisma/migrations/`:**
- Purpose: Database schema version history
- Generated: Auto-generated by `prisma migrate dev`
- Committed: Yes (tracks schema changes across team)
- Note: Never edit manually; regenerate with `prisma migrate dev`

**`.planning/codebase/`:**
- Purpose: Architecture and quality documentation for GSD
- Generated: Manual (this file you're reading)
- Committed: Yes (guides future development)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`public/uploads/`:**
- Purpose: User-uploaded files (receipts, logos, product images)
- Generated: Runtime upload handlers
- Committed: No (added to .gitignore)
- Cleanup: Manual or via cron job

**`.next/`:**
- Purpose: Next.js build artifacts and cache
- Generated: Auto-generated by `npm run build`
- Committed: No (.gitignore)
- Clean: `rm -rf .next/` to force rebuild

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: `yarn install` or `npm install`
- Committed: No (.gitignore)
- Lockfile: `yarn.lock` (yarn package manager)

---

*Structure analysis: 2026-02-19*
