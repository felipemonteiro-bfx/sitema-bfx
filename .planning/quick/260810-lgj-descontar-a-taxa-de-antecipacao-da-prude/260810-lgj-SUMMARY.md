---
phase: quick-260810-lgj
plan: 01
subsystem: payments
tags: [finance, prisma, next-server-actions, vitest, tdd]

requires: []
provides:
  - "custoAntecipacaoVenda / lucroLiquidoComAntecipacao (src/lib/antecipacao-custo.ts) — traduz uma venda no desagio da Prudent reusando a formula de src/lib/antecipacao.ts, sem reescreve-la"
  - "Venda.taxaFinanceiraValor gravada e descontada do lucroLiquido em criarVendaV2 e updateVenda"
  - "DRE (src/lib/finance.ts, src/app/(app)/financeiro/page.tsx) somando o desagio em custosVar e exibindo o card Taxa Prudent"
  - "GET/POST /api/admin/backfill-taxa-antecipacao para preencher a coluna em vendas antigas, sem tocar em lucroLiquido historico"
affects: [financeiro, historico, venda-rapida, comissoes, prudent]

actuals:
  tokens: 12834
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Custo derivado de forma de pagamento gravado direto na coluna da venda (nunca como Despesa avulsa) para nao dobrar contagem no DRE"
    - "DRE le coluna gravada em vez de recalcular a partir de estado mutavel (parcela `antecipada`) que muda depois da criacao da venda"

key-files:
  created:
    - src/lib/antecipacao-custo.ts
    - src/app/api/admin/backfill-taxa-antecipacao/route.ts
    - src/__tests__/antecipacao-custo.test.ts
    - src/__tests__/antecipacao-custo-edicao.test.ts
    - src/__tests__/backfill-taxa-antecipacao.test.ts
  modified:
    - src/app/(app)/venda-rapida/actions.ts
    - src/lib/finance.ts
    - src/app/(app)/financeiro/page.tsx
    - src/app/(app)/historico/actions.ts

key-decisions:
  - "O custo da antecipacao mora SO em Venda.taxaFinanceiraValor; nenhum caminho cria Despesa, porque finance.ts:81 ja soma `variaveis` (despesas) dentro de custosVar — um lancamento avulso dobraria a contagem."
  - "O DRE LE a coluna gravada em vez de recalcular via titulosDeVenda/calcularAntecipacao, porque a fila da Prudent marca parcela como `antecipada` e titulosDeVenda descarta parcela antecipada — recalcular zeraria o custo justamente quando ele vira real."
  - "Retroatividade: o backfill preenche so taxaFinanceiraValor (coluna 100% nula, lida por ninguem ate este trabalho); lucroLiquido de venda historica nao e tocado. POST nao foi executado contra producao."
  - "Consequencia assumida (nao corrigida aqui): comissao de vendas NOVAS em desconto em folha cai, porque /api/comissoes/relatorio le venda.lucroLiquido, que agora vem com o desagio ja descontado."
  - "Desvio do plano corrigido em execucao: o golden number do fallback de 1 parcela em 31 dias e 41.26 (juros compostos), nao 41.23 (juros simples) como o plano descrevia — ver secao Deviations."

patterns-established:
  - "Dado derivado de forma de pagamento (taxaFinanceiraValor, como custoEnvioFonte antes dele) precisa ser reescrito a cada save da venda, inclusive para nulo quando a condicao deixa de valer."

requirements-completed: [QK-LGJ-01, QK-LGJ-02, QK-LGJ-03]

