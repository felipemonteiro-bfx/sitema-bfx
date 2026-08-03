# Codebase Structure

**Analysis Date:** 2026-08-03

## Directory Layout

```
sistema-bfx/
├── src/
│   ├── app/                           # Next.js 15 App Router
│   │   ├── layout.tsx                 # Root layout (theme, providers, PWA)
│   │   ├── page.tsx                   # Root page (session check → redirect)
│   │   ├── middleware.ts              # JWT auth for /api/* routes
│   │   ├── api/                       # HTTP API routes (40+ endpoints)
│   │   │   ├── auth/                  # Authentication (login, logout)
│   │   │   ├── clientes/              # Client CRUD + search
│   │   │   ├── produtos/              # Product CRUD + upload
│   │   │   │   ├── upload/route.ts    # Image upload (MinIO fallback)
│   │   │   │   └── autocomplete/      # Product search
│   │   │   ├── vendas/                # Sales list + create
│   │   │   ├── relatorios/            # Report generation (CSV, PDF)
│   │   │   ├── assinatura/            # Signature flow (document sign)
│   │   │   │   └── documento/route.ts # Document storage
│   │   │   ├── cron/                  # Scheduled tasks (8 jobs)
│   │   │   │   ├── cleanup-uploads/   # File cleanup (Sundays 03:00 UTC)
│   │   │   │   ├── lembrete-parcelas/ # Payment reminders
│   │   │   │   └── ...
│   │   │   ├── webhooks/              # External callbacks
│   │   │   │   └── evolution/         # WhatsApp webhooks
│   │   │   ├── upload-logo/           # Logo upload
│   │   │   ├── recibo/                # Receipt PDF generation
│   │   │   ├── search/                # Unified search (clients, products)
│   │   │   └── ...                    # Other integrations
│   │   ├── (auth)/                    # Public routes (no auth required)
│   │   │   ├── layout.tsx             # Auth layout
│   │   │   └── login/page.tsx         # Login form
│   │   ├── (app)/                     # Protected routes (requires session)
│   │   │   ├── layout.tsx             # App layout (sidebar, guards)
│   │   │   ├── dashboard/page.tsx     # Main dashboard
│   │   │   ├── venda-rapida/          # Quick sales entry (PDV)
│   │   │   │   ├── page.tsx           # Form page
│   │   │   │   ├── actions.ts         # criarVendaV2 Server Action
│   │   │   │   └── loading.tsx        # Loading state
│   │   │   ├── historico/page.tsx     # Sales history + edit
│   │   │   ├── financeiro/page.tsx    # Finance & DRE reports
│   │   │   ├── boletos/page.tsx       # Boleto management
│   │   │   ├── prudent/page.tsx       # Advance payments (Prudent)
│   │   │   ├── inteligencia/page.tsx  # AI chat interface
│   │   │   ├── relatorios/page.tsx    # Report viewer
│   │   │   ├── cadastros/page.tsx     # Data entry (clients, products)
│   │   │   ├── gestao-rh/page.tsx     # HR management
│   │   │   ├── comissoes/page.tsx     # Commission tracking
│   │   │   ├── importacao/page.tsx    # Bulk data import
│   │   │   ├── configuracoes/page.tsx # Settings
│   │   │   ├── perfil/page.tsx        # User profile
│   │   │   ├── error.tsx              # Error boundary
│   │   │   └── loading.tsx            # Loading fallback
│   │   ├── assinatura/[token]/        # Signature signing (public, tokenized)
│   │   ├── catalogo/page.tsx          # Product catalog (public)
│   │   ├── offline/                   # PWA offline fallback
│   │   ├── global-error.tsx           # Global error handler
│   │   └── not-found.tsx              # 404 page
│   │
│   ├── components/                    # React components (92+ files)
│   │   ├── ui/                        # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   ├── select.tsx
│   │   │   ├── card.tsx
│   │   │   ├── date-input.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ... (30+ more)
│   │   │
│   │   ├── intelligence-chat-client.tsx    # AI chat main interface (Client)
│   │   ├── intelligence-chat-composer.tsx  # AI input form
│   │   ├── venda-rapida-form-v2.tsx        # Quick sales form (Client)
│   │   ├── produto-item-form.tsx           # Product line item editor
│   │   ├── parcelas-vencimento-form.tsx    # Installment schedule
│   │   │
│   │   ├── clientes-tab-client.tsx         # Client list table (Client)
│   │   ├── productos-tab-client.tsx        # Product list table
│   │   │
│   │   ├── gerar-boleto-button.tsx         # Boleto generation button
│   │   ├── recibo-download-link.tsx        # Receipt download
│   │   ├── link-assinatura-button.tsx      # Signature link + QR code
│   │   ├── assinatura-form-client.tsx      # Signature form
│   │   │
│   │   ├── dashboard-charts.tsx            # Dashboard charts (recharts)
│   │   ├── finance-charts.tsx              # Financial dashboards
│   │   ├── report-buttons-client.tsx       # Report export buttons
│   │   │
│   │   ├── sidebar-nav.tsx                 # Navigation menu (links by role)
│   │   ├── mobile-menu-trigger.tsx         # Mobile hamburger menu
│   │   ├── theme-toggle.tsx                # Dark/light mode switch
│   │   ├── notification-bell.tsx           # Notification center
│   │   ├── page-header.tsx                 # Page title + breadcrumbs
│   │   │
│   │   ├── masked-input.tsx                # Formatted input (CPF, phone)
│   │   ├── currency-input.tsx              # BRL currency input
│   │   ├── form-select.tsx                 # Accessible select
│   │   ├── sortable-header.tsx             # Table column sorting
│   │   ├── month-filter.tsx                # Month/year picker
│   │   ├── date-range-picker.tsx           # Date range selection
│   │   │
│   │   ├── delete-venda-button.tsx         # Delete sale with confirm
│   │   ├── edit-user-button.tsx            # User edit dialog
│   │   ├── logout-button.tsx               # Logout button
│   │   ├── theme-provider.tsx              # Theme context provider
│   │   ├── toaster-responsive.tsx          # Toast container
│   │   ├── pwa-register.tsx                # PWA service worker
│   │   ├── bfx-intelligence-panel.tsx      # AI panel component
│   │   ├── markdown-content.tsx            # Markdown + table renderer
│   │   │
│   │   └── ... (50+ more domain components)
│   │
│   ├── lib/                           # Utilities & services (40+ files)
│   │   ├── db.ts                      # Prisma Client singleton
│   │   ├── session.ts                 # JWT token creation/verification
│   │   ├── action-response.ts         # Server Action response type
│   │   ├── guards.ts                  # Authorization helpers
│   │   │
│   │   ├── ai.ts                      # Main AI orchestrator (runAiWithActions)
│   │   ├── ai-actions.ts              # AI tool definitions (50+ actions)
│   │   ├── mcp.ts                     # MCP tool integration adapter
│   │   │
│   │   ├── asaas.ts                   # Boleto API client
│   │   ├── boleto-actions.ts          # Boleto generation Server Action
│   │   ├── whatsapp.ts                # WhatsApp API client
│   │   ├── evolution.ts               # Evolution API wrapper
│   │   ├── minio.ts                   # MinIO/S3 client
│   │   ├── uber.ts                    # Uber Freight API
│   │   ├── email.ts                   # Email sending
│   │   │
│   │   ├── venda-item-validation.ts   # Sale item integrity checks
│   │   ├── venda-utils.ts             # Sale calculations
│   │   ├── finance.ts                 # Financial reports (DRE, cash flow)
│   │   ├── comissoes-utils.ts         # Commission calculations
│   │   ├── parcelas.ts                # Installment utilities
│   │   ├── credit.ts                  # Credit limit validation
│   │   │
│   │   ├── recibo-pdf.ts              # PDF generation (receipt, contract)
│   │   ├── recibo-url.ts              # Receipt URL signing
│   │   ├── documento-service.ts       # Document storage service
│   │   │
│   │   ├── db-search.ts               # Fuzzy search (cliente, produto)
│   │   ├── ncm.ts                     # NCM (product code) lookup
│   │   ├── forma-pagamento.ts         # Payment method enum/converters
│   │   ├── audit.ts                   # Audit logging
│   │   │
│   │   ├── masks.ts                   # Input formatting (CPF, CNPJ, phone)
│   │   ├── utils.ts                   # General utilities (formatBRL, cn, etc.)
│   │   ├── animations.ts              # Animation CSS class helpers
│   │   ├── design-tokens.ts           # Design system tokens
│   │   ├── use-query-param.tsx        # URL search params hook
│   │   ├── whatsapp-pre-atendimento.ts # AI pre-attendance logic
│   │   │
│   │   ├── validations/               # Zod schemas by domain
│   │   │   ├── auth.ts                # Login validation
│   │   │   ├── cliente.ts             # Client form validation
│   │   │   ├── produto.ts             # Product form validation
│   │   │   ├── venda.ts               # Sales form validation (vendaV2Schema)
│   │   │   └── importacao.ts          # Import file validation
│   │   │
│   │   ├── env.ts                     # Environment variable validation
│   │   ├── build-cadastros-url.ts     # URL builders
│   │   └── ...
│   │
│   ├── hooks/                         # React hooks (1 file)
│   │   └── use-table-features.ts      # Pagination, sorting, filtering
│   │
│   ├── __tests__/                     # Unit tests (9 test files)
│   │   ├── venda-item-validation.test.ts
│   │   ├── credit.test.ts
│   │   ├── guards.test.ts
│   │   ├── comissoes-utils.test.ts
│   │   └── ... (5 more)
│   │
│   └── generated/                     # Auto-generated (do not edit)
│       └── prisma/                    # Prisma Client types
│
├── prisma/
│   ├── schema.prisma                  # Database schema (14 models)
│   ├── migrations/                    # Database migrations (50+ files)
│   ├── seed.js                        # Database seeding script
│   ├── import_sqlite.js               # Legacy SQLite import
│   └── import-vendas-sqlite.js        # Legacy sales import
│
├── deploy/
│   └── bfx/                           # Kubernetes manifests (ArgoCD)
│       ├── kustomization.yaml         # Kustomize base
│       ├── namespace.yaml             # K8s namespace creation
│       ├── app.yaml                   # Deployment + Service
│       ├── postgres.yaml              # StatefulSet + PVC
│       ├── evolution-api.yaml         # Evolution API + ConfigMap
│       ├── secrets.yaml               # ConfigMap placeholder
│       ├── serviceaccount.yaml        # ServiceAccount
│       ├── ingress.yaml               # Ingress routing (traefik)
│       ├── cronjob-cleanup-uploads.yaml # CronJob cleanup
│       ├── ecr-creds-renew.yaml       # ECR credentials refresh
│       └── .argocd-source-sistema-bfx.yaml
│
├── k8s/                               # Kubernetes local configs
├── nginx/                             # NGINX configs
├── design-system/                     # Design tokens documentation
│
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── icons/                         # App icons (192x192, 512x512, etc.)
│   └── uploads/                       # User uploads (ephemeral on pod)
│
├── docs/                              # Documentation
├── scripts/                           # One-off utility scripts
│   ├── gerar-recibo-assinado-95.ts   # PDF generation
│   ├── reset-assinatura.ts           # Signature cleanup
│   └── sync-vendas-hoje.js           # Sales sync
│
├── tests/                             # E2E/integration tests
│   └── venda-rapida-dropdown.spec.ts
│
├── .claude/                           # Claude configuration
│   └── settings.json
│
├── .github/                           # GitHub Actions CI/CD
├── .planning/                         # GSD planning & analysis
│   ├── codebase/                      # This directory
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   ├── CONVENTIONS.md
│   │   ├── TESTING.md
│   │   ├── STACK.md
│   │   ├── INTEGRATIONS.md
│   │   └── CONCERNS.md
│   └── quick/                         # Quick notes & sketches
│
├── package.json                       # NPM dependencies (Yarn)
├── yarn.lock                          # Dependency lock file
├── tsconfig.json                      # TypeScript configuration
├── next.config.ts                     # Next.js configuration (output: "standalone")
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.js                  # PostCSS configuration
├── eslint.config.mjs                  # ESLint configuration
├── components.json                    # shadcn/ui configuration
├── Dockerfile                         # Multi-stage build (deps → builder → runner)
├── Dockerfile.dev                     # Development Dockerfile
├── docker-compose.yml                 # Local dev stack
├── docker-compose.evolution.yml       # Evolution API stack
│
├── CLAUDE.md                          # Claude-specific instructions (important!)
├── DARK_MODE_IMPROVEMENTS.md          # Feature notes
├── README.md                          # Project overview
├── Makefile                           # Common tasks
└── .env.example                       # Environment variables template
```

