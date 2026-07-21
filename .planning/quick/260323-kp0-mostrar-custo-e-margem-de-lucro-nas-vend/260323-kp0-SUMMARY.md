---
phase: quick
plan: 260323-kp0
subsystem: historico
tags: [financeiro, vendas, custo, margem, ui]
dependency_graph:
  requires: []
  provides: [custoTotalVenda, margemVenda in venda-utils, Custo/Margem columns in historico]
  affects: [src/lib/venda-utils.ts, src/app/(app)/historico/page.tsx, src/components/historico-vendas-cards.tsx]
tech_stack:
  added: []
  patterns: [null-safe utility pattern matching valorTotalVenda, gross margin CMV calculation]
key_files:
  created: []
  modified:
    - src/lib/venda-utils.ts
    - src/app/(app)/historico/page.tsx
    - src/components/historico-vendas-cards.tsx
decisions:
  - Gross margin only (receita - CMV) / receita, excludes taxaNota/custoEnvio for simplicity
  - Returns null (not 0) when cost data unavailable to distinguish "no data" from zero-cost sales
  - Color coding: green > 0%, amber = 0%, red < 0%
metrics:
  duration: ~10min
  completed: 2026-03-23
  tasks_completed: 2
  files_modified: 3
---

# Phase quick Plan 260323-kp0: Custo e Margem nas Vendas Summary

**One-liner:** Custo (CMV) and Margem % columns added to historico desktop table and mobile cards, using custoTotalVenda/margemVenda utility functions with null-safe legacy fallback.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add custoTotalVenda/margemVenda utils + extend Prisma query | c6fdb9d | venda-utils.ts, historico/page.tsx |
| 2 | Add Custo/Margem columns to desktop table and mobile cards | cfe9cf1 | historico/page.tsx, historico-vendas-cards.tsx |

## What Was Built

**`src/lib/venda-utils.ts`**
- `custoTotalVenda()`: Returns total CMV for a sale. For multi-item sales, sums `item.custoProduto * item.quantidade` across all items. For legacy single-product sales, uses `Venda.custoProduto * Venda.quantidade`. Returns `null` when no cost data is present (not zero).
- `margemVenda()`: Returns gross margin percentage `(receita - CMV) / receita * 100`. Returns `null` when cost is unavailable or receita <= 0.

**`src/app/(app)/historico/page.tsx`**
- Extended `prisma.venda.findMany` select to include `custoProduto` at Venda level (legacy fallback) and in `itens` select (multi-product sales).
- Imported `custoTotalVenda` and `margemVenda` from `@/lib/venda-utils`.
- Added "Custo" and "Margem" TableHead columns between "Valor Total" and "Nota".
- Added corresponding TableCell entries with BRL formatting for cost and color-coded percentage for margin.
- Updated empty-state `colSpan` from 11 to 13.

**`src/components/historico-vendas-cards.tsx`**
- Extended `Venda` type with `custoProduto?: number | null` and updated `itens` type to include `custoProduto: number`.
- Imported `custoTotalVenda` and `margemVenda` from `@/lib/venda-utils`.
- Added "Custo" and "Margem" rows in the expanded detail grid, between "Qtd" and "Nota".

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/lib/venda-utils.ts` — exports `custoTotalVenda` and `margemVenda`
- [x] `src/app/(app)/historico/page.tsx` — contains `custoProduto`, imports `custoTotalVenda`
- [x] `src/components/historico-vendas-cards.tsx` — contains `custoTotalVenda`
- [x] `npx tsc --noEmit` passes with no errors
- [x] Commits c6fdb9d and cfe9cf1 exist on branch nextjs-migration

## Self-Check: PASSED
