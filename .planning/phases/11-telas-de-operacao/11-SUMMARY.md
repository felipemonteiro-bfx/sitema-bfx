---
phase: 11-telas-de-operacao
plan: importacao-cadastro
subsystem: ui
tags: [design-tokens, tailwind, dark-mode, importacao, cadastro-produto]

requires:
  - phase: 10-fundacao-visual/10-03
    provides: "design-system/DE-PARA-CORES.md (de-para cor crua → token semântico)"
  - phase: 10-fundacao-visual/10-04
    provides: "tokens success-bg/warning-bg/error-bg/info-bg/card-elevated em :root e .dark, expostos em @theme inline"
provides:
  - "src/components/importacao-client.tsx migrado para tokens semânticos (0 cor crua)"
  - "src/components/edit-venda-form-client.tsx migrado para tokens semânticos (0 cor crua)"
  - "src/components/importacao-clientes-client.tsx migrado para tokens semânticos (0 cor crua)"
  - "src/components/importacao-fornecedores-client.tsx migrado para tokens semânticos (0 cor crua)"
  - "src/components/produto-form-client.tsx migrado para tokens semânticos (0 cor crua)"
  - "src/components/cadastrar-produto-rapido-dialog.tsx migrado para tokens semânticos (0 cor crua)"
affects: []

actuals:
  tokens: 3200
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Troca 1:1 de classe crua por token pelo de-para (design-system/DE-PARA-CORES.md), sem alterar layout/texto/comportamento"
    - "dark: manual removido onde o par crua/dark: mapeava para o mesmo token (o token já resolve o valor por tema)"

key-files:
  created: []
  modified:
    - src/components/importacao-client.tsx
    - src/components/edit-venda-form-client.tsx
    - src/components/importacao-clientes-client.tsx
    - src/components/importacao-fornecedores-client.tsx
    - src/components/produto-form-client.tsx
    - src/components/cadastrar-produto-rapido-dialog.tsx

key-decisions:
  - "text-blue-600 / border-blue-200 / bg-blue-50 / ring-blue-500 nas 4 telas de importação viraram info/info-bg (destaque informativo neutro, D-02), consistente com a classificação de blue já usada em outras telas do de-para"
  - "bg-red-50 (estado de campo obrigatório vazio na tabela de importacao-client.tsx) virou error-bg; text-red-400 do botão de remover linha virou error — ambos preservam o texto/ícone já existente (D-03)"
  - "text-amber-*/bg-amber-*/border-amber-* (aviso de PDF não assinado, badge de produto duplicado, botão 'Sugerir com IA') viraram warning/warning-bg, mantendo o AlertCircle/texto que já acompanhava a cor (D-03)"
  - "text-slate-900 (+ par dark:text-slate-100 em cadastrar-produto-rapido-dialog.tsx) virou foreground — texto principal sobre bg-background; o dark: manual foi removido porque o token resolve o tema sozinho"
  - "green-200/green-50/green-700 do card de resultado de importação (clientes e fornecedores) viraram success/success-bg"

requirements-completed: [OPE-01]

coverage:
  - id: D1
    description: "Zero cor crua nos 6 arquivos designados (importacao-client, edit-venda-form-client, importacao-clientes-client, importacao-fornecedores-client, produto-form-client, cadastrar-produto-rapido-dialog)"
    requirement: "OPE-01"
    verification:
      - kind: other
        ref: "node scripts/design-tokens/raw-color-scan.mjs src — nenhum dos 6 arquivos aparece na saída (antes: 38 ocorrências combinadas)"
        status: pass
      - kind: unit
        ref: "node --test scripts/design-tokens/*.test.mjs — 40/40 testes passando, sem regressão nos scripts de detecção"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-08-04
status: complete
---

# Phase 11: Telas de Operação — Migração de Importação e Cadastro (arquivos designados) Summary

**As 38 ocorrências de cor Tailwind crua nos 6 arquivos designados (telas de importação de vendas/clientes/fornecedores, edição de venda e cadastro de produto) foram trocadas 1:1 pelos tokens semânticos do de-para — zero cor crua restante, sem nenhuma mudança de layout, texto ou comportamento.**

## Escopo desta execução

Esta execução cobriu apenas os 6 arquivos explicitamente designados a este agente (38 ocorrências),
dentro da Fase 11 mais ampla ("Telas de operação"). Outros arquivos da fase (se houver) são de
responsabilidade de outros agentes/execuções — este SUMMARY documenta somente o trabalho feito
aqui.

## Accomplishments