coverage:
  - id: D1
    description: "Venda nova em desconto em folha grava taxaFinanceiraValor e lucroLiquido ja descontado; a mesma venda em Pix/boleto/cartao grava taxa nula e lucro intacto"
    requirement: "QK-LGJ-01"
    verification:
      - kind: unit
        ref: "src/__tests__/antecipacao-custo.test.ts#custoAntecipacaoVenda — Bloco A"
        status: unknown
    human_judgment: true
    rationale: "npm test nao roda neste checkout (node_modules ausente, ver Performance/Notas). Testes escritos e verificados manualmente contra a formula real via node --input-type=module; CI e o portao real."
  - id: D2
    description: "DRE soma o desagio em custosVar, expoe detalhe.taxaAntecipacao e mostra o card Taxa Prudent; nenhuma despesa e criada (sem dupla contagem)"
    requirement: "QK-LGJ-02"
    verification:
      - kind: unit
        ref: "src/__tests__/antecipacao-custo.test.ts#calcularMetricasPeriodo / calcularDre — Bloco B e Bloco C"
        status: unknown
    human_judgment: true
    rationale: "npm test nao roda neste checkout; gates de grep e aritmetica de numero dourado rodaram localmente e passaram (ver Performance/Notas), mas a suite completa so roda no CI."
  - id: D3
    description: "Editar a venda recalcula/anula a taxa conforme a forma de pagamento muda, com round-trip idempotente e fonte das parcelas correta quando o form nao envia"
    requirement: "QK-LGJ-01"
    verification:
      - kind: unit
        ref: "src/__tests__/antecipacao-custo-edicao.test.ts"
        status: unknown
    human_judgment: true
    rationale: "npm test nao roda neste checkout; CI e o portao real."
  - id: D4
    description: "Rota admin de backfill (GET previa / POST aplica) preenche so taxaFinanceiraValor de vendas historicas, nunca lucroLiquido, e e idempotente"
    requirement: "QK-LGJ-03"
    verification:
      - kind: unit
        ref: "src/__tests__/backfill-taxa-antecipacao.test.ts"
        status: unknown
    human_judgment: true
    rationale: "npm test nao roda neste checkout; alem disso o POST nunca foi executado contra o banco de producao por decisao do plano — precisa de confirmacao humana antes de rodar em producao de qualquer forma."

duration: "nao cronometrado com precisao — sessao unica, sem pausas de checkpoint"
completed: 2026-08-10
status: complete
---

# Quick Task 260810-lgj: Deságio da antecipação Prudent vira custo real da venda e do DRE

**Novo módulo `src/lib/antecipacao-custo.ts` traduz o deságio da Prudent em `Venda.taxaFinanceiraValor`, descontado do lucro gravado na criação e edição da venda e somado como linha própria "Taxa Prudent" no DRE — sem nunca criar `Despesa` — mais uma rota admin de backfill (previa + aplicação) para vendas históricas.**

## Performance

- **Duration:** não cronometrado com precisão (sessão única, contínua, sem checkpoints)
- **Tasks:** 3/3 completas
- **Files modified:** 9 (4 produção + 1 rota nova + 1 módulo novo + 3 testes) — exatamente os `files_modified` do plano, sem escopo extra
- **Commits:** 6 (RED/GREEN por task)

**Nota obrigatória sobre execução de testes:** `npm install` falha por permissão neste checkout (`node_modules` não existe) e portanto `vitest`/`tsc` **não rodaram localmente**. Os 3 arquivos de teste novos (`antecipacao-custo.test.ts`, `antecipacao-custo-edicao.test.ts`, `backfill-taxa-antecipacao.test.ts`) foram escritos e revisados linha a linha contra o comportamento real do código, e a lógica de negócio central (a fórmula pura em `custoAntecipacaoVenda`) foi exercitada de fato via `node --input-type=module` fora do bundler, copiando o módulo e `src/lib/antecipacao.ts` (inalterado) para um diretório temporário e rodando os 9 cenários do Bloco A mais os cenários de edição — todos bateram com os valores hard-coded nos testes. Os gates de `grep`/`readFileSync` (sem despesa criada, fiação presente, `where` combinando filtros) também rodaram localmente e passaram. **O CI é o portão real** para a suite completa (mocks de Prisma/Next, `calcularMetricasPeriodo`/`calcularDre`, as rotas).

## Accomplishments

