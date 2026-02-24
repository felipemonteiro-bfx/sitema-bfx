# Codebase Concerns

**Analysis Date:** 2026-02-19

## Security Issues

### Authentication & Authorization Gaps

**Missing API route protection:**
- Issue: API routes are not protected with authentication middleware or session validation
- Files: `src/app/api/clientes/[id]/limite/route.ts`, `src/app/api/produtos/autocomplete/route.ts`, `src/app/api/vendas/autocomplete/clientes/route.ts`, `src/app/api/search/route.ts`, `src/app/api/importacao/batch/route.ts`
- Impact: Any unauthenticated user can access data endpoints without logging in
- Fix approach: Create middleware that validates session token before processing requests

**Missing role-based access control (RBAC) on protected pages:**
- Issue: Dashboard requires admin check `requireAdmin()`, but other admin functions (comissoes, relatorios) lack validation
- Files: `src/app/(app)/dashboard/page.tsx`, `src/lib/guards.ts`
- Impact: Users can potentially access restricted features by bypassing client-side checks
- Fix approach: Implement server-side RBAC middleware in `/app/layout.tsx` for all protected routes

### File Upload Vulnerabilities

**No file type validation on uploads:**
- Issue: File upload endpoints accept any file without MIME type or extension checks
- Files: `src/app/api/produtos/upload/route.ts` (line 10-24), `src/app/api/upload-logo/route.ts` (line 15-19)
- Impact: Users could upload executables (.exe, .sh) or malicious documents disguised as PDFs
- Fix approach: Validate MIME type, extension whitelist, and file size before saving

**No file size limits:**
- Issue: Upload endpoints don't enforce maximum file size constraints
- Files: `src/app/api/produtos/upload/route.ts`, `src/app/api/upload-logo/route.ts`
- Impact: Disk space exhaustion attacks possible; large uploads could freeze application
- Fix approach: Add `MAX_FILE_SIZE` constant, check `file.size` before processing

**Unsafe file path construction:**
- Issue: Filenames not sanitized; paths built with unsanitized user input
- Files: `src/app/api/produtos/upload/route.ts` (line 21), `src/app/api/upload-logo/route.ts` (line 16)
- Example: `filename = \`${Date.now()}-${file.name}\`` - allows malicious filenames like `../../etc/passwd`
- Fix approach: Use `path.basename()` to extract filename only, remove special characters

**Path traversal vulnerability:**
- Issue: Logo/image paths loaded from database without validation
- Files: `src/app/api/recibo/route.ts` (line 66), `src/app/api/catalogo/route.ts` (line 68)
- Vulnerable code: `const logoFullPath = path.join(process.cwd(), "public", cfg.logoPath)`
- Impact: Attacker could craft malicious path in config to read any file on server
- Fix approach: Validate paths are within `public/` directory; reject paths with `..` components

### Plaintext Password Storage

**Critical: Passwords stored without hashing:**
- Issue: Login route compares plaintext passwords directly
- Files: `src/app/api/auth/login/route.ts` (line 15)
- Vulnerable code: `if (!user || user.password !== String(body.password).trim())`
- Impact: Database breach exposes all user passwords in plaintext
- Fix approach: Use bcrypt or argon2 for password hashing; implement proper password verification

### API Key Exposure

**Secrets stored in database (Config table):**
- Issue: OpenAI and Gemini API keys stored in plaintext in `config` table
- Files: `prisma/schema.prisma` (lines 113-114), `src/lib/ai.ts` (lines 14-15, 24)
- Impact: Database dump or SQL injection exposes production API keys
- Fix approach: Use environment variables only; never store secrets in database

**Sensitive data in session token:**
- Issue: Session JWT uses default secret if `SESSION_SECRET` not set
- Files: `src/lib/session.ts` (line 4)
- Vulnerable code: `const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret")`
- Impact: Default "dev-secret" makes sessions forgeable in development if deployed
- Fix approach: Require `SESSION_SECRET` env var; fail startup if missing in production

## Data Validation Issues

### Missing Input Validation

