---
phase: 260811-ddr
plan: 01
subsystem: ui
tags: [react, nextjs, server-actions, prisma, forms, historico-vendas]

requires: []
provides:
  - "src/lib/parcelas-ajuste.ts: modulo puro de ajuste/redistribuicao de parcelas (ajustarParcelas, redistribuirValores)"
  - "Guarda de parcela paga e de consistencia cabecalho-vs-linhas em updateVenda"
  - "FormSecaoTitulo: componente de titulo de secao para formularios em grid"
affects: [historico-vendas, edicao-de-venda]

actuals:
  tokens: 9710
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Regra de ajuste/redistribuicao de lista com datas em cadencia mensal vive em modulo puro sem React, testada isoladamente e reaproveitada pelo componente"
    - "Guarda de Server Action destrutiva le o estado atual do banco ANTES do update do cabecalho, para poder recusar o save sem deixar dado parcialmente escrito"
    - "Titulo de secao reutilizavel para grid de formulario, em arquivo proprio para evitar import circular entre componentes irmaos"

key-files:
  created:
    - src/lib/parcelas-ajuste.ts
    - src/__tests__/parcelas-ajuste.test.ts
    - src/__tests__/edit-venda-form-ux.test.ts
    - src/components/form-secao-titulo.tsx
  modified:
    - src/components/edit-parcelas-section.tsx
    - src/components/edit-venda-com-parcelas.tsx
    - src/components/edit-venda-historico-form.tsx
    - src/app/(app)/historico/page.tsx
    - src/app/(app)/historico/actions.ts

key-decisions:
  - "disableAutoInit do ParcelasVencimentoForm passa a ser sempre true; EditParcelasSection vira a unica dona da geracao/ajuste da lista de parcelas (D-01)"
  - "Checagem de consistencia cabecalho-vs-linhas (T-ddr-02) aplicada em updateVenda apos grep confirmar um unico consumidor de producao (historico/page.tsx)"
  - "Leitura de parcelaVencimento hoisted para antes do prisma.venda.update, com try/catch proprio, e reaproveitada (pagasMap) no bloco de regravacao — nunca duas leituras que podem discordar"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]

coverage:
  - id: D1
    description: "ajustarParcelas ajusta corretamente a lista ao crescer, reduzir, manter e a partir de lista vazia, com clamp de fim de mes e soma fechando o total"
    requirement: "D-01, D-02, D-03"
    verification:
      - kind: unit
        ref: "src/__tests__/parcelas-ajuste.test.ts (rodado via node --experimental-strip-types contra um harness com stub de utils.ts, nao via vitest — vitest nao sobe neste checkout)"
        status: pass
    human_judgment: true
    rationale: "vitest/tsc nao sobem neste checkout (node_modules ausente) — a suite real nunca rodou no runner oficial, so a logica foi validada manualmente. CI e o gate final (D-07); verificacao humana/CI ainda necessaria antes de considerar coberto."
  - id: D2
    description: "Edicao de venda parcelada: mudar o campo Parcelas atualiza o dialog de Datas de Vencimento (crescer, reduzir, manter); rotulo do botao mostra o mesmo numero gravado"
    requirement: "D-01, D-04"
    verification:
      - kind: manual_procedural
        ref: "human-check do plano: editar venda #210, subir Parcelas de 3 para 5, depois voltar para 3, fechar sem salvar e reabrir"
        status: unknown
    human_judgment: true
    rationale: "Requer abrir a UI real do Historico contra o banco de producao/homolog — nao executavel pelo agente neste ambiente."
  - id: D3
    description: "updateVenda recusa o save quando o payload descartaria uma parcela paga, ou quando parcelas do cabecalho diverge da quantidade de linhas enviadas"
    requirement: "D-01"
    verification:
      - kind: unit
        ref: "logica da guarda replicada e validada com node puro (node:assert) contra o caso literal da venda 182 e o caso de parcela paga descartada; src/__tests__/antecipacao-custo-edicao.test.ts tracado manualmente linha a linha contra o novo codigo (vitest nao roda no checkout)"
        status: pass
    human_judgment: true
    rationale: "A suite real (antecipacao-custo-edicao.test.ts) nao rodou no vitest real neste checkout — so foi tracada manualmente e a logica da guarda foi replicada num harness node. CI e o gate final (D-07)."
  - id: D4
    description: "Formulario de edicao agrupado em secoes tituladas, botao de excluir separado do salvar, rotulo do submit acentuado"
    requirement: "D-05"
    verification:
      - kind: unit
        ref: "src/__tests__/edit-venda-form-ux.test.ts (assercoes validadas com node --experimental-strip-types + node:assert lendo o arquivo real, vitest nao roda no checkout)"
        status: pass
      - kind: manual_procedural
        ref: "human-check do plano: abrir edicao da venda #210 e conferir os titulos, o botao de excluir numa linha propria, e o round-trip salvar-sem-alterar"
        status: unknown
    human_judgment: true
    rationale: "A parte visual/round-trip exige a UI real; so a parte textual (rotulo, ausencia de cor crua) foi verificada por leitura de fonte."

