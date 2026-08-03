# Codebase Concerns

**Analysis Date:** 2026-08-03

## Critical Issues (P0)

### Ephemeral Storage in Kubernetes — Pod Filesystem Loss (P0)

**Issue:** `src/app/api/upload-logo/route.ts:21` and `src/app/api/produtos/upload/route.ts:29-34` write file uploads to `public/uploads/` on the pod's ephemeral filesystem using Node.js `writeFile()`. Every pod restart or ArgoCD rollout destroys all uploaded files. Dead paths remain in the database (`Config.logoPath`, `Produto.imagem`), breaking image rendering.

**Files:**
- `src/app/api/upload-logo/route.ts:21` — Uploads stored as `/uploads/{filename}` on disk
- `src/app/api/produtos/upload/route.ts:29-34` — Fallback stores product images in `public/uploads/produtos`
- `deploy/bfx/app.yaml` — Deployment declares NO volumes or PersistentVolumeClaim
- `deploy/bfx/kustomization.yaml` — No MinIO/S3 storage configured
- `deploy/bfx/secrets.yaml` — No MINIO_* environment variables

**Impact:** 
- User-uploaded logos disappear on every deployment
- Product images become broken links after pod restart
- Database contains orphaned paths with no recovery mechanism
- MinIO fallback code exists (`src/lib/minio.ts`) but guard `isMinIOConfigured()` always returns false in production

**Fix approach:**
1. Add PersistentVolumeClaim or S3/MinIO configuration to `deploy/bfx/`
2. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY in `deploy/bfx/secrets.yaml`
3. Migrate existing uploads from local disk to persistent storage
4. Update `src/app/api/upload-logo/route.ts` to use MinIO when available
5. Run cleanup script on `src/app/api/cron/cleanup-uploads/route.ts` post-migration to remove orphaned DB entries

---

### Hard Delete on Fornecedor Without Soft-Delete (P0 Data Loss)

**Issue:** `src/app/(app)/cadastros/page.tsx:209` permanently deletes suppliers with `prisma.fornecedor.deleteMany({ where: { id: { in: ids } } })`. The `Fornecedor` model in `prisma/schema.prisma:212-219` has no `deletedAt` field. This is permanent, unrecoverable data loss.

**Files:**
- `src/app/(app)/cadastros/page.tsx:209` — `bulkDeleteFornecedores()` executes hard delete
- `prisma/schema.prisma:212-219` — `model Fornecedor` lacks soft-delete support

**Mitigating factor:** Audit logs are created (`src/app/(app)/cadastros/page.tsx:211` calls `createAuditLog("fornecedor:delete", ...)`) so data is reconstructable but requires manual effort.

**Current state:** All suppliers in production are currently missing (manually deleted).

**Impact:**
- No way to restore accidentally deleted suppliers
- Breaks referential integrity if products or orders reference deleted suppliers
- Audit trail exists but requires manual reconstruction

**Fix approach:**
1. Add `deletedAt DateTime?` field to `Fornecedor` model in `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name add_soft_delete_fornecedor`
3. Update `bulkDeleteFornecedores()` to use soft delete: `data: { deletedAt: new Date() }`
4. Update all `findMany()` queries to exclude soft-deleted: `where: { deletedAt: null }`
5. Provide admin recovery endpoint to undelete suppliers

---

### Stock Decrement Matches by Product Name, Not ID (P0 Multi-Supplier Bug)

**Issue:** `src/app/(app)/venda-rapida/actions.ts:301-304` decrements inventory using product name instead of ID:

```typescript
await tx.produto.updateMany({
  where: { nome: p.produtoNome },
  data: { qtdEstoque: { decrement: p.quantidade } },
});
```

If multiple suppliers provide a product with the same name, ALL matching products lose stock, not just the one sold.

**Files:**
- `src/app/(app)/venda-rapida/actions.ts:301-304` — Uses `where: { nome: p.produtoNome }`

**Latent trigger:** Current schema uses `@unique` on `Fornecedor.nome` but `Produto.nome` is NOT unique. When a second supplier adds a product with the same name as a first supplier's product, the bug activates.

**Impact:**
- Inventory for unrelated products decreases
- Stock count becomes inaccurate across suppliers
- No audit trail of which product was actually decremented

