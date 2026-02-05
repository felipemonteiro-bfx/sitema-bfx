# Codebase Concerns

**Analysis Date:** 2026-02-05

## Tech Debt

**Prisma Client Instantiation in API Routes:**
- Issue: Multiple API routes create their own `PrismaClient` instances instead of using the singleton from `src/lib/db.ts`
- Files: `src/app/api/comissoes/route.ts`, `src/app/api/comissoes/detalhe/route.ts`, `src/app/api/comissoes/relatorio/route.ts`
- Impact: Inefficient connection pooling, memory leaks, and possible connection exhaustion under load. Creates duplicate client instances that bypass the singleton pattern.
- Fix approach: Replace `const prisma = new PrismaClient()` with `import { prisma } from "@/lib/db"` across all route files. These routes manually disconnect with `await prisma.$disconnect()` which breaks the singleton pattern and should be removed.

**Manual Prisma Disconnection in Routes:**
- Issue: Some API routes call `await prisma.$disconnect()` in finally blocks, which breaks the connection pooling strategy
- Files: `src/app/api/comissoes/route.ts` (line 81), `src/app/api/comissoes/detalhe/route.ts` (line 85), `src/app/api/comissoes/relatorio/route.ts` (line 72)
- Impact: Closes the connection pool after each request, defeating the purpose of singleton connection reuse and causing performance degradation
- Fix approach: Remove all `await prisma.$disconnect()` calls from route handlers. The singleton in `src/lib/db.ts` manages the connection lifecycle properly.

**Missing Error Handling in Multiple API Routes:**
- Issue: Routes like `src/app/api/relatorios/vendas/route.ts`, `src/app/api/relatorios/catalogo/route.ts` do not wrap database calls in try-catch blocks
- Files: `src/app/api/relatorios/vendas/route.ts`, `src/app/api/relatorios/catalogo/route.ts`
- Impact: Unhandled promise rejections and server crashes if database queries fail. No user-facing error messages, leaving clients without feedback.
- Fix approach: Add try-catch blocks around all `prisma.*` calls and return `NextResponse.json({ error: "..." }, { status: 500 })` consistently.

**Inconsistent Error Response Format:**
- Issue: Different routes return error responses with different field names (`error`, `message`, etc.) and status codes
- Files: Multiple API routes across `src/app/api/`
- Impact: Frontend error handling code must anticipate multiple response formats, increasing complexity
- Fix approach: Establish a consistent error response format (e.g., `{ error: string, code?: string }`) and use it across all routes.

## Security Considerations

**Plaintext Password Storage:**
- Risk: User passwords are stored in plaintext in the database (no hashing)
- Files: `src/app/api/auth/login/route.ts` (line 15), `prisma/schema.prisma` (line 82)
- Current mitigation: None. Direct string comparison of passwords.
- Impact: If database is compromised, all user passwords are exposed. Violates basic security best practices.
- Recommendations:
  1. Use bcryptjs or argon2 to hash passwords before storage
  2. Update login to compare hashed passwords
  3. Require password reset for all existing users after deployment

**Hardcoded Default Session Secret:**
- Risk: Default `SESSION_SECRET` fallback is "dev-secret" (plaintext)
- Files: `src/lib/session.ts` (line 4)
- Current mitigation: Environment variable override available
- Impact: If env var is missing in production, JWTs are signed with a known secret, compromising session security
- Recommendations:
  1. Remove the default fallback
  2. Fail fast if `SESSION_SECRET` is not set in production
  3. Generate a secure random default only in dev

**File Upload Path Traversal Risk:**
- Risk: Uploaded filenames are not validated/sanitized in `src/app/api/produtos/upload/route.ts` and `src/app/api/upload-logo/route.ts`
- Files: `src/app/api/produtos/upload/route.ts` (line 21), `src/app/api/upload-logo/route.ts` (line 16)
- Current mitigation: Basic filename munging (spaces to dashes) but not comprehensive
- Impact: Attackers could upload files with malicious names or potentially bypass upload restrictions
- Recommendations:
  1. Generate UUIDs for filenames instead of using original names
  2. Validate file MIME types on server
  3. Restrict file sizes
  4. Scan for malware if handling user-uploaded content

**Missing Request Validation:**
- Risk: API routes accept query parameters and form data without proper validation/sanitization
- Files: `src/app/api/relatorios/vendas/route.ts` (line 5-6), `src/app/api/catalogo/route.ts` (line 42), multiple routes
- Current mitigation: Basic null coalescing and type assertions
- Impact: Injection attacks, unexpected behavior, or DoS via crafted requests
- Recommendations:
  1. Use Zod schemas for request validation (already available in dependencies)
  2. Parse and validate all query parameters and body data
  3. Return 400 status for invalid input