**No schema validation for server actions:**
- Issue: `criarVenda` and `criarVendaV2` don't validate FormData before database operations
- Files: `src/app/(app)/venda-rapida/actions.ts` (lines 8-49, 54-120)
- Example: `const clienteId = Number(formData.get("cliente") || 0)` - no check if clienteId exists
- Impact: Invalid data, negative values, NaN values can be saved to database
- Fix approach: Create Zod schemas for all server actions; validate before database operations

**Unvalidated query parameters in API routes:**
- Issue: Search queries, date ranges, and limits not validated
- Files: `src/app/api/search/route.ts` (line 10), `src/app/api/comissoes/route.ts` (lines 10-12)
- Example: `const limit = Math.min(Number(searchParams.get("limit") || 20) || 20, MAX_LIMIT)` - still allows invalid dates
- Impact: Invalid dates could return wrong results; string injection in search (though mitigated by Prisma)
- Fix approach: Validate date strings with `new Date()` and check `!isNaN(date.getTime())`

**No validation on batch import:**
- Issue: `importacao/batch/route.ts` doesn't validate row data before database operations
- Files: `src/app/api/importacao/batch/route.ts` (lines 9-48)
- Example: No checks for negative numbers, invalid dates, or missing required fields
- Impact: Corrupted data imported; financial calculations affected
- Fix approach: Validate each row with schema; return detailed errors for invalid rows

**Unvalidated date parsing:**
- Issue: Date strings converted to `new Date()` without validation
- Files: `src/app/(app)/venda-rapida/actions.ts` (line 31), `src/app/api/importacao/batch/route.ts` (line 34)
- Impact: Invalid date strings create Invalid Date objects; calculations break silently
- Fix approach: Use `z.coerce.date()` in Zod or validate with `!isNaN(new Date(str).getTime())`

## Error Handling Issues

### Silent Failures

**No return value from server actions:**
- Issue: `criarVenda` doesn't return ActionResponse; silently fails
- Files: `src/app/(app)/venda-rapida/actions.ts` (line 28-29)
- Impact: User doesn't know if operation succeeded; can repeat submissions
- Fix approach: Return ActionResponse with success/error status from all server actions

**Unhandled promise rejections:**
- Issue: Fetch calls in client components don't handle all error cases
- Files: `src/components/venda-rapida-form-client.tsx` (lines 87-90, 100+)
- Example: `.catch(error => console.error(...))` - only logs, doesn't update UI
- Impact: User sees no feedback if network request fails
- Fix approach: Add proper error states; show toast notifications on failure

**Generic error messages:**
- Issue: All API errors return same generic "Erro interno no servidor"
- Files: `src/app/api/importacao/batch/route.ts` (line 53), multiple routes
- Impact: Impossible to debug; user doesn't know what failed
- Fix approach: Return structured error objects with specific error codes

### Uncaught Exceptions

**JSON parsing without try-catch:**
- Issue: Some routes parse JSON without error handling
- Files: `src/app/(app)/venda-rapida/actions.ts` (line 77), `src/app/api/mcp/route.ts` (line 22)
- Vulnerable code: `JSON.parse(String(produtosJson))` - throws if invalid JSON
- Impact: Application crashes with 500 error instead of validation error
- Fix approach: Wrap in try-catch; return `errorResponse` for invalid JSON

## Performance Bottlenecks

### N+1 Query Patterns

**Multiple sequential queries for related data:**
- Issue: `findMany` called without `include` relationships
- Files: `src/app/(app)/historico/page.tsx` (lines 108-110), `src/app/(app)/dashboard/page.tsx` (line 38)
- Example: Loads all `usuario` records separately for filtering instead of in `where` clause
- Impact: Unnecessary database round trips; slow page loads with many users/vendors
- Fix approach: Use Prisma `include` or `select` to batch load relationships

**Loop-based data aggregation:**
- Issue: Manual aggregation using loops instead of database queries
- Files: `src/app/(app)/dashboard/page.tsx` (lines 57-87), `src/app/(app)/historico/page.tsx`
- Example: Loads all sales, loops through manually to aggregate by vendor
- Impact: Memory usage scales with data size; slow with thousands of records
- Fix approach: Use Prisma `groupBy()` or raw SQL aggregation

### Missing Database Indexes