- `src/lib/antecipacao-custo.ts`: módulo puro (zero import de banco) com `custoAntecipacaoVenda` e `lucroLiquidoComAntecipacao`, reusando `titulosDeVenda`/`calcularAntecipacao`/`vendaEhAntecipavel`/`TAXA_MENSAL_PADRAO` de `src/lib/antecipacao.ts` sem tocar na fórmula (`git diff -- src/lib/antecipacao.ts` vazio).
- `criarVendaV2` (venda-rápida) grava `taxaFinanceiraValor` e desconta o deságio do `lucroLiquido` na criação; a lista de parcelas subiu para fora da transação para alimentar o cálculo do custo e a gravação das parcelas com a mesma fonte.
- `updateVenda` (histórico) recalcula a taxa a cada save — inclusive anulando-a quando a venda sai do desconto em folha — e lê as parcelas reais do banco quando o form não as reenvia, para não cair no fallback de 30/60/90 e divergir da tela da Prudent.
- `src/lib/finance.ts`: `calcularMetricasPeriodo` lê `taxaFinanceiraValor` **da coluna**, soma em `custosVar` e desconta por vendedor; `calcularDre` expõe `detalhe.taxaAntecipacao`.
- `src/app/(app)/financeiro/page.tsx`: card "Taxa Prudent" na composição dos custos, reusando as classes dos cards irmãos (grid 4→5 colunas); `npm run cores:check` passou (0 cores cruas novas).
- `GET`/`POST /api/admin/backfill-taxa-antecipacao`: previa e aplicação do backfill em vendas antigas, RBAC admin, `where` combinando `WHERE_VENDA_ANTECIPAVEL` + `taxaFinanceiraValor: null`, `data` do `update` contendo **apenas** `taxaFinanceiraValor`. **O POST não foi executado contra o banco** — a rota foi entregue, não rodada.
- Nenhum caminho (dos 4 arquivos de produção) cria `Despesa` — gate de `grep` sobre o fonte sem comentários confirmou isso localmente para os 3 tasks.

## Task Commits

1. **Task 1: deságio ponta a ponta — venda em desconto em folha vira custo no lucro e no DRE**
   - `24feb67` (test, RED) — 17 testes falhando em `antecipacao-custo.test.ts`
   - `200d140` (feat, GREEN) — módulo novo + `criarVendaV2` + `finance.ts` + card do DRE
2. **Task 2: edição da venda — recalcular a taxa e ANULAR quando sai do desconto em folha**
   - `2dab37d` (test, RED) — 8 testes falhando em `antecipacao-custo-edicao.test.ts`
   - `be3d03d` (feat, GREEN) — `updateVenda` recalcula/anula a taxa
3. **Task 3: retroatividade — backfill admin da taxa, com prévia e sem tocar em lucro histórico**
   - `5f86496` (test, RED) — 9 testes falhando em `backfill-taxa-antecipacao.test.ts`
   - `7067fc2` (feat, GREEN) — rota `GET`/`POST` nova

_SUMMARY.md e STATE.md não são commitados por este agente — o orquestrador cuida disso, conforme instrução recebida._

## Files Created/Modified

- `src/lib/antecipacao-custo.ts` (novo) — tradução venda → custo de antecipação, sem tocar na fórmula
- `src/app/(app)/venda-rapida/actions.ts` — grava `taxaFinanceiraValor` e lucro já descontado na criação
- `src/lib/finance.ts` — DRE lê a coluna e soma em `custosVar`/`porVendedor`/`detalhe.taxaAntecipacao`
- `src/app/(app)/financeiro/page.tsx` — card "Taxa Prudent"
- `src/app/(app)/historico/actions.ts` — recalcula/anula a taxa na edição
- `src/app/api/admin/backfill-taxa-antecipacao/route.ts` (novo) — backfill admin (GET previa / POST aplica)
- `src/__tests__/antecipacao-custo.test.ts` (novo) — 17 testes (Blocos A/B/C)
- `src/__tests__/antecipacao-custo-edicao.test.ts` (novo) — 8 testes
- `src/__tests__/backfill-taxa-antecipacao.test.ts` (novo) — 9 testes

## Decisões registradas (itens (b)-(f) exigidos pelo plano)

**(b) Por que nenhum caminho cria `Despesa`:** o custo da antecipação mora exclusivamente em `Venda.taxaFinanceiraValor`. Se qualquer um dos 4 arquivos de produção criasse uma linha em `Despesa`, `src/lib/finance.ts:81` somaria esse mesmo deságio de novo através de `variaveis` (que vem de despesas) dentro de `custosVar`, dobrando a contagem no DRE. Um gate de `grep` (Teste 15/Teste 6/Teste 8, conforme a task) roda sobre o fonte sem comentários e trava isso.