duration: 20min
completed: 2026-08-11
status: complete
---

# Quick Task 260811-ddr: Ajuste de parcelas na edicao de venda + UX do formulario Summary

**Modulo puro `parcelas-ajuste.ts` corrige o bug de `disableAutoInit` travado que deixava o dialog de Datas de Vencimento sem acompanhar o campo Parcelas na edicao do Historico; `updateVenda` ganhou guarda contra apagar parcela paga e contra cabecalho/linhas divergentes; formulario de edicao reagrupado em secoes tituladas com o botao de excluir separado do salvar.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 completos
- **Files modified:** 9 (4 criados, 5 modificados)

## Accomplishments

- **Bug corrigido (D-01, D-04):** `edit-parcelas-section.tsx` passava
  `disableAutoInit={initialParcelas.length > 0}` — um booleano fixo, verdadeiro para toda
  venda ja parcelada, que travava a geracao da lista de vencimentos pra sempre. Trocar
  Parcelas de 2 para 4 mudava so `venda.parcelas` (cabecalho), nunca as linhas de
  `parcelas_vencimento` — o rastro real da venda 182 em producao (`parcelas = 4`, 5 linhas
  gravadas). Agora `disableAutoInit` e sempre `true` e `EditParcelasSection` e a unica dona
  da lista, chamando `ajustarParcelas` sempre que o campo Parcelas muda.
- **Modulo puro `src/lib/parcelas-ajuste.ts` (D-02, D-03):** `ajustarParcelas` preserva datas
  existentes ao nao mudar N, corta do fim ao reduzir, acrescenta em cadencia mensal ao
  crescer (com clamp de fim de mes via `Date.UTC`, sem transbordar 31/01 -> 03/03), faz
  bootstrap a partir de `calcularPrimeiroVencimento` quando a lista vem vazia (venda antiga),
  e nunca corta uma parcela ja paga (`minimoPorPagas`). `redistribuirValores` foi movido de
  dentro do componente para ca, sem alterar o algoritmo — unico lugar que o implementa agora.
- **Guarda de servidor em `updateVenda` (D-01, T-ddr-01, T-ddr-02):** a leitura de
  `parcelaVencimento` foi hoisted para antes do `prisma.venda.update`, dentro de try/catch
  proprio. Com o resultado em maos, o save e recusado quando o payload descartaria uma
  parcela marcada como paga, e quando `parcelas` (cabecalho) diverge da quantidade de linhas
  enviadas — exatamente o estado em que a venda 182 ficou. `grep -rn "updateVenda" src/`
  confirmou um unico consumidor de producao (`historico/page.tsx`) antes de aplicar a segunda
  checagem; o `pagasMap` montado na leitura hoisted e reaproveitado no bloco de regravacao,
  sem reler.
- **Formulario reagrupado (D-05):** novo `FormSecaoTitulo` (titulo + `Separator`, item de
  largura total do grid) agrupa os campos em "Dados da venda", "Produtos",
  "Pagamento e parcelas" (renderizado por `EditVendaComParcelas`), "Custos e descontos" e
  "Fiscal e documentos" — so reordenacao de blocos JSX ja existentes, nenhum `name=`
  alterado. Botao de excluir foi para uma segunda linha, separada por `Separator`, longe do
  salvar/recibo/boleto. Rotulo do submit corrigido para "Salvar alterações" (faltava o
  acento). Total das parcelas e divergencia agora aparecem em texto legivel ao lado do botao
  de Datas de Vencimento, com os tokens de warning ja usados no aviso de parcela paga.

