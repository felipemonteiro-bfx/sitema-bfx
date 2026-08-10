---
phase: quick-260810-lgj
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [QK-LGJ-01, QK-LGJ-02, QK-LGJ-03]
files_modified:
  - src/lib/antecipacao-custo.ts
  - src/app/(app)/venda-rapida/actions.ts
  - src/lib/finance.ts
  - src/app/(app)/financeiro/page.tsx
  - src/app/(app)/historico/actions.ts
  - src/app/api/admin/backfill-taxa-antecipacao/route.ts
  - src/__tests__/antecipacao-custo.test.ts
  - src/__tests__/antecipacao-custo-edicao.test.ts
  - src/__tests__/backfill-taxa-antecipacao.test.ts

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Uma venda nova em desconto em folha grava `Venda.taxaFinanceiraValor` com o deságio da Prudent, e o `lucroLiquido` gravado ja vem descontado dele (QK-LGJ-01)."
    - "A mesma venda em Pix/boleto/cartao grava `taxaFinanceiraValor` NULO e o lucro nao muda em nada (QK-LGJ-01)."
    - "O DRE mostra `Taxa Prudent` como linha propria na composicao dos custos, e a margem e o lucro do mes caem exatamente por esse valor (QK-LGJ-02)."
    - "O desagio entra UMA unica vez: a coluna `taxaFinanceiraValor` alimenta o lucro gravado da venda E o `custosVar` do DRE, que sao dois calculos independentes. Nenhum caminho cria linha na tabela de despesas — se criasse, `variaveis` somaria o mesmo desagio de novo em `finance.ts` (QK-LGJ-01, QK-LGJ-02)."
    - "Editar a venda e trocar a forma de pagamento para fora do desconto em folha ANULA a taxa gravada — nunca sobra valor velho (QK-LGJ-01)."
    - "Salvar a venda sem alterar nada devolve exatamente a mesma taxa e o mesmo lucro (round-trip idempotente)."
    - "Depois que o lote da Prudent marca as parcelas como antecipadas, o custo CONTINUA no DRE — porque o DRE le a coluna gravada e nao recalcula a partir das parcelas (QK-LGJ-02)."
    - "A formula nao e reescrita: o valor sai de `titulosDeVenda` + `calcularAntecipacao` de `src/lib/antecipacao.ts`, com `vendaEhAntecipavel` decidindo se ha custo."
    - "O `lucroLiquido` de vendas historicas NAO e reescrito por este trabalho. So a coluna `taxaFinanceiraValor` — hoje 100% nula e lida por ninguem — pode ser preenchida, por rota admin explicita, com previa (GET) antes de qualquer escrita (QK-LGJ-03)."
    - "O backfill roda duas vezes sem mudar nada na segunda passada (filtro `taxaFinanceiraValor: null`)."
    - "Consequencia assumida e visivel: a comissao de vendas NOVAS em desconto em folha passa a ser calculada sobre o lucro ja com o desagio, porque `/api/comissoes/relatorio` le `venda.lucroLiquido`. Vendas historicas nao mudam."
  artifacts:
    - src/lib/antecipacao-custo.ts
    - src/app/api/admin/backfill-taxa-antecipacao/route.ts
    - src/__tests__/antecipacao-custo.test.ts
    - src/__tests__/antecipacao-custo-edicao.test.ts
    - src/__tests__/backfill-taxa-antecipacao.test.ts
  key_links:
    - "`vendaEhAntecipavel` (src/lib/antecipacao.ts) -> decide se a venda tem custo de antecipacao; nulo quando nao tem"
    - "`titulosDeVenda` + `calcularAntecipacao` (src/lib/antecipacao.ts) -> `custoAntecipacaoVenda` (novo modulo) -> `Venda.taxaFinanceiraValor`"
    - "`Venda.taxaFinanceiraValor` -> `lucroLiquido` gravado em criarVendaV2 e updateVenda (calculo 1)"
    - "`Venda.taxaFinanceiraValor` -> `taxaAntecipacao` em src/lib/finance.ts -> `custosVar`, `margem`, `lucro` e `porVendedor[].lucroLiquido` (calculo 2, independente do anterior)"
    - "`calcularDre().detalhe.taxaAntecipacao` -> card `Taxa Prudent` em src/app/(app)/financeiro/page.tsx"
    - "updateVenda / backfill -> `revalidarVenda()` de src/lib/revalidacao.ts (ROTAS_VENDA cobre /financeiro, /dashboard, /comissoes, /historico)"
    - "`Venda.taxaFinanceiraValor` (coluna orfa, ja existe em prisma/migrations/0001_init) -> nenhuma migration nova"
---

<objective>
Fazer o desagio da antecipacao Prudent virar custo de verdade das vendas em desconto em folha:
descontado no lucro gravado da venda E aparecendo como linha propria no DRE, sem contar duas vezes.

Purpose: regra do Andre — TODA venda em desconto em folha VAI ser antecipada na Prudent. Logo o
desagio nao e hipotese, e custo certo daquela venda. Hoje ele nao existe em lugar nenhum do
financeiro: o lucro por venda, o lucro por vendedor no dashboard e o DRE estao todos inflados pelo
valor exato da taxa. Item do backlog pos-antecipacao.

Escopo travado (nao alargar):
- (1) modulo que traduz uma venda no custo de antecipacao, REUSANDO a formula ja pronta e testada
  de `src/lib/antecipacao.ts` (3,99% a.m., prazo medio D+1, simples abaixo de 30 dias, composto de
  30 em diante) — a formula NAO e reescrita;
