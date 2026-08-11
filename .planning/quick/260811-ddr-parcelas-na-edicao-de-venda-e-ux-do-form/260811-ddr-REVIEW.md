---
phase: 260811-ddr-parcelas-na-edicao-de-venda-e-ux-do-form
reviewed: 2026-08-11T14:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/lib/parcelas-ajuste.ts
  - src/__tests__/parcelas-ajuste.test.ts
  - src/components/edit-parcelas-section.tsx
  - src/components/edit-venda-com-parcelas.tsx
  - src/components/edit-venda-historico-form.tsx
  - src/components/form-secao-titulo.tsx
  - src/__tests__/edit-venda-form-ux.test.ts
  - src/app/(app)/historico/actions.ts
  - src/app/(app)/historico/page.tsx
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 260811-ddr: Code Review Report — Bug de parcelas na edição de venda

**Reviewed:** 2026-08-11T14:00:00Z
**Depth:** deep (cross-file trace: component wiring → FormData → server action; pure module independently re-executed via `node --experimental-strip-types` outside of the test file)
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Scope: commits `d20a53b`, `9d10f20`, `7afab8c`, `6ead7cc` only. `6bb8487` (password/audit-log security fix) was excluded as instructed.

The pure module `src/lib/parcelas-ajuste.ts` is solid. I re-implemented the test harness independently (stubbing `calcularPrimeiroVencimento` to sidestep the missing `clsx` dependency) and re-ran every scenario from the task's focus list directly against the source, not just read it: 2→4 growth, 4→2 reduction, no-change idempotence, month-end clamp (Jan 31 → Feb 28), year-rollover clamp (Dec 31 → Jan 31 of next year), 100-in-3 rounding (33.33/33.33/33.34), and the paid-installment clamp (`parcelasPagas`). All matched the documented contract. The server-side guard order in `actions.ts` is also correct: the paid-installment read (`parcelaVencimento.findMany`) and both new guards (T-ddr-01, T-ddr-02) run and can `return` **before** `prisma.venda.update` is reached, so a rejected save never leaves the header mutated while the guard fires. The pre-existing `antecipacao-custo-edicao.test.ts` file was not touched by this task and its fixture (`parcelas: "4"` with 4 matching `parcelasVencimento` rows) already satisfies the new T-ddr-02 check, so it isn't broken by the new guard — confirmed by reading the fixture, not assumed. `grep -c 'name="'` before/after the D-05 reshuffle is genuinely 10/10 (I reran the diff myself), and `raw-color-scan.mjs src --check` reports zero regressions when actually executed.

However, the module being correct in isolation does not mean the bug is actually fixed end-to-end. Tracing the wiring from `EditParcelasSection` through to the FormData the server receives surfaces a **critical** regression path that reproduces the exact class of bug this task exists to close (header/rows divergence, paid installment silently orphaned) — reachable through completely ordinary use of the "Parcelas" number input, not a contrived edge case. See CR-01.

## Critical Issues

### CR-01: Setting "Parcelas" to 1 bypasses every new guard and can re-create the header/rows divergence bug (D-04 regression)

**File:** `src/components/edit-parcelas-section.tsx:85` (interacts with `src/components/edit-venda-com-parcelas.tsx:53-59` and `src/app/(app)/historico/actions.ts:65-73,101-126,158-183,199-220`)

**Issue:** The whole point of this task's server guards (T-ddr-01/T-ddr-02) is to make it impossible to silently discard a paid parcela or let `venda.parcelas` diverge from the row count in `parcelas_vencimento` — exactly the failure mode that produced the venda‑182 incident. There is a direct, normal-usage path around both guards:

1. `edit-venda-com-parcelas.tsx:53-59` renders the Parcelas `<Input name="parcelas" type="number" min={1} ...>` with `onChange={(e) => setNumeroParcelas(Math.max(1, Number(e.target.value) || 1))}` — nothing prevents the user from typing `1` even when the venda has several parcelas, some already paid.
2. `edit-parcelas-section.tsx:85` has `if (numeroParcelas <= 1) return null;` — unchanged by this task, still present after all four commits. When the user types `1`, `EditParcelasSection` stops rendering entirely, including the `<input type="hidden" name="parcelasVencimento" ...>` at line 92-97 that carries the adjusted list back to the server. The `minimoPorPagas` warning banner (the one piece of UI meant to tell the user "esta venda ja tem parcelas pagas ate a Nª") is inside the same unmounted subtree, so it never displays either — at exactly the value where the user most needs to see it.
3. On submit, `formData.get("parcelasVencimento")` is `null`. In `actions.ts:65-73`, `parcelasRaw` is falsy, so `parcelasForm` stays `[]`.
4. `actions.ts:101` — the entire guard block (`if (parcelasForm.length > 0) { ...T-ddr-01... ...T-ddr-02... }`) is skipped, because the condition is false. Neither the "parcela paga seria apagada" check nor the "cabecalho diverge das linhas" check ever runs.
5. `actions.ts:199` — `if (parcelasForm.length > 0)` is also false, so the `deleteMany`/`createMany` rewrite of `parcelaVencimento` never runs. The existing rows (including `paga: true` rows) are left untouched in the DB — so there's no data loss inside `parcelas_vencimento` itself.
6. But `actions.ts:158-183` — `prisma.venda.update` is **unconditional**. It writes `parcelas: parcelasNum` (`= 1`) into the venda header regardless of what happened above.

Net result: the venda ends up with `parcelas = 1` in the header while `parcelas_vencimento` still has N rows (some `paga = true`) — the identical shape of corruption documented in the module's own header comment as the venda‑182 incident (`parcelas = 4` header, 5 rows). The save succeeds (`{ success: true }`), no error is shown, and no warning was ever displayed to the user because the warning banner lives inside the component that unmounted. This is reachable by any user simply correcting the Parcelas field to `1` (e.g., "actually this was paid up front, not financed") on a venda that has 2+ installments with some already marked paid — not an attack, not a contrived edge case.

As a secondary consequence in the same save, `custoAntecipacaoVenda` (`actions.ts:149-155`) is invoked with `parcelas: 1` (the new header value) but `parcelas_detalhes` falls back to the **old** multi-row `parcelasExistentes` (since `parcelasForm.length === 0`), feeding the Prudent cost calculation a header/detail pair that no longer agree with each other either.

There is no test (unit, component, or integration) that exercises `EditParcelasSection`'s actual render/unmount/submit behavior — `parcelas-ajuste.test.ts` only covers the pure function, never the component wiring where this regression actually lives. That gap is exactly why this slipped through despite the module-level tests being thorough.

**Fix:** Don't let the component's DOM stop carrying the parcelas payload just because the visual dialog is hidden. Two independent ways to close this, either is sufficient on its own but doing both is safer:

```tsx
// edit-parcelas-section.tsx — always emit the hidden input, gate only the visible UI
export function EditParcelasSection({ initialParcelas, numeroParcelas, valorTotal, dataVenda, parcelasPagas = [] }: Props) {
  // ...unchanged hooks...

  const totalParcelas = parcelas.reduce((s, p) => s + p.valorParcela, 0);
  const diverge = Math.abs(totalParcelas - valorTotal) > 0.01;

  return (
    <div className="md:col-span-3">
      <input type="hidden" name="parcelasVencimento" value={JSON.stringify(parcelas)} readOnly />
      {numeroParcelas > 1 && (
        <>
          {/* ...rest of the visible UI, unchanged... */}
        </>
      )}
    </div>
  );
}
```

And, belt-and-suspenders, make the server guard fire even when the client sends nothing, whenever paid rows exist and the requested header count would drop below them:

```ts
// actions.ts — run T-ddr-01/02 independent of whether the client sent a payload
const parcelasPagasExistentes = parcelasExistentes.filter((p) => p.paga);
if (parcelasForm.length === 0 && parcelasPagasExistentes.length > 0) {
  const maiorPaga = Math.max(...parcelasPagasExistentes.map((p) => p.numeroParcela));
  if (parcelasNum < maiorPaga) {
    return {
      success: false,
      error: `Nao e possivel salvar: existem parcelas pagas ate a ${maiorPaga}ª, mas o numero de parcelas informado e ${parcelasNum}.`,
    };
  }
}
```

## Warnings

### WR-01: Month-end date drift compounds across growth steps and is untested beyond a single step

**File:** `src/lib/parcelas-ajuste.ts:53-63` (`somarUmMes`)

**Issue:** Each new installment's date is computed by clamping off the *previous* (already-clamped) parcela's date, not off a fixed original day-of-month. I verified this independently by running the module directly:

```
input:  1 parcela, 2026-01-31, grown to 5
output: 2026-01-31, 2026-02-28, 2026-03-28, 2026-04-28, 2026-05-28
```

