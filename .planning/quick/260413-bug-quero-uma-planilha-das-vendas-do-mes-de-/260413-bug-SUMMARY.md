---
phase: quick
plan: 260413-bug
subsystem: relatorios
tags: [export, xlsx, historico, vendas]
dependency_graph:
  requires: []
  provides: [GET /api/relatorios/vendas-xlsx]
  affects: [src/app/(app)/historico/page.tsx]
tech_stack:
  added: []
  patterns: [XML Spreadsheet 2003, URLSearchParams filter passthrough]
key_files:
  created:
    - src/app/api/relatorios/vendas-xlsx/route.ts
  modified:
    - src/app/(app)/historico/page.tsx
decisions:
  - "XML Spreadsheet 2003 format chosen to avoid npm install (xlsx lib not available)"
  - "Filter params passed via URLSearchParams from historico page to ensure exported data matches visible table"
  - "quantidadeTotal utility reused for Qtd column (handles both itens and legacy quantity)"
metrics:
  duration: 10m
  completed: "2026-04-13"
  tasks_completed: 2
  files_changed: 2
---

# Quick Task 260413-bug: Vendas Excel Export Summary

**One-liner:** XML Spreadsheet export for vendas with filter passthrough, reusing existing antecipacao-xlsx pattern.

## What Was Built

A GET endpoint at `/api/relatorios/vendas-xlsx` that accepts the same filter params as the historico page (`from`, `to`, `vendedor`, `cliente`, `produto`, `formaPagamento`) and returns a downloadable `.xls` file in XML Spreadsheet 2003 format.

An "Exportar Excel" button with a Download icon was added to the Vendas card header in `/historico`. The button builds its `href` using `URLSearchParams` to pass the current active filters, so the downloaded file always matches what the user sees in the table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create vendas-xlsx API route | a27736f | src/app/api/relatorios/vendas-xlsx/route.ts (new) |
| 2 | Add download button to historico page | 01ad52e | src/app/(app)/historico/page.tsx |

## Spreadsheet Columns

| Column | Source |
|--------|--------|
| Cliente | `v.cliente?.nome` |
| Data | DD/MM/YYYY (UTC) |
| Vendedor | `v.vendedor` |
| Produtos | `produtosTexto(v)` |
| Qtd | `quantidadeTotal(v)` |
| Valor Total | `valorTotalVenda(v)` (Number type) |
| Parcelas | `v.parcelas \|\| 1` |
| Forma Pagamento | `formaPagamentoLabel(forma)` with legacy flag fallback |
| Status | `v.status` |

Totals row at bottom sums Valor Total.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/app/api/relatorios/vendas-xlsx/route.ts` exists
- [x] `src/app/(app)/historico/page.tsx` contains "Exportar Excel" and "vendas-xlsx"
- [x] Commits a27736f and 01ad52e exist in git log
- [x] TypeScript check passes (no errors in new/modified files)
- [x] Pushed to remote `nextjs-migration`