- (2) o custo gravado em `Venda.taxaFinanceiraValor` e descontado do `lucroLiquido` na criacao e na
  edicao da venda;
- (3) o custo somado ao `custosVar` do DRE e exibido como linha propria "Taxa Prudent";
- (4) rota admin de backfill (previa + aplicacao) para as vendas que ja existem.

Decisao de arquitetura (QK-LGJ-01): a coluna `Venda.taxaFinanceiraValor` e a UNICA fonte do numero.
Ela ja existe no schema (`@map("taxa_financeira_valor")`, migration `0001_init`) e hoje nada em
`src/` le ou escreve nela — nao ha migration nova. O DRE LE essa coluna; NAO recalcula a taxa a
partir das parcelas. Motivo concreto: a server action da fila Prudent
(`src/app/(app)/prudent/page.tsx:79`) marca as parcelas com `antecipada: true`, e `titulosDeVenda`
descarta parcela antecipada. Se o DRE recalculasse, o custo de uma venda ja antecipada cairia para
zero justamente quando ele passou a ser real. Um teste trava isso.

Decisao de dupla contagem (QK-LGJ-02): existem DOIS calculos de lucro independentes no sistema —
o `lucroLiquido` gravado na venda (consumido por historico, comissoes e dashboard de comissoes) e
o recalculo do zero em `src/lib/finance.ts` (consumido por DRE e dashboard). Subtrair a taxa uma
vez DENTRO de cada um deles nao dobra nada. O que dobraria e gravar o desagio tambem como linha na
tabela de despesas, porque `finance.ts:81` ja soma `variaveis` (que vem de despesas) junto de
`custosVar`. Nenhum caminho deste plano escreve em despesas, e um gate de fonte trava isso — mesma
armadilha documentada no trabalho do Uber.

Decisao de retroatividade (QK-LGJ-03): `lucroLiquido` de venda historica NAO e reescrito. Comissao
ja calculada e paga nao muda retroativamente. O que o backfill preenche e apenas
`taxaFinanceiraValor`, uma coluna hoje integralmente nula e lida por ninguem — preencher coluna
vazia nao e reescrever historico. Como o DRE recalcula do zero a cada render, depois do backfill os
meses passados passam a mostrar o custo real da Prudent sem nenhum dado historico ter sido
sobrescrito. A rota tem GET (previa, nao escreve) e POST (aplica so onde a coluna e nula).

Output: um modulo de custo, 4 arquivos de producao alterados, uma rota admin de backfill e 3
arquivos de teste.
</objective>

<consequencia_conhecida>
Efeito colateral REAL desta decisao, que o executor tem de registrar no SUMMARY para o Andre ver:

`/api/comissoes/relatorio` e `/api/comissoes/detalhe` calculam a comissao sobre
`venda.lucroLiquido`. Como o lucro gravado das vendas NOVAS em desconto em folha passa a vir ja
com o desagio descontado, a comissao dessas vendas cai proporcionalmente. Isso e consequencia
direta da regra "o lucro tem de refletir o desagio", nao um efeito escondido.

O que NAO muda:
- vendas historicas — o `lucroLiquido` delas nao e tocado, entao comissao ja apurada fica igual;
- a linha `Comissoes` do DRE — `finance.ts:70` calcula comissao sobre a RECEITA (`r.total`), nao
  sobre o lucro; ela nao se mexe por causa da taxa, e por isso tambem nao ha dupla contagem entre
  `comissoes` e `taxaAntecipacao` dentro de `custosVar`.

Se o Andre nao quiser esse efeito na comissao, a correcao e no calculo da comissao (usar um lucro
antes do desagio), NAO em deixar o desagio fora do lucro da venda.
</consequencia_conhecida>

<execution_context>
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/workflows/execute-plan.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

# A FORMULA JA EXISTE E E TESTADA — reusar, nunca reimplementar
@src/lib/antecipacao.ts
@src/__tests__/antecipacao-taxa.test.ts

# Onde o lucro e gravado (calculo 1) e onde ele e recalculado do zero (calculo 2)
@src/app/(app)/venda-rapida/actions.ts
@src/app/(app)/historico/actions.ts
@src/lib/finance.ts

# Quem decide se a venda vai para a Prudent
@src/lib/forma-pagamento.ts

# Total da venda — o fallback de titulosDeVenda espera o TOTAL, nao o valor unitario
@src/lib/venda-utils.ts

# Helper obrigatorio de revalidacao para qualquer escrita
@src/lib/revalidacao.ts

# Padrao de rota admin com previa (GET) e aplicacao (POST)
@src/app/api/admin/backfill-estoque/route.ts

# Padrao de teste com prisma/session/next-cache mockados (unico jeito de testar action/rota aqui)
@src/__tests__/fornecedores-post-route.test.ts

# Padrao de teste dourado de numero financeiro
@src/__tests__/estoque-metrics-nao-regressao.test.ts
</context>

<environment_constraints>
- `node_modules` nao existe neste checkout e `npm install` falha por permissao. `vitest` e `tsc` NAO
  rodam aqui. O CI e o unico portao. Escrever os testes e obrigatorio; depender de roda-los
  localmente nao e — registrar no SUMMARY em vez de considerar reprovado.
- O modulo novo importa de `@/lib/antecipacao`, entao NAO da para exercita-lo com
  `node --input-type=module` (o alias `@/` nao resolve fora do bundler). As verificacoes locais
  possiveis sao: conferencia aritmetica do numero dourado com a formula crua e gates de `grep`
  sobre o fonte.
