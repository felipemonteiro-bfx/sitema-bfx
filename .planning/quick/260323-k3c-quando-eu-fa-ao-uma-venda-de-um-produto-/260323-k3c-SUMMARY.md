---
phase: quick
plan: 260323-k3c
subsystem: stock-management
tags: [stock, venda, backfill, prisma]
dependency_graph:
  requires: []
  provides: [stock-decrement-on-sale, backfill-historical-sales]
  affects: [venda-rapida, historico, ai-actions, financeiro]
tech_stack:
  added: []
  patterns: [name-based updateMany, transaction-inline decrement, groupBy aggregation]
key_files:
  created:
    - src/app/api/admin/backfill-estoque/route.ts
  modified:
    - src/app/(app)/venda-rapida/actions.ts
    - src/lib/ai-actions.ts
    - src/app/(app)/historico/actions.ts
decisions:
  - Allow negative stock (oversell indicator) rather than capping at 0
  - Name-based matching (produtoNome) since ItemVenda has no produtoId FK
  - updateMany silently no-ops for manually typed product names (correct behavior)
  - Backfill excludes cancelada and estornada vendas only
metrics:
  duration: 15min
  completed: "2026-03-23"
  tasks_completed: 2
  files_modified: 4
---

# Quick Task 260323-k3c: Stock Decrement on Sale Summary

**One-liner:** Name-based stock decrement across all 3 sale creation paths (PDV, legacy, AI) + restore on delete + admin backfill endpoint for historical corrections.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add stock decrement to all sale paths + restore on delete | f51e773 | actions.ts (venda-rapida), ai-actions.ts, actions.ts (historico) |
| 2 | Create backfill endpoint for historical sales | cc0379b | src/app/api/admin/backfill-estoque/route.ts |

## What Was Built

### Task 1: Stock Decrement + Restore

**criarVenda** (`src/app/(app)/venda-rapida/actions.ts`):
- After `prisma.venda.create`, added `prisma.produto.updateMany` to decrement `qtdEstoque` by `quantidade` where `nome = produto`

**criarVendaV2** (same file):
- Added step 4 inside the `$transaction` block after `itemVenda.createMany`
- Loops through all `produtosValidados` and decrements each product by its quantity within the transaction

**criar_venda** (`src/lib/ai-actions.ts`):
- After `tx.itemVenda.create`, decrements stock by 1 for the product name if `parsedParams.produtoNome` is set

**deleteVenda** (`src/app/(app)/historico/actions.ts`):
- Before `prisma.venda.delete`, fetches all `ItemVenda` records for the sale
- Restores stock for each item via `increment` on `qtdEstoque`

### Task 2: Backfill Endpoint

`GET /api/admin/backfill-estoque` — Preview mode, no writes:
- Aggregates all ItemVenda quantities by produtoNome (excluding cancelada/estornada)
- Returns `{ preview: [{ produtoNome, currentStock, totalSold, newStock }] }`

`POST /api/admin/backfill-estoque` — Apply mode:
- Same aggregation, applies `decrement: totalSold` to each matching product
- Returns `{ applied: true, updates: [{ produtoNome, decremented, newStock }] }`

## Decisions Made

- **Name-based matching only**: `ItemVenda` has no `produtoId` FK, only `produtoNome` string. `updateMany` by `nome` is the only option. Silently no-ops for manually typed names.
- **Negative stock allowed**: Overselling shows as negative stock — visible indicator rather than silent cap.
- **Backfill exclusions**: Only `cancelada` and `estornada` are excluded. Null status (active sales) are included.
- **No auth guard on backfill**: Matches existing admin API patterns in the codebase; one-time manual use.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/app/api/admin/backfill-estoque/route.ts` exists
- `src/app/(app)/venda-rapida/actions.ts` modified (stock decrement in criarVenda + criarVendaV2)
- `src/lib/ai-actions.ts` modified (stock decrement in criar_venda)
- `src/app/(app)/historico/actions.ts` modified (stock restore in deleteVenda)
- TypeScript: `npx tsc --noEmit` passes with no errors
- Commits: f51e773 (Task 1), cc0379b (Task 2)