## Task Commits

1. **Task 1 (RED): teste do modulo parcelas-ajuste** - `d20a53b` (test)
2. **Task 1 (GREEN): implementacao de parcelas-ajuste.ts** - `9d10f20` (feat)
3. **Task 2: ligar o modulo na tela e proteger a parcela paga** - `7afab8c` (feat)
4. **Task 3: agrupar formulario em secoes e separar acao destrutiva** - `6ead7cc` (feat)

_Task 1 seguiu TDD (RED -> GREEN); Tasks 2 e 3 sao `type="auto"`, um commit cada._

## Files Created/Modified

- `src/lib/parcelas-ajuste.ts` - modulo puro: `ajustarParcelas` e `redistribuirValores`
- `src/__tests__/parcelas-ajuste.test.ts` - 9 casos cobrindo D-02/D-03
- `src/__tests__/edit-venda-form-ux.test.ts` - teste-gate le o fonte do formulario (rotulo, secoes, cor crua)
- `src/components/form-secao-titulo.tsx` - `FormSecaoTitulo`, novo componente compartilhado
- `src/components/edit-parcelas-section.tsx` - liga `ajustarParcelas`/`redistribuirValores`, bootstrap de montagem, aviso de parcela paga e de divergencia
- `src/components/edit-venda-com-parcelas.tsx` - propaga `parcelasPagas`, renderiza titulo "Pagamento e parcelas"
- `src/components/edit-venda-historico-form.tsx` - secoes tituladas, rodape reestruturado, rotulo acentuado
- `src/app/(app)/historico/page.tsx` - select de `parcelaVencimento` traz `paga`; monta `editParcelasPagas`
- `src/app/(app)/historico/actions.ts` - leitura hoisted, guarda de parcela paga e de consistencia cabecalho-vs-linhas

## Decisions Made

- `disableAutoInit` do `ParcelasVencimentoForm` passa a ser sempre `true` — `EditParcelasSection`
  vira a unica dona da geracao/ajuste da lista, evitando dois lugares com regras conflitantes.
  A prop em si nao foi removida do form filho porque `venda-rapida-form-v2.tsx` ainda depende
  do comportamento padrao (fora de escopo, D-06).
- Checagem de consistencia cabecalho-vs-linhas (T-ddr-02) foi aplicada (nao virou follow-up):
  `grep -rn "updateVenda" src/ --include="*.tsx" --include="*.ts"` mostrou apenas a propria
  definicao (`actions.ts`), o unico consumidor de producao (`historico/page.tsx`) e o arquivo
  de teste (`antecipacao-custo-edicao.test.ts`).
- Leitura de `parcelaVencimento` hoisted para antes do `prisma.venda.update`, com try/catch
  proprio (a tabela pode nao existir em producao antiga) — o resultado alimenta a guarda, o
  calculo de custo de antecipacao e a regravacao final, evitando tres leituras que poderiam
  discordar entre si.

## Deviations from Plan

None - plano executado como escrito. As unicas adicoes alem do texto literal do plano foram
de UX complementar ja sinalizado no proprio plano (linha de "Total das parcelas" e aviso de
divergencia em `edit-parcelas-section.tsx`, explicitamente pedidos na Task 3).

## Verificacao rodada vs. nao rodada (D-07)

Este checkout tem `node_modules` ausente — `npx vitest`, `npx tsc` e `npm run lint` NAO
sobem (confirmado): `npx vitest run` falha com `Cannot find module 'vitest/config'`
resolvendo `vitest.config.ts`; `npx tsc` baixa um pacote `tsc` de terceiros sem relacao com
TypeScript ("This is not the tsc command you are looking for"). Por D-07 o CI e o gate; o que
foi possivel validar neste ambiente:

- **RED confirmado:** antes de criar `src/lib/parcelas-ajuste.ts`,
  `node --experimental-strip-types` tentando importar o modulo falhou com
  `Cannot find module '.../src/lib/parcelas-ajuste.ts'` — o mesmo motivo que faria o vitest
  falhar ao resolver o import em `parcelas-ajuste.test.ts`.
- **GREEN confirmado:** todos os 9 casos de `parcelas-ajuste.test.ts` foram reescritos como
  asserções `node:assert/strict` e rodados com `node --experimental-strip-types` contra o
  modulo real (via harness com um stub minimo de `@/lib/utils` contendo so
  `calcularPrimeiroVencimento`, para nao precisar de `clsx`/`tailwind-merge`). Todos
  passaram.
- **Guarda de `updateVenda` (Task 2):** a logica da guarda (parcela paga + consistencia
  cabecalho-vs-linhas) foi extraida e rodada com `node:assert` contra 5 cenarios, incluindo o
  caso literal da venda 182 (`parcelasNum=4`, payload com 2 linhas -> recusa) e o caso de
  parcela paga descartada (`parcela 3 paga`, payload so com 1 e 2 -> recusa). O arquivo de
  teste existente `antecipacao-custo-edicao.test.ts` foi tracado manualmente linha a linha
  contra o novo `actions.ts` (nao executado no vitest real) — a hoist da leitura nao muda o
  numero de chamadas de `prisma.parcelaVencimento.findMany` mockadas em nenhum dos 8 casos.
- **Teste-gate da Task 3:** as 6 asserções de `edit-venda-form-ux.test.ts` foram rodadas com
  `node:assert` lendo `edit-venda-historico-form.tsx` de verdade. Todas passaram.
- **`node scripts/design-tokens/raw-color-scan.mjs src --check`:** rodou de ponta a ponta
  (nao depende de `node_modules`) — `OK — sem regressoes. Saldo: 0 a menos que o baseline`.
- **`grep -c 'name="' src/components/edit-venda-historico-form.tsx`:** 10 antes e 10 depois —
  nenhum campo perdido na Task 3.
- **NAO rodado neste ambiente:** `npx vitest run` (os tres arquivos de teste do plano),
  `npx tsc --noEmit`, `npm run lint`. Ficam para o CI, conforme D-07.

## Follow-ups conhecidos (fora de escopo deste plano)

- `T-ddr-03`: envolver `prisma.parcelaVencimento.deleteMany` + `createMany` (e o par
  equivalente de `itemVenda`) em `prisma.$transaction`, para uma falha entre os dois nao
  deixar a venda sem parcelas. Aceito como risco baixo no threat model do plano.
- Corrigir os dados ja inconsistentes em producao, comecando pela venda 182 (`parcelas = 4`
  com 5 linhas gravadas) — fica com o orquestrador, fora deste plano (D-06).
- Rodar a suite real (`npx vitest run`) e `npx tsc --noEmit` no CI para confirmar as
  validacoes manuais acima.

## Issues Encountered

Ambiente sem `node_modules` (falha de permissao ao instalar, conforme CLAUDE.md) impediu
rodar `vitest`/`tsc`/`lint` diretamente. Contornado validando a logica pura com
`node --experimental-strip-types` + `node:assert/strict` contra o codigo real (nao contra uma
reimplementacao), conforme orientado pelo orquestrador.

## Next Phase Readiness

- Bug relatado pelo Andre (mudar Parcelas na edicao nao atualiza as datas) esta corrigido a
  nivel de codigo; falta verificacao humana na UI real (venda #210) e confirmacao do CI.
- Guarda de servidor fecha os dois vetores do threat model (T-ddr-01, T-ddr-02) sem exigir
  migration nem mudanca de schema.
- Follow-ups (transacao no deleteMany/createMany, correcao da venda 182 em producao) ficam
  registrados acima para o orquestrador priorizar.

---
*Quick task: 260811-ddr*
*Completed: 2026-08-11*

## Self-Check: PASSED

Todos os 9 arquivos citados no plano (criados/modificados) existem no filesystem e os 4
commits das Tasks 1-3 (`d20a53b`, `9d10f20`, `7afab8c`, `6ead7cc`) existem em `git log`.