- Hook de seguranca bloqueia o padrao `RegExp exec`. Usar `.test()`, `.includes()` ou `.split()`.
- Nao criar arquivos na raiz do repositorio (exigiria sudo). Todos os arquivos deste plano ficam
  sob `src/`.
- Toda escrita nova no banco chama o helper certo de `src/lib/revalidacao.ts` (aqui: `revalidarVenda`).
- Trava de CI contra cor crua (`npm run cores:check`) roda sobre `src` inteiro: o card novo do DRE
  reusa exatamente as classes dos cards irmaos, sem introduzir cor nova.
</environment_constraints>

<fatos_travados>
Ja verificados no codigo — nao repesquisar:

1. `Venda.taxaFinanceiraValor` existe em `prisma/schema.prisma:154` e a coluna existe desde
   `prisma/migrations/0001_init`. Nada em `src/` le ou escreve nela hoje. NAO precisa migration.
2. `prisma.venda.findMany` de `finance.ts:30` usa `include`, entao ja devolve todos os campos
   escalares — `taxaFinanceiraValor` chega sem alterar a query.
3. `titulosDeVenda(venda)` sem `parcelas_detalhes` cai no fallback que usa `venda.valorVenda` como
   TOTAL da venda e divide pelas parcelas. Passar o valor unitario ali produz taxa errada.
4. `titulosDeVenda` descarta parcela com `antecipada: true`. Para custo de venda isso esta errado —
   o desagio e da venda inteira. O modulo novo neutraliza esse flag antes de chamar.
5. `criarVenda` (V1 legada), `POST /api/importacao/batch` e `criar_venda` da IA derivam a forma com
   `formaFromLegacyFlags({ descontoEmFolha: false, boleto: false, parcelas })`, que nunca devolve
   `DESCONTO_FOLHA`. A taxa seria sempre nula nesses tres caminhos — por isso ficam FORA do escopo.
   Um teste trava que eles continuam incapazes de produzir desconto em folha; no dia em que
   passarem a aceitar forma de pagamento, o teste quebra e obriga a chamar o modulo.
6. `atualizar_venda` da IA (`src/lib/ai-actions.ts:1016`) nao mexe em forma de pagamento nem
   recalcula `lucroLiquido` hoje — segue igual, fora do escopo.
7. Numeros dourados da planilha `taxa smart`, ja travados em `antecipacao-taxa.test.ts`: venda de
   R$ 4.000 em 4 parcelas de R$ 1.000 vencendo 31/61/91/121 dias -> prazo medio 76 dias ->
   taxa 10,419386912884554% -> desagio 416,7754765153822, que arredondado a centavo da 416,78.
   Uma parcela vencendo em 31 dias -> juros simples 4,123% -> sobre R$ 1.000 da 41,23.
8. `updateVenda` reescreve as parcelas preservando `paga`/`dataPagamento` mas perdendo o flag
   `antecipada`. E bug pre-existente, FORA do escopo — e irrelevante aqui porque o modulo novo
   ignora esse flag de proposito (fato 4). Registrar no SUMMARY como achado, sem corrigir.
</fatos_travados>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: desagio ponta a ponta — venda em desconto em folha vira custo no lucro e no DRE</name>
  <files>
src/lib/antecipacao-custo.ts,
src/app/(app)/venda-rapida/actions.ts,
src/lib/finance.ts,
src/app/(app)/financeiro/page.tsx,
src/__tests__/antecipacao-custo.test.ts
  </files>

  <reversibility rating="costly">
    Eleger `Venda.taxaFinanceiraValor` como fonte unica do numero (em vez de recalcular no DRE) e a
    escolha que sobrevive ao lote da Prudent marcar as parcelas como antecipadas. Trocar depois
    exigiria migrar dados ja gravados e reensinar o DRE — caro, mas nao irreversivel.
  </reversibility>

  <behavior>
Escrever ESTES testes falhando ANTES da implementacao (CLAUDE.md, passo 2), todos em
`src/__tests__/antecipacao-custo.test.ts`. O arquivo mocka `@/lib/db` no topo (padrao de
`fornecedores-post-route.test.ts`); o mock nao atrapalha os testes do modulo puro, que nao importam
banco.

Bloco A — modulo `custoAntecipacaoVenda`:
- Teste 1 (numero dourado): venda em `DESCONTO_FOLHA`, dataVenda 2026-01-01, 4 parcelas de 1000
  vencendo 2026-01-31 / 2026-03-02 / 2026-04-01 / 2026-05-01 -> custo 416.78. O esperado e literal,
  escrito a mao a partir da planilha; nunca recalculado com a mesma formula do modulo.
- Teste 2: a mesma venda com `formaPagamento: "PIX"` -> `null`. Nulo, nao zero: zero significaria
  "passou pela Prudent e nao custou nada".
- Teste 3 (legado): `formaPagamento: null` + `descontoEmFolha: true` -> 416.78, igual ao que
  `vendaEhAntecipavel` responde.
- Teste 4 (legado nao vence forma canonica): `formaPagamento: "PIX"` + `descontoEmFolha: true` ->
  `null`.
- Teste 5 (o flag da fila nao apaga o custo): as mesmas 4 parcelas, todas com `antecipada: true` ->
  416.78, NAO 0. Depois que o lote roda, o desagio virou custo realizado.
- Teste 6 (fallback com o TOTAL): venda em desconto em folha, sem `parcelas_detalhes`, total 1000
  em 1 parcela -> 41.23 (prazo 31 dias, juros simples).
- Teste 7: arredondamento a centavo — o retorno do Teste 1 e exatamente 416.78, nunca
  416.7754765153822 (o banco guarda dinheiro, nao float cru).
