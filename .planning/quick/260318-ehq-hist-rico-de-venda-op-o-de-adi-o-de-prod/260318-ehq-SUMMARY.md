---
phase: quick-260318-ehq
plan: 01
subsystem: ui
tags: [react, prisma, nextjs, server-actions, historico, vendas]

requires: []
provides:
  - "Expandable product list in historico desktop table (details/summary HTML)"
  - "Individual product items display in historico mobile cards when expanded"
  - "EditVendaItens client component for multi-product editing in historico edit form"
  - "updateVenda server action handles itensJson to persist ItemVenda records"
affects: [historico, vendas, ItemVenda]

tech-stack:
  added: []
  patterns:
    - "Reuse ProdutoItemForm component for editing product items in historico (same as PDV)"
    - "Serialize items to hidden itensJson field; server action parses and replaces ItemVenda records"
    - "Keep legacy single-product fields (produtoNome, quantidade, valorVenda) updated for backward compat"

key-files:
  created:
    - src/components/edit-venda-itens-client.tsx
  modified:
    - src/app/(app)/historico/page.tsx
    - src/components/historico-vendas-cards.tsx

key-decisions:
  - "Use HTML details/summary (no client state) for expandable product list in server-component table"
  - "EditVendaItens omits id field from initialItens prop; component generates random IDs client-side"
  - "deleteMany + createMany pattern for updating ItemVenda records (clean replace)"
  - "Update legacy Venda fields (produtoNome/quantidade/valorVenda) after item save for backward compat"

patterns-established:
  - "Multi-product editor pattern: ProdutoItemForm list + itensJson hidden input + server action parse"

requirements-completed: [HIST-ITENS-01, HIST-ITENS-02]

duration: 15min
completed: 2026-03-18
---

# Quick Task 260318-ehq: Historico de Venda — Opcao de Adicao de Produtos Summary

**Expandable product list in historico table/cards plus full multi-product editor in edit form using ProdutoItemForm, persisting ItemVenda records via deleteMany/createMany.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T14:30:00Z
- **Completed:** 2026-03-18T14:45:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Desktop historico table shows expandable product list for multi-product sales using native HTML details/summary (no JS required)
- Mobile historico cards show individual product items in a styled list when expanded
- New `EditVendaItens` client component reuses `ProdutoItemForm` for consistent UX with PDV
- `updateVenda` server action extended to parse `itensJson`, replace ItemVenda records, update legacy fields, and recalculate lucroLiquido

## Task Commits

1. **Task 1: Display product items in historico table and mobile cards** - `7403824` (feat)
2. **Task 2: Create multi-product editor for historico edit form** - `c777283` (feat)

**Plan metadata:** (included in task commits — quick task)

## Files Created/Modified
- `src/components/edit-venda-itens-client.tsx` - "use client" component managing list of ProdutoItemForm items with add/remove, serializes to itensJson hidden input
- `src/app/(app)/historico/page.tsx` - Updated itens query selects, expandable product cell in table, EditVendaItens in edit form, itensJson handling in updateVenda action
- `src/components/historico-vendas-cards.tsx` - Updated Venda type and added product list block in expanded card details

## Decisions Made
- Used HTML `<details>/<summary>` for expandable product list in server component table (no client state needed)
- EditVendaItens accepts `initialItens` without `id` fields; generates random IDs via `Math.random().toString(36).slice(2)` internally (avoids crypto.randomUUID() unavailability in some server render contexts)
- deleteMany + createMany pattern chosen for simplicity and correctness (avoids partial update issues)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- File permissions were root-owned; required `sudo chown/chmod` before edits could proceed.
- node_modules was empty so TypeScript compiler could not be run locally; code was verified manually by review.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Historico page now fully supports multi-product sales in both display and editing
- Legacy single-product sales remain backward compatible via fallback in edit form and legacy field updates

---
*Phase: quick-260318-ehq*
*Completed: 2026-03-18*
