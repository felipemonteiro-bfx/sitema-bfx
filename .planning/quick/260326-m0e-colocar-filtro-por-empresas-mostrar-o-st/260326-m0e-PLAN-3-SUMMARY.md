---
phase: quick-260326-m0e
plan: 3
subsystem: antecipacao-prudent
tags: [prisma, antecipacao, batch, historico, filtro-periodo, status-colors]
dependency_graph:
  requires: [PLAN-2 filtro empresa/status xlsx, PLAN-1 CNPJ empresas]
  provides: [AnticipacaoBatch model, batch history with re-download, period filter, color-coded status rows]
  affects: [prudent/page.tsx, antecipacao-client.tsx, historico-antecipacoes.tsx]
tech_stack:
  added: []
  patterns: [Prisma batch tracking model, period range filtering on parcelas, server action batch creation]
key_files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/app/(app)/prudent/page.tsx
    - src/components/antecipacao-client.tsx
    - src/components/historico-antecipacoes.tsx
    - src/generated/prisma/index.d.ts
decisions:
  - Prisma model AnticipacaoBatch generates camelCase accessor anticipacaoBatch (not antecipacaoBatch)
  - Used prisma generate (not --skip-generate) to obtain correct TypeScript types
  - DB bfx missing from container; created via docker exec and reset postgres password
metrics:
  duration: ~25 min
  completed: "2026-03-27"
  tasks_completed: 2
  files_changed: 10
---

# Phase quick-260326-m0e Plan 3: AnticipacaoBatch, Filtro de Período e Cores

**One-liner:** AnticipacaoBatch rastreia cada antecipação em lote com período calculado das parcelas, filtro de período por range de meses, cores sólidas por status nas linhas e histórico por lote com re-download de planilha e relatório visual.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AnticipacaoBatch schema + server action + historico por lote | b9c144d | prisma/schema.prisma, prudent/page.tsx, historico-antecipacoes.tsx, generated/prisma/* |
| 2 | Filtro de periodo + cores por status + acentuacao | 18fbe8d | antecipacao-client.tsx |

## What Was Built

### Task 1: AnticipacaoBatch

Model `AnticipacaoBatch` adicionado ao schema Prisma com: `id`, `criadaEm`, `vendaIds` (JSON string), `valorTotal`, `quantidadeVendas`, `periodoDescricao`, `periodoInicio`, `periodoFim`. Tabela `antecipacao_batches` criada no DB via `prisma db push`. Client regenerado com delegate `prisma.anticipacaoBatch`.

Server action `antecipar()` refatorada: busca itens e parcelas das vendas selecionadas, calcula `valorTotal` (soma dos subtotais), determina `periodoInicio/Fim` pela menor/maior data de parcela, formata `periodoDescricao` (ex: "mar./2025 - abr./2025"), cria o batch antes de atualizar `antecipada=1` nas vendas.

`prudent/page.tsx` substituiu query de vendas antecipadas individuais por `anticipacaoBatch.findMany()` e passa `batchesFormatados` para `<HistoricoAntecipacoes>`.

`historico-antecipacoes.tsx` reescrito: exibe cards por lote com número do batch, data/hora, período descritivo, quantidade de vendas, valor total e botões "Planilha" e "Relatório Visual" que reconstroem os links com os IDs do lote.

### Task 2: Filtro de Período, Cores e Acentuação

Helper `parseMesAno()` valida formato `MM/AAAA`. Estados `periodoInicio`/`periodoFim` inicializados com mês atual. A lógica de `vendasFiltradas` agora inclui verificação de parcelas: uma venda passa o filtro se tiver ao menos uma parcela com `dataVencimento` dentro do range `[primeiro dia do mês início, último dia do mês fim]`.

Dois inputs textuais "De mês/ano" / "Até mês/ano" adicionados à barra de filtros (maxLength=7, largura fixa w-28).

`StatusBadge` atualizado com cores sólidas visíveis: `bg-green-600 text-white` (antecipado), `bg-blue-600 text-white` (em_andamento), `bg-amber-500 text-white` (pendente). `TableRow` com fundo colorido por status para clareza visual imediata.

Acentuação corrigida: "Gerar Relatorio Visual" → "Gerar Relatório Visual".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Database bfx ausente no container Docker**
- **Found during:** Task 1 (prisma db push)
- **Issue:** Container `bfx_db` não tinha o database `bfx` criado; senha postgres inválida para conexões externas (scram-sha-256)
- **Fix:** `docker exec bfx_db psql -U postgres -c "CREATE DATABASE bfx;"` + `ALTER USER postgres PASSWORD 'postgres'`
- **Commit:** incluído em b9c144d via db push bem-sucedido

**2. [Rule 1 - Bug] Accessor Prisma é `anticipacaoBatch` não `antecipacaoBatch`**
- **Found during:** Task 1 (tsc check pós-generate)
- **Issue:** Prisma Client gera camelCase de `AnticipacaoBatch` → `anticipacaoBatch`
- **Fix:** Substituição global de `prisma.antecipacaoBatch` → `prisma.anticipacaoBatch` no page.tsx
- **Commit:** b9c144d

## Self-Check: PASSED

- [x] `prisma/schema.prisma` contém model AnticipacaoBatch
- [x] `src/components/historico-antecipacoes.tsx` interface Batch com botoes re-download
- [x] `src/components/antecipacao-client.tsx` filtro de periodo + cores solidas
- [x] `src/app/(app)/prudent/page.tsx` usa anticipacaoBatch.findMany e passa batches
- [x] Commits b9c144d e 18fbe8d existem no historico git
- [x] TypeScript: apenas erros pre-existentes em .next/dev/types/validator.ts
