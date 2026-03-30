# Codebase Structure

**Analysis Date:** 2026-03-30

## Directory Layout

```
sistema-bfx/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout (theme, providers)
│   │   ├── page.tsx                   # Root page (redirects to /dashboard)
│   │   ├── api/                       # HTTP API routes (40+ endpoints)
│   │   │   ├── auth/                  # Authentication endpoints
│   │   │   ├── clientes/              # Client management
│   │   │   ├── produtos/              # Product endpoints
│   │   │   ├── vendas/                # Sales endpoints
│   │   │   ├── relatorios/            # Report generation (CSV, PDF, XLSX)
│   │   │   ├── assinatura/            # Signature document endpoints
│   │   │   ├── cron/                  # Scheduled tasks (8 jobs)
│   │   │   ├── webhooks/              # WhatsApp/Evolution webhooks
│   │   │   └── ...                    # Other integrations
│   │   ├── (auth)/                    # Login group (public)
│   │   │   └── login/page.tsx         # Authentication page
│   │   ├── (app)/                     # Protected app group (requires session)
│   │   │   ├── layout.tsx             # App layout (sidebar, navigation)
│   │   │   ├── dashboard/page.tsx     # Main dashboard
│   │   │   ├── venda-rapida/          # Quick sales entry
│   │   │   ├── historico/page.tsx     # Sales history
│   │   │   ├── financeiro/page.tsx    # Finance & DRE
│   │   │   ├── boletos/page.tsx       # Boleto management
│   │   │   ├── inteligencia/page.tsx  # AI chat interface
│   │   │   ├── relatorios/page.tsx    # Report viewer
│   │   │   ├── cadastros/page.tsx     # Data entry (clients, products)
│   │   │   ├── gestao-rh/page.tsx     # HR management
│   │   │   ├── comissoes/page.tsx     # Commission tracking
│   │   │   ├── importacao/page.tsx    # Bulk data import
│   │   │   ├── configuracoes/page.tsx # Settings
│   │   │   └── perfil/page.tsx        # User profile
│   │   ├── assinatura/[token]/        # Signature signing (public link)
│   │   ├── catalogo/page.tsx          # Product catalog (public)
│   │   └── offline/                   # PWA offline fallback
│   │
│   ├── components/                    # React components (92 files)
│   │   ├── ui/                        # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   ├── select.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── intelligence-chat-client.tsx    # AI chat interface (main)
│   │   ├── intelligence-chat-composer.tsx  # AI input form
│   │   ├── venda-rapida-form-client.tsx    # Quick sales form
│   │   ├── edit-venda-form-client.tsx      # Edit sales with products
│   │   ├── clientes-tab-client.tsx         # Client management table
│   │   ├── parcelas-vencimento-form.tsx    # Installment payment form
│   │   ├── gerar-boleto-button.tsx         # Boleto generation button
│   │   ├── recibo-download-link.tsx        # Receipt download link
│   │   ├── assinatura-form-client.tsx      # Signature form
│   │   ├── dashboard-charts.tsx            # Dashboard charts (recharts)
│   │   ├── finance-charts.tsx              # Financial dashboards
│   │   ├── report-buttons-client.tsx       # Report generation buttons
│   │   ├── sidebar-nav.tsx                 # Navigation menu
│   │   ├── mobile-menu-trigger.tsx         # Mobile hamburger menu
│   │   ├── theme-toggle.tsx                # Dark/light mode switch
│   │   ├── notification-bell.tsx           # Notification center
│   │   ├── masked-input.tsx                # Formatted input (CPF, phone)
│   │   ├── sortable-header.tsx             # Table column sorting
│   │   ├── month-filter.tsx                # Month/year picker
│   │   ├── delete-venda-button.tsx         # Delete sale with confirm
│   │   ├── edit-user-button.tsx            # User edit dialog
│   │   └── ...
│   │
│   ├── lib/                           # Utilities and services (38 files)
│   │   ├── db.ts                      # Prisma Client singleton
│   │   ├── session.ts                 # JWT session management
│   │   ├── action-response.ts         # Server Action response type
│   │   │
│   │   ├── ai.ts                      # AI orchestration (runAiWithActions)
│   │   ├── ai-actions.ts              # AI tool definitions & schemas (50+ actions)
│   │   ├── mcp.ts                     # MCP tool integration
│   │   │
│   │   ├── boleto-actions.ts          # Server Action: generate Asaas boleto
│   │   ├── asaas.ts                   # Asaas SDK wrapper
│   │   ├── whatsapp.ts                # WhatsApp API client
│   │   ├── evolution.ts               # Evolution API wrapper
│   │   ├── minio.ts                   # MinIO/S3 client
│   │   ├── uber.ts                    # Uber Freight API
│   │   │
│   │   ├── db-search.ts               # Fuzzy search utilities (cliente, produto, fornecedor)
│   │   ├── venda-utils.ts             # Sale calculations (total, margin, commission)
│   │   ├── finance.ts                 # Financial calculations (DRE, cash flow)
│   │   ├── comissoes-utils.ts         # Commission calculations
│   │   ├── parcelas.ts                # Installment utilities
│   │   │
│   │   ├── recibo-pdf.ts              # PDF generation (receipt, contract)
│   │   ├── recibo-url.ts              # Receipt URL generation
│   │   ├── documento-service.ts       # Document storage (Documento model)
│   │   │
│   │   ├── guards.ts                  # Authorization helpers
│   │   ├── audit.ts                   # Audit logging
│   │   ├── credit.ts                  # Credit limit checks
│   │   │
│   │   ├── ncm.ts                     # NCM (product code) lookup
│   │   ├── masks.ts                   # Input formatting (CPF, CNPJ, phone)
│   │   ├── utils.ts                   # General utilities (formatBRL, cn, etc.)
│   │   ├── animations.ts              # Animation CSS classes
│   │   ├── design-tokens.ts           # Design system tokens
│   │   ├── use-query-param.tsx        # URL search params hook
│   │   ├── whatsapp-pre-atendimento.ts # AI pre-attendance for WhatsApp
│   │   ├── validations/               # Zod schemas
│   │   │   ├── auth.ts                # Login validation
│   │   │   ├── cliente.ts             # Client form validation
│   │   │   ├── produto.ts             # Product form validation
│   │   │   ├── venda.ts               # Sales form validation
│   │   │   └── importacao.ts          # Import validation
│   │   └── ...
│   │
│   ├── hooks/                         # React hooks (1 file)
│   │   └── use-table-features.ts      # Pagination, sorting, filtering logic
│   │
│   └── generated/                     # Generated files (do not edit)
│       └── prisma/                    # Prisma Client generated types
│           └── runtime/
│
├── prisma/
│   ├── schema.prisma                  # Database schema (14 models)
│   ├── migrations/                    # Database migrations
│   │   ├── 20260324000000_add_produto_data_compra/
│   │   ├── 20260327000002_add_antecipacao_batch/
│   │   └── 20260226130000_add_asaas_config/
│   ├── seed.js                        # Database seeding script
│   ├── import_sqlite.js               # Legacy SQLite import
│   └── import-vendas-sqlite.js        # Legacy sales import
│
├── deploy/
│   └── bfx/                           # Kubernetes manifests (ArgoCD)
│       ├── kustomization.yaml         # Kustomize base
│       ├── namespace.yaml             # K8s namespace creation
│       ├── app.yaml                   # Deployment + Service for app
│       ├── postgres.yaml              # StatefulSet + PVC for PostgreSQL
│       ├── secrets.yaml               # ConfigMap placeholder
│       ├── serviceaccount.yaml        # ServiceAccount for app pod
│       ├── ingress.yaml               # Ingress routing
│       ├── cronjob-cleanup-uploads.yaml # CronJob for cleanup
│       └── evolution-api.yaml         # Evolution API deployment
│
├── public/
│   ├── manifest.json                  # PWA manifest
│   └── icons/                         # App icons (192x192, 512x512)
│
├── tests/                             # Test files (if any)
├── docs/                              # Documentation
├── scripts/                           # One-off scripts
│   ├── gerar-recibo-assinado-95.ts   # PDF generation for receipt
│   ├── reset-assinatura.ts           # Signature data cleanup
│   └── ...
│
├── package.json                       # NPM dependencies
├── tsconfig.json                      # TypeScript configuration
├── next.config.js                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.mjs                 # PostCSS configuration
├── eslint.config.js                   # ESLint configuration
├── Dockerfile                         # Container image definition
└── docker-compose.yml                 # Local development stack
```