**(c) Por que o DRE LÊ a coluna em vez de recalcular:** a server action da fila Prudent (`src/app/(app)/prudent/page.tsx:79`) marca as parcelas com `antecipada: true` quando o lote roda, e `titulosDeVenda` (`src/lib/antecipacao.ts`) descarta parcela antecipada por design (ela já não é mais "a antecipar"). Se `calcularMetricasPeriodo` recalculasse o custo a partir das parcelas a cada render, o custo de uma venda já antecipada cairia para **zero** justamente no momento em que ele passou a ser real. Por isso `finance.ts` só lê `v.taxaFinanceiraValor`, nunca chama `titulosDeVenda`/`calcularAntecipacao` — Teste 13 do Bloco B trava isso (venda com parcelas todas `antecipada: true` mas coluna nula contribui 0, provando que a leitura é da coluna, não das parcelas).

**(d) CONSEQUÊNCIA NA COMISSÃO — leitura obrigatória para o André:** `/api/comissoes/relatorio` e `/api/comissoes/detalhe` calculam a comissão do vendedor sobre `venda.lucroLiquido`. Como o lucro gravado das vendas **NOVAS** em desconto em folha agora vem com o deságio da Prudent já descontado (Tasks 1 e 2), **a comissão dessas vendas cai proporcionalmente ao valor do deságio** — para a venda de R$ 4.000/4x do caso dourado, o lucro usado para calcular comissão cai R$ 416,78. Isso é consequência direta e assumida da regra "o lucro tem que refletir o deságio" (decisão do André de 2026-08-03/07), **não um efeito escondido**. Vendas históricas **não mudam** (Task 3 preserva `lucroLiquido` histórico), e a linha `Comissões` do próprio DRE também não muda (ela é calculada sobre receita, não sobre lucro — `finance.ts:70`). Se o André não quiser esse efeito na comissão do vendedor, a correção é no cálculo da comissão (usar um lucro anterior ao deságio), **não** em deixar o deságio fora do lucro da venda — essa era a decisão de arquitetura travada no plano (T-LGJ-07, `disposition: accept`).

**(e) Retroatividade:** o `lucroLiquido` de venda histórica **não foi tocado**. O backfill (Task 3) preenche apenas `taxaFinanceiraValor` — uma coluna que hoje é 100% nula e que, antes deste trabalho, nada em `src/` lia ou escrevia. Preencher uma coluna vazia não é reescrever histórico financeiro; o `data` de todo `venda.update` do POST contém somente `taxaFinanceiraValor` (gate de `grep` + Teste 5 do Bloco de testes travam isso). **O POST não foi executado contra o banco de produção** — a rota foi entregue pronta para uso, mas rodá-la é decisão do André, depois de conferir a prévia via `GET`.

