---
phase: 09-integracoes-e-carga-de-dados
verified: 2026-08-03T21:00:00Z
status: human_needed
score: 3/4 must-haves verified (1 blocked on external human action, tracked as a pre-existing checkpoint — not a code gap)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Task 2 of 09-03-PLAN.md (checkpoint:human-verify, gate=blocking): create UBER_DIRECT_CUSTOMER_ID/UBER_DIRECT_TOKEN/UBER_PICKUP_ADDRESS_JSON in the bfx-app-secrets SSM parameter (sa-east-1), force-sync the ExternalSecret, then confirm GET /api/frete/uber/status returns enabled:true and the PDV 'Uber' button fills the freight field for a client with a registered address."
    expected: "GET /api/frete/uber/status flips from {enabled:false, motivo:\"sem_credencial\"} to {enabled:true, pickupAddress:{...}}; in the PDV, clicking 'Uber' for a client with a valid address fills 'Frete (Cobrado)' and shows a toast with value/duration."
    why_human: "Requires creating real Uber Direct API credentials in the Uber dashboard, writing them into the production AWS SSM parameter, and forcing a Kubernetes ExternalSecret re-sync — all explicitly prohibited for the coding agent (CLAUDE.md / plan environment_constraints) and outside the scope of static code verification. Independently re-confirmed today (2026-08-03) via `aws ssm get-parameter` against bfx-app-secrets: 22 keys total, zero starting with UBER_ — the blocker is exactly as documented, not a stale claim."
---

# Phase 9: Integrações e carga de dados Verification Report

**Phase Goal:** A cotação de frete Uber funciona em produção com degradação clara sem credencial, e o import de clientes da Equilibrium é seguro (dry-run) e idempotente.
**Verified:** 2026-08-03T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria, Phase 9)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Com as credenciais Uber configuradas em produção, a cotação de frete preenche o valor do frete para um endereço válido (INT-01) | ⏳ BLOCKED — code ready, pending human action | Code path fully verified (routes, `getDeliveryQuote`, PDV wiring — see truth 2/3 evidence below), but the credential does not exist in production. Independently re-verified today via `aws ssm get-parameter --name /softlive/bfx/prod/secrets/bfx-app-secrets`: **22 keys, none `UBER_*`**. This matches the runbook's documented blocker exactly. INT-01 cannot be TRUE in production until a human creates the credential — this is `checkpoint:human-verify` Task 2 of `09-03-PLAN.md`, never executed by design. Not a code gap. |
| 2 | Sem credencial Uber configurada, a UI degrada com uma mensagem clara em vez de falhar em silêncio ou travar o formulário (INT-02) | ✓ VERIFIED | `src/lib/uber.ts` `getDeliveryQuote()` no longer contains any `return null` — confirmed by direct source read (lines 90-112) and by an independently re-executed reproduction of the plan's `<verify>` one-liner (`INT-02 TRACER OK`), which exercises `interpretarRespostaUber`/`interpretarFalhaDeRede` with real inputs (200/401/400/network-failure) and asserts 4 distinct pt-BR messages, each containing "manual". `POST /api/frete/uber/quote` and `GET /api/frete/uber/status` both translate `motivo` → HTTP status + message (verified by source read, no `detalhe` field leaked to the browser). PDV (`venda-rapida-form-v2.tsx`) shows `uberMensagem` in a toast and as inline help text under "Frete (Cobrado)" (lines 361, 404, 411, 978-980) — never blocks the sale (see truth below). |
| 3 | O import de clientes da Equilibrium roda em modo dry-run, reportando quantos registros seriam criados, quantos seriam ignorados e quais deram erro, antes de qualquer escrita no banco (INT-03) | ✓ VERIFIED | `analisarImportacaoClientes` (`src/app/(app)/importacao/clientes/actions.ts:22-59`) contains exactly two Prisma calls — `empresaParceira.findUnique` and `cliente.findMany` — both reads; independently re-confirmed by parsing the function body and asserting no write method appears. `/importacao/clientes` (`page.tsx` + `importacao-clientes-client.tsx`) renders 4 counters (`A criar`/`A vincular`/`Ignorados`/`Com erro`) from `plano.resumo` before any commit action is available. Independently re-ran `parseCsvClientes` + `planejarImportacaoClientes` with real CSV input — correctly classified into criar/vincular/ignorar with a consistent `resumo.total`. |
| 4 | Rodar o commit do import da Equilibrium duas vezes com o mesmo arquivo não duplica clientes — o commit é idempotente (INT-03) | ✓ VERIFIED | Independently re-ran `planejarImportacaoClientes` against a simulated "already imported" state (the same 2 CSV rows now present as existing clients bound to the same `empresaParceiraId`) — result: `{criar: 0, vincular: 0, ignorar: 2}`, i.e. a second pass classifies everything as `ignorar` and the transaction body (`confirmarImportacaoClientes`, `actions.ts:77-160`) only writes for `criar`/`vincular` items — `ignorar` never reaches the `$transaction`. The behavioral test that exercises this exact invariant end-to-end against a mocked Prisma client (`src/__tests__/cliente-import-commit.test.ts`, Teste 1) could not be run locally (`vitest` unavailable, no `node_modules` — documented, pre-existing environment constraint) but CI is green on the current `nextjs-migration` HEAD (`928f104`, workflow run `30848575017`, `success`), which is the project's real test gate per `CLAUDE.md`. |