- Teste 8: `lucroLiquidoComAntecipacao(1000, 416.78)` === 583.22 e
  `lucroLiquidoComAntecipacao(1000, null)` === 1000.
- Teste 9: venda sem parcela nenhuma e com total 0 -> custo 0 (nao NaN, nao null), para nao gravar
  lixo em venda degenerada.

Bloco B — DRE, com `@/lib/db` mockado, chamando `calcularMetricasPeriodo` e `calcularDre`:
- Teste 10: duas vendas de 1000 (mesmo vendedor), uma com `taxaFinanceiraValor: 416.78` e outra
  `null` -> `custosVar` e exatamente 416.78 maior que o mesmo cenario com as duas nulas.
- Teste 11: `porVendedor["Maria"].lucroLiquido` desconta a taxa da venda dela e nao a do outro
  vendedor.
- Teste 12: `calcularDre(...).detalhe.taxaAntecipacao` === 416.78 e `margem` e `lucro` caem
  exatamente 416.78 em relacao ao cenario sem taxa.
- Teste 13 (a fonte e a coluna, nao o recalculo): venda em `DESCONTO_FOLHA` COM parcelas reais mas
  `taxaFinanceiraValor: null` contribui 0 para `taxaAntecipacao`. Isso e o que garante que o custo
  nao evapora quando a fila da Prudent marca as parcelas como antecipadas.
- Teste 14: a linha `comissoes` continua sendo receita x percentual e nao muda quando a taxa
  aparece — prova de que `custosVar` nao conta o desagio duas vezes.

Bloco C — gates de fonte (`readFileSync`, padrao de `revalidacao.test.ts`):
- Teste 15 (sem dupla contagem via despesa): em `src/lib/antecipacao-custo.ts`, `src/lib/finance.ts`,
  `src/app/(app)/venda-rapida/actions.ts` e `src/app/(app)/historico/actions.ts`, o fonte SEM as
  linhas de comentario (remover linhas iniciadas por `//` e blocos `/* */`) nao contem
  `despesa.create`. Se contivesse, `variaveis` somaria o mesmo desagio de novo em `finance.ts:81`.
- Teste 16 (fiacao do caminho de criacao): `src/app/(app)/venda-rapida/actions.ts` importa
  `custoAntecipacaoVenda` de `@/lib/antecipacao-custo` e cita `taxaFinanceiraValor`.
- Teste 17 (caminhos legados seguem incapazes de gerar desconto em folha): para `parcelas` de 1 a
  12, `formaFromLegacyFlags({ descontoEmFolha: false, boleto: false, parcelas })` nunca devolve
  `FORMA_PAGAMENTO.DESCONTO_FOLHA` — trava que justifica deixar V1, importacao e IA fora do escopo.
  </behavior>

  <action>
Implementar o caminho fino e completo: venda em desconto em folha -> custo calculado -> gravado na
venda -> lucro gravado ja descontado -> DRE somando -> linha visivel na tela. Codigo minimo para os
testes acima passarem.

1. `src/lib/antecipacao-custo.ts` — modulo novo, sem acesso a banco, importando SOMENTE
   `titulosDeVenda`, `calcularAntecipacao`, `vendaEhAntecipavel` e `TAXA_MENSAL_PADRAO` de
   `@/lib/antecipacao`. Cabecalho explicando a regra do Andre (toda venda em desconto em folha vai
   para a Prudent, logo o desagio e custo certo daquela venda) e por que o valor e gravado na venda
   em vez de virar lancamento avulso. Exporta:
   - `interface VendaParaCustoAntecipacao` = `{ formaPagamento?: string | null; descontoEmFolha?:
     boolean | null; dataVenda: string | Date; valorVenda: number | null; parcelas: number | null;
     parcelas_detalhes?: { dataVencimento: string | Date; valorParcela: number }[] }`. Documentar no
     tipo que `valorVenda` e o TOTAL da venda (fato 3), porque o fallback divide esse numero pelas
     parcelas.
   - `custoAntecipacaoVenda(venda, taxaMensal = TAXA_MENSAL_PADRAO): number | null` — devolve `null`
     quando `vendaEhAntecipavel(venda)` e falso; caso contrario monta os titulos com
     `titulosDeVenda`, passando as parcelas com o flag de antecipada forcado a falso (fato 4,
     comentar o porque: o desagio e da venda, nao do lote), e devolve
     `calcularAntecipacao(titulos, taxaMensal).valorTaxa` arredondado a centavo com
     `Math.round(x * 100) / 100`. Valor nao finito vira 0.
   - `lucroLiquidoComAntecipacao(lucroSemAntecipacao: number, custoAntecipacao: number | null):
     number` — subtrai o custo quando existe; devolve o lucro intacto quando e nulo.

2. `src/app/(app)/venda-rapida/actions.ts`, dentro de `criarVendaV2` (a action V1 legada nao muda —
   fato 5): logo depois de `valorParcela` ser calculado, montar `parcelasParaGravar`, a lista de
   parcelas que a transacao vai escrever — hoje ela e montada DENTRO da `$transaction`, e precisa
   subir para fora para que o custo e as linhas gravadas venham da mesma fonte (senao o numero da
   venda diverge do que a tela da Prudent mostra). A lista e: as parcelas validadas quando o form
   mandou; senao, quando `parcelas > 1`, a geracao automatica com `calcularPrimeiroVencimento` e
   dia 10, exatamente como esta hoje, sem mudar as datas nem trocar local por UTC; senao, lista
   vazia. Em seguida chamar `custoAntecipacaoVenda` com `formaPagamento`, `dataVenda`,
   `valorVenda: totalVenda` (o TOTAL — fato 3), `parcelas` e `parcelas_detalhes` (undefined quando a
   lista estiver vazia), gravar o resultado em `taxaFinanceiraValor` no `create` da venda, e trocar
   o `lucroLiquido` por `lucroLiquidoComAntecipacao(totalVenda - custoTotal, taxa)`. Dentro da
   transacao, o bloco de criacao de parcelas passa a apenas mapear `parcelasParaGravar` somando
   `vendaId` e `paga: false`. Nao mexer em mais nada da action.