## Directory Purposes

**src/app:**
- Purpose: Next.js 15 App Router page hierarchy and API routes
- Contains: Page components (Server Components by default), layouts, API handlers, middleware
- Key files: `(app)/layout.tsx` (protected), `(auth)/login/page.tsx` (public), `middleware.ts` (JWT verification)
- Note: Using route groups `(app)` and `(auth)` to organize public vs. protected routes

**src/components:**
- Purpose: Reusable React components (UI primitives + domain-specific features)
- Contains: 92+ components including forms, charts, tables, dialogs
- Key files: `intelligence-chat-client.tsx` (AI interface), `venda-rapida-form-v2.tsx` (sales form)
- Pattern: Client Components marked with `"use client"` for interactivity

**src/lib:**
- Purpose: Utilities, services, business logic, database access
- Contains: AI orchestration, integrations, validations, calculations, audit logging
- Key files: `ai.ts` (LLM entry), `ai-actions.ts` (tool definitions), `db.ts` (Prisma singleton)
- Organization: By domain (ai.ts, asaas.ts, whatsapp.ts, etc.) + by concern (validation, utils, guards)

**prisma:**
- Purpose: Database schema, migrations, seeding
- Contains: 14 data models, 50+ migration files, import scripts
- Key files: `schema.prisma` (complete database structure)
- Note: Uses Prisma Migrate; migrations idempotent (safe for deployments)

