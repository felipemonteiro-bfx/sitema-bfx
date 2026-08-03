---
phase: 07-pdv-sem-friccao
plan: 01
subsystem: api
tags: [validation, pdv, venda, ai-actions, tdd]

requires: []
provides:
  - "`validarItensContraCatalogo` sem piso de custo — so a regra de subtotal permanece"
  - "`criarVendaV2` (PDV) chama a validacao com um unico argumento, sem consultar o catalogo"
  - "ramo `criar_venda` do chat da IA (`ai-actions.ts`) usa a mesma regra sem catalogo"
  - "trava de regressao (`pdv-custo-livre.test.ts`) documentando PDV-14/D-01/D-03 e o commit revertido (`a63dc04`)"
affects: [08-pdv-cadastro-inline, relatorios-margem-comissao]

actuals:
  tokens: 2660
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "modulo puro de validacao (zero imports) verificavel via `node --input-type=module` sem depender do vitest local"
    - "segundo parametro opcional com prefixo `_` para marcar argumento intencionalmente ignorado, preservando compatibilidade de assinatura"

key-files:
  created:
    - src/__tests__/pdv-custo-livre.test.ts
  modified:
    - src/lib/venda-item-validation.ts
    - src/__tests__/venda-item-validation.test.ts
    - src/app/(app)/venda-rapida/actions.ts
    - src/lib/ai-actions.ts

key-decisions:
  - "D-01: apenas a regra 2 (piso de custo) saiu; a regra 1 (subtotal ≈ valorVenda × quantidade) permanece intacta"
  - "D-02: os dois casos de teste que travavam o piso foram invertidos e renomeados, nao apagados — historico da regra fica legivel"
  - "D-03: liberado para TODOS os vendedores (nao so admin), decisao do Andre em 2026-08-03 contra recomendacao do Grok — marcado ⚠️ Revisit no PROJECT.md"

patterns-established:
  - "Trava de regressao dedicada a decisao de negocio (nao a implementacao) em arquivo separado, citando o requisito, a decisao e o commit revertido no cabecalho"

requirements-completed: [PDV-14]

coverage:
  - id: D1
    description: "`validarItensContraCatalogo` aceita custoProduto abaixo do custoPadrao do catalogo (piso removido)"
    requirement: "PDV-14"
    verification:
      - kind: unit
        ref: "src/__tests__/venda-item-validation.test.ts#aceita custoProduto informado abaixo do custo cadastrado no catalogo (PDV-14, D-01: piso removido)"
        status: pass
      - kind: unit
        ref: "src/__tests__/pdv-custo-livre.test.ts#aceita custo muito abaixo do catalogo em item unico (caso literal da demanda 7)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Regra de subtotal (subtotal ≈ valorVenda × quantidade, tolerancia de 1 centavo) continua ativa e nao foi removida junto com o piso"
    requirement: "PDV-14"
    verification:
      - kind: unit
        ref: "src/__tests__/venda-item-validation.test.ts#rejeita quando subtotal nao bate com valorVenda x quantidade"
        status: pass
      - kind: unit
        ref: "src/__tests__/pdv-custo-livre.test.ts#custo abaixo do catalogo combinado com subtotal errado ainda e recusado, mas so pela regra de subtotal (D-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "`criarVendaV2` (PDV) e o ramo `criar_venda` do chat da IA gravam a venda com o custo digitado, sem consultar custo de catalogo, para qualquer perfil de usuario"
    requirement: "PDV-14"
    verification:
      - kind: unit
        ref: "one-liner de verificacao estrutural (node --input-type=module) sobre src/app/(app)/venda-rapida/actions.ts e src/lib/ai-actions.ts — PDV-14 TRACER OK / PDV-14 IA OK"
        status: pass
    human_judgment: true
    rationale: "A checagem estrutural (grep/one-liner) confirma ausencia de consulta ao catalogo no codigo-fonte, mas nao substitui rodar o CI (vitest) real, que nao roda nesta maquina por ausencia de node_modules — verificador deve confirmar com o CI apos push."

duration: 16min
completed: 2026-08-03
status: complete
---

# Phase 7 Plan 01: Remove o piso de custo do servidor (PDV-14) Summary

**`validarItensContraCatalogo` perde a comparacao contra `custoPadrao` do catalogo — so a checagem de subtotal permanece — nos dois chamadores (PDV e chat da IA), com suite existente invertida e trava de regressao nova documentando a decisao de negocio D-03.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-03T14:12:47-04:00 (aproximado, referencia: commit anterior no historico)
- **Completed:** 2026-08-03T14:28:14-04:00
- **Tasks:** 3
- **Files modified:** 4 modificados + 1 criado

