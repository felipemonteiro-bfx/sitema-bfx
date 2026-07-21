---
phase: quick-260326-m0e
plan: 1
subsystem: cadastros
tags: [empresas, produtos, schema, sorting, forms]
key-files:
  modified:
    - prisma/schema.prisma
    - src/app/(app)/cadastros/page.tsx
    - src/components/empresas-tab-client.tsx
    - src/components/produtos-tab-client.tsx
    - src/generated/prisma/index.d.ts
    - src/generated/prisma/index.js
decisions:
  - CNPJ stored as plain string (uppercase), no validation mask — user enters raw format
  - emailsExtras stored as comma-separated string in a single column (simple, queryable)
  - Products sorting is client-side only (no server round-trip needed for in-memory sort)
metrics:
  completed: "2026-03-26"
  tasks_completed: 2
  files_changed: 6
---

# Phase quick-260326-m0e Plan 1: Empresas CNPJ + emails extras + ordenacao produtos Summary

**One-liner:** Added CNPJ and extra emails fields to EmpresaParceira (schema + form) and sortable headers (nome, marca, data compra, valor) to produtos table.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Add cnpj and emailsExtras to EmpresaParceira schema + update server actions | 1fcb637 | Done |
| 2 | Update empresas form (CNPJ + emails extras) + produtos table sorting | 25a32e4 | Done |

## What Was Built

### Task 1: Schema + Server Actions
- Added `cnpj String? @map("cnpj")` to `EmpresaParceira` model
- Added `emailsExtras String? @map("emails_extras")` to `EmpresaParceira` model
- Applied migration with `prisma db push`
- Updated `addEmpresa` and `updateEmpresa` server actions to read and save the new fields
- Updated `editEmpresaData` select to include `cnpj` and `emailsExtras`

### Task 2: Frontend Components
**empresas-tab-client.tsx:**
- Updated `EmpresaListItem` type with `cnpj: string | null` and `emailsExtras: string | null`
- Restructured form to 3-column grid: (Empresa, CNPJ, Responsavel RH) and (Telefone, Email RH, Emails adicionais)
- Added CNPJ column to the empresas table (mono font, shows "—" if null)
- Contact cell now shows telefone + emailRh + emailsExtras stacked

**produtos-tab-client.tsx:**
- Added `sortField` and `sortDir` state (default: nome asc)
- `sortedProdutos` useMemo sorts the list client-side by the selected field
- Table headers Nome, Marca/Fornecedor, Data Compra, Valor are now clickable with ChevronUp/ChevronDown/ArrowUpDown icons
- Added Data Compra column displaying date in dd/MM/yyyy format
- Null dataCompra treated as epoch (oldest) in sort
- Null marca treated as "" in sort

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client regeneration required**
- **Found during:** Task 2 TypeScript check
- **Issue:** `--skip-generate` flag on `db push` left Prisma client types without `emailsExtras` field, causing TS2322 type errors
- **Fix:** Ran `npx prisma generate` to regenerate client with new fields
- **Files modified:** `src/generated/prisma/index.d.ts`, `src/generated/prisma/index.js`, and related generated files
- **Commit:** Included in 25a32e4

## Self-Check: PASSED

- prisma/schema.prisma — FOUND with cnpj and emailsExtras fields
- src/components/empresas-tab-client.tsx — FOUND with CNPJ field and emailsExtras
- src/components/produtos-tab-client.tsx — FOUND with sortField, sortedProdutos, SortIcon
- Commit 1fcb637 — FOUND
- Commit 25a32e4 — FOUND (contains Task 2 changes merged with PLAN-2 work from concurrent session)
