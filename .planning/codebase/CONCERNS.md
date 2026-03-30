# Codebase Concerns

**Analysis Date:** 2026-03-30

## Security Issues

**Hardcoded placeholder secrets in production manifest:**
- Issue: `SESSION_SECRET: change-me-in-production` and `CRON_SECRET: change-me-cron-secret-min-32-chars` are placeholder values in committed Kubernetes secrets file
- Files: `deploy/bfx/secrets.yaml` (lines 20, 25)
- Impact: If secrets file is deployed as-is, session tokens are predictable and cron endpoints are unprotected. Any attacker can forge sessions or trigger cron jobs.
- Fix approach: Move to external secret management (AWS Secrets Manager, HashiCorp Vault) or ensure CI/CD replaces these values before deployment. Add validation in middleware to reject default secret values.

**Asaas API key exposed in secrets manifest:**
- Issue: Production Asaas API key is hardcoded in committed secrets.yaml (format: `$aact_prod_...`)
- Files: `deploy/bfx/secrets.yaml` (line 26)
- Impact: If repository is compromised, attacker gains access to payment processing. Key can be revoked but requires immediate action.
- Fix approach: Use external secret management (AWS Secrets Manager, K8s sealed-secrets). Never commit real credentials to git.

**LiteLLM API key exposed:**
- Issue: Production LiteLLM key (`sk-ly735Euf-s6uQKcPu1l52Q`) committed in secrets.yaml
- Files: `deploy/bfx/secrets.yaml` (line 31)
- Impact: Attacker can make unlimited API calls to AI provider, incurring costs and potentially accessing rate-limited free tier.
- Fix approach: Use external secret management. Rotate key immediately.

**Database credentials in plain text:**
- Issue: Postgres credentials (`postgres:postgres`) hardcoded in secrets.yaml DATABASE_URL
- Files: `deploy/bfx/secrets.yaml` (line 19)
- Impact: Default credentials are widely known. Should be unique per environment.
- Fix approach: Use strong, auto-generated passwords. Store in external secret manager.

## AI Provider Issues

**No fallback when all providers exhaust rate limits:**
- Issue: LiteLLM provider has no retry logic or degradation strategy. Gemini has fallback to OpenAI (lines 369-399 in ai.ts), but no tertiary fallback.
- Files: `src/lib/ai.ts` (lines 39-77, 295-330)
- Impact: When free tier Gemini quota exhausted and OpenAI key missing, users see generic error. No graceful degradation to read-only mode or queued processing.
- Fix approach: Implement queue-based processing, read-only fallback, exponential backoff with jitter. Add provider health check endpoint.

**Free tier Gemini quota not monitored:**
- Issue: No quota tracking or warning system for Gemini free tier. Rate limit errors only discovered when user hits them.
- Files: `src/lib/ai.ts` (lines 358-399)
- Impact: Users experience sudden failures during peak usage. No proactive notification to admin.
- Fix approach: Add quota tracking in Config model. Implement warning when 80% of daily quota used. Switch to paid tier monitoring.

**LiteLLM configuration not validated:**
- Issue: LiteLLM URL and key loaded from env/DB without validation that endpoint is reachable
- Files: `src/lib/ai.ts` (lines 42-55)
- Impact: Silent failures if LiteLLM server down. Error message returned to user but no alerting.
- Fix approach: Add health check on startup and periodically. Implement circuit breaker pattern.

## Database Schema Issues

**Text-based vendedor field lacks foreign key constraint:**
- Issue: `Venda.vendedor` and `Pagamento.vendedor` stored as `String?` without FK to `Usuario.username`. Same in `AuditLog.usuario` and `AiMensagem.usuario`.
- Files: `prisma/schema.prisma` (lines 54, 215, 225, 274)
- Impact: Cannot enforce data integrity. Orphaned references when user deleted. Reports show text strings instead of linked user objects. No audit trail linking.
- Fix approach: Add FK relationship `vendedor Usuario @relation(fields: [vendedorId], references: [id])`. Migrate existing text data to integer IDs. Add cascade delete rules.

**AnticipacaoBatch.vendaIds stored as JSON string:**
- Issue: `vendaIds` is `String` containing JSON array `"[1,2,3]"` instead of proper M2M relation
- Files: `prisma/schema.prisma` (lines 319)
- Impact: Cannot query batches by venda. Cannot enforce FK constraint. Parsing required in application code (see `historico-antecipacoes.tsx:26` - uses `JSON.parse(vendaIds)`). No referential integrity.
- Fix approach: Create `AnticipacaoBatchVenda` M2M model. Add FK constraints. Update queries to use relations instead of string parsing.