**API Authorization Gaps:**
- Risk: Most API routes do not check authentication or authorization
- Files: `src/app/api/relatorios/vendas/route.ts`, `src/app/api/catalogo/route.ts`, `src/app/api/relatorios/antecipacao/route.ts`, and others
- Current mitigation: Only `src/app/api/mcp/route.ts` and `src/app/api/auth/*` routes check sessions
- Impact: Any authenticated user can access sensitive reports, financial data, and operations they shouldn't
- Recommendations:
  1. Add session verification to all API routes that access sensitive data
  2. Implement role-based access control (use the `role` field from session)
  3. Create a middleware function `requireSession()` to reduce boilerplate

**CSV Injection in Export Routes:**
- Risk: CSV exports do not escape values that could contain formula injections
- Files: `src/app/api/relatorios/vendas/route.ts` (line 29-44), `src/app/api/relatorios/catalogo/route.ts`
- Current mitigation: None
- Impact: Attackers could craft data that executes formulas in Excel/Sheets when opened
- Recommendations:
  1. Escape values starting with `=`, `+`, `@`, or `-` by prepending a single quote
  2. Consider using a CSV library that handles escaping automatically

## Performance Bottlenecks

**N+1 Query Pattern in Credit Calculation:**
- Problem: `src/lib/credit.ts` loads all vendas for a client, then loops through them in memory for filtering
- Files: `src/lib/credit.ts` (line 10)
- Cause: `findMany` without date filters, then client-side filtering
- Impact: Loads entire sales history for every credit check, becoming slower as data grows
- Improvement path:
  1. Add date range to the Prisma query where clause
  2. Filter by month/year on database side instead of in JavaScript

**Catalog PDF Generation Without Pagination Limits:**
- Problem: `src/app/api/catalogo/route.ts` generates PDF with all matching products, no limit
- Files: `src/app/api/catalogo/route.ts` (line 44-47)
- Cause: `findMany` without `take` parameter
- Impact: Large product catalogs could cause OOM errors or extreme latency
- Improvement path:
  1. Add `take: 500` limit to Prisma query
  2. Implement pagination or a separate index page showing page count
  3. Add timeout handling

**Inefficient Commission Calculations:**
- Problem: `src/app/api/comissoes/route.ts` loads all sales and all users, then does client-side filtering
- Files: `src/app/api/comissoes/route.ts` (line 32-68)
- Cause: Creates Map from all usuarios, then loops through all vendas looking up by vendedor name
- Impact: O(n*m) complexity; slow with hundreds of sales or users
- Improvement path:
  1. Join usuarios to vendas in Prisma query with `include`
  2. Calculate commissions in a single database pass
  3. Consider a materialized view or denormalized commission table

**Repeated Config Lookups:**
- Problem: `src/app/api/catalogo/route.ts` calls `prisma.config.findFirst()` once per route, other routes repeat this pattern
- Files: `src/app/api/catalogo/route.ts` (line 63), `src/app/api/recibo/route.ts`, `src/lib/ai.ts` (multiple)
- Cause: No caching of config values
- Impact: Unnecessary database queries for frequently-accessed static config
- Improvement path:
  1. Cache config in memory with a TTL (5-10 minutes)
  2. Invalidate cache on config updates
  3. Create a helper function `getConfig()` that handles caching

## Fragile Areas

**AI/Chat Integration Dependency Chain:**
- Files: `src/lib/ai.ts`, `src/lib/ai-actions.ts`, `src/lib/mcp.ts`, `src/app/api/mcp/route.ts`
- Why fragile: Complex fallback logic between Gemini and OpenAI, dynamic tool registration, and action execution without strong typing
- Safe modification: Keep AI provider switching logic isolated. Add integration tests for both provider paths. Document the fallback behavior clearly.
- Test coverage: No tests exist; the module is untested and risky to modify

**Venda Data Model Inconsistencies:**
- Files: `prisma/schema.prisma` (model Venda), multiple routes using `venda.vendedor` and `venda.clienteId`
- Why fragile: Venda stores `vendedor` as a string (vendor name), but joins to Cliente via ID. This creates ambiguity about whether a venda is tied to a user or just a name string. Commission calculations rely on matching by name.
- Safe modification:
  1. Add a `vendedorId` foreign key to Usuario
  2. Keep `vendedor` string as a denormalized copy for display
  3. Update all queries and calculations to use the FK
  4. This is a significant migration