## Directory Purposes

**src/app:**
- Purpose: Next.js 15 App Router page hierarchy and API routes
- Contains: Page components, layouts, API handlers
- Key files: `(app)/layout.tsx` (protected wrapper), `api/` (40+ endpoints)

**src/components:**
- Purpose: Reusable React components, both UI primitives and domain-specific
- Contains: 92 components including forms, charts, tables, dialogs
- Key files: `intelligence-chat-client.tsx` (main AI interface), form components

**src/lib:**
- Purpose: Utilities, services, and business logic
- Contains: Database access, AI orchestration, integrations, calculations, validation
- Key files: `ai.ts` (AI entry point), `ai-actions.ts` (tool definitions), `db.ts` (Prisma singleton)

**prisma:**
- Purpose: Database schema, migrations, and seeding
- Contains: 14 data models, migration files, legacy import scripts
- Key files: `schema.prisma` (database structure)

**deploy/bfx:**
- Purpose: Kubernetes manifests for production deployment
- Contains: Deployment configs, StatefulSet for PostgreSQL, Ingress routing, CronJobs
- Key files: `kustomization.yaml` (composition), `app.yaml` (main app), `postgres.yaml` (database)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML setup (fonts, theme provider, PWA register)
- `src/app/(app)/layout.tsx`: Protected app layout (session check, sidebar)
- `src/app/(auth)/login/page.tsx`: Authentication endpoint