3. `src/lib/finance.ts`, em `calcularMetricasPeriodo`: somar `taxaAntecipacao` como
   `vendas.reduce((s, v) => s + (v.taxaFinanceiraValor || 0), 0)` (o campo ja vem na query — fato 2,
   nao alterar o `findMany`); dentro do laco de `porVendedor`, subtrair a taxa daquela venda junto
   de cmv, frete e nota; incluir `taxaAntecipacao` em `custosVar`; adicionar o campo ao tipo
   `MetricasPeriodo` e ao retorno arredondado. Comentario curto explicando que o numero vem da
   coluna e NAO e recalculado, com o motivo (a fila da Prudent marca parcela como antecipada e o
   recalculo cairia para zero). Em `calcularDre`, expor `detalhe.taxaAntecipacao`.

4. `src/app/(app)/financeiro/page.tsx`, bloco "Custos do periodo": acrescentar um quinto card,
   copiando exatamente as classes dos irmaos (nenhuma cor nova, senao a trava de cor crua do CI
   reprova), com titulo `Taxa Prudent`, valor `formatBRL(dre.detalhe.taxaAntecipacao)` e legenda
   `Antecipacao do desconto em folha`. Trocar `lg:grid-cols-4` por `lg:grid-cols-5` na grade desse
   bloco. Nao mexer em nenhum outro card.
  </action>

  <verify>
    <automated>node -e "const TX=3.99,n=76;const t=(Math.pow(1+TX/100,n/30)-1)*100;const v=Math.round(4000*t/100*100)/100;if(v!==416.78)throw new Error('numero dourado errado: '+v);const s=Math.round(1000*(31*(TX/30))/100*100)/100;if(s!==41.23)throw new Error('dourado de 31 dias errado: '+s);console.log('numeros dourados conferidos');"</automated>
    <automated>for f in src/lib/antecipacao-custo.ts src/lib/finance.ts "src/app/(app)/venda-rapida/actions.ts" "src/app/(app)/historico/actions.ts"; do if grep -v '^[[:space:]]*[/*]' "$f" | grep -q 'despesa\.create'; then echo "FALHOU: $f grava despesa"; exit 1; fi; done; echo "nenhum caminho da taxa cria despesa"</automated>
    <automated>grep -q "custoAntecipacaoVenda" "src/app/(app)/venda-rapida/actions.ts" && grep -q "taxaFinanceiraValor" src/lib/finance.ts && grep -q "taxaAntecipacao" src/lib/finance.ts && grep -q "Taxa Prudent" "src/app/(app)/financeiro/page.tsx" && echo "fiacao ponta a ponta presente"</automated>
    <automated>npm test -- src/__tests__/antecipacao-custo.test.ts</automated>
    <note>O ultimo comando e o portao do CI; nesta maquina `node_modules` nao existe e ele nao roda. Registrar isso no SUMMARY em vez de considerar reprovado.</note>
  </verify>

  <done>
Uma venda de R$ 4.000 em desconto em folha, em 4 parcelas mensais, e gravada com
`taxaFinanceiraValor` 416,78 e `lucroLiquido` ja 416,78 menor; a mesma venda em Pix grava taxa nula
e lucro inalterado. O DRE do mes soma esses 416,78 em `custosVar`, derruba margem e lucro no mesmo
valor e mostra o card `Taxa Prudent` na composicao dos custos. Nenhum caminho cria linha de
despesa. Commits atomicos RED (testes) e GREEN (implementacao) feitos.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: edicao da venda — recalcular a taxa e ANULAR quando sai do desconto em folha</name>
  <files>
src/app/(app)/historico/actions.ts,
src/__tests__/antecipacao-custo-edicao.test.ts
  </files>

  <reversibility rating="reversible">
    Recalculo em cima do modulo da Task 1 dentro de uma action que ja recalcula lucro. Reverter e
    apagar duas linhas.
  </reversibility>

  <behavior>
Escrever ESTES testes falhando ANTES da implementacao, em
`src/__tests__/antecipacao-custo-edicao.test.ts`. Mockar `@/lib/db`, `@/lib/audit`, `@/lib/email` e
`next/cache` no padrao de `fornecedores-post-route.test.ts` e importar `updateVenda` de
`@/app/(app)/historico/actions` por `await import`. Montar o `FormData` com uma venda de R$ 4.000
em 4 parcelas de R$ 1.000 vencendo 31/61/91/121 dias apos a data da venda (mesmo caso dourado da
Task 1), custo dos itens R$ 3.000 e sem nota.

- Teste 1: editando e mantendo `DESCONTO_FOLHA`, o `data` passado a `prisma.venda.update` traz
  `taxaFinanceiraValor` 416.78 e `lucroLiquido` 583.22.
- Teste 2 (a stale que o review do Uber pegou): a mesma venda editada para `PIX` grava
  `taxaFinanceiraValor: null` — nunca deixa o 416.78 velho — e `lucroLiquido` 1000.