**Fix approach:**
1. Require `produtoId` (not just name) in venda form submission
2. Update `src/app/(app)/venda-rapida/actions.ts:301-304` to use `where: { id: p.produtoId }`
3. Add test case: create two products with same name from different suppliers, sell one, verify only that one decrements

---

### Plaintext Password Comparison (P0 — Authentication Bypass)

**Issue:** `src/app/api/auth/login/route.ts:15` compares passwords without hashing:

```typescript
if (!user || user.password !== String(body.password).trim()) {
  return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
}
```

Passwords are stored plaintext in the database (`prisma/schema.prisma:192`). An attacker with database access obtains all user passwords immediately. Violates OWASP, GDPR, and security best practices.

**Files:**
- `src/app/api/auth/login/route.ts:15` — Plaintext comparison
- `prisma/schema.prisma:192` — `password String` stored as-is

**Impact:**
- Database breach = all passwords compromised instantly
- No resistance to credential stuffing or brute force
- Regulatory compliance violations

**Fix approach:**
1. Add `bcrypt` or `argon2` dependency
2. Create migration to hash all existing passwords (set placeholder hash if password lost)
3. Update `src/app/api/auth/login/route.ts` to use password hashing on compare
4. Hash passwords before storing on signup/password change
5. Implement password reset flow (passwords cannot be recovered, only reset)

---

### Placeholder CRON_SECRET in Production Secrets (P0)

**Issue:** `deploy/bfx/secrets.yaml:25` contains placeholder:

```yaml
CRON_SECRET: change-me-cron-secret-min-32-chars
```

This weak secret protects all cron endpoints (`/api/cron/*`) across the system. An attacker can trigger maintenance jobs (cleanup, notifications, reports) without authentication. Used by:
- `src/app/api/cron/cleanup-uploads/route.ts:16`
- `src/app/api/cron/aniversario/route.ts:10`
- `src/app/api/cron/parcela-vencida/route.ts:12`
- `src/app/api/cron/pesquisa-satisfacao/route.ts:13` (multiple others)

**Files:**
- `deploy/bfx/secrets.yaml:25` — Placeholder value
- `src/middleware.ts:14-20` — PUBLIC_API_PATHS includes `/api/cron` without JWT verification

**Impact:**
- Unauthenticated access to system maintenance
- Potential for abuse (delete all uploads, spam emails, etc.)

**Fix approach:**
1. Generate strong random secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update `deploy/bfx/secrets.yaml:25` with actual secret
3. Document secret in runbook (never commit to git)
4. Consider using scheduled cloud provider jobs (AWS EventBridge, Vercel Cron) instead of bearer token

---

## Deployment Issues

### Image Tag Mismatch Between Deployment and Kustomization

**Issue:** `deploy/bfx/app.yaml:40` and `deploy/bfx/kustomization.yaml:18` reference different image tags:

- `app.yaml:40`: `...bfx-shop:938b273a5a683c4828cbfb088c9f69d44e8e842d`
- `kustomization.yaml:18`: `newTag: 3504c86d346dc7418ae462874090338387e293c2`

Kustomization's `newTag` field should override `app.yaml`'s inline tag, but the mismatch indicates manual edits out of sync. This causes confusion during deploys and makes it unclear which version is running.

**Files:**
- `deploy/bfx/app.yaml:40` — Hardcoded old tag
- `deploy/bfx/kustomization.yaml:16-18` — Newer tag in kustomization

**Impact:**
- Deployment behavior unpredictable if kustomize build fails
- Manual debugging required to determine which version is live

**Fix approach:**
1. Remove image tag from `deploy/bfx/app.yaml:40`, use placeholder: `{PLACEHOLDER_TAG}` or `latest`
2. Rely entirely on `deploy/bfx/kustomization.yaml` for tag management
3. Automate CI to update `kustomization.yaml` on every successful build
4. Add pre-deploy validation: verify image tags are consistent

---

### Placeholder Database Credentials in Secrets (P1)

**Issue:** `deploy/bfx/secrets.yaml:49-50` contains placeholders:

```yaml
postgres-password: "bfx-secure-password-2024"
session-secret: "bfx-session-secret-change-in-production"
```

Also, `deploy/bfx/secrets.yaml:8-9` hardcodes default Postgres credentials:

```yaml
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
```

**Files:**
- `deploy/bfx/secrets.yaml:8-10` — Hardcoded default credentials
- `deploy/bfx/secrets.yaml:49-50` — Placeholder values

