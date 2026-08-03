---
phase: 08-estoque-e-identidade-visual
plan: 01
subsystem: ui
tags: [react, nextjs, tdd, venda-rapida, pdv]

# Dependency graph
requires: []
provides:
  - "src/lib/estoque-venda-policy.ts: modulo puro (zero imports) que devolve a quantidade digitada sem teto de estoque"
  - "produto-item-form.tsx sem estado/badges/alertas de estoque"
  - "trava de regressao dos alertas de estoque (venda-rapida-sem-alerta-estoque.test.ts)"
affects: [08-02-estoque-financeiro, 08-03-tokens-cor]

actuals:
  tokens: 3412
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Modulo de politica puro (zero imports) verificavel via `node --input-type=module`, mesmo padrao usado nas fases 5-7 para decisoes de negocio reversiveis"
    - "Trava de regressao le os fontes com readFileSync + .includes()/.split() (sem regex exec), no padrao de pdv-custo-livre.test.ts"

key-files:
  created:
    - src/lib/estoque-venda-policy.ts
    - src/__tests__/estoque-venda-policy.test.ts
    - src/__tests__/venda-rapida-sem-alerta-estoque.test.ts
  modified:
    - src/components/produto-item-form.tsx

key-decisions:
  - "D-03 (Andre): a venda rapida so perde os avisos de estoque e o teto de quantidade; o decremento de estoque na gravacao da venda e a aba Estoque do /financeiro nao sao tocados"
  - "aplicarTetoQuantidade mantem o segundo parametro (estoque disponivel) ignorado de proposito, prefixado com `_`, como costura de reversibilidade caso o teto volte"

patterns-established:
  - "Fatia vertical tracer -> expansao -> trava: modulo puro primeiro (Task 1, tracer), depois o consumo visual (Task 2), depois a trava estrutural que protege os dois lados da decisao (Task 3)"

requirements-completed: [UXP-01, UXP-02]

coverage:
  - id: D1
    description: "aplicarTetoQuantidade devolve a quantidade digitada sem recorte para qualquer estoque (0, 3, 5, 100, null) e para chamada com um unico argumento"
    requirement: "UXP-02"
    verification:
      - kind: unit
        ref: "src/__tests__/estoque-venda-policy.test.ts (5 casos) + one-liner node --input-type=module da Task 1"
        status: pass
      - kind: unit
        ref: "npx vitest run src/__tests__/estoque-venda-policy.test.ts (CI)"
        status: unknown
    human_judgment: false
  - id: D2
    description: "produto-item-form.tsx nao exibe nenhum badge, rotulo colorido ou linha de alerta sobre estoque, e o campo Qtd nao declara teto"
    requirement: "UXP-01"
    verification:
      - kind: unit
        ref: "one-liner node --input-type=module da Task 2 (grep estrutural negativo no componente)"
        status: pass
    human_judgment: true
    rationale: "O gate automatizado prova ausencia de identificadores no codigo-fonte, mas so a UI renderizada confirma visualmente que nenhum rotulo aparece na tela para estoque 0/3/5 — o human-check da Task 2 (`Abrir /venda-rapida...`) nao foi executado nesta maquina (sem servidor rodando neste contexto de execucao)."
  - id: D3
    description: "Trava de regressao protege os dois lados da decisao D-03: os avisos/teto nao voltam e os dois decrementos de estoque em actions.ts continuam intactos"
    requirement: "UXP-01"
    verification:
      - kind: unit
        ref: "src/__tests__/venda-rapida-sem-alerta-estoque.test.ts (4 casos) + one-liner node --input-type=module da Task 3"
        status: pass
      - kind: unit
        ref: "npx vitest run src/__tests__/venda-rapida-sem-alerta-estoque.test.ts (CI)"
        status: unknown
    human_judgment: false

duration: 20min
completed: 2026-08-03
status: complete
---

# Phase 8 Plan 1: Sem alertas de estoque nem teto de quantidade na venda rapida Summary

**`aplicarTetoQuantidade` (modulo puro, zero imports) substitui o recorte de quantidade embutido no componente, e `produto-item-form.tsx` perde badges/rotulos de estoque, mantendo os dois decrementos de estoque em `actions.ts` intocados.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-03T18:39:00Z (aprox.)
- **Completed:** 2026-08-03T18:59:33Z
- **Tasks:** 3/3
- **Files modified:** 4 (1 modificado, 3 criados)