## Accomplishments
- Piso de custo (`custoProduto < custoPadrao`) removido do modulo puro `venda-item-validation.ts`, mantendo intacta a checagem de subtotal (D-01)
- `criarVendaV2` (`venda-rapida/actions.ts`) nao consulta mais o catalogo de produtos para validar custo — chama a validacao com um unico argumento
- Ramo `criar_venda` do chat da IA (`ai-actions.ts`) segue a mesma regra, sem copia divergente e sem leitura de catalogo (`catalogoIa` removida)
- Suite existente (`venda-item-validation.test.ts`) com os 2 casos de custo invertidos e renomeados, sem apagar historico (D-02) — 11 casos no total, 9 intocados
- Trava de regressao nova (`pdv-custo-livre.test.ts`, 5 casos) documentando PDV-14, D-01, D-03 e o commit `a63dc04` que introduziu o piso agora revertido

## Task Commits

Each task was committed atomically:

1. **Task 1: Fatia vertical — custo livre do modulo puro ate `criarVendaV2`** (TDD: RED → GREEN)
   - `79fe068` - test(07-01): failing test for custo abaixo do catalogo aceito
   - `105896e` - feat(07-01): remove piso de custo da validacao de venda (PDV-14, D-01)
2. **Task 2: Mesmo custo livre pelo caminho da IA (`ai-actions.ts`)** - `737e9c2` (refactor)
3. **Task 3: Trava de regressao — o piso nao volta por acidente** - `886a3c2` (test)

_TDD: Task 1 seguiu RED (teste falhando confirmado localmente antes da implementacao) → GREEN (one-liner `PDV-14 TRACER OK`)._

## Files Created/Modified
- `src/lib/venda-item-validation.ts` - piso de custo removido; segundo parametro `_catalogo` opcional (default `[]`), `normalizaNome` (codigo morto) removida junto
- `src/__tests__/venda-item-validation.test.ts` - 2 casos de custo invertidos e renomeados (D-02), 9 casos byte-a-byte iguais
- `src/app/(app)/venda-rapida/actions.ts` - `criarVendaV2` chama a validacao com um unico argumento; consulta `prisma.produto.findMany` para montar catalogo removida (unica no arquivo)
- `src/lib/ai-actions.ts` - ramo `criar_venda`: `catalogoIa` (leitura de produto so para alimentar a validacao) removida; chamada passa a receber so o item da venda da IA
- `src/__tests__/pdv-custo-livre.test.ts` (novo) - 5 casos travando a decisao de negocio PDV-14/D-01/D-03

## Decisions Made
- D-01: apenas a regra 2 (piso de custo) saiu do modulo; a regra 1 (subtotal) permanece — confirmado pelo one-liner e pelos testes que verificam a mensagem de subtotal ainda ativa
- D-02: os dois casos de teste que hoje travavam o piso foram invertidos e renomeados no lugar, nao apagados — segue o padrao pedido pelo plano
- D-03: liberado para todos os vendedores (nao so admin) — aplicado por construcao, ja que os dois chamadores (PDV e IA) compartilham o mesmo modulo sem excecao de perfil

## Deviations from Plan

None - plan executado exatamente como escrito. Interface contract (`_catalogo: CatalogoProduto[] = []`, nome iniciado por `_`, tipos exportados inalterados, zero imports) seguido a risca.

## Issues Encountered

Nenhum bloqueio. O segundo `<automated>` de cada task (`npx vitest run`) falha nesta maquina por ausencia de `node_modules` (`Cannot find module 'vitest/config'`), exatamente como antecipado em `<environment_constraints>` item 2 — nao foi tratado como falha, o gate real e o CI. Nenhum comando de banco, cluster ou `npm install` foi executado; nenhum `git push` foi feito.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PDV-14 concluida: custo digitado pelo vendedor e gravado sem piso, por qualquer caminho (PDV manual e chat da IA)
- Risco aceito (T-07-01/T-07-02, D-03) permanece registrado como `⚠️ Revisit` no PROJECT.md e na Nota de risco da Fase 7 no ROADMAP — nenhuma mitigacao compensatoria foi adicionada nesta fase, conforme escopo
- Fase 7 segue para os planos de PDV-15 (`POST /api/clientes`) e PDV-16 (`POST /api/fornecedores`), que dependem dos padroes de modal ja mapeados no 07-CONTEXT.md, nao deste plano

---
*Phase: 07-pdv-sem-friccao*
*Completed: 2026-08-03*

## Self-Check: PASSED

All 5 files created/modified confirmed present on disk; all 4 task commits (`79fe068`, `105896e`, `737e9c2`, `886a3c2`) confirmed present in git log.