**Impact:**
- Database accessible with default credentials
- Session secret predictable, allowing JWT forgery

**Fix approach:**
1. Generate strong random credentials
2. Never commit secrets.yaml — move to sealed-secrets or external secret manager
3. Use `POSTGRES_PASSWORD` from environment instead of plaintext
4. Document credential rotation procedure

---

## Known Bugs

### Fire-and-Forget Email Notifications Without Error Handling

**Issue:** `src/app/(app)/venda-rapida/actions.ts:90` and `:318` use fire-and-forget promises:

```typescript
void (async () => {
  try {
    // ... send email notification
  } catch (err) {
    console.error("Erro ao notificar...", err);
  }
})();
```

If the email service fails, the sale still completes but the partner company never receives notification. The error is logged to console but never alerted or retried.

**Files:**
- `src/app/(app)/venda-rapida/actions.ts:90-104` — Partner email notification
- `src/app/(app)/venda-rapida/actions.ts:318-333` — Same pattern, second location

**Impact:**
- Silent failures: partner doesn't know sale occurred
- No retry mechanism
- No alerting to ops team

**Fix approach:**
1. Replace `void (async () => {...})()` with proper error handling
2. Implement retry logic with exponential backoff or queue (e.g., BullMQ, Redis)
3. Add structured logging (Pino, Winston) instead of console.error
4. Create metrics: track failed notifications and alert on threshold
5. Document SLA for notification delivery

---

### Empty Catch Handlers Silencing Errors

**Issue:** Multiple locations silently catch and ignore errors:

```typescript
const data = await res.json().catch(() => ({}));
```

**Files:**
- `src/app/api/whatsapp/route.ts:32`
- `src/(auth)/login/page.tsx:41`
- `src/components/assinatura-form-client.tsx:83`
- `src/components/cadastrar-produto-rapido-dialog.tsx:103`
- `src/components/pwa-register.tsx:8` — `.catch(() => {})`
- `src/lib/asaas.ts:141`

**Impact:**
- Network failures masked as empty responses
- Difficult to debug production issues
- No metrics on failure rate

**Fix approach:**
1. Log errors: `const data = await res.json().catch(err => { logger.warn("JSON parse failed", err); return {}; })`
2. Use error boundaries in React components
3. Implement structured logging with context (request ID, user ID, endpoint)
4. Add metrics collection for all errors

---

## Performance Bottlenecks

### Large Monolithic Components and Action Files

**Issue:** Multiple files exceed 600 lines, combining multiple concerns in single files:

- `src/lib/ai-actions.ts` — 1,476 lines. AI tool definitions, prompts, and action handlers all in one file
- `src/components/venda-rapida-form-v2.tsx` — 1,103 lines. Form state, validation, UI, and submission all mixed
- `src/lib/email.ts` — 645 lines. Email templates and SMTP logic combined
- `src/app/(app)/configuracoes/page.tsx` — 624 lines. Settings UI + form actions + multiple tabs
- `src/app/api/recibo/route.ts` — 616 lines. PDF generation, payment validation, and response logic
- `src/app/(app)/historico/page.tsx` — 604 lines. Filtering, sorting, pagination, and table rendering
- `src/app/(app)/financeiro/page.tsx` — 586 lines. Chart rendering, filtering, export logic

**Impact:**
- Difficult to maintain and test
- Slow hot module reload during development
- Bundle size impact on frontend
- Increased cognitive load for code review

**Fix approach:**
1. Extract AI tool definitions into `src/lib/ai-actions/` subdirectory (one file per tool category)
2. Split `venda-rapida-form-v2.tsx` into smaller components: `VendaForm`, `ProductSelector`, `PaymentTerms`
3. Extract email templates to separate files in `src/lib/templates/`
4. Create `src/app/api/recibo/` directory with `pdf.ts`, `validate.ts`, `route.ts`
5. Set linting rule: max file size 400 lines for new files

---

### Complex Data Transformations Without Memoization

**Issue:** `src/lib/ai.ts:98-250` builds tool summaries and markdown tables on every AI response:

- `buildToolSummary()` iterates tool results and formats tables
- `buildLinks()` extracts links from results
- No caching or memoization of repeated computations

**Files:**
- `src/lib/ai.ts:98-250`

**Impact:**
- High CPU usage for large result sets
- Slow response times for AI chat with many actions
- No performance monitoring