- `src/components/importacao-client.tsx` (15 ocorrências → 0): spinner de loading, card de
  validação, botão "Sugerir com IA", focos de input da tabela editável, estado de campo
  obrigatório vazio e botão de remover linha — todos migrados para `info`/`info-bg`,
  `warning`/`warning-bg` e `error`/`error-bg`.
- `src/components/edit-venda-form-client.tsx` (6 ocorrências → 0): aviso "Vendedor ainda não subiu
  o PDF assinado" migrado para `warning`/`warning-bg`, com o `dark:` manual eliminado (o token já
  resolve os dois temas).
- `src/components/importacao-clientes-client.tsx` (6 ocorrências → 0): mesmo padrão de
  `importacao-client.tsx` — spinner e card de análise para `info`/`info-bg`, card de resultado
  para `success`/`success-bg`.
- `src/components/importacao-fornecedores-client.tsx` (6 ocorrências → 0): idêntico ao de
  clientes.
- `src/components/produto-form-client.tsx` (3 ocorrências → 0): borda/ícone de "produto
  duplicado" para `warning`, código NCM sugerido para `foreground`.
- `src/components/cadastrar-produto-rapido-dialog.tsx` (2 ocorrências → 0): código NCM sugerido
  para `foreground`, com o par `text-slate-900 dark:text-slate-100` colapsado em um único token
  (dark: removido).

## Task Commits

- `feat(11): migrar telas de operacao para tokens semanticos de cor` — `faeca8b`

## Verificação

```
node scripts/design-tokens/raw-color-scan.mjs src
```
Nenhum dos 6 arquivos aparece mais na lista de ocorrências (antes: 38 combinadas entre os 6).
Total do projeto após esta migração: 275 ocorrências em 17 arquivos (fora do escopo desta
execução — arquivos de outras telas/fases).

```
node --test scripts/design-tokens/*.test.mjs
```
40/40 testes passando (nenhuma regressão nos scripts de detecção/contraste herdados da Fase 10).

`git diff --stat` confirma inserções = deleções em cada linha tocada — só a origem da cor mudou,
nada de layout, texto ou estrutura.

## Deviations from Plan

Nenhuma. Todas as 38 ocorrências tinham destino direto e inequívoco na tabela de
`design-system/DE-PARA-CORES.md` (seção blue/sky/cyan, amber/yellow/orange, red, green/emerald,
gray/slate/zinc). Nenhum caso sem token adequado foi encontrado nestes 6 arquivos — os tokens
`success-bg`/`warning-bg`/`error-bg`/`info-bg` já existiam em `:root` e `.dark` (herdados do
plano 10-04), então nenhuma criação de token foi necessária aqui.

## Regra D-03 (cor nunca sozinha)

Nenhum ícone ou texto de estado foi removido durante a migração. Onde a cor comunica estado —
`AlertCircle` + "Atenção: Vendedor ainda não subiu o PDF assinado." em
`edit-venda-form-client.tsx`; `AlertCircle` + "Já existe!" em `produto-form-client.tsx`; texto
"Importação concluída" nos cards de sucesso — o ícone/texto já acompanhava a cor antes da
migração e continua presente depois.

## Known Stubs

Nenhum. Migração de classe CSS pura, sem alteração de dado, lógica ou renderização condicional.

## Issues Encountered

Nenhum. Todos os tokens necessários já existiam em `globals.css` (confirmado antes de iniciar a
migração), então não houve bloqueio nem necessidade de escalar para o plano 10-04.

## Next Phase Readiness

- Os 6 arquivos designados estão prontos para a auditoria visual da Fase 11 (screenshot nos dois
  temas) e para a checagem funcional de ponta a ponta do fluxo de venda/importação/cadastro —
  nenhuma lógica foi tocada, apenas classes de cor.
- `design-system/raw-color-baseline.json` **não foi atualizado** por este agente, por instrução
  explícita do orquestrador (quem regrava o baseline é o orquestrador, ao final da fase, depois de
  consolidar todos os agentes concorrentes).

---
*Phase: 11-telas-de-operacao*
*Completed: 2026-08-04*

## Self-Check: PASSED

- FOUND: src/components/importacao-client.tsx (0 ocorrências no scanner)
- FOUND: src/components/edit-venda-form-client.tsx (0 ocorrências no scanner)
- FOUND: src/components/importacao-clientes-client.tsx (0 ocorrências no scanner)
- FOUND: src/components/importacao-fornecedores-client.tsx (0 ocorrências no scanner)
- FOUND: src/components/produto-form-client.tsx (0 ocorrências no scanner)
- FOUND: src/components/cadastrar-produto-rapido-dialog.tsx (0 ocorrências no scanner)
- FOUND commit: faeca8b
