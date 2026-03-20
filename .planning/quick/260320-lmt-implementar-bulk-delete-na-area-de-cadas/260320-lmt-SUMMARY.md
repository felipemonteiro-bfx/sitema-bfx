---
phase: quick-260320-lmt
plan: 01
subsystem: cadastros
tags: [bulk-delete, checkbox, ui, server-actions]
key-files:
  created:
    - src/components/clientes-tab-client.tsx
    - src/components/fornecedores-tab-client.tsx
    - src/components/empresas-tab-client.tsx
  modified:
    - src/app/(app)/cadastros/page.tsx
    - src/components/produtos-tab-client.tsx
decisions:
  - "Passed searchParams as plain Record<string,string|undefined> prop to client components — avoids useSearchParams in clientes/fornecedores/empresas tabs while keeping buildUrl logic client-side"
  - "Combined tasks 1 and 2 into single commit since ProdutosTabClient bulk delete required immediate fix for TypeScript to pass"
metrics:
  duration: "4 minutes"
  completed: "2026-03-20"
  tasks_completed: 2
  files_changed: 5
---

# Phase quick-260320-lmt Plan 01: Bulk Delete Cadastros Summary

**One-liner:** Checkbox multi-select + AlertDialog bulk delete with audit logs added to all 4 cadastros tabs (clientes, produtos, fornecedores, empresas).

## What Was Built

Added bulk delete functionality across all tabs in the cadastros page:

- **4 new server actions** in `page.tsx`: `bulkDeleteClientes`, `bulkDeleteProdutos`, `bulkDeleteFornecedores`, `bulkDeleteEmpresas` — each fetches names first, calls `deleteMany`, creates audit logs per item, and calls `revalidatePath`.
- **3 new client components** extracted from `page.tsx`: `clientes-tab-client.tsx`, `fornecedores-tab-client.tsx`, `empresas-tab-client.tsx` — each contains the full tab UI (add form + list table + edit form) now with bulk delete support.
- **ProdutosTabClient updated** to add `onBulkDeleteAction` prop + checkbox selection state.
- **All 4 tabs share the same pattern:**
  - Checkbox first column in every table row
  - Header checkbox with indeterminate state for partial selection
  - Bulk delete bar (shown when 1+ rows selected) with count + "Excluir selecionados" button
  - AlertDialog confirmation before executing bulk delete
  - Selection clears and `router.refresh()` fires after successful deletion

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add bulk delete server actions + extract clientes/fornecedores/empresas client components | 584169b | page.tsx, clientes-tab-client.tsx, fornecedores-tab-client.tsx, empresas-tab-client.tsx |
| 2 | Add checkbox bulk selection UI to ProdutosTabClient | 584169b | produtos-tab-client.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tasks 1 and 2 committed together**
- **Found during:** Task 1 verification (TypeScript check)
- **Issue:** ProdutosTabClient needed `onBulkDeleteAction` prop to compile, and this was technically Task 2 work. Since TypeScript failed without it, both tasks were implemented before committing.
- **Fix:** Implemented ProdutosTabClient bulk delete UI (Task 2 scope) during Task 1 to unblock TypeScript.
- **Files modified:** src/components/produtos-tab-client.tsx
- **Commit:** 584169b

## Self-Check

- [x] `src/components/clientes-tab-client.tsx` — created
- [x] `src/components/fornecedores-tab-client.tsx` — created
- [x] `src/components/empresas-tab-client.tsx` — created
- [x] `src/app/(app)/cadastros/page.tsx` — updated
- [x] `src/components/produtos-tab-client.tsx` — updated
- [x] Commit 584169b — verified
- [x] TypeScript compiles without errors

## Self-Check: PASSED