**Fix approach:**
1. Add React Query/SWR caching to `src/components/intelligence-chat-client.tsx`
2. Memoize `buildToolSummary()` and `buildLinks()` with `useMemo()`
3. Add performance instrumentation (measure execution time, log slow queries)
4. Consider streaming responses instead of buffering entire result

---

## Fragile Areas

### Fornecedor Model — Used in Product Foreign Key Without Cascade

**Issue:** `prisma/schema.prisma` defines:

```prisma
model Fornecedor {
  id       Int     @id @default(autoincrement())
  nome     String  @unique
  produtos Produto[]
}

model Produto {
  fornecedorId Int
  fornecedor   Fornecedor @relation(fields: [fornecedorId], references: [id])
}
```

If a Fornecedor is deleted and Produto references it, the relationship breaks. There is no cascading delete or soft-delete to handle orphaned products.

**Files:**
- `prisma/schema.prisma:160-170` (Produto model)
- `prisma/schema.prisma:212-219` (Fornecedor model)

**Impact:**
- Orphaned products with dangling `fornecedorId`
- Queries including `fornecedor` will fail or return null
- Data inconsistency

**Fix approach:**
1. Add soft-delete to Fornecedor (see "Hard Delete on Fornecedor" concern above)
2. Add `@relation(..., onDelete: Cascade)` if hard delete is acceptable
3. Document referential integrity constraint in schema comments
4. Add database trigger or application-level check to prevent deletion of suppliers with products

---

### Product Upload Routes Depend on Filesystem Permissions

**Issue:** `src/app/api/upload-logo/route.ts:20-21` and `src/app/api/produtos/upload/route.ts:30-31` call `mkdir()` and `writeFile()` without verifying permissions or disk space.

**Files:**
- `src/app/api/upload-logo/route.ts:20-21`
- `src/app/api/produtos/upload/route.ts:30-31`

**Impact:**
- Upload fails silently if pod runs as non-root and `public/` is owned by root
- No disk space check before writing
- Docker image build succeeds but runtime fails (CLAUDE.md notes: "Criar novos arquivos na raiz do projeto requer `sudo`")

**Fix approach:**
1. Move all uploads to `/tmp` or mounted volume, not `public/`
2. Verify write permissions at startup in a health check
3. Add disk space check before upload: `df -h | awk '{print $5}'`
4. Return 507 "Insufficient Storage" instead of 500 on disk full
5. Use MinIO/S3 to avoid filesystem dependency entirely

---

## Test Coverage Gaps

### Large Business Logic Files Without Tests

**Issue:** Complex action files lack test coverage:

- `src/app/(app)/venda-rapida/actions.ts:496 lines` — Venda creation, validation, payment processing. Only 2 test files reference it indirectly.
- `src/lib/ai-actions.ts:1,476 lines` — AI tool definitions and actions. No unit tests.
- `src/lib/email.ts:645 lines` — Email templates and SMTP logic. Only `asaas.test.ts` exists for Asaas, not email.

**Test files present:**
- `src/__tests__/venda-item-validation.test.ts` — Validates item schema, not full venda flow
- `src/__tests__/asaas.test.ts` — Asaas API integration, not email logic

**Files:**
- `src/app/(app)/venda-rapida/actions.ts` — No direct tests
- `src/lib/ai-actions.ts` — No tests
- `src/lib/email.ts` — No tests

**Risk:** 
- Stock decrement bug (matches by name) went undetected
- Payment split logic untested
- AI tool execution paths untested

**Fix approach:**
1. Add integration test for full venda flow: create sale → decrement stock → create parcelas → send notification
2. Unit test each AI tool in `src/lib/ai-actions.ts`
3. Test email rendering with sample data (stub Asaas API)
4. Set coverage threshold: 70% for src/app, 80% for src/lib
5. Add e2e test via Playwright: create sale via UI, verify DB state, check notification sent

---

## Configuration Management

### Hardcoded Company List in Reports (Config Drift)

**Issue:** `src/app/(app)/relatorios/page.tsx:24` and `:65` hardcode a company list:

```typescript
const extraEmpresas = ["AMAZON FIVE", "Gimam"];
```

This list is duplicated and hardcoded in the UI. When a new partner is added, developers must edit source code and redeploy instead of using the database.

**Files:**
- `src/app/(app)/relatorios/page.tsx:24` — Line 1: `const extraEmpresas = ["AMAZON FIVE", "Gimam"];`
- `src/app/(app)/relatorios/page.tsx:65` — Line 2: hardcoded list in export buttons