**Missing FK enforcement in deprecated fields:**
- Issue: `Venda.produtoNome` and `Venda.custoProduto` are deprecated but still used. No FK to Produto. ItemVenda.produtoNome also text-based.
- Files: `prisma/schema.prisma` (lines 58-61, 111-112)
- Impact: Can create orphaned item records with fake product names. No price history tracking. Cannot report by actual product.
- Fix approach: Deprecate Venda deprecated fields entirely. Enforce ItemVenda.produtoId FK to Produto. Migration to populate missing IDs.

## Deployment Issues

**Image tag mismatch between kustomization and app.yaml:**
- Issue: `kustomization.yaml` specifies `newTag: dc22172d19e93d8fc9e3fbc55b22b27b17dfc0f2` but `app.yaml` has hardcoded different tag `938b273a5a683c4828cbfb088c9f69d44e8e842d`
- Files: `deploy/bfx/kustomization.yaml` (line 17), `deploy/bfx/app.yaml` (line 40)
- Impact: Kustomization image patch is ignored. app.yaml hardcoded tag deploys old code. ArgoCD reconciliation may fail.
- Fix approach: Remove hardcoded tag from app.yaml. Let Kustomize manage all image tags via kustomization.yaml.

**No image pull secret validation:**
- Issue: Deployment references `ecr-creds` secret but no validation that it exists or contains valid AWS credentials
- Files: `deploy/bfx/app.yaml` (lines 22-23)
- Impact: Pod stuck in ImagePullBackOff without clear error if secret missing or expired.
- Fix approach: Add pre-deployment validation script. Document ECR credential setup in runbook.

## Missing Tests

**Zero unit/integration test coverage:**
- Issue: Only 1 Playwright E2E test file exists (`tests/venda-rapida-dropdown.spec.ts`) for entire codebase. No unit tests, integration tests, or API tests.
- Files: `tests/` (only one .spec.ts file)
- Impact: Regressions undetected until production. AI actions untested. Data model changes break queries silently. API endpoints have no contract tests.
- Fix approach: Set up Vitest. Add 80% coverage requirement in CI. Prioritize: AI actions (high risk), venda creation flow, Asaas integration.

**No test config or test runner setup:**
- Issue: No Jest/Vitest config, no test setup files, no mocking framework configured
- Files: Missing `jest.config.js`, `vitest.config.ts`, `test-setup.ts`
- Impact: High barrier to adding tests. Developers unsure of patterns and tooling.
- Fix approach: Configure Vitest with jsdom, MSW for API mocking, add test template examples.

## Code Organization Issues

**Prisma generated client committed to git:**
- Issue: `src/generated/prisma/` directory (1.2MB of .js/.d.ts files) committed to repository
- Files: `src/generated/prisma/*.js`, `src/generated/prisma/*.d.ts`, `src/generated/prisma/*.wasm`
- Impact: Repository size bloated. Merge conflicts on schema changes. Generated code diffs clutter history.
- Fix approach: Add `src/generated/` to .gitignore. Regenerate during CI prebuild step. Keep only `prisma/schema.prisma` in version control.

**Giant monolithic form components:**
- Issue: Multiple form components exceed 1000 lines: `venda-rapida-form-v2.tsx` (1082 lines), `venda-rapida-form-client.tsx` (724 lines)
- Files: `src/components/venda-rapida-form-v2.tsx`, `src/components/venda-rapida-form-client.tsx`
- Impact: Impossible to test individual features. Complex state management. Hard to reuse validation logic. Merge conflicts likely.
- Fix approach: Split into: FormHeader, ClientSelector, ProductItemsList, ParcelasForm, PaymentOptions, ReviewSummary subcomponents.

**Fragmented AI action definitions:**
- Issue: All AI actions (~1426 lines) in single `ai-actions.ts` file with no logical grouping
- Files: `src/lib/ai-actions.ts`
- Impact: Difficult to navigate. Actions for different domains (venda, produto, cliente, financeiro) mixed together. Updates require large file edits.
- Fix approach: Split into: `ai-actions/venda.ts`, `ai-actions/cliente.ts`, `ai-actions/produto.ts`, `ai-actions/financeiro.ts`. Index in main file.

## Integration Fragility