Once February clamps the day from 31 to 28, every later month stays pinned at 28 even though March (31 days) and April (30 days) could have supported the original day 31/30. Whether this is the intended business rule isn't documented, but it is a real, user-visible behavior (vencimento date silently drifts 2-3 days earlier for the rest of the installments) and only the single-step case (`1 → 2`, `2026-01-31 → 2026-02-28`) is covered by `parcelas-ajuste.test.ts`. The multi-step compounding is unverified against any stated requirement.

**Fix:** Capture the target day-of-month once (from the first/original parcela) and compute each new date from a fixed base month + i, clamping per-target-month independently, instead of chaining off the previous result:

```ts
function gerarProximaData(baseAno: number, baseMes: number, diaAlvo: number, passo: number): string {
  const ultimoDiaDoMesDestino = new Date(Date.UTC(baseAno, baseMes + passo + 1, 0)).getUTCDate();
  return formatarDataUtc(baseAno, baseMes + passo, Math.min(diaAlvo, ultimoDiaDoMesDestino));
}
```

### WR-02: `ajustarParcelas` accepts an optional `dataVenda`, silently reading the system clock and breaking the module's own "pure/UTC-only" contract

**File:** `src/lib/parcelas-ajuste.ts:65-69` (`dataVendaParaDate`), `86-91` (signature)

**Issue:** The file's header comment states this module deliberately avoids `new Date("YYYY-MM-DD")` + local getters and is meant to be the single, deterministic source of truth for this arithmetic. But `dataVenda?: string` is optional, and when omitted, `dataVendaParaDate` falls back to `new Date()` — current wall-clock time in the server/client's local timezone, not UTC-derived from any input. This isn't reachable today (every real caller — `EditParcelasSection` — declares `dataVenda: string` as a required prop), but the exported function's own type signature invites a future caller to omit it and get non-deterministic, timezone-dependent output, which is precisely the bug class this same codebase already had to fix once (commit `d9064ee`).

**Fix:** Make `dataVenda` mandatory in `ajustarParcelas`'s parameter type (drop the `?`), forcing every caller to supply an explicit reference date rather than allowing a silent "now" fallback.

### WR-03: No feedback tells the user how to resolve the T-ddr-02 rejection caused by the paid-installment clamp

**File:** `src/components/edit-parcelas-section.tsx:122-127`, `src/app/(app)/historico/actions.ts:120-125`

**Issue:** When `parcelasPagas` clamps `alvo` above what the user typed (e.g., user types `2` but parcela 3 is already paid), `ajustarParcelas` correctly keeps 3 rows and reports `minimoPorPagas: 3`. But the Parcelas number input itself is never updated to reflect the clamp — it still holds the value the user typed (`2`). On submit, `parcelasForm.length` (3) will always disagree with `parcelasNum` (2, taken straight from the still-unclamped input), so `actions.ts:120-125`'s T-ddr-02 check always rejects the save with the generic message "Numero de parcelas nao bate com a quantidade de datas de vencimento informadas." Combined with the separate banner "Esta venda ja tem parcelas pagas ate a 3ª — a lista nao pode ficar menor que isso," the user is never told the concrete action needed (set the Parcelas field back to 3). This fails safe (no data loss), but is a real usability gap directly caused by a scenario this task's own guard forces into existence.

**Fix:** Either surface a single, actionable message ("ajuste o campo Parcelas para pelo menos 3") whenever `minimoPorPagas !== null`, or have the parent (`EditVendaComParcelas`) auto-correct its `numeroParcelas` state when the clamp fires so the input and the payload never disagree in the first place.

## Info

### IN-01: Component/integration test coverage gap around D-04's actual guarantee

**File:** `src/__tests__/parcelas-ajuste.test.ts`, `src/components/edit-parcelas-section.tsx`

**Issue:** The task's TDD step only produced tests for the pure `ajustarParcelas`/`redistribuirValores` functions. There is no test that renders `EditParcelasSection`, sets `numeroParcelas` to a value that would drop a paid installment, and asserts the submitted `FormData` still carries a `parcelasVencimento` payload for the server guard to inspect. CR-01 above is a direct consequence of this gap — the module-level "never descarta parcela paga" guarantee doesn't hold at the component/form-submission boundary where the real regression lives.

**Fix:** Add a component or integration-level test (e.g., render `EditParcelasSection` with `parcelasPagas` set, drive `numeroParcelas` down to 1, and assert the hidden `parcelasVencimento` input is still present with the clamped list) so this class of regression fails loudly next time.

---

_Reviewed: 2026-08-11T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
