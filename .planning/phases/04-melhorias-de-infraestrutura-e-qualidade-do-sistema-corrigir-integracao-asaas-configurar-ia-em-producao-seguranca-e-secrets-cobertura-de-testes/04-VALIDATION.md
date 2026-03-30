---
phase: 4
slug: melhorias-de-infraestrutura-e-qualidade-do-sistema-corrigir-integracao-asaas-configurar-ia-em-producao-seguranca-e-secrets-cobertura-de-testes
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed in Wave 2 / Plan 04-04) |
| **Config file** | vitest.config.ts (created by Plan 04-04) |
| **Quick run command** | `yarn vitest run --reporter=verbose 2>/dev/null` |
| **Full suite command** | `yarn vitest run 2>/dev/null` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run task-level `<automated>` verify command
- **After every plan wave:** Run full suite if Wave 2 complete; grep-verify for Wave 1
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Verification Strategy by Wave

### Wave 1 (Plans 01, 02, 03) — Structural grep verify

Wave 1 plans (Security, Asaas, IA/Env) modify source files. Vitest is not yet installed at this point — it is installed by Plan 04-04 (Wave 2). Therefore Wave 1 tasks use grep-based structural verification only.

**This is a deliberate tradeoff:** grep confirms the correct code constructs are present. Behavioral/unit test coverage comes in Wave 2 after vitest is available.

No Wave 0 stub files are required. Wave 1 verify commands are self-contained and do not depend on any test runner.

### Wave 2 (Plan 04) — Full automated test verify

Plan 04-04 installs vitest and creates all test files. Its Task 2 verify command runs the full suite: `npx vitest run --reporter=verbose`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 4-01-01 | 01 (Seguranca) | 1 | SESSION_SECRET fail-fast; requireAdminOrThrow | grep | `grep -n "throw new Error.*SESSION_SECRET" src/lib/session.ts src/middleware.ts src/lib/recibo-url.ts && grep -n "requireAdminOrThrow" src/lib/guards.ts` | ⬜ pending |
| 4-01-02 | 01 (Seguranca) | 1 | Admin routes auth guard; no unprotected routes | grep | `grep -c "getSession" src/app/api/admin/backfill-estoque/route.ts && grep -rL "getSession\|requireAdmin" src/app/api/admin/ 2>/dev/null \| grep "route\.ts"` | ⬜ pending |
| 4-02-01 | 02 (Asaas) | 1 | Asaas CPF dup error via error.code | grep | `grep -n "isAsaasDuplicateError" src/lib/asaas.ts && grep -n "cpf_cnpj_already_in_use" src/lib/asaas.ts` | ⬜ pending |
| 4-02-02 | 02 (Asaas) | 1 | Asaas parcelamento installmentValue | grep | `grep -n "installmentValue" src/lib/asaas.ts` | ⬜ pending |
| 4-03-01 | 03 (IA/Env) | 1 | src/env.ts zod validation + validateEnv export | grep | `test -f src/env.ts && grep -c "z.object" src/env.ts && grep "SKIP_ENV_VALIDATION" src/env.ts && grep "export function validateEnv" src/env.ts` | ⬜ pending |
| 4-03-02 | 03 (IA/Env) | 1 | src/lib/db.ts imports env.ts; .env.example updated | grep | `grep 'import.*@/env' src/lib/db.ts && grep "LITELLM_URL" .env.example && grep "SKIP_ENV_VALIDATION" .env.example` | ⬜ pending |
| 4-04-01 | 04 (Testes) | 2 | vitest installed + configured | automated | `test -f vitest.config.ts && grep "vitest" package.json && yarn vitest --version` | ⬜ pending |
| 4-04-02 | 04 (Testes) | 2 | All unit tests pass | automated | `yarn vitest run --reporter=verbose` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Asaas webhook em producao | Asaas integration | Requer sandbox Asaas | Testar via painel Asaas sandbox |
| IA em producao com LiteLLM | IA config | Requer chave de API real | Testar no ambiente de staging |
| SESSION_SECRET em producao | Seguranca | Requer deploy real | Verificar variavel em env de producao |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (grep for Wave 1, test runner for Wave 2)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 1 grep-only verify is deliberate — vitest installed in Wave 2
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
