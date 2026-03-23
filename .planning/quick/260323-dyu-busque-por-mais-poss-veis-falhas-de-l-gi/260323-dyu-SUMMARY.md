---
phase: quick-260323-dyu
plan: "01"
subsystem: ai-actions
tags: [bugfix, ai, financial-calculations, lucroLiquido, comissoes, margem]
dependency_graph:
  requires: [src/lib/ai-actions.ts, src/lib/venda-utils.ts]
  provides: [correct lucroLiquido on AI-created sales, correct comissao totals, correct cost reporting]
  affects: [AI chat financial reports, dashboard profit/commission calculations]
tech_stack:
  added: []
  patterns: [Prisma select with itens relation, date range filtering via venda relation]
key_files:
  created: []
  modified:
    - src/lib/ai-actions.ts
decisions:
  - "AI criar_venda uses simplified lucro formula (no taxaNota) since AI action does not support temNota/taxaNota params"
  - "consultar_comissoes uses select (not include) with explicit itens field to keep query efficient"
metrics:
  duration: "~12 minutes"
  completed: "2026-03-23T14:11:43Z"
  tasks_completed: 2
  files_modified: 1
---

# Phase quick-260323-dyu Plan 01: AI Financial Calculation Fixes Summary

**One-liner:** Fixed four financial calculation bugs in AI actions: null lucroLiquido on created sales, missing itens in comissoes query, missing taxaNota in cost reporting, and absent date filter in margem produto.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix AI criar_venda to compute and store lucroLiquido | f2077fa | src/lib/ai-actions.ts |
| 2 | Fix AI report action calculation bugs (Bug A/B/C) | 9104110 | src/lib/ai-actions.ts |

## What Was Built

### Task 1 — lucroLiquido in criar_venda

AI-created sales were storing `null` for `lucroLiquido`, causing commission calculations and profit dashboards to show zero for those records. The fix computes `lucroLiquido = (valorVenda + valorFrete) - (custoProduto + custoEnvio)` before the `prisma.venda.create` call and includes it in the data object. This matches the V1 `criarVenda` formula in `venda-rapida/actions.ts` (minus `taxaNota`, which is not applicable since the AI action has no `temNota`/`taxaNota` params).

### Task 2 — Three report calculation bugs

**Bug A (MEDIUM-04) — consultar_comissoes missing itens/quantidade:**
The Prisma select only had `{ vendedor, valorVenda, valorFrete }`. Since `valorTotalVenda()` uses `itens[].subtotal` for V2 sales and `valorVenda * quantidade` for V1, both `quantidade` and `itens: { select: { subtotal: true } }` were added to the select. Without this, `valorTotalVenda()` was computing wrong totals for any V2 (multi-product) sale.

**Bug B (MEDIUM-05) — resumo_relatorio_vendas missing taxaNota in cost:**
`totalCusto` only summed `custoItens + custoEnvio`. For sales with `temNota = true`, the nota fiscal percentage cost was ignored, inflating the reported `lucroTotal`. Added `notaCost = v.temNota ? ((valorTotalVenda(v) - (v.valorFrete ?? 0)) * (v.taxaNota ?? 5.97) / 100) : 0` and included it in the reduce. The `include` query already fetches `temNota` and `taxaNota`, so no query change was needed.

**Bug C (LOW-05) — resumo_margem_produto ignores date filter:**
The `resumo_margem_produto` schema had no `from`/`to` params, and the `ItemVenda` query had no `where` clause — it always loaded all records. Added `from` and `to` optional string params to the schema, and added a conditional `where` clause that filters `ItemVenda` through the `venda.dataVenda` relation when dates are provided.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- All three automated verification checks passed (consultar_comissoes has itens, totalCusto has notaCost/temNota, resumo_margem_produto schema has from)
- TypeScript errors in output are all pre-existing node_modules issues (Prisma runtime private identifiers, Zod v4 locales esModuleInterop) — not introduced by this change
- File reads cleanly via Node.js (no syntax errors)

## Self-Check: PASSED

- src/lib/ai-actions.ts modified: FOUND
- Commit f2077fa (Task 1): FOUND
- Commit 9104110 (Task 2): FOUND
- lucroLiquido in criar_venda case: FOUND
- itens in consultar_comissoes select: FOUND
- notaCost in resumo_relatorio_vendas: FOUND
- from/to params in resumo_margem_produto schema: FOUND
