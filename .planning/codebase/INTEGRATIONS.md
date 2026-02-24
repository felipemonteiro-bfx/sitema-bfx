# External Integrations

**Analysis Date:** 2026-02-19

## APIs & External Services

**Artificial Intelligence:**
- OpenAI API - LLM and text generation
  - SDK: `@ai-sdk/openai` + `openai` (direct SDK)
  - Auth: `Config.openaiKey` stored in database (`prisma/schema.prisma`)
  - Models: gpt-4o-mini
  - Integration file: `src/lib/ai.ts`, `src/lib/ai-actions.ts`

- Google Generative AI (Gemini) - LLM alternative
  - SDK: `@ai-sdk/google` + `@google/generative-ai`
  - Auth: `Config.geminiKey` stored in database
  - Models: gemini-2.5-flash
  - Integration file: `src/lib/ai.ts`

**NCM (Nomenclatura Comum do MERCOSUL) Database:**
- Custom integration via `searchNcm()` function
- Location: `src/lib/ncm.ts`
- Purpose: Brazilian product classification code lookup
- Endpoint: `GET /api/ncm/search?q=<query>`

## Data Storage

**Primary Database:**
- PostgreSQL 16+
  - Connection: `DATABASE_URL` env var
  - Client: Prisma Client (`@prisma/client`)
  - Schema: `prisma/schema.prisma`
  - Tables: Cliente, Produto, Venda, ItemVenda, ParcelaVencimento, Config, Usuario, Fornecedor, EmpresaParceira, Pagamento, AuditLog, Despesa, Aviso

**Optional Secondary Database:**
- SQLite (via `better-sqlite3` package)
  - Used for: Data import/migration only (`prisma/import_sqlite.js`)
  - Not used in runtime

**File Storage:**
- Local filesystem only
  - Product images: `public/` directory
  - Logo uploads: `public/` directory configured in `Config.logoPath`
  - PDF generation: Server-side temporary (in-memory via pdf-lib)
  - Upload endpoint: `POST /api/upload-logo`

**Caching:**
- None configured - all queries hit PostgreSQL directly
- Client-side React Query pattern via `fetch()` in components

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication
  - Implementation: `src/lib/session.ts`
  - Algorithm: HS256
  - Token expiration: 7 days
  - Storage: HTTP-only cookie named "session"

**Login Mechanism:**
- Username/password stored in `Usuario` table
- Endpoint: `POST /api/auth/login`
- Session creation: `createSessionToken()` (jose library)
- Location: `src/app/api/auth/login/route.ts`

**Authorization:**
- Role-based access control (RBAC)
  - Roles: "admin" | "vendedor"
  - Checked in protected routes and API handlers
  - User data available via `getSession()` from cookies

**Logout:**
- Endpoint: `POST /api/auth/logout`
- Location: `src/app/api/auth/logout/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected - no Sentry, Bugsnag, or similar configured

**Logs:**
- Prisma: Configured to log errors only (`log: ["error"]`)
- Audit trail: Custom `AuditLog` table in database
  - Fields: id, dataHora, usuario, acao, detalhes
  - Location: `prisma/schema.prisma`
  - Populated in `src/lib/ai-actions.ts` line 426

**Performance Monitoring:**
- Not detected - no New Relic or Datadog

## CI/CD & Deployment

**Hosting:**
- Docker containerization supported (`Dockerfile`, `docker-compose.yml`)
- Platform: Any Kubernetes-compatible or Docker-capable host
- Port: 3000 (configurable)

**CI Pipeline:**
- GitHub Actions workflow files in `.github/` directory
- Not fully examined - appears to have automatic update workflows

**Build Process:**
- `yarn build` - Compiles Next.js
- `npx prisma generate` - Generates Prisma client
- `npx prisma migrate deploy` - Runs pending migrations
- Multi-stage Docker build for production optimization

**Database Migrations:**
- Managed via Prisma migrations
- Command: `db:migrate` → `npx prisma migrate deploy`
- Auto-run on Docker startup (`Dockerfile` line 46)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/db?schema=public`)
- `SESSION_SECRET` - JWT signing secret (minimum 16 chars recommended)
- `NEXT_PUBLIC_APP_URL` - Public base URL (e.g., `https://seu-dominio.com`)

**Optional env vars:**
- `NODE_ENV` - Set to "production" for production builds
- `NEXT_DISABLE_TURBOPACK` - Set to 1 for production builds
- `PORT` - Server port (default 3000)
- `HOSTNAME` - Bind address (default 0.0.0.0)

**Secret Storage:**
- OpenAI key: Stored in `Config.openaiKey` (database)
- Gemini key: Stored in `Config.geminiKey` (database)
- Session secret: Environment variable only (not in database)
- No `.env` file in Git (excluded in `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- Not detected - no external webhook receivers

**Outgoing:**
- Not detected - no external API callbacks

## Data Import/Export

**Import:**
- CSV batch import endpoint: `POST /api/importacao/batch`
- Location: `src/app/api/importacao/batch/route.ts`
- Format: Array of objects with fields: cliente, valor, frete, envio, custo, parcelas, dataVenda, produto, vendedor, antecipada
- Processing: Batch insert to Venda and Cliente tables

- SQLite migration: Node script at `prisma/import_sqlite.js`
  - Command: `db:import-sqlite`
  - Purpose: One-time data migration from SQLite to PostgreSQL

**Export:**
- PDF catalog generation: `GET /api/catalogo?q=<search>`
  - Location: `src/app/api/catalogo/route.ts`
  - Output: Product catalog PDF with images, prices, NCM codes
  - Uses: `pdf-lib` library for PDF generation

## MCP (Model Context Protocol)

**Custom MCP Server:**
- Custom implementation in `src/lib/mcp.ts`
- Endpoint: `GET /api/mcp` - List available tools
- Endpoint: `POST /api/mcp` - Execute tool
- Tools/Actions: Database CRUD operations via `src/lib/ai-actions.ts`
- Available actions: listar_*, criar_*, update_*, delete_* for all major entities
- Access control: Role-based (reads allowed for all, writes checked against roles)

## Third-Party Services Summary

| Service | Type | Integration | Config |
|---------|------|------------ |--------|
| OpenAI | LLM | @ai-sdk/openai | env + database |
| Google Gemini | LLM | @ai-sdk/google | env + database |
| PostgreSQL | Database | Prisma | DATABASE_URL env |
| None other | - | - | - |

## Security Considerations

**Secrets Protection:**
- `.env` excluded from Git (in `.gitignore`)
- Example provided in `.env.example`
- Production secrets injected at runtime

**API Keys Management:**
- LLM keys stored in database table `Config` for runtime retrieval
- Session secret as environment variable only
- No API keys hardcoded in source

**Authentication:**
- HS256 JWT with 7-day expiration
- HTTP-only cookies to prevent XSS
- SameSite=lax for CSRF protection
- Secure flag enabled in production only

**Database:**
- Prisma prevents SQL injection
- Schema validation via Zod
- Password hashing: Currently stored plaintext (security concern - see CONCERNS.md)

---

*Integration audit: 2026-02-19*