**Score:** 3/4 truths verified. 1/4 (INT-01) is not a code failure — it is correctly and honestly reported by the executor as blocked on external human action, and is tracked as an existing `checkpoint:human-verify` task, never bypassed or falsely marked complete.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/uber-quote-result.ts` | Pure module (zero imports) with discriminated result, response classification, pt-BR messages | ✓ VERIFIED | 188 lines. No `import` statements confirmed by grep. Exports match `<interface_contract>`: `MotivoFalhaUber`, `ResultadoCotacaoUber`, `CODIGOS_ENDERECO_INVALIDO`, `interpretarRespostaUber`, `interpretarFalhaDeRede`, `mensagemFalhaUber`, `statusHttpParaFalhaUber`, `classificarProntidaoUber`. |
| `src/lib/uber.ts` | `getDeliveryQuote()` returns `ResultadoCotacaoUber`, no bare `null` on any error path | ✓ VERIFIED | Confirmed: signature is `Promise<ResultadoCotacaoUber>`; the function body (lines 52-112) contains zero occurrences of `return null`. Previously-documented bare-null returns at (former) lines 114/126/129 are gone — replaced with `interpretarRespostaUber(res.status, data)` in the success/HTTP-error path and `interpretarFalhaDeRede()` in the `catch`. |
| `src/app/api/frete/uber/quote/route.ts` | Translates `motivo` → HTTP status + message | ✓ VERIFIED | Uses `statusHttpParaFalhaUber`/`mensagemFalhaUber`; happy path body unchanged; `detalhe` never returned to the browser. |
| `src/app/api/frete/uber/status/route.ts` | Distinguishes missing-credential from missing-pickup-address | ✓ VERIFIED | Delegates entirely to `classificarProntidaoUber(process.env.*)`; returns `{enabled, motivo, mensagem, pickupAddress}`. |
| `src/components/venda-rapida-form-v2.tsx` | Shows server message; never blocks sale | ✓ VERIFIED | See key-link section below. |
| `src/lib/cliente-import.ts` | Pure importer: parse + idempotency key + planning | ✓ VERIFIED | 273 lines, zero imports confirmed by grep. `chaveDoCliente` uses CPF when present, normalized name otherwise (D-04) — confirmed both by source read and independent execution. |
| `src/app/(app)/importacao/clientes/actions.ts` | Dry-run (reads only) + idempotent commit setting `empresaParceiraId` | ✓ VERIFIED | `analisarImportacaoClientes`: only `findUnique`/`findMany`. `confirmarImportacaoClientes`: `createMany` sets `empresaParceiraId`, `estagioCrm: ESTAGIOS_CRM.NOVO_LEAD`, `origem: "import_funcionarios"`; `update` (vincular path) sets `empresaParceiraId` but does **not** touch `estagioCrm` — confirmed by source read (only 1 occurrence of `estagioCrm` in the whole file, inside `createMany`). |
| `src/app/(app)/importacao/clientes/page.tsx` / `importacao-clientes-client.tsx` | `/importacao/clientes` UI: empresa selector, 4 counters, confirm dialog | ✓ VERIFIED | `page.tsx` wires `analisarAction`/`confirmarAction` to the client component; client component renders `Contador` for `criar`/`vincular`/`ignorar`/`erros` and gates the "Confirmar importação" button behind an `AlertDialog`. |
| `deploy/bfx/README.md` | Uber credential runbook, no real credential values | ✓ VERIFIED | `## Uber Direct (cotação de frete)` section present (lines 89-142): current state, SSM keys to add (placeholders only, `<customer-id-da-uber>` etc.), why no manifest changes, `force-sync` command, motivo→meaning troubleshooting table. Grep for real credential values: none found — only `<...>` placeholders. |
| `.env.example` | Documents the 3 envs, points to SSM/bfx-app-secrets | ✓ VERIFIED | Lines 84-90: comment block states production values come from AWS SSM via `bfx-app-secrets`, same pattern as MinIO. |
| `src/__tests__/uber-credenciais-runbook.test.ts` | CI drift-lock test | ✓ VERIFIED (present, substantive) | 113 lines, 7 test cases, including the literal-credential-value guard (T-09-14). Could not run locally (no vitest); CI green on current HEAD is the real gate. |
| 7 test files (uber-quote-result, uber-status-prontidao, uber-cotacao-nao-bloqueia-venda, cliente-import-parser, cliente-import-commit, cliente-import-robustez, uber-credenciais-runbook) | Non-trivial TDD coverage | ✓ VERIFIED | All present, 54-164 lines each (735 total), none stub-length. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `venda-rapida-form-v2.cotarFreteUber` | `POST /api/frete/uber/quote` | `fetch` + `resultado.ok` handling | ✓ WIRED | Error path uses `data?.mensagem \|\| data?.error`; catch path uses `mensagemFalhaUber("erro_upstream")`; success path `setFrete(data.fee ?? 0)`. |
| `getDeliveryQuote` | `uber-quote-result.interpretarRespostaUber`/`interpretarFalhaDeRede` | direct call | ✓ WIRED | Confirmed in source. |
| `quote/route.ts` | `statusHttpParaFalhaUber` + `mensagemFalhaUber` | direct call | ✓ WIRED | Body `{motivo, mensagem, error}`, no `detalhe`. |
| `GET /api/frete/uber/status` | `classificarProntidaoUber(process.env)` | direct call | ✓ WIRED | Confirmed. |
| `src/middleware.ts` (`PUBLIC_API_PATHS`) | `/api/frete/*` stays behind session | array membership check | ✓ WIRED | `/api/frete` absent from `PUBLIC_API_PATHS` (confirmed by reading the array — 7 entries, none matching `frete`). |
| PDV submit button | sale never blocked by quote state | `disabled={loading}` only | ✓ WIRED | Confirmed at line 1155 — no `uberQuoteLoading`/`uberEnabled` in the guard expression. |
| PDV `CurrencyInput` (frete) | manually editable in all failure cases | no `disabled`/`readOnly` | ✓ WIRED | Confirmed at lines 958-962 — only `value`/`onChange={setFrete}`/`className`. |
| `cotarFreteUber` error/catch paths | do not overwrite typed freight value | absence of `setFrete(...)` before `return` | ✓ WIRED | Confirmed at lines 403-406 (HTTP error) and 409-414 (`catch`/`finally`) — `setFrete` only called on the success path (line 407). |
| `importacao-clientes-client.tsx` | `analisarImportacaoClientes` | dry-run action call | ✓ WIRED | Line 66: `analisarAction(conteudo, empresaParceiraId)`. |
| `importacao-clientes-client.tsx` | `confirmarImportacaoClientes` | commit action call, gated by `AlertDialog` | ✓ WIRED | Line 86: `confirmarAction(texto, empresaParceiraId)`. |
| `page.tsx` | `prisma.empresaParceira.findMany` | server-side empresa list | ✓ WIRED | Confirmed. |
| `actions.ts` (both actions) | `requireAdminOrThrow()` | first statement | ✓ WIRED | Confirmed in both `analisarImportacaoClientes` and `confirmarImportacaoClientes`. |