- Teste 3 (caminho inverso): venda em `PIX` editada para `DESCONTO_FOLHA` passa a gravar 416.78.
- Teste 4 (round-trip idempotente): chamar `updateVenda` duas vezes com exatamente o mesmo
  `FormData` produz o mesmo `taxaFinanceiraValor` e o mesmo `lucroLiquido` nas duas chamadas.
- Teste 5 (fonte das parcelas quando o form nao manda): sem o campo `parcelasVencimento` no
  `FormData`, a action consulta `prisma.parcelaVencimento.findMany` para a venda e usa essas datas —
  o resultado e 416.78, e nao o valor do fallback de 30/60/90.
- Teste 6: `prisma.despesa.create` nunca e chamado em nenhum dos casos acima.
- Teste 7: `revalidatePath` foi chamado para `/financeiro` (o DRE atualiza sem reload).
- Teste 8 (nao regressao): venda em `PIX` sem nada a ver com Prudent continua com exatamente o mesmo
  `lucroLiquido` que a action ja produzia antes desta mudanca — numero dourado literal.
  </behavior>

  <action>
Em `src/app/(app)/historico/actions.ts`, dentro de `updateVenda`:

1. Subir o parse do campo `parcelasVencimento` para antes do `prisma.venda.update` (hoje ele
   acontece so depois, no bloco que reescreve as parcelas) e guardar o resultado em uma variavel
   unica, reusada nos dois lugares — parsear duas vezes abriria espaco para os dois lugares
   discordarem.
2. Montar a lista de parcelas que define o custo: as parcelas do form quando vieram; senao, ler as
   que ja existem no banco com `prisma.parcelaVencimento.findMany({ where: { vendaId: id },
   select: { dataVencimento: true, valorParcela: true } })`. Sem essa leitura, editar so a data da
   venda cairia no fallback de 30/60/90 e inventaria uma taxa diferente da que a tela da Prudent
   mostra para a mesma venda.
3. Chamar `custoAntecipacaoVenda` com a forma canonica ja calculada na action, `dataVenda:
   new Date(data)`, `valorVenda: total` (o TOTAL da venda — fato 3), `parcelas: parcelasNum` e a
   lista do passo 2 (undefined quando vazia). Gravar o retorno em `taxaFinanceiraValor` no mesmo
   `update` — inclusive quando for nulo, que e como a venda que saiu do desconto em folha e limpa.
4. Trocar o `lucroLiquido` do update por `lucroLiquidoComAntecipacao(lucro, taxa)`, mantendo o
   `lucro` atual como esta.
5. Comentario curto explicando o passo 3, no mesmo espirito do comentario que ja existe ali sobre
   `custoEnvioFonte`: dado derivado de forma de pagamento tem de ser reescrito a cada save, senao
   fica congelado num estado que nao corresponde mais a venda.

Nao mexer em mais nada da action. O flag `antecipada` das parcelas continua sendo perdido na
reescrita (fato 8) — nao corrigir aqui, so registrar no SUMMARY.
  </action>

  <verify>
    <automated>node -e "const TX=3.99;const t=(Math.pow(1+TX/100,76/30)-1)*100;const taxa=Math.round(4000*t/100*100)/100;const lucro=Math.round((1000-taxa)*100)/100;if(taxa!==416.78||lucro!==583.22)throw new Error('dourados da edicao errados: '+taxa+'/'+lucro);console.log('dourados da edicao conferidos');"</automated>
    <automated>grep -q "custoAntecipacaoVenda" "src/app/(app)/historico/actions.ts" && grep -q "parcelaVencimento.findMany" "src/app/(app)/historico/actions.ts" && echo "edicao recalcula a taxa a partir das parcelas reais"</automated>
    <automated>npm test -- src/__tests__/antecipacao-custo-edicao.test.ts</automated>
    <note>Portao do CI; nao roda nesta maquina (node_modules ausente).</note>
  </verify>

  <done>
Abrir uma venda em desconto em folha no historico e salvar sem mudar nada devolve exatamente a
mesma taxa e o mesmo lucro; trocar a forma para Pix apaga a taxa gravada e devolve o lucro cheio;
trocar de Pix para desconto em folha passa a cobrar o desagio. Nenhuma despesa e criada e
`/financeiro` revalida. Commits atomicos RED e GREEN feitos.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: retroatividade — backfill admin da taxa, com previa e sem tocar em lucro historico</name>
  <files>
src/app/api/admin/backfill-taxa-antecipacao/route.ts,
src/__tests__/backfill-taxa-antecipacao.test.ts
  </files>

  <reversibility rating="costly">
    A rota em si e reversivel (apagar o arquivo). Rodar o POST em producao nao e trivialmente
    reversivel: depois de preenchida, nao da para distinguir a linha vinda do backfill da linha
    escrita por uma venda nova. Por isso o GET (previa, nao escreve) existe e o POST so alcanca
    linhas hoje nulas. Este plano ENTREGA a rota; quem decide roda-la em producao e o Andre, depois
    de conferir a previa.
  </reversibility>

  <behavior>
Escrever ESTES testes falhando ANTES da implementacao, em
`src/__tests__/backfill-taxa-antecipacao.test.ts`, com `@/lib/db`, `@/lib/session` e `next/cache`
mockados no padrao de `fornecedores-post-route.test.ts`.

- Teste 1: GET sem sessao admin -> 401 e nenhuma escrita (`venda.update`/`updateMany` nao chamados).
- Teste 2: POST sem sessao admin -> 401 e nenhuma escrita.
- Teste 3: GET com admin devolve a previa com id, total da venda e a taxa calculada de cada venda, e
  NAO chama nenhum metodo de escrita do prisma.
