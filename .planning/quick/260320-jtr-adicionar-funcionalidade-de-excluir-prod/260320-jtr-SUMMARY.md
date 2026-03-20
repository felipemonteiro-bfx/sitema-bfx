---
phase: quick-260320-jtr
plan: 01
subsystem: cadastros/produtos
tags: [delete, alert-dialog, server-action, audit]
dependency_graph:
  requires: []
  provides: [produto-delete-action, produto-delete-ui]
  affects: [src/app/(app)/cadastros/page.tsx, src/components/produtos-tab-client.tsx]
tech_stack:
  added: []
  patterns: [AlertDialog confirmation before destructive action, server action with audit log]
key_files:
  modified:
    - src/app/(app)/cadastros/page.tsx
    - src/components/produtos-tab-client.tsx
decisions:
  - No try/catch on deleteProduto — ItemVenda stores produtoNome as denormalized string, no FK cascade issues
  - AlertDialog used for confirmation to prevent accidental deletion
metrics:
  duration: "~10 minutes"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-260320-jtr Plan 01: Add Delete Product Functionality Summary

**One-liner:** Inline Trash2 delete button per product row with AlertDialog confirmation, server action that deletes and creates audit log entry.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Add deleteProduto server action and wire prop | fcc3cc5 | src/app/(app)/cadastros/page.tsx |
| 2 | Add Trash2 button with AlertDialog confirmation | 827815c | src/components/produtos-tab-client.tsx |

## What Was Built

### Task 1: deleteProduto server action (page.tsx)
- New `deleteProduto` async server action following the same pattern as `addProduto`/`updateProduto`
- Looks up the product name before deleting (for audit log)
- Calls `prisma.produto.delete({ where: { id } })`
- Creates audit log entry with `produto:delete` action
- Calls `revalidatePath("/cadastros")` to refresh the page
- Prop `onDeleteAction={deleteProduto}` wired to `ProdutosTabClient`

### Task 2: Trash2 + AlertDialog UI (produtos-tab-client.tsx)
- Added `onDeleteAction` to Props interface
- Imported `Trash2` from lucide-react and all `AlertDialog*` components from `@/components/ui/alert-dialog`
- Added `deleting` state (`useState<number | null>(null)`) to track in-progress deletion
- Each product row now shows a Trash2 ghost button before the existing Pencil button
- Clicking Trash2 opens AlertDialog with product name in description
- Confirming: calls `onDeleteAction(fd)` with product id, shows "Excluindo..." while pending, then calls `router.refresh()` via `startTransition`
- Last TableHead widened from `w-[80px]` to `w-[100px]` to fit both icons

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/app/(app)/cadastros/page.tsx — modified, committed fcc3cc5
- src/components/produtos-tab-client.tsx — modified, committed 827815c
- `npx tsc --noEmit` passes with no errors