**Asaas webhook handling missing:**
- Issue: Boleto creation works (`src/lib/asaas.ts`) but no webhook endpoint to receive payment status updates
- Files: `src/lib/asaas.ts` (no webhook handling code)
- Impact: Payment status never updated in DB. Parcels marked paid only if admin manually updates. Overdue payments not detected. False positives on payment status.
- Fix approach: Add `POST /api/webhooks/asaas` endpoint. Parse webhook payload. Update payment status and ParcelaVencimento.paga. Add webhook signature verification.

**Evolution API dependency fragility:**
- Issue: WhatsApp messages sent via Evolution API (`src/lib/evolution.ts`) with no retry logic or graceful degradation
- Files: `src/lib/evolution.ts`, `src/lib/whatsapp.ts`
- Impact: If Evolution API down, WhatsApp features silently fail. No user notification. Recibos not sent. Boleto reminders not delivered.
- Fix approach: Implement exponential backoff retry. Queue failed messages. Add monitoring/alerting. Fallback to in-app notification if API unavailable.

**Asaas API key invalidation not handled:**
- Issue: If Asaas API key becomes invalid (revoked, expired), system continues trying to create boletos and silently fails
- Files: `src/lib/asaas.ts` (lines 219-243), `src/lib/boleto-actions.ts`
- Impact: Users think boletos created when they're not. Payment processing silently broken. No alerting to admin.
- Fix approach: Add API key validation on startup. Catch 401/403 errors specifically. Disable boleto feature in UI. Alert admin.

**LiteLLM configuration silent failures:**
- Issue: Invalid LiteLLM URL or key returns generic error to user with no logging
- Files: `src/lib/ai.ts` (lines 41-55)
- Impact: Admin unaware of misconfiguration. Users see "LiteLLM not configured" when actually URL wrong.
- Fix approach: Add structured logging. Validate config on app startup. Return detailed error with endpoint tested.

## Missing Features

**No payment webhook to update order status:**
- Issue: Asaas integration creates payments but has no mechanism to receive payment confirmations and update Venda.status
- Files: No webhook handler implemented
- Impact: Venda status stays "ativa" forever. Parcels never marked paid unless manually updated. Financial reports incorrect.
- Fix approach: Create webhook handler. Test with Asaas test payloads. Add signature verification.

**No expiration handling for assinatura tokens:**
- Issue: `Assinatura.assinatura_status` can be "pendente" or "expirado" but no job removes expired records or prevents expired signature submission
- Files: `src/app/(app)/assinatura/`, no cleanup cron
- Impact: Stale pending signatures clutter DB. Expired tokens may still be accepted. Signature page could be available long after venda completed.
- Fix approach: Add cron job to mark signatures as expired after 30 days. Reject signature submission if expired.

**No rate limiting on public endpoints:**
- Issue: No rate limiting on `/api/assinatura` or other public endpoints. No CSRF protection.
- Files: Public API routes
- Impact: Brute force attacks possible. Spam submissions. DOS vulnerability.
- Fix approach: Add rate limiting middleware. Implement CSRF tokens. Add request throttling.

**Missing data export feature:**
- Issue: Users cannot export sales data to CSV/Excel beyond antecipacao batches
- Files: No bulk export endpoint
- Impact: Users manually copy-paste from tables. Cannot perform external analysis. Fragmented reporting.
- Fix approach: Add export endpoint with format selection. Cache for performance.

## Performance Concerns

**Large file components not optimized:**
- Issue: Dashboard and finance charts (353 lines, 183 lines) not code-split. render on every state change.
- Files: `src/components/dashboard-charts.tsx`, `src/components/finance-charts.tsx`
- Impact: Initial page load slow. Large JS bundle. Client-side computation expensive.
- Fix approach: Implement React.memo() for chart components. Lazy load with Suspense. Consider server-side aggregation.

**Unindexed database queries:**
- Issue: Multiple columns lack indexes for common filters (client query, date range queries, status filters)
- Files: `prisma/schema.prisma` (schema shows limited indexes)
- Impact: Full table scans on common queries. Slow reports as data grows.
- Fix approach: Add indexes on: `Venda.dataVenda`, `Venda.status`, `Cliente.nome`, `ParcelaVencimento.dataPagamento`, `AiMensagem.sessaoId, criadoEm`.

