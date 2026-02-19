---
phase: quick
plan: 1
subsystem: PDV / Venda Rapida
tags: [pdv, multi-produto, toasts, sonner, form]
dependency_graph:
  requires: []
  provides: [multi-produto PDV ativo em /venda-rapida, toasts Sonner globais]
  affects: [src/app/(app)/venda-rapida/page.tsx, src/components/venda-rapida-form-v2.tsx, src/app/layout.tsx]
tech_stack:
  added: [sonner@latest]
  patterns: [ActionResponse, toast.success/error/warning, Toaster in root layout]
key_files:
  created: []
  modified:
    - src/app/layout.tsx
    - src/components/venda-rapida-form-v2.tsx
    - src/app/(app)/venda-rapida/page.tsx
decisions:
  - Installed sonner directly (not via shadcn/ui wrapper) — simpler, no extra file needed
  - Used --legacy-peer-deps due to pre-existing zod v4 vs openai optional peer dep conflict (unrelated to sonner)
  - Toaster placed inside ThemeProvider so it inherits dark/light mode automatically
metrics:
  duration: ~8 minutes
  completed: 2026-02-19T15:41:27Z
  tasks_completed: 3
  files_modified: 3
---

# Quick Plan 1: Activate Multi-Product PDV (VendaRapidaFormV2) Summary

**One-liner:** Activated multi-product PDV form (VendaRapidaFormV2) by wiring it to venda-rapida page, fixing ActionResponse types, and replacing all alert() calls with Sonner toasts.

## What Was Done

### Task 0: Install Sonner and add Toaster to layout
- Installed `sonner` package via `npm install sonner --legacy-peer-deps`
- Added `import { Toaster } from "sonner"` to `src/app/layout.tsx`
- Added `<Toaster richColors position="top-right" />` inside ThemeProvider so toasts appear globally and respect dark mode

**Commit:** `716339d`

### Task 1: Fix VendaRapidaFormV2 types and replace alerts
- Added `import { toast } from "sonner"`
- Added `import type { ActionResponse } from "@/lib/action-response"`
- Updated `Props.onSubmit` type from `Promise<void>` to `Promise<ActionResponse<{ vendaId: number }>>` — now matches `criarVendaV2` return type
- Replaced `alert("Por favor, selecione um cliente.")` with `toast.warning("Selecione um cliente para continuar.")`
- Replaced `alert("Por favor, preencha todos os produtos.")` with `toast.warning("Preencha o nome de todos os produtos.")`
- Updated `handleSubmit` to read `result` from `onSubmit`: reset form + `toast.success(result.message)` on success, `toast.error(result.error)` on failure
- Replaced catch `alert()` with `toast.error("Erro ao finalizar venda. Tente novamente.")`

**Commit:** `94f680e`

### Task 2: Update page to use VendaRapidaFormV2
- Replaced `import VendaRapidaFormClient from "@/components/venda-rapida-form-client"` with `import VendaRapidaFormV2 from "@/components/venda-rapida-form-v2"`
- Changed JSX render from `<VendaRapidaFormClient` to `<VendaRapidaFormV2` with identical props
- Props are fully compatible: `vendedorOptions`, `parcelasOptions`, `onSubmit={criarVendaV2}` — all match

**Commit:** `dd9e980`

## Decisions Made

1. **sonner direct install vs shadcn/ui wrapper**: Used direct `sonner` import. No additional wrapper file needed since the project uses Sonner directly per the memory docs pattern. Toaster placed in layout.
2. **--legacy-peer-deps**: Required due to a pre-existing conflict between `zod@4.3.6` (installed) and `openai@4.x` which has an optional peer dep on `zod@^3.23.8`. This conflict existed before this plan and is unrelated to sonner.
3. **ActionResponse type**: The `onSubmit` prop signature now correctly reflects the actual server action return type, eliminating the type mismatch that would have caused runtime issues.

## Verification

- TypeScript: Only pre-existing errors in `tests/venda-rapida-dropdown.spec.ts` (@playwright/test not installed) — no errors in modified files
- `require('sonner')` — resolves OK
- `<Toaster />` present in layout.tsx

## Deviations from Plan

None — plan executed exactly as written.

## State After Execution

- `/venda-rapida` now renders `VendaRapidaFormV2` (multi-product PDV)
- All 4 Phase 1 success criteria are now implemented in the active form:
  1. Multi-product (add/remove items via "Adicionar Produto" button)
  2. Each item shows product name, quantity, price (ProdutoItemForm)
  3. Remove item without affecting others (X button per item)
  4. Real-time total update (reactive React state calculations)
- Toast feedback replaces all browser alert() dialogs

## Awaiting Human Verification

The plan includes a `checkpoint:human-verify` as Task 3 — requires manual browser testing at http://localhost:3000/venda-rapida to confirm the multi-product UI renders correctly and toasts appear on form submission.

## Self-Check

**Files exist:**
- [x] src/app/layout.tsx — modified (Toaster added)
- [x] src/components/venda-rapida-form-v2.tsx — modified (types + toasts)
- [x] src/app/(app)/venda-rapida/page.tsx — modified (VendaRapidaFormV2)
- [x] .planning/quick/1-all-plans/1-SUMMARY.md — this file

**Commits exist:**
- [x] 716339d — chore(quick-1): install sonner and add Toaster to root layout
- [x] 94f680e — feat(quick-1): fix VendaRapidaFormV2 types and replace alerts with toasts
- [x] dd9e980 — feat(quick-1): activate VendaRapidaFormV2 on venda-rapida page

## Self-Check: PASSED