- Teste 4: o `where` usado na leitura combina o filtro de venda antecipavel com
  `taxaFinanceiraValor: null` — nunca varre a tabela inteira.
- Teste 5 (historico nao e reescrito): o objeto `data` de todo `venda.update` do POST contem
  `taxaFinanceiraValor` e NAO contem a chave `lucroLiquido`. Este e o teste que separa "preencher
  coluna vazia" de "reescrever historico financeiro".
- Teste 6 (idempotencia): na segunda passada o mock devolve lista vazia por causa do filtro de nulo,
  e o POST responde `atualizadas: 0` sem nenhuma escrita.
- Teste 7: o numero gravado bate com o dourado — venda de 4.000 em 4 parcelas 31/61/91/121 -> 416.78,
  o mesmo que a venda nova produziria; backfill e criacao nao podem divergir.
- Teste 8: `prisma.despesa.create` nunca e chamado.
- Teste 9: o POST chama `revalidatePath` para `/financeiro` (o DRE dos meses passados precisa
  refletir o backfill sem reload).
  </behavior>

  <action>
Criar `src/app/api/admin/backfill-taxa-antecipacao/route.ts` espelhando
`src/app/api/admin/backfill-estoque/route.ts`: `GET` e previa, `POST` aplica, os dois exigem
`getSession()` com `session.role === "admin"` e respondem 401 antes de qualquer leitura.

Cabecalho do arquivo explicando a decisao de retroatividade (QK-LGJ-03): a coluna
`taxa_financeira_valor` e hoje integralmente nula e nao e lida por ninguem, entao preenche-la nao e
reescrever historico; o lucro gravado da venda antiga, esse sim historico (a comissao ja apurada
saiu dele), NAO e tocado. Consequencia deliberada: no historico e nas comissoes a venda antiga continua
com o lucro de antes, enquanto o DRE — que recalcula do zero a cada render — passa a mostrar o custo
real da Prudent nos meses passados.

Leitura comum as duas rotas: `prisma.venda.findMany` com `where` combinando
`WHERE_VENDA_ANTECIPAVEL` (de `@/lib/antecipacao`) e `taxaFinanceiraValor: null`, incluindo
`parcelasVencimento` (dataVencimento, valorParcela) e `itens` (subtotal). Nao filtrar por status:
`finance.ts` ja exclui cancelada/estornada do DRE, e a coluna descreve a venda independentemente do
status — menos condicao, menos surpresa. Para cada venda, o total vem de `valorTotalVenda` de
`@/lib/venda-utils` e a taxa de `custoAntecipacaoVenda`.

GET devolve `{ total, preview: [{ id, dataVenda, valorTotal, parcelas, taxa }] }` e nao escreve nada.

POST percorre a previa e, para cada venda com taxa nao nula, faz `prisma.venda.update` com `data`
contendo APENAS `taxaFinanceiraValor` — nenhum outro campo, e em especial nada de lucro. Ao final
chama `revalidarVenda()` de `@/lib/revalidacao` e responde `{ atualizadas, ignoradas }`. Erro
inesperado devolve 500 com mensagem propria, sem vazar objeto de erro cru.
  </action>

  <verify>
    <automated>grep -q "WHERE_VENDA_ANTECIPAVEL" src/app/api/admin/backfill-taxa-antecipacao/route.ts && grep -q "taxaFinanceiraValor" src/app/api/admin/backfill-taxa-antecipacao/route.ts && grep -q "getSession" src/app/api/admin/backfill-taxa-antecipacao/route.ts && echo "rota filtra, calcula e exige admin"</automated>
    <automated>if grep -v '^[[:space:]]*[/*]' src/app/api/admin/backfill-taxa-antecipacao/route.ts | grep -q 'lucroLiquido'; then echo "FALHOU: backfill toca em lucro historico"; exit 1; fi; echo "backfill nao reescreve lucro historico"</automated>
    <automated>npm test -- src/__tests__/backfill-taxa-antecipacao.test.ts</automated>
    <note>Portao do CI; nao roda nesta maquina (node_modules ausente). O POST NAO deve ser executado contra producao por este plano — o Andre roda o GET primeiro.</note>
  </verify>

  <done>