**Impact:**
- New companies require code changes and deployment
- Inconsistency between UI and database source of truth
- No audit trail of company additions

**Fix approach:**
1. Move to database: add `isExtraEmpresa: Boolean` flag to `EmpresaParceira` model
2. Query database instead: `empresas.filter(e => e.isExtraEmpresa || fornecedores.has(e.nome.toLowerCase()))`
3. Remove hardcoded list from `relatorios/page.tsx`
4. Add admin UI to toggle company visibility in reports
5. Document the company filtering logic

---

## Missing Critical Features

### No Session Expiration or Token Rotation

**Issue:** Session tokens are valid for 7 days (`src/app/api/auth/login/route.ts:32`) without refresh mechanism or rotation.

**Files:**
- `src/app/api/auth/login/route.ts:32` — `maxAge: 60 * 60 * 24 * 7`
- `src/lib/session.ts` — Token creation logic

**Impact:**
- Long-lived tokens increase risk if compromised
- No way to revoke sessions early
- No logout mechanism (cookies cannot be cleared server-side)

**Fix approach:**
1. Implement token refresh flow: short-lived access token (15 min) + long-lived refresh token (7 days)
2. Store refresh tokens in database with creation date and ip/user-agent
3. Add logout endpoint that invalidates refresh token
4. Implement token rotation: issue new token with every request
5. Add session management UI: view active sessions, force logout from other devices

---

### No Rate Limiting on API Endpoints

**Issue:** No rate limiting middleware on public or semi-public endpoints. An attacker can:
- Brute-force login: `src/app/api/auth/login/route.ts` has no login attempt limits
- Spam cron endpoints: `src/app/api/cron/*` protected only by weak `CRON_SECRET`
- Generate bogus receipts: `src/app/api/recibo/route.ts`

**Files:**
- `src/middleware.ts` — No rate limiting logic
- `src/app/api/auth/login/route.ts`
- `src/app/api/cron/*`

**Fix approach:**
1. Add rate limiting middleware (e.g., `ratelimit` package or Redis-based)
2. Login: max 5 attempts per IP per 15 minutes
3. Cron: add actual JWT authentication instead of weak bearer token
4. API routes: 100 requests per minute per user
5. Public endpoints: 1000 requests per minute per IP

---

## Dependencies at Risk

### Outdated or Risky Dependencies

**Issue:** Large dependency tree with limited visibility into security updates. Package installation fails (`npm install` fails due to permissions, per CLAUDE.md).

**Files:**
- `package.json` — Not readable for version audit in this analysis

**Impact:**
- Security vulnerabilities in transitive dependencies undetected
- No dependency scanning in CI/CD
- Unable to update packages due to filesystem permissions issue

**Fix approach:**
1. Fix `npm install` permissions issue (run in container or adjust ownership)
2. Add `npm audit` to CI pipeline, block merge on high severity
3. Set up Dependabot or Renovate for automated dependency updates
4. Review and pin versions of critical packages: prisma, next, express (if used)
5. Document dependency security policy

---

## Scaling Limits

### Database Connection Pooling Not Configured for Kubernetes

**Issue:** `DATABASE_URL` in `deploy/bfx/secrets.yaml:19` connects directly to `bfx-db:5432` without connection pooling. Kubernetes can spawn multiple pod replicas but all connections go to a single Postgres instance.

**Files:**
- `deploy/bfx/secrets.yaml:19` — Direct Postgres connection
- `src/lib/db.ts` — Likely uses Prisma client without PgBouncer

**Current state:** Single replica (`deploy/bfx/app.yaml:8: replicas: 1`) so not immediately critical, but blocks horizontal scaling.

**Impact:**
- Cannot scale to multiple app pods (all will exhaust connection pool)
- Postgres connection limit hit at ~20 concurrent users
- No failover mechanism

**Fix approach:**
1. Deploy PgBouncer sidecar or external pool (e.g., Supabase managed pooling)
2. Update `DATABASE_URL` to use pooler: `postgresql://user:pass@pgbouncer:6432/db`
3. Configure Prisma client to use pool mode: `connection_limit`, `pool_timeout`
4. Increase Kubernetes replica count and monitor connection usage
5. Document connection budget per replica

---

*Concerns audit: 2026-08-03*