**Configuration:**
- `src/lib/db.ts`: Prisma Client singleton (import everywhere)
- `src/lib/session.ts`: JWT token creation/verification
- `prisma/schema.prisma`: All database models and relationships

**Core Logic:**
- `src/lib/ai.ts`: Main AI orchestrator `runAiWithActions()`
- `src/lib/ai-actions.ts`: Tool definitions with Zod schemas
- `src/lib/boleto-actions.ts`: Asaas boleto generation Server Action
- `src/lib/venda-utils.ts`: Sale calculations (total, margin, taxes)
- `src/lib/finance.ts`: Financial reports (DRE, cash flow)

**Testing:**
- `src/**/*.test.ts` (none currently — testing patterns not established)
- See TESTING.md for patterns

**Reports:**
- `src/app/api/relatorios/vendas/route.ts`: CSV export
- `src/app/api/relatorios/vendas/pdf/route.ts`: PDF report
- `src/app/api/relatorios/catalogo/route.ts`: Product catalog

**Integrations:**
- `src/lib/asaas.ts`: Boleto API client
- `src/lib/whatsapp.ts`: WhatsApp message sending
- `src/lib/evolution.ts`: Evolution API wrapper
- `src/lib/minio.ts`: File storage client

## Naming Conventions

**Files:**

- **Page components:** `page.tsx` in route directories (Next.js convention)
- **Client components:** `*-client.tsx` (e.g., `venda-rapida-form-client.tsx`) — signals `"use client"` directive
- **Server actions:** `*-actions.ts` (e.g., `boleto-actions.ts`) — contains `"use server"` boundary
- **UI components:** lowercase with hyphens (e.g., `input.tsx`, `card.tsx`) in `src/components/ui/`
- **Utilities:** lowercase with hyphens (e.g., `db-search.ts`, `venda-utils.ts`)
- **Hooks:** `use-*` pattern (e.g., `use-table-features.ts`)
- **Validation schemas:** `*.ts` in `src/lib/validations/` by domain (e.g., `cliente.ts`, `venda.ts`)