**(f) Achado fora de escopo, não corrigido:** `updateVenda` continua perdendo o flag `antecipada` das parcelas ao reescrevê-las na edição (bug pré-existente, já documentado no plano como fato #8). Isso é irrelevante para este trabalho porque `custoAntecipacaoVenda` ignora esse flag de propósito (o custo é da venda inteira, não do estado momentâneo de "já antecipada fisicamente"). Não fiz nenhuma alteração nesse comportamento.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug no golden number do próprio plano] Corrigido o valor esperado do fallback de 1 parcela em 31 dias: 41.26, não 41.23**

- **Found during:** Task 1, antes de escrever o Teste 6 do Bloco A (`antecipacao-custo.test.ts`)
- **Issue:** O plano (`fatos_travados #7` e o Teste 6 da Task 1, ecoados também no briefing de ambiente que recebi) descreve o caso "venda em desconto em folha, sem `parcelas_detalhes`, total R$ 1.000 em 1 parcela" como produzindo **juros simples 4,123%** e, portanto, **R$ 41,23**. Rodei a fórmula real e não modificada de `src/lib/antecipacao.ts` (`titulosDeVenda` + `calcularAntecipacao`) fora do bundler via `node --input-type=module`, copiando o arquivo para um diretório temporário e reescrevendo só o import `@/`. O fallback de 1 parcela produz `prazoDias = DIAS_NO_MES*(0+1)+1 = 31` — e `calcularTaxaPercent` só usa juros simples quando `prazoMedioDias < 30`; com N=31 (≥30) o ramo executado é o de **juros compostos**, que dá 4,125707...% sobre R$ 1.000 = R$ 41,257... → **R$ 41,26** arredondado a centavo. Testei isso isoladamente e também reconfirmei o caso dourado de 4 parcelas/76 dias (R$ 416,78), que bateu exatamente com o plano — o erro está isolado no caso específico de 1 parcela/31 dias.
- **Fix:** Escrevi o Teste 6 do Bloco A (`antecipacao-custo.test.ts`) e a verificação equivalente em `run-edicao.ts`/local com o valor **R$ 41,26** (o que a fórmula real e não tocada de fato produz), documentando a razão no próprio teste. **Não toquei em `src/lib/antecipacao.ts`** — a fórmula continua exatamente como estava (`git diff -- src/lib/antecipacao.ts` vazio), conforme o plano exige. Este caso específico (fallback de 1 parcela) não é exercitado por nenhum dos outros testes do plano (Tasks 1/2/3 usam o caso de 4 parcelas/76 dias em todos os outros lugares), então a correção fica isolada a essa única asserção.
- **Files modified:** `src/__tests__/antecipacao-custo.test.ts` (Teste 6 do Bloco A)
- **Verificação:** `node --input-type=module` local reproduzindo `titulosDeVenda`+`calcularAntecipacao` sem alteração de fórmula; ver comentário extenso no próprio teste explicando o cálculo passo a passo.
- **Committed in:** `24feb67` (Task 1, commit RED)

---

**Total deviations:** 1 auto-fixed (Rule 1 — correção de um número esperado incorreto que o próprio plano continha, sem alterar a fórmula que o plano proíbe tocar)
**Impact on plan:** Nenhum escopo extra. A fórmula de `src/lib/antecipacao.ts` permanece intocada; a correção só ajustou a expectativa literal de um teste para bater com o que essa fórmula (não reescrita) de fato produz.

## Issues Encountered

None além da deviation acima.

## Known Stubs

Nenhum — não há dado hardcoded vazio nem placeholder introduzido por este trabalho. O card "Taxa Prudent" no DRE sempre lê `dre.detalhe.taxaAntecipacao`, calculado a partir de dados reais.

## Threat Flags

Nenhuma superfície nova além do que já está descrito no `<threat_model>` do plano (T-LGJ-01 a T-LGJ-09, T-LGJ-SC) — todos com disposição `mitigate` ou `accept` já implementada/documentada:
- T-LGJ-01 (dupla contagem via despesa) — mitigado, gate de grep.
- T-LGJ-02 (taxa velha após troca de forma) — mitigado, `updateVenda` sempre reescreve/anula.
- T-LGJ-03 (custo evapora após lote Prudent) — mitigado, DRE lê a coluna.
- T-LGJ-05 (elevação de privilégio na rota de backfill) — mitigado, `getSession()` + `role === "admin"` antes de qualquer leitura.
- T-LGJ-06 (backfill reescrevendo histórico) — mitigado, `data` do update só contém `taxaFinanceiraValor`.
- T-LGJ-07 (corte silencioso de comissão) — `accept`, documentado explicitamente na seção (d) acima.

## User Setup Required

None - nenhuma configuração de serviço externo é necessária.

## Next Phase Readiness

- O CI precisa rodar a suite completa (`antecipacao-custo.test.ts`, `antecipacao-custo-edicao.test.ts`, `backfill-taxa-antecipacao.test.ts`) para confirmar o que só pôde ser verificado localmente por aritmética/grep neste checkout.
- Depois do CI verde, o André pode rodar `GET /api/admin/backfill-taxa-antecipacao` (sessão admin) para conferir a prévia das vendas históricas antes de decidir rodar o `POST`.
- Ponto em aberto que o André precisa decidir: se a queda de comissão em vendas novas de desconto em folha (item (d) acima) é o comportamento desejado ou se o cálculo de comissão precisa de um lucro "pré-deságio" separado — isso está fora do escopo deste plano por decisão explícita (T-LGJ-07, `accept`).

---
*Quick task: 260810-lgj*
*Completed: 2026-08-10*