**Insufficient indexes for common queries:**
- Issue: `findMany` on unindexed fields without filters
- Files: `prisma/schema.prisma` - missing indexes on frequently searched fields
- Example: No index on `venda.vendedor` (used in WHERE clauses) or `cliente.nome` (used in searches)
- Impact: Full table scans on queries; performance degrades as data grows
- Fix approach: Add `@@index([vendedor])`, `@@index([nome])` to models

**Date range queries slow:**
- Issue: Dashboard queries large date ranges without proper indexes
- Files: `src/app/(app)/dashboard/page.tsx` (line 92-94)
- Query: `vendasEvo` loads 6 months of sales to calculate evolution
- Impact: Slow on large dataset; blocks page load
- Fix approach: Add `@@index([dataVenda])` to Venda model; consider pagination for time series

### Unbounded Result Sets

**No limit on full table scans:**
- Issue: Some queries load all records without pagination or limits
- Files: `src/lib/ai-actions.ts` (multiple `findMany` calls), `src/app/(app)/cadastros/page.tsx` (line 89+)
- Example: `await prisma.usuario.findMany()` loads all users without limit
- Impact: Memory exhaustion with large datasets; crashes possible
- Fix approach: Add `take` parameter or pagination; implement cursor-based pagination

## Database Schema Issues

### Deprecated Fields Mixed with New

**Parallel product tracking (conflicting data models):**
- Issue: `Venda` model has both old fields (produtoNome) and new relationship (itens)
- Files: `prisma/schema.prisma` (lines 51-72)
- Impact: Data inconsistency; calculations may use wrong field; migrations risky
- Fix approach: Complete migration to `ItemVenda` relationship; deprecate old fields in phases

### Missing Constraints

**No uniqueness on critical fields:**
- Issue: `vendedor` field not indexed; allows duplicate vendor entries
- Files: `prisma/schema.prisma` (line 48) - `vendedor` is plain String
- Impact: Vendor analytics split across inconsistent names
- Fix approach: Add `@@unique([vendedor])` or normalize vendor references

**Orphaned records possible:**
- Issue: `clienteId` is nullable; allows sales with null customer
- Files: `prisma/schema.prisma` (line 49)
- Impact: Reports exclude sales without client; data quality issues
- Fix approach: Make `clienteId` required with `NOT NULL`; add data migration

### Missing Cascade Delete Rules

**Partial cascade delete implementation:**
- Issue: `ItemVenda` and `ParcelaVencimento` have `onDelete: Cascade`, but business logic may expect soft deletes
- Files: `prisma/schema.prisma` (lines 87, 102)
- Impact: Hard deletes lose data; no audit trail of deletions
- Fix approach: Implement soft deletes (add `deletedAt` field) or restrict deletion with validation

## Tech Debt

### Dead Code & Unused Features

**Unused import patterns:**
- Issue: Multiple import strategies not consistently used across codebase
- Files: Various component files import unused icons from lucide-react
- Impact: Larger bundle size; maintenance confusion
- Fix approach: ESLint rule to enforce no unused imports

**Dual form implementations:**
- Issue: Both `VendaRapidaFormClient` (730 lines) and `VendaRapidaFormV2` (468 lines) exist
- Files: `src/components/venda-rapida-form-client.tsx` vs `venda-rapida-form-v2.tsx`
- Impact: Code duplication; twice the maintenance burden
- Fix approach: Consolidate into single form component; deprecate old version

### Type Safety Issues

**Generic type parameter abuse:**
- Issue: `toolSchema` uses `.passthrough()` allowing any properties
- Files: `src/lib/ai.ts` (line 9)
- Impact: Type safety lost; potential runtime errors from AI tool calls
- Fix approach: Define strict schema for each AI action parameter

**Loose type casting:**
- Issue: Excessive use of `String()` and `Number()` coercion without validation
- Files: Throughout codebase (e.g., `src/app/(app)/venda-rapida/actions.ts`)
- Example: `Number(formData.get("cliente") || 0)` returns 0 if missing instead of error
- Impact: Silent failures; calculations with wrong values
- Fix approach: Use Zod to coerce with proper validation; throw on invalid input

## Fragile Areas

### Complex Multi-Product Sales Logic

