---
task: 260810-f21-capturar-o-custo-real-do-uber-direct-por
verified: 2026-08-10T00:00:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Quick Task 260810-f21: Capturar o custo real do Uber Direct por entrega — Verification Report

**Task Goal:** Capturar o custo real do Uber Direct por entrega e lancar como custo no financeiro
**Verified:** 2026-08-10
**Status:** passed

## Method

Read every file the SUMMARY claims to have created/modified, independently re-ran the pure money
and decision logic with `node --input-type=module` (bypassing the executor's own claimed output),
diffed `src/lib/finance.ts` across the four claimed commits, verified each of the four commit
hashes exists with the claimed diff, read all three test files in full, and cross-checked the
admin-guard pattern, revalidation wiring, and migration style against the existing files the plan
named as references.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `full_fee.total = 2490` (centavos) vira `custoEnvio = 24.9`, nunca 2490 nem 0.249 | VERIFIED | Independently ran `converterCentavosParaReais(1234)` -> `12.34`; `interpretarCustoEntregaUber(200, {..., full_fee:{total:2490,...}})` -> `total: 24.9`. `src/lib/uber-custo-entrega.ts:47-53` divides by 100 only after `Number.isInteger` + `>= 0` + `Number.isFinite` checks. |
| 2 | Moeda diferente de BRL nunca vira reais gravaveis — falha explicita, sem escrita | VERIFIED | `interpretarCustoEntregaUber` line 125-126: `if (moeda !== "BRL") return falha("moeda_inesperada", moeda)` — independently reproduced with `currency_code: "USD"` -> `{ok:false, motivo:"moeda_inesperada"}`. Route maps this to HTTP 422 via `statusHttpParaFalhaCustoUber`, never proceeds to `prisma.venda.update`. |
| 3 | `POST /api/frete/uber/custo` sem sessao admin -> 401, nao escreve nada | VERIFIED | `route.ts:17-20` checks `getSession()` + `role === "admin"` before any read/write, returns 401. Test 10 (`uber-custo-entrega-rota.test.ts:51-58`) asserts `res.status === 401` and `dbMock.venda.update` not called. |
| 4 | Depois de gravar, `/financeiro`, `/dashboard`, `/relatorios` refletem sem reload (`revalidarVenda`) | VERIFIED | `uber-entrega.ts:186` calls `revalidarVenda()` after successful update; `src/lib/revalidacao.ts:23-33` — `ROTAS_VENDA` includes `/dashboard`, `/financeiro`, `/relatorios` (plus others); `revalidarRotas` calls `revalidatePath` on every entry. Test 12 confirms `/financeiro` specifically. |
| 5 | O fluxo nunca cria `Despesa`; `custoEnvio` ja entra em `custosVar` via `freteReal` | VERIFIED | `git diff 31a46a9^ 6911008 -- src/lib/finance.ts` is empty (file untouched). `grep -n despesa` on the two new lib files finds only comments, no `prisma.despesa.create` call anywhere. `finance.ts:81`: `custosVar = cmv + comissoes + variaveis + freteReal` confirmed verbatim, `freteReal` (line 46) sums `v.custoEnvio`. Test 13 asserts `despesa.create` never called. |
| 6 | Custo digitado a mao nunca e sobrescrito por um custo da Uber | VERIFIED | `decidirGravacaoCustoEnvio` (`uber-custo-entrega.ts:198-200`): `fonte === null && custoAtualNum > 0` -> `gravar:false, motivo:"custo_manual_preservado", httpStatus:409`. Independently reproduced with `{custoEnvioAtual:35, fonteAtual:null, ...}` -> `gravar:false`. |
| 7 | Custo definitivo nunca e rebaixado por um custo provisorio | VERIFIED | `uber-custo-entrega.ts:203-204`: `fonte === "uber_final" && !novoDefinitivo` -> `gravar:false, motivo:"custo_final_ja_gravado"`. Independently reproduced. Reconciliation case (definitivo->definitivo com valor diferente) correctly still grants `gravar:true`. |
| 8 | Nenhum texto livre da Uber (erro, fee_code) aparece na resposta HTTP | VERIFIED | `normalizarCodigoTaxaUber` strips to `[A-Z_]` only, 40-char cap. Route's failure branch (`route.ts:57-62`) only ever returns `{motivo, mensagem}` from the closed-vocabulary `mensagemFalhaCustoUber`/`mensagemMotivoGravacao` functions — raw Uber body (`data`) is only passed to `console.error` (server-side), never returned. Test 8 and Test 16 assert this directly; independently reproduced with a street-address fee_code -> stripped to `RUAAUGUSTA`. |
| 9 | O mesmo `uber_delivery_id` nao pode ser lancado em duas vendas | VERIFIED | `prisma/schema.prisma:175`: `uberDeliveryId String? @unique @map("uber_delivery_id")`. Migration creates `CREATE UNIQUE INDEX IF NOT EXISTS "vendas_uber_delivery_id_key"`. `uber-entrega.ts:174-184` catches P2002 via `ehConflitoDeUnicidade` and maps to `{motivo:"entrega_ja_lancada", httpStatus:409}`. Test 8 in `uber-custo-envio-decisao.test.ts` exercises this with a mocked P2002 error. |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/uber-custo-entrega.ts` | Pure money/parse/decision module, zero imports | VERIFIED | Zero imports confirmed by reading full file; independently executed via `node --input-type=module`. |
| `src/lib/uber-entrega.ts` | HTTP client + persistence | VERIFIED | Imports `prisma`, `uber-auth`, `uber-custo-entrega`, `revalidacao` — all wired, all exist. |
| `src/app/api/frete/uber/custo/route.ts` | Admin POST route | VERIFIED | Guard-first ordering matches `src/app/api/admin/backfill-estoque/route.ts` pattern exactly. |
| `src/__tests__/uber-custo-entrega.test.ts` | 9 tests, pure layer | VERIFIED | 151 lines, all assertions substantive (not tautological) — see Test Quality below. |
| `src/__tests__/uber-custo-entrega-rota.test.ts` | 7 tests, route with mocks | VERIFIED | 135 lines, mocks `db`/`session`/`uber`/`next/cache`, matches `fornecedores-post-route.test.ts` style. |
| `src/__tests__/uber-custo-envio-decisao.test.ts` | 8 tests, provisional/final + P2002 | VERIFIED | 139 lines. |
| `prisma/migrations/20260810120000_venda_uber_custo_entrega/migration.sql` | Idempotent, `@map`-consistent | VERIFIED | `ADD COLUMN IF NOT EXISTS` x2, `CREATE UNIQUE INDEX IF NOT EXISTS` x1 — matches `20260804120000_config_uber` style exactly. Column names (`uber_delivery_id`, `custo_envio_fonte`) match schema `@map` values verbatim. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `full_fee.total` (centavos) | `Venda.custoEnvio` (reais) | `converterCentavosParaReais` | WIRED | Verified numerically: 1234 -> 12.34, not 1234 or 0.1234. |
| `Venda.custoEnvio` | `custosVar`/margem | `src/lib/finance.ts:81` `freteReal` | WIRED (untouched) | Diff across all 4 commits is empty for this file. |
| `registrarCustoEntregaUber` | `/financeiro`, `/dashboard`, `/relatorios` | `revalidarVenda()` | WIRED | Called unconditionally after successful `prisma.venda.update`, before returning. |
| route | `getSession().role === "admin"` | same pattern as `backfill-estoque/route.ts` | WIRED | First statement in `POST`, before body parsing. |
| `getUberDirectConfig()` | `obterTokenUber(...)` | `resolveUberBearerToken` | WIRED | Branches on `config.source` exactly as `src/lib/uber.ts` does; 401-retry logic present with cache-clear before retry. |
| `Venda.uberDeliveryId @unique` | P2002 -> 409 | `ehConflitoDeUnicidade` + try/catch around `prisma.venda.update` | WIRED | Confirmed via mocked P2002 test and code path reading. |

### Independent Re-verification (money + decision logic)

Ran directly against the checked-in module, not the executor's transcript:

```
1234 -> 12.34   (not 1234, not 0.1234)
0 -> 0
-1 -> null
24.9 (non-integer) -> null
NaN -> null
Infinity -> null
"1234" (string) -> null
null/undefined -> null
USD currency -> {ok:false, motivo:"moeda_inesperada"}
free-text fee_code ("Rua das Flores, 123 - apto 4B") -> normalized to "RUADASFLORESAPTOB" (no raw text)
deliveryIdValido("../etc") -> false
deliveryIdValido("del_9f3-AB") -> true
manual cost (fonte null, custo 35) + new Uber cost -> gravar:false, custo_manual_preservado, 409
final cost + new provisional -> gravar:false, custo_final_ja_gravado, 409
final cost + new final with different value (reconciliation) -> gravar:true, uber_final
```

All match the plan's stated `must_haves.truths` and the SUMMARY's claims exactly — no discrepancy
found between claimed and actual behavior.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| QK-F21-01 | Custo real aterrissa em `Venda.custoEnvio`, sem dupla contagem via `Despesa` | SATISFIED | `finance.ts` untouched, no `despesa.create` calls, Test 13 locks this. |
| QK-F21-02 | Provisorio x definitivo, protecao contra sobrescrita | SATISFIED | `decidirGravacaoCustoEnvio` + `custoEntregaDefinitivo`, Tests 2-6 of decision test file. |

### Anti-Patterns Found

None. `grep` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` across all four production files (module,
client, route, migration) returned zero matches.

### Test Quality — not tautological

Read all three test files in full (425 lines). Assertions check concrete return values (`toBe(24.9)`,
`toBe("custo_manual_preservado")`, `toHaveBeenCalledWith("/financeiro")`, mock call args
`chamada.data.custoEnvio`), not just truthy/type checks. Test 16 specifically asserts the raw Uber
error string does NOT appear in the response body (negative assertion, correctly targeted). No test
found that merely re-asserts its own mock setup.

### Environment Constraints Honored

- `node_modules` confirmed absent (`ls: node_modules: No such file or directory`); `vitest`
  genuinely cannot run here. This is a known constraint per task instructions, not treated as a
  gap. Test *existence* and assertion quality were verified by reading; CI remains the real gate.
- No Uber credentials exist in this environment; code paths were verified to require them
  (`getUberDirectConfig()` returning `null` -> 503) and no code path bypasses this.

### Git History Verification

All four claimed commits exist with the claimed diffs:
- `31a46a9` — RED Task 1: adds the two test files only (286 insertions, 0 implementation).
- `547b839` — GREEN Task 1: adds `route.ts`, `uber-custo-entrega.ts`, `uber-entrega.ts` (385 insertions).
- `dc72e37` — RED Task 2: adds `uber-custo-envio-decisao.test.ts` only (139 insertions, 0 implementation).
- `6911008` — GREEN Task 2: adds migration, schema change, extends the two lib files (151 insertions, 5 deletions).

RED/GREEN separation is real, not just claimed.

## Gaps Summary

None found. All 9 must-have truths, all 7 required artifacts, and all 6 key links verified against
the actual codebase, independently of the SUMMARY.md narrative. Money conversion is exact (no
off-by-100). No double-counting path exists. Non-BRL is a hard failure. No-clobber rules behave
exactly as specified for manual/provisional/final transitions. Duplicate delivery IDs are blocked
at the database constraint level with correct error mapping. Revalidation is wired. Migration is
idempotent and matches schema `@map` conventions. Auth guard matches the reference pattern.

---

_Verified: 2026-08-10_
_Verifier: Claude (gsd-verifier)_