**No database query analysis:**
- Issue: No N+1 query detection, no query logging in development
- Files: No middleware for query analysis
- Impact: Unnoticed N+1 problems until production slowness. Hidden data layer inefficiencies.
- Fix approach: Enable Prisma query logging in dev. Add query metrics to observability.

## Technical Debt

**npm install fails due to permissions:**
- Issue: Package installation fails with permission errors on node_modules directory
- Files: Project root
- Impact: Cannot install new dependencies. Developers stuck on old versions. CI/CD issues.
- Fix approach: Check directory ownership. Use sudo sparingly. Consider Docker-based development.

**remark-gfm not installed, using native parser:**
- Issue: Markdown table rendering uses custom native parser instead of robust remark-gfm
- Files: `src/lib/ai.ts` (buildMarkdownTable), `src/components/MarkdownContent`
- Impact: Complex markdown may render incorrectly. Feature parity issues with standard markdown. Hard to maintain parser.
- Fix approach: Either document custom parser behavior or substitute compatible markdown library.

**Hook blocks RegExp.exec() pattern:**
- Issue: Git hook rejects code containing `RegExp exec()` pattern, requires `.split()` + regex instead
- Files: `.git/hooks/` (enforces pattern matching)
- Impact: Counterintuitive code style requirement. Not self-documenting. Developers surprised by commit failure.
- Fix approach: Document in CLAUDE.md with examples. Consider relaxing rule or adding linting instead.

**Multiple migration scripts with unclear purpose:**
- Issue: Many ad-hoc scripts in `scripts/` and `prisma/` (import-vendas-sqlite.js, fix-parcelas-roteador.ts, reset-assinatura.ts) lack documentation
- Files: `prisma/`, `scripts/` directories
- Impact: Unclear which are safe to run, which are one-off. Risk of accidental data loss.
- Fix approach: Add script documentation. Add confirmation prompts. Move one-offs to archive directory.

## Scaling Limits

**Single database replica:**
- Issue: PostgreSQL deployed as single StatefulSet without replication
- Files: `deploy/bfx/postgres.yaml`
- Impact: Database unavailability = full system down. No read scaling. Schema migrations require downtime.
- Fix approach: Add read replicas. Implement connection pooling. Plan for managed RDS.

**No caching layer for repeated queries:**
- Issue: No Redis or in-memory cache. Every dashboard load queries full dataset.
- Files: No cache layer in architecture
- Impact: Database load increases linearly with concurrent users. Reports slow down.
- Fix approach: Add Redis for session, cache, and query results. Implement cache invalidation on writes.

**Evolution API instance single point of failure:**
- Issue: Single Evolution API instance. If down, all WhatsApp features fail.
- Files: `deploy/bfx/evolution-api.yaml`, `src/lib/evolution.ts`
- Impact: WhatsApp integrations unavailable during Evolution maintenance. No failover.
- Fix approach: Deploy multiple instances. Load balance. Implement queue-based async sending.

## Audit & Compliance

**Audit log missing critical info:**
- Issue: `AuditLog.usuario` stored as text without FK. Cannot trace actions to actual Usuario records.
- Files: `prisma/schema.prisma` (line 225)
- Impact: Audit trail not forensically sound. Cannot prove who made changes. Compliance audit failures.
- Fix approach: Add FK to Usuario. Add usuarioId integer field. Log both action type (create/update/delete) and old/new values.

**No data retention policy:**
- Issue: No automatic deletion of old audit logs, AI conversation history, or temporary documents
- Files: No cron job for cleanup
- Impact: Database grows unbounded. GDPR right-to-be-forgotten not implemented. Storage costs escalate.
- Fix approach: Add retention policies to Config. Implement cron jobs for purge. Add GDPR data export/deletion endpoints.

## Dependency Risks

**Outdated or risky dependencies:**
- Issue: Some dependencies may have known vulnerabilities (requires audit)
- Files: `package.json`
- Impact: Security vulnerabilities in transitive dependencies. Supply chain risk.
- Fix approach: Run `npm audit`. Add Dependabot or similar. Pin patch versions. Automated security scanning in CI.

**Pinned image tags in production:**
- Issue: Kubernetes manifests use specific image tags (correct practice) but Dockerfile/build process unclear
- Files: `deploy/bfx/app.yaml`, `deploy/bfx/kustomization.yaml`
- Impact: If build fails, no rollback option. Unknown base image origins.
- Fix approach: Document build/push process. Use semantic versioning. Store build metadata (commit SHA, build timestamp).

---

*Concerns audit: 2026-03-30*