**Area:** `src/components/venda-rapida-form-client.tsx`, `src/app/(app)/venda-rapida/actions.ts`
- Why fragile: 730+ lines managing product arrays, parcelas, AI suggestions, stock limits
- Multiple state variables (clienteQuery, selectedCliente, produtoQuery, selectedProduto, etc.)
- Heavy reliance on fetch calls with implicit error handling
- Safe modification: Add comprehensive test suite before refactoring; use React Testing Library for form state

### AI Integration with Dynamic Schemas

**Area:** `src/lib/ai-actions.ts`, `src/lib/ai.ts`
- Why fragile: 615 lines of AI action definitions; schema validation at runtime
- JSON parsing of action results without strict typing
- Changes to AI model behavior could break assumptions
- Safe modification: Lock AI model version; add integration tests for each action; validate output schemas

### Financial Calculations Spread Across Multiple Files

**Area:** `src/lib/finance.ts`, `src/app/(app)/dashboard/page.tsx`, `src/components/venda-rapida-form-client.tsx`
- Why fragile: Lucro, ticket, margem calculations duplicated in multiple places
- Subtle differences in how fields are used (lucroLiquido vs calculated lucro)
- Safe modification: Centralize all calculations in single module; unit test each formula

## Missing Critical Features

### No Audit Trail

**Problem:** No logging of who created/modified records or when
- Blocks: Compliance audits; fraud investigation; data recovery
- Users can modify/delete records with no accountability
- Fix approach: Add `createdAt`, `updatedAt`, `createdBy`, `updatedBy` fields to all models

### No Soft Deletes

**Problem:** Hard deletes lose data permanently
- Blocks: Recovery of accidentally deleted sales/customers; data retention compliance
- No way to distinguish deleted vs never-existing records
- Fix approach: Add `deletedAt` field to models; filter out soft-deleted records in queries

### No Rate Limiting

**Problem:** API endpoints have no rate limiting
- Blocks: Protection against brute force attacks; DDoS mitigation
- Batch import endpoint could be abused
- Fix approach: Use `next-rate-limit` package; implement per-IP rate limiting on all API routes

### No CSRF Protection

**Problem:** No CSRF tokens on state-changing requests
- Blocks: Protection against cross-site request forgery
- Forms using FormData don't validate origin
- Fix approach: Implement CSRF token validation using `next-safe` or built-in Next.js mechanisms

### No SQL Injection Prevention (Partially)

**Problem:** While Prisma prevents SQL injection, raw dynamic query strings could be used
- Impact: Safe with current code but risky pattern if extended
- Fix approach: Enforce no raw SQL; use parameterized queries always

## Scaling Limits

### Database Connection Pooling

**Current state:** No explicit connection pool configuration
- Files: `src/lib/db.ts` (not examined but typically uses Prisma default)
- Limit: Default Prisma pool ~10 connections; exhausted under heavy load
- Scaling path: Configure `prisma.schema` with `connectionLimit`, `idleTimeout` parameters

### Large File Handling

**Current state:** Files written synchronously to local filesystem
- Files: `src/app/api/produtos/upload/route.ts`, `src/app/api/upload-logo/route.ts`
- Limit: Single server can't handle parallel uploads; disk I/O blocks requests
- Scaling path: Migrate to S3/cloud storage; implement async upload with job queue

### Dashboard Query Performance

**Current state:** Dashboard loads 6+ months of sales data in memory
- Files: `src/app/(app)/dashboard/page.tsx` (line 92-102)
- Limit: >100K records causes OOM; page load >5 seconds
- Scaling path: Implement time-series aggregation in database; use materialized views or cache

## Dependencies at Risk

### AI SDK Pinning

**Risk:** `@ai-sdk/openai`, `@ai-sdk/google`, `ai` packages update frequently
- Impact: Breaking API changes; new OpenAI API versions not supported
- Migration plan: Pin major versions; test new releases in staging before updating

### Prisma Version Gap

**Risk:** `@prisma/client@6.5.0` is recent; upgrade path unclear
- Impact: Bug fixes may require schema changes; migration failures possible
- Migration plan: Monitor release notes; test migrations in dev first

### Deprecated shadcn Component Versions

**Risk:** Some shadcn/ui components may have breaking changes
- Impact: Component API changes break existing usage
- Workaround: Pin shadcn versions; create wrapper components for stability

---

*Concerns audit: 2026-02-19*
