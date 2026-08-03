---
phase: 04-melhorias-infra
plan: 04
subsystem: testing
tags: [vitest, unit-testing, asaas, session, guards, env-validation, crypto, hmac]

# Dependency graph
requires:
  - phase: 04-melhorias-infra-01
    provides: session fail-fast, guards requireAdminOrThrow, recibo-url HMAC
  - phase: 04-melhorias-infra-02
    provides: getAsaasConfig, isAsaasDuplicateError, asaasFetch error codes
  - phase: 04-melhorias-infra-03
    provides: env.ts validateEnv() exported function, SKIP_ENV_VALIDATION support
provides:
  - vitest 4.1.2 installed and configured with @ alias for src/
  - 22 unit tests covering critical business logic (asaas, recibo-url, guards, session, env)
  - package.json test script (vitest run --reporter=verbose)
  - env-validation tests exercise real src/env.ts module via dynamic import
affects: [future-plans, ci-pipeline]

# Tech tracking
tech-stack:
  added: [vitest@4.1.2, vite@8.0.3, @vitest/expect, @vitest/runner]
  patterns:
    - vi.mock for Next.js dependencies (next/headers) in unit tests
    - vi.resetModules() + dynamic import() for testing module-level side effects
    - env tests use await expect(import("@/env")).rejects.toThrow() when module throws at import time

key-files:
  created:
    - vitest.config.ts
    - src/__tests__/asaas.test.ts
    - src/__tests__/recibo-url.test.ts
    - src/__tests__/guards.test.ts
    - src/__tests__/session-secret.test.ts
    - src/__tests__/env-validation.test.ts
  modified:
    - package.json (added test and test:watch scripts)
    - yarn.lock (vitest and dependencies)

key-decisions:
  - "env-validation tests use await import() rejects pattern because env.ts runs validateEnv() at module scope — calling validateEnv() after a broken import would never reach that line"
  - "session-secret test mocks next/headers to avoid cookie() dependency, keeping tests pure Node.js"
  - "guards test uses vi.mock('@/lib/session') to isolate getSession from real cookie/JWT logic"

patterns-established:
  - "Module-scope side-effect testing: use vi.resetModules() + dynamic import() per test case"
  - "Next.js server API mocking: vi.mock('next/headers', ...) to stub cookies() in unit tests"
  - "Tests run via: SKIP_ENV_VALIDATION=true DATABASE_URL=... vitest run"

requirements-completed: [INF-TEST-01, INF-TEST-02]

# Metrics
duration: 12min
completed: 2026-03-30
---

# Phase 4 Plan 4: Cobertura de Testes Summary

**Vitest configurado com 22 testes unitarios cobrindo asaas, recibo-url, guards, session e env — sem dependencia de banco ou rede**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-30T13:20:00Z
- **Completed:** 2026-03-30T13:33:44Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Instalou vitest 4.1.2 via yarn com alias @ apontando para src/
- Criou 5 arquivos de teste cobrindo toda a logica critica dos plans 01-03
- Todos os 22 testes passam sem banco de dados, rede ou dependencias externas

## Task Commits

Each task was committed atomically:

1. **Task 1: Instalar vitest via yarn e configurar test runner** - `2142819` (chore)
2. **Task 2: Criar testes unitarios para logica critica** - `96baa89` (test)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `vitest.config.ts` - Configuracao vitest com alias @ para src/ e include src/__tests__/**
- `package.json` - Scripts test e test:watch adicionados
- `src/__tests__/asaas.test.ts` - 4 casos para getAsaasConfig (null, sandbox default, production, espacos)
- `src/__tests__/recibo-url.test.ts` - 5 casos para signReciboId/verifyReciboSig (hmac, invalido, determinismo)
- `src/__tests__/guards.test.ts` - 6 casos para requireAdmin/requireAdminOrThrow (vi.mock de getSession)
- `src/__tests__/session-secret.test.ts` - 1 caso de carregamento sem erro em dev
- `src/__tests__/env-validation.test.ts` - 6 casos para validateEnv() real de src/env.ts

## Decisions Made
- env-validation tests usam `await expect(import("@/env")).rejects.toThrow()` para os casos de erro porque `env.ts` executa `validateEnv()` na linha 65 no escopo do modulo — chamar `validateEnv()` apos uma importacao quebrada nao seria alcancado
- session-secret mockeia `next/headers` para evitar dependencia de `cookies()` mantendo os testes em Node.js puro
- guards usa `vi.mock('@/lib/session')` para isolar `getSession` de JWT/cookies reais

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido assertions de env-validation para erros de import-time**
- **Found during:** Task 2 (primeira execucao de vitest)
- **Issue:** 2 testes falharam porque `env.ts` chama `validateEnv()` no escopo do modulo (linha 65), entao quando `DATABASE_URL` esta ausente o throw acontece no `import()`, nao quando `validateEnv()` e chamado explicitamente
- **Fix:** Alterado de `expect(() => validateEnv()).toThrow()` para `await expect(import("@/env")).rejects.toThrow()`
- **Files modified:** src/__tests__/env-validation.test.ts
- **Verification:** Todos 22 testes passando apos a correcao
- **Committed in:** 96baa89 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Correcao necessaria para testar corretamente o comportamento real do modulo. Sem scope creep.

## Issues Encountered
- A execucao de vitest durante os testes precisa de `SKIP_ENV_VALIDATION=true DATABASE_URL=...` no ambiente para que o processo inicial de importacao do vitest nao falhe ao resolver modulos que dependem de `src/env.ts`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Base de testes estabelecida; pronta para CI/CD pipeline
- Cobertura de logica critica de seguranca (session, guards, asaas, env) previne regressoes
- Para rodar testes: `SKIP_ENV_VALIDATION=true DATABASE_URL=postgresql://localhost/test yarn test`

---
*Phase: 04-melhorias-infra*
*Completed: 2026-03-30*