## Accomplishments
- UXP-02: `src/lib/estoque-venda-policy.ts` criado como modulo puro (zero imports); `aplicarTetoQuantidade` devolve a quantidade digitada sem recorte para estoque 0, 3, 5, 100 ou `null`, e tambem quando chamada com um unico argumento — provado por 5 casos de teste e pelo one-liner da Task 1.
- UXP-01: todo badge, rotulo colorido e linha de alerta sobre estoque saiu de `produto-item-form.tsx` — cabecalho do campo Produto, lista de sugestoes do autocomplete, rotulo do campo Qtd e rodape de resumo. O atributo `max` do input de quantidade tambem saiu; `min="1"` permanece.
- D-03 (lado que fica): `src/app/(app)/venda-rapida/actions.ts` nao foi tocado — os dois blocos `qtdEstoque: { decrement: ... }` continuam intactos, confirmado pelos one-liners das Tasks 1 e 3.
- Trava de regressao criada (`venda-rapida-sem-alerta-estoque.test.ts`, 4 casos) citando UXP-01, UXP-02 e D-03, protegendo tanto a ausencia dos avisos/teto quanto a presenca dos dois decrementos.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fatia vertical — teto de quantidade sai do componente e vira modulo puro (UXP-02)**
   - `c286d74` (test) — `test(08-01): failing test for quantidade acima do estoque aceita`
   - `7c3b650` (feat) — `feat(08-01): remove teto de quantidade da venda rapida (UXP-02, D-03)`
2. **Task 2: Todo aviso de estoque sai da tela da venda rapida (UXP-01)**
   - `1d97e44` (feat) — `feat(08-01): remove alertas de estoque da venda rapida (UXP-01, D-03)`
3. **Task 3: Trava de regressao — o alerta de estoque nao volta por acidente**
   - `cee8143` (test) — `test(08-01): trava de regressao dos alertas de estoque da venda rapida`

_Note: Task 1 seguiu TDD (RED confirmado antes da criacao do modulo — o one-liner falhou com "Cannot find module" — depois GREEN)._

## Files Created/Modified
- `src/lib/estoque-venda-policy.ts` - modulo puro (zero imports) com `aplicarTetoQuantidade`, unico ponto de retorno do teto se a decisao for revertida
- `src/__tests__/estoque-venda-policy.test.ts` - 5 casos cobrindo estoque 0, 3, 5, 100, `null` e chamada com um unico argumento
- `src/components/produto-item-form.tsx` - remove estado de estoque, badges, rotulos de alerta e teto do input de quantidade; `handleChange` passa a delegar a `aplicarTetoQuantidade`
- `src/__tests__/venda-rapida-sem-alerta-estoque.test.ts` - trava de regressao com 4 casos, citando UXP-01, UXP-02, D-03

## Decisions Made
- Nenhuma decisao nova alem das ja registradas em D-03/08-CONTEXT.md — plano executado como especificado.

## Deviations from Plan

None - plan executado exatamente como escrito. Os dois `<automated>` `npx vitest run` de cada task falharam nesta maquina por ausencia de `node_modules` (`vitest.config.ts` nao resolve `vitest/config`), exatamente como previsto em `<environment_constraints>` item 2 do plano — nao foi uma tentativa de conserto, e o gate real (CI) roda no push.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `estoque-venda-policy.ts` e a trava de regressao estao prontos como base de contexto para 08-02 (aba Estoque do `/financeiro`, que depende do `qtdEstoque` continuar sendo decrementado) e 08-03 (tokens de cor, sem sobreposicao de arquivos).
- Pendente: o `<human-check>` da Task 2 (abrir `/venda-rapida` visualmente) nao foi executado nesta sessao — nao ha servidor de desenvolvimento rodando neste contexto de execucao autonoma. Recomenda-se verificacao visual manual antes do deploy, embora o gate estrutural (one-liner + trava) ja prove a ausencia dos identificadores de alerta no codigo-fonte.

---
*Phase: 08-estoque-e-identidade-visual*
*Completed: 2026-08-03*

## Self-Check: PASSED

All created files found (`src/lib/estoque-venda-policy.ts`, `src/__tests__/estoque-venda-policy.test.ts`,
`src/components/produto-item-form.tsx`, `src/__tests__/venda-rapida-sem-alerta-estoque.test.ts`,
this SUMMARY.md). All 4 commits found in git log (`c286d74`, `7c3b650`, `1d97e44`, `cee8143`).