**deploy/bfx:**
- Purpose: Kubernetes manifests for production deployment (ArgoCD synced)
- Contains: Deployment, StatefulSet (postgres), Ingress, Services, CronJobs, ConfigMaps
- Key files: `app.yaml` (main app), `postgres.yaml` (database), `ingress.yaml` (routing)
- Topology: app pod + postgres StatefulSet + evolution-api + cleanup CronJob

**public/uploads:**
- Purpose: Ephemeral file storage on pod filesystem
- Contains: Product images, receipts, uploaded files
- Persistence: LOST on pod restart (no persistent volume). Use MinIO for production.
- Cleanup: CronJob deletes unreferenced files older than 90 days

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML (fonts, theme, PWA, providers)
- `src/app/(app)/layout.tsx`: Protected app layout (session check, sidebar navigation)
- `src/app/(auth)/login/page.tsx`: Login page (public)
- `src/app/page.tsx`: Root → redirects based on session

**Configuration:**
- `src/lib/db.ts`: Prisma Client singleton (import in all server code)
- `src/lib/session.ts`: JWT token creation/verification
- `prisma/schema.prisma`: All database models, relationships, constraints

**Core Business Logic:**
- `src/app/(app)/venda-rapida/page.tsx`: PDV entry point (server component)
- `src/components/venda-rapida-form-v2.tsx`: Form UI (client component)
- `src/components/produto-item-form.tsx`: Line item editor
- `src/app/(app)/venda-rapida/actions.ts`: `criarVendaV2` Server Action
- `src/lib/venda-item-validation.ts`: Item validation (subtotal, cost checks)