### Behavioral Spot-Checks (independently re-executed by the verifier, not taken from SUMMARY claims)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `getDeliveryQuote`/`uber-quote-result` classify 200/401/400/network-failure into 4 distinct motivos with distinct messages, no leaked Uber free-text, no `return null` remaining | Re-ran the plan 09-01 `<verify>` one-liner verbatim | `INT-02 TRACER OK` | ✓ PASS |
| `cliente-import` dry-run: parse + plan classify correctly (criar/vincular/ignorar), `empresaParceiraId` respected, "steal from another empresa" blocked | Re-ran an independent reproduction against real CSV input and 3 existing-client scenarios (empty DB / same empresa / other empresa) | Correct classification in all 3 scenarios | ✓ PASS |
| Second import pass of the same file (now already imported) results in `criar:0, vincular:0, ignorar:2` — the core idempotency claim | Re-ran `planejarImportacaoClientes` with existing clients matching both CPF/nome keys | `{criar:0, vincular:0, ignorar:2}` | ✓ PASS |
| `bfx-app-secrets` SSM parameter has no `UBER_*` keys (INT-01 blocker is real, not stale) | `aws ssm get-parameter --name /softlive/bfx/prod/secrets/bfx-app-secrets --with-decryption --region sa-east-1` | 22 keys total, 0 matching `UBER_*` | ✓ PASS (confirms the documented blocker) |
| CI is green on current branch HEAD | `gh run list --branch nextjs-migration --limit 5` | Latest CI run on `928f104`: `success` | ✓ PASS |
| All commit hashes cited in the three SUMMARYs exist in git history | `git log --oneline --all \| grep <hash>` for all 11 hashes | All 11 found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INT-01 | 09-03 | Uber quote works in production with credentials configured | ⏳ BLOCKED (external, not code) | Code/runbook fully ready; credential absent in SSM (independently re-confirmed); `REQUIREMENTS.md` correctly still shows `[ ]` for INT-01 — not falsely marked complete. |
| INT-02 | 09-01 | No-credential UI degrades with clear message, never blocks | ✓ SATISFIED | See truths 2, artifacts, key links above. |
| INT-03 | 09-02 | Dry-run reporting + idempotent commit | ✓ SATISFIED | See truths 3/4, artifacts, key links above. |

