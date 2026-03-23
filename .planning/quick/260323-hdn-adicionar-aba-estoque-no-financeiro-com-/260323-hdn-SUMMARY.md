---
phase: quick-260323-hdn
plan: "01"
subsystem: financeiro
tags: [estoque, dre, financeiro, capital-imobilizado]
dependency_graph:
  requires: [prisma.produto, financeiro/page.tsx]
  provides: [aba-estoque, card-capital-em-estoque]
  affects: [/financeiro]
tech_stack:
  added: []
  patterns: [server-component-query, sort-in-js, conditional-color-class]
key_files:
  created: []
  modified:
    - src/app/(app)/financeiro/page.tsx
decisions:
  - Sort por valor imobilizado feito em JS (`.sort()`) em vez de ordenacao no banco, evitando campo calculado no Prisma
  - Sem novos imports — Card, Table e demais componentes ja presentes na pagina
metrics:
  duration: "~10 min"
  completed: "2026-03-23T16:34:33Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase quick-260323-hdn Plan 01: Adicionar Aba Estoque no Financeiro

**One-liner:** Aba "Estoque" com 4 cards de capital imobilizado + tabela de produtos ordenada por valor imobilizado, e mini-card "Capital em Estoque" nos Detalhes do DRE Inteligente.

## What Was Built

### Task 1 — Buscar dados de estoque e adicionar aba "Estoque" + card no DRE

**Commit:** `69e5278`

Modificacoes em `src/app/(app)/financeiro/page.tsx`:

1. **Query de produtos** adicionada apos a query de despesas:
   - `prisma.produto.findMany` com `select: { nome, custoPadrao, qtdEstoque, valorVenda }`
   - Ordenacao por valor imobilizado feita em JS com `.sort()` (produtosOrdenados)

2. **Metricas calculadas** antes do return:
   - `estoqueImobilizado`: soma de `custoPadrao * qtdEstoque` de todos os produtos
   - `estoquePotencialReceita`: soma de `valorVenda * qtdEstoque`
   - `estoqueMargemPct`: `(potencial - imobilizado) / potencial * 100`
   - `estoqueItensZerados`: contagem de produtos com `qtdEstoque = 0` ou null

3. **Mini-card "Capital em Estoque"** adicionado como 5o card na grade Detalhes do DRE Inteligente (cor amber-600)

4. **4a aba "Estoque"** adicionada ao QueryTabs:
   - 4 cards de resumo: Valor Imobilizado (amber), Potencial de Receita (success), Margem Potencial, Itens Zerados (destructive)
   - Tabela "Produtos em Estoque" com 6 colunas: Produto | Qtd | Custo unit. | Valor em estoque | Preco venda | Margem %
   - Margem % com cor condicional: verde >= 30%, amber >= 15%, vermelho < 15%
   - Estado vazio tratado (exibe "Sem produtos cadastrados.")

## Verification

- `npx tsc --noEmit` passou sem nenhum erro
- Zero novos imports necessarios
- Todos os criterios de sucesso do plano atendidos

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- File modified: `src/app/(app)/financeiro/page.tsx` — FOUND
- Commit `69e5278` — FOUND
- TypeScript: zero errors