**Directories:**

- **Route groups:** Parentheses for logical grouping, non-URL (e.g., `(app)`, `(auth)`)
- **API routes:** Snake-case matching resource names (e.g., `/api/clientes/`, `/api/relatorios/vendas/`)
- **Feature folders:** Lowercase with hyphens (e.g., `src/app/configuracoes/`)

**Functions:**

- **Server actions:** camelCase, descriptive (e.g., `gerarBoletoAsaas()`, `askAi()`, `addAssistantMessage()`)
- **Utilities:** camelCase (e.g., `valorTotalVenda()`, `calcularDre()`, `formatBRL()`)
- **AI actions:** snake_case for tool names (e.g., `listar_clientes`, `criar_venda`, `resumo_financeiro`)
- **React hooks:** camelCase with `use` prefix (e.g., `useTableFeatures()`)

**Variables & Constants:**

- **Constants:** UPPER_SNAKE_CASE for global config (e.g., `TABLE_BLOCK_RE`, `SYSTEM_PROMPT`)
- **Types:** PascalCase for TS types (e.g., `SessionPayload`, `ActionResponse`, `ProdutoItem`)
- **Regular variables:** camelCase (e.g., `selectedCliente`, `produtoSuggestions`)

## Where to Add New Code

**New Feature (e.g., sales with tracking):**

1. **Database Model:** Add to `prisma/schema.prisma`
2. **Migration:** Run `npx prisma migrate dev --name add_tracking`
3. **API Endpoint:** Create `src/app/api/tracking/route.ts` (GET) or use Server Action
4. **Page:** Create `src/app/(app)/tracking/page.tsx`
5. **Form Component:** Create `src/components/tracking-form-client.tsx`
6. **Utilities:** Add calculations to `src/lib/tracking-utils.ts`
7. **Validation:** Add Zod schema to `src/lib/validations/tracking.ts`

**New Component/Module:**

- **Presentational:** Place in `src/components/` with descriptive name
- **Reusable logic:** Extract to `src/lib/[domain]-utils.ts`
- **Data fetching:** Keep in Server Components or use API routes
- **Interactions:** Use Client Components with `"use client"` marker

**New API Route:**

- Location: `src/app/api/[resource]/route.ts` following REST conventions
- Pattern: Read query params, call Prisma, return Response
- Example: `src/app/api/relatorios/vendas/route.ts` returns CSV

**New AI Action:**

1. Add schema to `actionParamSchemas` in `src/lib/ai-actions.ts`
2. Add definition to `aiActions` array with name, description, handler
3. Handler executes Prisma queries, returns formatted data
4. Add role restrictions if admin-only
5. Test in intelligence page with prompt

**Utilities/Helpers:**

- **Shared calculations:** `src/lib/[domain]-utils.ts`
- **Database queries:** Keep in API routes or Server Components, don't create separate DAL
- **Formatting:** `src/lib/utils.ts` for general, domain-specific in `src/lib/[domain]-utils.ts`

## Special Directories

**src/generated/prisma:**
- Purpose: Prisma Client auto-generated types and client
- Generated: Yes, by `npx prisma generate`
- Committed: Yes (safe to commit generated Prisma client)
- Note: Do not edit manually

**public/:**
- Purpose: Static assets served directly by Next.js
- Contains: PWA manifest, app icons, favicon
- Committed: Yes
- Note: Files here accessible at `/[filename]`

**deploy/bfx/:**
- Purpose: Kubernetes infrastructure-as-code (ArgoCD synced)
- Contains: Manifests for app, database, ingress, cron jobs
- Committed: Yes (critical for production)
- Note: Changes trigger automatic deployments via ArgoCD

**scripts/:**
- Purpose: One-off utility scripts for manual execution
- Contains: PDF generation, data cleanup, imports
- Committed: Yes
- Note: Run with `npx tsx scripts/[script].ts`

**.next/:**
- Purpose: Build output directory (Next.js)
- Generated: Yes, by `npm run build`
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes, by `npm install` or `yarn install`
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-30*