No orphaned requirements — `REQUIREMENTS.md` traceability table maps INT-01/02/03 all to "Phase 9 — Integracoes e carga de dados", matching the 3 plans executed.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across all files modified by this phase produced only false positives (the Portuguese word "TODOS" containing the substring "TODO"). No stub returns, no hardcoded empty data flowing to the UI, no orphaned wiring.

### Data-Flow Trace (Level 4)

`/importacao/clientes` renders `plano.resumo` (criar/vincular/ignorar/erros counts) sourced from `analisarAction(conteudo, empresaParceiraId)`, which is the real server action reading `prisma.cliente.findMany` — not a static/hardcoded prop. The PDV's `uberMensagem`/`uberEnabled` state is populated from a real `fetch("/api/frete/uber/status")` call in a `useEffect`, with a `.catch()` fallback defaulting to `sem_credencial` rather than silently failing — confirmed flowing, not hollow.

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes declared or discovered for this phase. Skipped.

### Human Verification Required

1. **Uber credential activation and production quote (INT-01, `09-03-PLAN.md` Task 2, `checkpoint:human-verify` gate=blocking)**
   - **Test:** André creates `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_TOKEN`, `UBER_PICKUP_ADDRESS_JSON` in the `bfx-app-secrets` SSM parameter (`sa-east-1`, append, don't replace — 22 existing keys must remain), forces the ExternalSecret re-sync (`kubectl annotate externalsecret bfx-app-secrets -n bfx force-sync=$(date +%s) --overwrite`), then checks `GET /api/frete/uber/status` and clicks "Uber" in the PDV for a client with a registered address.
   - **Expected:** `/api/frete/uber/status` flips from `{enabled:false, motivo:"sem_credencial"}` to `{enabled:true, pickupAddress:{...}}`; the PDV's "Frete (Cobrado)" field fills with a real quoted value and a success toast appears.
   - **Why human:** Requires live Uber Direct dashboard credentials, a write to the production AWS SSM parameter, and a `kubectl` operation against the production cluster — all explicitly outside the coding agent's permitted actions (and outside what static code verification can prove). This is not a new ask — it is the pre-existing blocking checkpoint documented in `09-03-SUMMARY.md` under "Ações humanas pendentes", reproduced here for completeness.

### Gaps Summary

No code gaps. All INT-02 and INT-03 deliverables are present, substantively implemented, wired end-to-end, and independently re-verified against the actual source (not taken on the SUMMARY's word) — including re-running the pure classification/planning logic with real inputs and re-confirming zero `return null` remains in `getDeliveryQuote`.

INT-01 is genuinely blocked on a credential that does not exist in production (independently re-confirmed today via `aws ssm get-parameter`: 22 keys, none `UBER_*`) — the code and runbook are ready, and the executor correctly did **not** claim INT-01 complete (`REQUIREMENTS.md` still shows `[ ]`, `09-03-SUMMARY.md`'s `requirements-completed` field is empty). This is routed to human verification, not reported as a gap, per the explicit instruction that blocked external dependencies are not code failures.

---

_Verified: 2026-08-03T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