**AI System:**
- `src/lib/ai.ts`: `runAiWithActions()` main orchestrator
- `src/lib/ai-actions.ts`: All tool definitions (50+ actions)
- `src/lib/mcp.ts`: MCP tool adapter
- `src/components/intelligence-chat-client.tsx`: AI chat UI

**API & Integration:**
- `src/app/api/produtos/upload/route.ts`: Product image upload (MinIO or local fallback)
- `src/app/api/cron/cleanup-uploads/route.ts`: File cleanup CronJob
- `src/app/recibo/route.ts`: Receipt PDF generation
- `src/lib/asaas.ts`: Boleto API client
- `src/lib/whatsapp.ts`: WhatsApp message sender
- `src/lib/evolution.ts`: Evolution API wrapper

**Validation & Guards:**
- `src/lib/validations/venda.ts`: `vendaV2Schema` (Zod)
- `src/lib/guards.ts`: Authorization checks
- `src/lib/venda-item-validation.ts`: Business rule validation

**Testing:**
- `src/__tests__/venda-item-validation.test.ts`: Item validation tests
- `src/__tests__/credit.test.ts`: Credit limit tests
- `vitest.config.ts`: Test runner configuration (located at root)

**Reports & Export:**
- `src/app/api/relatorios/vendas/route.ts`: Sales CSV export
- `src/app/api/relatorios/vendas/pdf/route.ts`: Sales PDF report
- `src/app/api/catalogo/route.ts`: Product catalog PDF