`GET /api/admin/backfill-taxa-antecipacao` como admin lista, sem escrever nada, quais vendas
antigas em desconto em folha estao sem taxa e quanto cada uma custaria. `POST` preenche so essas,
so a coluna da taxa, e rodar de novo nao muda mais nada. Nenhum `lucroLiquido` historico e tocado.
Commits atomicos RED e GREEN feitos.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| operador/navegador -> server action `criarVendaV2` / `updateVenda` | form nao confiavel decide forma de pagamento, parcelas e datas, e isso vira um custo financeiro gravado |
| admin/navegador -> `GET`/`POST /api/admin/backfill-taxa-antecipacao` | uma chamada escreve em coluna financeira de TODAS as vendas antecipaveis de uma vez |
| `Venda.taxaFinanceiraValor` -> DRE, dashboard e margem por vendedor | numero gravado atravessa para os relatorios que o Andre usa para decidir |
| `Venda.lucroLiquido` -> `/api/comissoes/*` | o mesmo numero define quanto o vendedor recebe |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-LGJ-01 | Tampering | dupla contagem do desagio | high | mitigate | o custo mora so em `Venda.taxaFinanceiraValor`; nenhum caminho cria linha na tabela de despesas (Teste 15 le o fonte dos 4 arquivos sem comentarios), porque `finance.ts:81` ja soma `variaveis` junto de `custosVar` |
| T-LGJ-02 | Tampering | taxa velha apos troca de forma de pagamento | high | mitigate | `updateVenda` reescreve `taxaFinanceiraValor` a cada save, gravando nulo quando a venda sai do desconto em folha (Teste 2 da Task 2) — mesma classe de bug que o review do Uber pegou em `custoEnvioFonte` |
| T-LGJ-03 | Tampering | custo evapora depois do lote da Prudent | high | mitigate | o DRE le a coluna gravada e nao recalcula (Teste 13); o modulo neutraliza o flag `antecipada` antes de montar os titulos (Teste 5) |
| T-LGJ-04 | Tampering | valor unitario passado onde o fallback espera o total | medium | mitigate | tipo documenta que `valorVenda` e o TOTAL; Teste 6 trava o fallback em 41,23 e os chamadores usam `totalVenda`/`total`/`valorTotalVenda` |
| T-LGJ-05 | Elevation of Privilege | rota de backfill | high | mitigate | `getSession()` + `role === "admin"` antes de qualquer leitura nos dois metodos; Testes 1 e 2 provam que nada e escrito sem admin |
| T-LGJ-06 | Tampering | backfill reescrevendo historico financeiro | critical | mitigate | `data` do update carrega apenas `taxaFinanceiraValor`; `lucroLiquido` nunca aparece (Teste 5 da Task 3 + gate de `grep`); filtro `taxaFinanceiraValor: null` torna a operacao idempotente |
| T-LGJ-07 | Repudiation | corte silencioso de comissao | medium | accept | consequencia assumida e declarada em `<consequencia_conhecida>`; obrigatorio constar do SUMMARY; vendas historicas nao sao afetadas |
| T-LGJ-08 | Information Disclosure | resposta de erro da rota | low | mitigate | 500 com mensagem propria em pt-BR, sem serializar o erro do Prisma |
| T-LGJ-09 | Denial of Service | backfill varrendo a tabela inteira | low | mitigate | `where` sempre combina venda antecipavel + coluna nula (Teste 4); o universo encolhe a cada execucao |
| T-LGJ-SC | Tampering | cadeia de dependencias | low | accept | zero pacotes novos: nada e instalado neste plano e `npm install` e impossivel neste ambiente |
</threat_model>

<verification>
1. Verificacoes locais possiveis nesta maquina: os `node -e` de numero dourado das Tasks 1 e 2 e os
   gates de `grep` das tres tasks. Todos devem passar.
2. Portao real: CI verde com os tres arquivos de teste novos (`antecipacao-custo`,
   `antecipacao-custo-edicao`, `backfill-taxa-antecipacao`) e com `src/__tests__/antecipacao-taxa.test.ts`
   intacto — se a suite da formula quebrar, alguem reescreveu `src/lib/antecipacao.ts`, o que este
   plano proibe.
3. `npm run lint` e `npm run cores:check` continuam passando (o card novo do DRE reusa as classes
   dos irmaos, sem cor crua).
4. `git diff -- prisma/` vazio: nenhuma migration nova, a coluna ja existe.
5. `git diff -- src/lib/antecipacao.ts` vazio: a formula nao foi tocada.
6. `git status` limpo de arquivos na raiz do repositorio.
</verification>

<success_criteria>
- Venda nova de R$ 4.000 em desconto em folha, 4 parcelas mensais: `taxaFinanceiraValor` 416,78 e
  `lucroLiquido` 416,78 menor do que era antes desta mudanca.
- A mesma venda em Pix: taxa nula, lucro identico ao de hoje (nenhuma regressao para quem nao vai
  para a Prudent).
- DRE do mes mostra `Taxa Prudent` como card proprio na composicao dos custos, e margem e lucro do
  mes caem exatamente por esse valor.
- Editar a venda e sair do desconto em folha apaga a taxa; salvar sem alterar nada nao muda numero
  nenhum.
- O custo continua no DRE depois do lote da Prudent marcar as parcelas como antecipadas.
- Nenhuma linha de despesa e criada em nenhum caminho — sem dupla contagem no DRE.
- A formula de `src/lib/antecipacao.ts` nao foi reescrita nem duplicada.
- Existe rota admin de backfill com previa; ela so preenche a coluna da taxa, nunca o lucro
  historico, e roda duas vezes sem efeito na segunda.
- Testes escritos antes da implementacao, com commits RED e GREEN separados por task.
</success_criteria>

<output>
Criar
`.planning/quick/260810-lgj-descontar-a-taxa-de-antecipacao-da-prude/260810-lgj-01-SUMMARY.md`
ao terminar, registrando explicitamente:

(a) que `npm test` nao roda nesta maquina e o CI e o portao;
(b) a decisao de nao criar linha de despesa e o motivo (`finance.ts:81` somaria de novo via
    `variaveis`);
(c) a decisao de o DRE LER a coluna em vez de recalcular, e o motivo (a fila da Prudent marca
    parcela como antecipada e o recalculo zeraria o custo justo quando ele vira real);
(d) **a consequencia na comissao** — vendas NOVAS em desconto em folha passam a ter comissao sobre
    o lucro ja com o desagio, porque `/api/comissoes/relatorio` le `venda.lucroLiquido`; vendas
    historicas nao mudam. Esta linha e obrigatoria: e a decisao que o Andre precisa ver;
(e) a decisao de retroatividade: `lucroLiquido` historico intocado, so `taxaFinanceiraValor`
    preenchida, por rota admin com previa, e que o POST NAO foi executado contra producao;
(f) o achado fora de escopo: `updateVenda` perde o flag `antecipada` das parcelas ao reescreve-las
    (bug pre-existente, irrelevante para este trabalho porque o custo ignora esse flag de proposito).
</output>