**Direct PrismaClient Exports:**
- Files: `src/lib/db.ts`
- Why fragile: Singleton exported directly allows any module to run any query without intercepting or logging
- Safe modification: Consider wrapping prisma in a service layer that logs queries, enforces tenancy if needed, or adds auditing

**File Upload and Path Handling:**
- Files: `src/app/api/produtos/upload/route.ts`, `src/app/api/upload-logo/route.ts`, `src/app/api/catalogo/route.ts`
- Why fragile: Writes to `process.cwd()` + hardcoded paths, assumes directory exists, no cleanup of old files
- Safe modification:
  1. Use a dedicated uploads directory
  2. Create it if it doesn't exist
  3. Store path references consistently in database
  4. Implement a cleanup job for orphaned files

## Scaling Limits

**Database Connection Pool:**
- Current capacity: Prisma default is 10 connections
- Limit: With 22 API routes and concurrent requests, connection exhaustion is possible under moderate load
- Scaling path:
  1. Increase `connection_limit` in DATABASE_URL
  2. Implement connection pooling with PgBouncer if using PostgreSQL
  3. Monitor connection usage

**Synchronous File I/O in PDF Generation:**
- Current capacity: Single request processes one PDF at a time
- Limit: Large PDFs or concurrent requests can cause event loop blocking
- Scaling path:
  1. Move PDF generation to a background job queue
  2. Use streams instead of buffering entire PDFs in memory
  3. Implement request cancellation

## Known Issues

**Session Token Expiration:**
- Symptoms: Users stay logged in for 7 days regardless of activity
- Files: `src/lib/session.ts` (line 17)
- Current behavior: Fixed 7-day expiration, no refresh tokens, no activity-based renewal
- Recommendation: Implement sliding window expiration or refresh token flow

**Missing Role-Based Access Control:**
- Symptoms: All authenticated users can access all API endpoints
- Files: `src/app/api/*` (most routes lack role checks)
- Current behavior: `src/app/api/mcp/route.ts` checks role but doesn't enforce permissions on tools
- Recommendation: Add middleware to check `session.role` and action permissions

**Audit Logging Not Wired Up:**
- Symptoms: `AuditLog` table exists but is never written to
- Files: `prisma/schema.prisma` (model AuditLog), no usage in codebase
- Current behavior: Table defined but unused
- Recommendation: Implement audit logging wrapper for sensitive operations

**CLI Import Script Not Tested:**
- Symptoms: `src/lib/db.ts` references `prisma/import_sqlite.js` but script may be incomplete or broken
- Files: `package.json` (line 14), `prisma/import_sqlite.js`
- Current behavior: Script available but no tests, documentation, or error handling visible
- Recommendation: Add validation, error handling, and tests for import flow

## Missing Critical Features

**Input Validation Framework:**
- Problem: Routes accept query parameters and JSON without schema validation
- Blocks: Cannot safely handle user input, no error standardization
- Solution: Use Zod (already in dependencies) to define request/response schemas for all routes

**Authentication Middleware:**
- Problem: Session checks scattered across individual routes
- Blocks: Easy to forget to add `requireSession()` check, creating unintended public endpoints
- Solution: Create Next.js middleware in `src/middleware.ts` to enforce auth on protected routes

**Rate Limiting:**
- Problem: No rate limiting on API endpoints
- Blocks: Vulnerable to brute force (login), DoS (exports), credential stuffing
- Solution: Add rate limiting middleware (use a library like `Ratelimit` from Upstash)

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: All utility functions, helpers, and business logic
- Files: `src/lib/*.ts` (credit.ts, finance.ts, session.ts, ai.ts, etc.)
- Risk: Logic changes can introduce silent bugs in commission calculations, credit checks, or financial reporting
- Priority: High

**No API Tests:**
- What's not tested: All routes in `src/app/api/*`
- Files: `src/app/api/**/*`
- Risk: Regressions in data export, report generation, authentication, and business logic
- Priority: High

**No Integration Tests:**
- What's not tested: Database interactions, Prisma queries, transaction handling
- Files: Entire data layer
- Risk: Data corruption, partial updates, broken relationships during multi-step operations
- Priority: Medium

**No E2E Tests:**
- What's not tested: User workflows (login, create sale, export report, etc.)
- Files: Entire application
- Risk: Critical user journeys can break without detection
- Priority: Medium

---

*Concerns audit: 2026-02-05*