## Naming Conventions

**Files:**

- **Page components:** `page.tsx` in route directories (Next.js convention)
- **Client components:** `*-client.tsx` (e.g., `venda-rapida-form-v2.tsx`) — indicates `"use client"` boundary
- **Server actions:** `*-actions.ts` (e.g., `venda-rapida/actions.ts`) — contains `"use server"` functions
- **UI components:** lowercase with hyphens (e.g., `input.tsx`, `button.tsx`) in `src/components/ui/`
- **Domain utilities:** `*-utils.ts` or `*-service.ts` (e.g., `venda-utils.ts`, `recibo-pdf.ts`)
- **Hooks:** `use-*` pattern (e.g., `use-table-features.ts`)
- **Validation schemas:** `*.ts` in `src/lib/validations/` by domain (e.g., `venda.ts`, `cliente.ts`)
- **Integration clients:** `*-client.ts` or direct (e.g., `asaas.ts`, `minio.ts`, `evolution.ts`)

**Directories:**

- **Route groups:** Parentheses for logical organization, non-URL (e.g., `(app)`, `(auth)`)
- **API routes:** Snake-case matching resource (e.g., `/api/clientes/`, `/api/relatorios/vendas/`)
- **Feature folders:** Kebab-case (e.g., `venda-rapida/`, `gestao-rh/`, `inteligencia/`)
- **Internal organization:** `ui/` for primitives, no subdirs for domain components

**Functions & Types:**

- **Server actions:** camelCase, descriptive (e.g., `criarVendaV2()`, `askAi()`, `gerarBoletoAsaas()`)
- **Utilities:** camelCase (e.g., `valorTotalVenda()`, `formatBRL()`, `calcularDre()`)
- **AI tool names:** snake_case (e.g., `listar_clientes`, `criar_venda`, `registrar_entrada_estoque`)
- **React components:** PascalCase (e.g., `VendaRapidaFormV2`, `ProdutoItemForm`)
- **React hooks:** camelCase with `use` prefix (e.g., `useTableFeatures()`)
- **Types:** PascalCase (e.g., `SessionPayload`, `ActionResponse`, `ProdutoItem`, `FormaPagamento`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `TABLE_BLOCK_RE`, `SYSTEM_PROMPT`, `MAX_AGE_DAYS`)
- **Regular variables:** camelCase (e.g., `selectedClient`, `produtoItems`, `isLoading`)

