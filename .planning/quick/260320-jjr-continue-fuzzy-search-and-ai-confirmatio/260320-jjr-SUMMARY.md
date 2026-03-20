---
phase: quick
plan: 260320-jjr
subsystem: search, ai
tags: [fuzzy-search, pg_trgm, ai-prompt, confirmation-flow]
dependency_graph:
  requires: []
  provides: [fuzzy-search-api, ai-confirmation-flow]
  affects: [src/lib/db-search.ts, src/app/api/search/route.ts, src/lib/ai.ts, src/lib/ai-actions.ts]
tech_stack:
  added: []
  patterns: [pg_trgm fuzzy search, unaccent normalization, GIN indexes]
key_files:
  created:
    - src/lib/db-search.ts (new: fuzzyFindUsuarios added)
    - prisma/migrations/20260320100000_fuzzy_search_indexes/migration.sql
  modified:
    - src/app/api/search/route.ts
    - src/lib/ai.ts
    - src/lib/ai-actions.ts
decisions:
  - fuzzyFindUsuarios searches nome_exibicao first, then falls back to username, combining unique IDs
  - AI system prompt uses FLUXO DE CADASTRO to enforce FK resolution before write proposals
metrics:
  duration: ~10 minutes
  completed: 2026-03-20T18:11:00Z
  tasks_completed: 2
  files_modified: 5
---

# Quick Task 260320-jjr Summary

**One-liner:** pg_trgm fuzzy search for all entity types in search API, plus AI system prompt with explicit FK resolution flow before write confirmations.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add fuzzyFindUsuarios and migrate search API route to fuzzy | ad0861e | src/lib/db-search.ts, src/app/api/search/route.ts, src/lib/ai-actions.ts, prisma/migrations/ |
| 2 | Update AI system prompt for FK resolution and confirmation flow | d432ccd | src/lib/ai.ts |

## What Was Built

### Task 1: Fuzzy Search Migration

- Added `fuzzyFindUsuarios(search, limit)` to `src/lib/db-search.ts`:
  - Searches `nome_exibicao` column first via trigram similarity
  - Falls back to `username` column for users without display names
  - Combines unique IDs and fetches via Prisma
- Rewrote `src/app/api/search/route.ts` to use fuzzy helpers:
  - `clientes` type → `fuzzyFindClientes(q, limit)`
  - `produtos` type → `fuzzyFindProdutos(q, limit)`
  - `usuarios` type → `fuzzyFindUsuarios(q, limit)`
  - Removed direct `prisma` import (all queries via db-search helpers)
- `src/lib/ai-actions.ts` changes were pre-existing unstaged work:
  - `listar_clientes` and `listar_produtos` now use fuzzy helpers when search param present
  - `criar_venda` uses `fuzzyFindClienteByNome` instead of `prisma.cliente.findFirst` with contains
- Migration `20260320100000_fuzzy_search_indexes` enables pg_trgm + unaccent extensions, immutable `f_unaccent` wrapper, and GIN indexes on clientes/produtos/fornecedores nome columns

### Task 2: AI System Prompt Update

- Added `FLUXO DE CADASTRO` section to `SYSTEM_PROMPT` in `src/lib/ai.ts`
- Instructs AI to resolve all FK references (fornecedor, cliente, produto) via lookup tools before proposing any write action
- Requires AI to present complete summary with resolved names (e.g. "Fornecedor: Distribuidora ABC (ID: 42)")
- Instructs AI to ask "Confirma o cadastro acima?" before proceeding
- If a reference isn't found, AI should inform user and ask whether to create it first

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` passes for all modified files
2. `src/app/api/search/route.ts` contains no `prisma.cliente.findMany`, `prisma.produto.findMany`, or `prisma.usuario.findMany`
3. `src/lib/ai.ts` SYSTEM_PROMPT contains "FLUXO DE CADASTRO" and "ANTES de propor"
4. `src/lib/db-search.ts` exports `fuzzyFindUsuarios`

## Self-Check: PASSED

All files verified present. Both commits confirmed in git log.