## Where to Add New Code

**New Feature (e.g., sales tracking module):**

1. **Database:** Add model to `prisma/schema.prisma`
2. **Migration:** `npx prisma migrate dev --name add_tracking`
3. **API:** Create `src/app/api/tracking/route.ts` (GET/POST handlers) or use Server Action
4. **Page:** Create `src/app/(app)/tracking/page.tsx` (Server Component)
5. **Form:** Create `src/components/tracking-form-client.tsx` (Client Component)
6. **Logic:** Add utilities to `src/lib/tracking-utils.ts`
7. **Validation:** Add Zod schema to `src/lib/validations/tracking.ts`
8. **Tests:** Add `src/__tests__/tracking.test.ts` (vitest)
9. **Navigation:** Add link to menu in `src/app/(app)/layout.tsx`

**New Component/Widget:**

- **Presentational (no state):** Place in `src/components/` with PascalCase name
- **Stateful (interactive):** Mark with `"use client"` if using hooks
- **Reusable logic:** Extract calculations to `src/lib/[domain]-utils.ts`
- **Data fetching:** Keep in Server Component or use API route

**New API Endpoint:**

- Location: `src/app/api/[resource]/[action]/route.ts`
- Pattern: Handle GET/POST, query params, call Prisma, return Response
- Example: `src/app/api/relatorios/vendas/route.ts` for CSV export
- Middleware: JWT auth via `src/middleware.ts` (verify token in cookie)

**New AI Action/Tool:**

1. Add to `aiActions` array in `src/lib/ai-actions.ts`
2. Define schema in `actionParamSchemas`
3. Implement handler function (execute Prisma + format result)
4. Add `roles: ["admin"]` if admin-only
5. Test in Intelligence page

**Utilities/Helpers:**

- **Shared calculations:** `src/lib/[domain]-utils.ts` (exported, reusable functions)
- **Database queries:** Keep in API routes or Server Components, no separate DAL layer
- **Formatting/Masking:** `src/lib/utils.ts` for general, `src/lib/masks.ts` for input masks
- **Validation:** Zod schemas in `src/lib/validations/[domain].ts`

## Special Directories

**src/generated/prisma:**
- Purpose: Auto-generated Prisma Client types and runtime
- Generated: Yes, by `npx prisma generate` (runs as prebuild hook)
- Committed: Yes (safe to commit; part of build)
- Edit: Do not edit manually; regenerate if schema changes

**src/__tests__/:**
- Purpose: Unit tests for utilities and business logic
- Framework: Vitest
- Pattern: Test files co-located by domain (e.g., `venda-item-validation.test.ts`)
- Run: `npm run test` (one-off) or `npm run test:watch` (continuous)

**public/uploads/:**
- Purpose: Ephemeral file storage on pod filesystem
- Persistence: EPHEMERAL (lost on pod restart)
- Cleanup: CronJob deletes unreferenced files > 90 days old
- Production: Use MinIO/S3 instead (set via env var)

**deploy/bfx/:**
- Purpose: Kubernetes manifests (ArgoCD-synced to production)
- Committed: Yes (critical infrastructure)
- Changes: Trigger automatic deployments
- Management: Apply via `kubectl apply -k deploy/bfx/` locally

**scripts/:**
- Purpose: One-off utility scripts for manual execution
- Run: `npx tsx scripts/[name].ts`
- Examples: PDF generation, data migration, cleanup
- Committed: Yes (useful for future operators)

**.next/:**
- Purpose: Build output directory
- Generated: Yes, by `npm run build`
- Committed: No (.gitignore)

**node_modules/:**
- Purpose: Installed dependencies (Yarn)
- Generated: Yes, by `yarn install`
- Committed: No (.gitignore)

---

*Structure analysis: 2026-08-03*
