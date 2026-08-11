---
phase: 260811-ddr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/parcelas-ajuste.ts
  - src/__tests__/parcelas-ajuste.test.ts
  - src/__tests__/edit-venda-form-ux.test.ts
  - src/components/edit-parcelas-section.tsx
  - src/components/edit-venda-com-parcelas.tsx
  - src/components/edit-venda-historico-form.tsx
  - src/components/form-secao-titulo.tsx
  - src/app/(app)/historico/page.tsx
  - src/app/(app)/historico/actions.ts
autonomous: true
requirements: [D-01, D-02, D-03, D-04, D-05, D-06, D-07]

estimate:
  tokens: 96000
  raw_tokens: 48000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-01: editando uma venda com 2 parcelas, mudar o campo Parcelas para 4 faz o dialog Datas de Vencimento passar a listar 4 linhas, com as 2 originais intactas (data e numero) e 2 novas em cadencia mensal."
    - "D-01: abrir a edicao de uma venda parcelada e nao tocar no campo Parcelas deixa as datas de vencimento exatamente como vieram do banco — nenhuma recalculada pela regra do dia 10/20."
    - "D-01: reduzir de 4 para 2 corta as parcelas do fim; se alguma das cortadas estiver paga, a lista NAO e reduzida abaixo da ultima parcela paga e a tela avisa."
    - "D-01: em qualquer mudanca do numero de parcelas a soma dos valores das linhas fecha com o total da venda (trunc nas primeiras, resto na ultima)."
    - "D-04: o rotulo do botao Datas de Vencimento mostra o mesmo numero de parcelas que sera gravado — rotulo e hidden parcelasVencimento nunca discordam."
    - "D-01: a Server Action updateVenda recusa o save (sem ter alterado o cabecalho da venda) quando o payload descartaria uma parcela ja marcada como paga."
    - "D-05: o formulario de edicao esta agrupado em secoes tituladas, o botao de excluir esta separado do salvar, e o rotulo do submit esta acentuado."
  artifacts:
    - src/lib/parcelas-ajuste.ts
    - src/__tests__/parcelas-ajuste.test.ts
    - src/__tests__/edit-venda-form-ux.test.ts
    - src/components/form-secao-titulo.tsx
  key_links:
    - "EditParcelasSection: useRef do numeroParcelas anterior -> ajustarParcelas() -> setParcelas -> hidden input name=parcelasVencimento"
    - "historico/page.tsx select paga -> prop parcelasPagas -> EditVendaHistoricoForm -> EditVendaComParcelas -> EditParcelasSection (aviso na tela)"
    - "updateVenda: leitura de parcelaVencimento hoisted para ANTES de prisma.venda.update -> guarda de parcela paga -> reuso do pagasMap no bloco de regravacao"
    - "EditVendaItens (total produtos) -> onTotalChange -> EditVendaComParcelas.total -> EditParcelasSection.valorTotal -> redistribuirValores()"
---

<objective>
Corrigir o bug em que mudar a quantidade de parcelas ao editar uma venda no Historico nao
atualiza a lista de datas de vencimento — gravando cabecalho e linhas inconsistentes no banco —
e melhorar o UX/UI do formulario de edicao de venda.

Purpose: hoje `edit-parcelas-section.tsx:93` passa `disableAutoInit={initialParcelas.length > 0}`,
um booleano fixo que trava a geracao da lista para toda venda que ja tem parcelas. Trocar 2 -> 4
muda o campo `parcelas` do cabecalho mas nao as linhas de `parcelas_vencimento`. A venda 182 em
producao esta com `parcelas = 4` e 5 linhas gravadas — o rastro real do defeito.

Output: modulo puro `src/lib/parcelas-ajuste.ts` com a regra de ajuste, testes que travam a
regressao, os componentes de edicao do Historico corrigidos, guarda de parcela paga na Server
Action, e o formulario reagrupado em secoes.
</objective>

<execution_context>
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/workflows/execute-plan.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/skills/shadcn-bfx/SKILL.md

Arquivos da cadeia do defeito (ja diagnosticados — nao reinvestigar do zero):
@src/components/edit-parcelas-section.tsx
@src/components/parcelas-vencimento-form.tsx
@src/components/edit-venda-com-parcelas.tsx
@src/components/edit-venda-historico-form.tsx

Padroes a seguir:
- Teste de modulo puro: @src/__tests__/pdv-custo-livre.test.ts
- Teste de Server Action com mock de prisma: @src/__tests__/antecipacao-custo-edicao.test.ts
- Teste-gate que le o fonte de um componente: @src/__tests__/tokens-fundo-neutro.test.ts

Restricoes duras (CLAUDE.md + constraints do orquestrador):
- Um hook do projeto BLOQUEIA edicoes contendo o padrao de execucao de regex por metodo em
  objeto RegExp. Usar sempre `.split()`, `.startsWith()`, `.includes()` e `.replace()`.
- Nao instalar pacotes (`npm install` falha por permissoes). Nenhuma dependencia nova.
- Nao mexer em: src/app/api/relatorios/**, src/components/report-buttons-client.tsx,
  src/lib/relatorio-vendas-colunas.ts, src/lib/senha*.ts, src/app/api/auth/login/route.ts,
  src/app/(app)/perfil/page.tsx, src/app/(app)/gestao-rh/page.tsx, src/lib/ai-actions.ts.
  Outros agentes estao nesses arquivos agora.
- D-06: NAO tocar em src/components/venda-rapida-form-v2.tsx, nem em migration, schema ou
  correcao de dados em producao.
- D-07: os testes nao rodam localmente de forma confiavel; o CI e o gate. Rodar o que der e
  seguir sem travar se o runner falhar por ambiente — mas registrar no SUMMARY o que rodou e o
  que nao rodou.
</context>

<tasks>

<task type="tdd" tdd="true">
  <name>Task 1: RED->GREEN do modulo puro de ajuste de parcelas (D-02, D-03)</name>
  <files>src/__tests__/parcelas-ajuste.test.ts, src/lib/parcelas-ajuste.ts</files>

  <read_first>
    src/components/edit-parcelas-section.tsx (linhas 34-49: a redistribuicao de valores que deve
    ser movida para ca, nao duplicada — D-01), src/components/parcelas-vencimento-form.tsx
    (linhas 28-43: a auto-init e a cadencia mensal atual), src/lib/utils.ts (linhas 58-63:
    calcularPrimeiroVencimento), src/__tests__/pdv-custo-livre.test.ts (formato do teste).
  </read_first>

  <behavior>
    Escrever PRIMEIRO `src/__tests__/parcelas-ajuste.test.ts`, rodar, confirmar que falha por
    modulo inexistente, e so entao implementar `src/lib/parcelas-ajuste.ts`. Cobertura minima
    exigida por D-03, um `it()` por caso:

    - N nao muda (3 -> 3): as tres datas voltam identicas as de entrada. Trava da regressao que
      motivou o disableAutoInit original — abrir a edicao nao pode recalcular datas combinadas
      com o cliente.
    - Crescimento 2 -> 4: as duas primeiras voltam com numeroParcela, dataVencimento e ordem
      intactos; as duas novas sao 3 e 4, cada uma um mes depois da anterior, mesmo dia do mes.
    - Crescimento a partir de dia alto (ultima parcela em 2026-01-31, cresce 1 -> 2): a nova cai
      no ultimo dia de fevereiro, nao transborda para marco.
    - Reducao 4 -> 2: sobram as parcelas 1 e 2, as do fim sao cortadas.
    - Soma fecha o total em todos os casos acima: a soma dos valorParcela e exatamente igual ao
      valorTotal (comparar com tolerancia de 0.005), inclusive num total que nao divide exato
      (ex.: 100 em 3 -> 33.33 / 33.33 / 33.34).
    - Parcela paga nao e descartada em silencio: com parcelasPagas [1,2,3] e pedido de reducao
      para 2, o retorno traz 3 linhas (nao 2) e `minimoPorPagas === 3`.
    - Reducao legitima nao dispara o clamp: com parcelasPagas [1] e reducao 4 -> 2, voltam 2
      linhas e `minimoPorPagas === null`.
    - Lista vazia com numeroParcelas 3 (venda antiga sem linhas em parcelas_vencimento): gera 3
      linhas a partir de calcularPrimeiroVencimento(dataVenda), dia 10, cadencia mensal — mesma
      regra da auto-init atual.
  </behavior>

  <action>
    Criar `src/lib/parcelas-ajuste.ts`, sem React e sem import de componente, exportando:

    1. `export type ParcelaAjuste = { numeroParcela: number; dataVencimento: string; valorParcela: number }`
       — `dataVencimento` no formato YYYY-MM-DD.

    2. `export function redistribuirValores(parcelas: ParcelaAjuste[], valorTotal: number): ParcelaAjuste[]`
       — move para ca, sem alterar o algoritmo, a redistribuicao que hoje vive no useEffect de
       `edit-parcelas-section.tsx` linhas 38-48: `base = Math.trunc((valorTotal / n) * 100) / 100`
       para todas menos a ultima, e a ultima recebe `Math.round((valorTotal - base * (n - 1)) * 100) / 100`.
       Lista vazia volta vazia. D-01 manda reaproveitar, nao duplicar: este passa a ser o unico
       lugar com essa regra.

    3. `export function ajustarParcelas(input: { parcelas: ParcelaAjuste[]; numeroParcelas: number; valorTotal: number; dataVenda?: string; parcelasPagas?: number[] }): { parcelas: ParcelaAjuste[]; minimoPorPagas: number | null }`

    Regras de `ajustarParcelas`, nesta ordem:
    - `alvo` = numeroParcelas. Se `parcelasPagas` tem algum numero maior que `alvo`, entao
      `alvo` vira esse maior numero e `minimoPorPagas` recebe esse valor; caso contrario
      `minimoPorPagas` e null. Nunca cortar uma parcela paga (D-01).
    - Se `parcelas` esta vazia: gerar `alvo` linhas a partir de `calcularPrimeiroVencimento`
      (importado de `@/lib/utils`) sobre a `dataVenda`, uma por mes no dia 10 — identico ao que
      a auto-init de `parcelas-vencimento-form.tsx` faz hoje, para nao regredir a venda antiga
      sem linhas gravadas. Sem `dataVenda`, usar a data de hoje como base.
    - Se `alvo` < `parcelas.length`: cortar do fim (`slice(0, alvo)`), preservando datas.
    - Se `alvo` > `parcelas.length`: manter todas as existentes com data e numero intactos e
      acrescentar as faltantes, cada uma um mes depois da anterior no mesmo dia do mes.
    - Se `alvo === parcelas.length`: manter as datas como estao.
    - Em todos os ramos, renumerar `numeroParcela` sequencialmente de 1 a `alvo` e devolver o
      resultado passado por `redistribuirValores` com o `valorTotal` recebido.

    Aritmetica de data — ponto sensivel, ja houve bug de data aparecendo um dia antes (commit
    d9064ee). Nao usar `new Date("YYYY-MM-DD")` seguido de getters locais. Parsear com
    `valor.split("-").map(Number)`, montar com `Date.UTC(ano, mes, dia)` e formatar de volta com
    `.toISOString().slice(0, 10)`. Para somar um mes preservando o dia: montar
    `Date.UTC(ano, mes + 1, 1)`, descobrir o ultimo dia desse mes com
    `new Date(Date.UTC(ano, mes + 2, 0)).getUTCDate()`, e usar `Math.min(dia, ultimoDia)` — assim
    31 de janeiro vira o ultimo dia de fevereiro em vez de transbordar.

    Proibido usar o metodo de execucao de regex sobre objeto RegExp em qualquer ponto (hook de
    seguranca do projeto bloqueia a edicao). Toda a manipulacao de string aqui e `.split()`.
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/parcelas-ajuste.test.ts</automated>
  </verify>

  <done>
    O teste foi escrito antes da implementacao e falhou na primeira execucao (registrar no
    SUMMARY a mensagem de falha observada). Depois de implementado o modulo, os casos de D-03
    passam. `src/lib/parcelas-ajuste.ts` nao importa nada de React nem de `@/components`.
    Conforme D-07, se o runner nao subir por ambiente, registrar isso no SUMMARY e seguir — o CI
    e o gate.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ligar o modulo na tela e proteger a parcela paga (D-01, D-04)</name>
  <files>src/components/edit-parcelas-section.tsx, src/components/edit-venda-com-parcelas.tsx, src/components/edit-venda-historico-form.tsx, src/app/(app)/historico/page.tsx, src/app/(app)/historico/actions.ts</files>

  <read_first>
    src/app/(app)/historico/page.tsx linhas 176-193 (a leitura de editParcelasVenc, que hoje NAO
    seleciona `paga`), src/app/(app)/historico/actions.ts linhas 59-73 (parse de
    parcelasVencimento) e 150-175 (deleteMany + createMany com pagasMap).
  </read_first>

  <behavior>
    Comportamento observavel exigido, verificavel abrindo a edicao de uma venda parcelada:
    - Abrir a edicao e nao tocar no campo Parcelas: as datas listadas no dialog sao exatamente as
      do banco. Nenhum recalculo.
    - Subir o campo Parcelas de 2 para 4: o dialog passa a listar 4 linhas e o rotulo do botao
      mostra 4x com a soma batendo no total.
    - Descer de 4 para 2 numa venda sem parcela paga: sobram 2 linhas.
    - Descer abaixo da ultima parcela paga: a lista para no numero da ultima paga e um aviso
      aparece ao lado do botao.
    - O numero exibido no rotulo e o numero de linhas do hidden `parcelasVencimento` sao sempre o
      mesmo (D-04).
  </behavior>

  <action>
    Quatro mudancas, todas dentro do fluxo de edicao do Historico.

    (a) `src/components/edit-parcelas-section.tsx` — a correcao central. Substituir o gatilho
    errado. Hoje a linha 93 passa `disableAutoInit={initialParcelas.length > 0}`: um booleano
    fixo, verdadeiro para toda venda ja parcelada, que faz o useEffect de
    `parcelas-vencimento-form.tsx` retornar cedo e nunca regenerar a lista. Passar a constante
    `true` sempre — a partir daqui a secao e a unica dona da geracao da lista, e o motivo
    original do flag (nao sobrescrever datas ja combinadas com o cliente) continua respeitado.
    Nao remover a prop do `ParcelasVencimentoForm`: `venda-rapida-form-v2.tsx` depende do
    comportamento padrao e esta fora do escopo (D-06).

    Acrescentar `const prevNumeroParcelas = useRef(numeroParcelas)` e um useEffect que retorna
    cedo quando `prevNumeroParcelas.current === numeroParcelas`, atualiza o ref e chama
    `ajustarParcelas` de `@/lib/parcelas-ajuste` com a lista atual, o `numeroParcelas` novo, o
    `valorTotal`, a `dataVenda` e a nova prop `parcelasPagas`. Guardar `minimoPorPagas` num
    estado local para o aviso. Mesmo padrao do `prevTotal` que ja existe na linha 32 — e o
    padrao pedido por D-01.

    Acrescentar tambem um bootstrap de montagem: quando `parcelas.length === 0` e
    `numeroParcelas > 1`, chamar `ajustarParcelas` uma vez para gerar a lista. Sem isso a venda
    antiga sem linhas em `parcelas_vencimento` ficaria sem datas, porque a auto-init do form
    filho passou a estar sempre desligada.

    Trocar o corpo do useEffect de total (linhas 35-49) por uma chamada a `redistribuirValores`,
    mantendo a guarda do `prevTotal`. A regra de arredondamento passa a viver so no modulo.

    (b) Levar a informacao de parcela paga ate a tela. Em `src/app/(app)/historico/page.tsx`
    linha 182, acrescentar `paga: true` ao `select` do `findMany`, e montar ao lado de
    `editParcelasVenc` uma lista `editParcelasPagas` com os `numeroParcela` cujo `paga` e
    verdadeiro. Passar como prop nova `parcelasPagas` para `EditVendaHistoricoForm`, que repassa
    para `EditVendaComParcelas`, que repassa para `EditParcelasSection`. Manter o `paga` FORA do
    estado `parcelas` e fora do JSON do hidden — o formato do payload nao muda.

    (c) `src/components/edit-parcelas-section.tsx`, aviso e rotulo (D-04). Ao lado do botao,
    quando `minimoPorPagas` nao e nulo, renderizar um aviso curto dizendo que a venda ja tem
    parcelas pagas e por isso a lista nao desce abaixo daquele numero. Usar exclusivamente os
    tokens ja empregados em `parcelas-vencimento-form.tsx` linhas 119-124 (`bg-warning-bg`,
    `border-warning/30`, `text-warning-text`); nenhuma cor crua entre colchetes no Tailwind — ha
    trava de CI. Trocar no rotulo do botao o `{numeroParcelas}x` por `{parcelas.length}x`, para
    o rotulo passar a contar as linhas que serao realmente enviadas. Manter o indicador
    `diverge` que ja existe.

    (d) `src/app/(app)/historico/actions.ts`, a guarda de servidor. O layout roda depois da
    action, entao a Server Action destrutiva precisa da propria guarda — o cliente sozinho nao
    protege. Hoje o `findMany` de `parcelaVencimento` com `paga`/`dataPagamento` (linhas 152-155)
    acontece DEPOIS do `prisma.venda.update`: recusar o save nesse ponto deixaria o cabecalho ja
    alterado. Subir essa leitura para logo apos a abertura do `try`, antes do
    `prisma.venda.update`, mantendo-a dentro de um try/catch proprio que devolve lista vazia
    (a tabela pode nao existir em producao antiga — motivo do catch atual na linha 172). Com o
    resultado em maos e apenas quando `parcelasForm.length > 0`: montar um Set com os
    `numeroParcela` do payload e, se alguma parcela com `paga` verdadeiro nao estiver nesse Set,
    devolver `{ success: false, error: "..." }` com uma mensagem que diga quais parcelas pagas
    seriam apagadas. Reaproveitar o mesmo `pagasMap` no bloco de regravacao mais abaixo, em vez
    de reler.

    Acrescentar na mesma guarda a checagem de consistencia entre cabecalho e linhas: quando
    `parcelasForm.length > 0` e difere de `parcelasNum`, recusar o save — e exatamente o estado
    em que a venda 182 foi parar. Antes de adicionar essa segunda checagem, rodar
    `grep -rn "updateVenda" src/ --include=*.tsx --include=*.ts` e confirmar que o unico
    consumidor e o formulario do Historico; se aparecer outro chamador, NAO adicionar a recusa e
    registrar como follow-up no SUMMARY, para nao quebrar um fluxo de terceiro.

    Nao alterar a assinatura nem o formato de retorno de `updateVenda`, e nao renomear nenhum
    `name=` de campo — o parsing depende deles (D-05).
  </action>

  <verify>
    <automated>npx tsc --noEmit && npx vitest run src/__tests__/parcelas-ajuste.test.ts src/__tests__/antecipacao-custo-edicao.test.ts</automated>
    <human-check>Abrir o Historico, editar a venda #210, mudar Parcelas de 3 para 5 e abrir o dialog: devem aparecer 5 linhas, as 3 originais com as datas de antes e 2 novas em meses seguintes; o rotulo do botao deve dizer 5x com a soma igual ao total. Voltar para 3 e conferir que sobram as 3 primeiras. Fechar sem salvar, reabrir a edicao e conferir que as datas continuam as do banco.</human-check>
  </verify>

  <done>
    `grep -n "disableAutoInit" src/components/edit-parcelas-section.tsx` nao mostra mais nenhuma
    comparacao com `initialParcelas.length`. `npx tsc --noEmit` limpo. O teste da Server Action
    ja existente (`antecipacao-custo-edicao.test.ts`) continua passando, provando que o hoist da
    leitura de `parcelaVencimento` nao quebrou o calculo de antecipacao. O SUMMARY registra o
    resultado do grep por outros chamadores de `updateVenda` e se a checagem de consistencia foi
    aplicada ou virou follow-up.
  </done>
</task>

<task type="auto">
  <name>Task 3: agrupar o formulario de edicao em secoes e separar a acao destrutiva (D-05)</name>
  <files>src/components/form-secao-titulo.tsx, src/components/edit-venda-historico-form.tsx, src/components/edit-venda-com-parcelas.tsx, src/__tests__/edit-venda-form-ux.test.ts</files>

  <read_first>
    .claude/skills/shadcn-bfx/SKILL.md (quando usar componente do shadcn e quando usar HTML cru),
    src/components/ui/separator.tsx, src/__tests__/tokens-fundo-neutro.test.ts (formato do
    teste-gate que le o fonte e so usa split/startsWith/includes).
  </read_first>

  <action>
    O formulario e hoje um `grid gap-4 md:grid-cols-3` plano com 12+ campos de assuntos
    diferentes lado a lado, sem nenhum agrupamento. Agrupar sem reestruturar o grid nem tocar em
    nenhum `name=`.

    Criar `src/components/form-secao-titulo.tsx` exportando `FormSecaoTitulo`, que recebe
    `children` e renderiza um item de largura total do grid: `div` com `md:col-span-3 space-y-2
    pt-2 first:pt-0`, dentro um `h3` com `text-xs font-bold uppercase tracking-wider
    text-muted-foreground` e abaixo um `Separator` de `@/components/ui/separator`. Arquivo
    proprio, e nao um export de `edit-venda-historico-form.tsx`, porque
    `edit-venda-com-parcelas.tsx` tambem precisa dele e o import cruzado seria circular.

    Em `edit-venda-historico-form.tsx`, inserir os titulos e reordenar apenas blocos JSX ja
    existentes, sem editar o conteudo dos campos:
    - "Dados da venda" antes de Data da venda e Vendedor.
    - "Produtos" imediatamente antes de `<EditVendaComParcelas>`.
    - "Custos e descontos" antes de Frete ao cliente, Custo de envio e Desconto.
    - "Fiscal e documentos" antes de Com Nota Fiscal, Taxa da Nota e Comprovante Assinado.
    - Mover o bloco de Forma de pagamento para logo depois de `<EditVendaComParcelas>`, ficando
      dentro do grupo de pagamento. E so mudanca de posicao no JSX: a ordem dos campos no
      FormData e irrelevante para o parsing da action.

    Em `edit-venda-com-parcelas.tsx`, renderizar `<FormSecaoTitulo>Pagamento e parcelas</FormSecaoTitulo>`
    entre `<EditVendaItens>` e o campo Parcelas — e o unico ponto onde o titulo pode ficar na
    posicao certa, porque o componente controla os dois lados dessa fronteira.

    Rodape: hoje o submit e o `DeleteVendaButton` dividem a mesma linha via `justify-between`.
    Deixar na primeira linha o submit, o `ReciboDownloadLink` e o botao de boleto; abaixo, um
    `Separator` e uma segunda linha de largura total com o `DeleteVendaButton` alinhado a
    direita, para a acao destrutiva nao ficar encostada no salvar.

    O rotulo do botao de submit (linha ~205) esta com a palavra "alteracoes" sem o acento
    agudo no "o". Corrigir para `Salvar alterações`.

    Legibilidade dos totais: `EditVendaItens` mostra "Total produtos" e `EditParcelasSection`
    mostra o total das parcelas so no rotulo do botao; o alerta de divergencia so existe dentro
    do dialog. Em `edit-parcelas-section.tsx`, ao lado do botao, renderizar em texto pequeno o
    total das parcelas e, quando `diverge` for verdadeiro, uma linha curta dizendo que a soma
    das parcelas difere do total da venda, com os dois valores por `formatBRL`. Usar os mesmos
    tokens de aviso da Task 2.

    Cor exclusivamente por token do design system: nenhuma cor crua entre colchetes no Tailwind e
    nenhum hexadecimal em `style`. Nenhuma dependencia nova. Nenhum `name=` renomeado, nenhum
    campo removido, e o contrato de `updateVenda` intocado (D-05, D-06).

    Criar `src/__tests__/edit-venda-form-ux.test.ts` no formato do teste-gate: le
    `src/components/edit-venda-historico-form.tsx` com `readFileSync` e afirma que o fonte contem
    `Salvar alterações`, que nao contem a grafia sem acento dessa mesma frase, que contem
    `FormSecaoTitulo`, e que nao contem os prefixos de cor crua do Tailwind entre colchetes para
    fundo, texto e borda. Usar so `.includes()` — nada de execucao de regex sobre objeto RegExp.
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/edit-venda-form-ux.test.ts && npx tsc --noEmit</automated>
    <human-check>Abrir a edicao da venda #210: os campos devem aparecer sob os titulos Dados da venda, Produtos, Pagamento e parcelas, Custos e descontos, Fiscal e documentos; o botao de excluir deve estar numa linha propria abaixo do separador; o botao de salvar deve ler "Salvar alterações". Salvar sem alterar nada e conferir que a venda volta identica (round-trip idempotente).</human-check>
  </verify>

  <done>
    Todos os `name=` originais continuam presentes: conferir com
    `grep -c 'name="' src/components/edit-venda-historico-form.tsx` antes e depois, e registrar os
    dois numeros no SUMMARY (o de depois nao pode ser menor). `npx tsc --noEmit` limpo e o novo
    teste-gate passa. Nenhum arquivo da lista de exclusao do orquestrador foi tocado.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| navegador -> Server Action `updateVenda` | O hidden `parcelasVencimento` e JSON controlado pelo cliente; o servidor hoje confia nele para apagar e recriar todas as linhas de `parcelas_vencimento`. |
| Server Action -> Prisma | `deleteMany` + `createMany` sem transacao: uma falha entre os dois deixa a venda sem parcelas. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ddr-01 | Tampering | `updateVenda` — payload `parcelasVencimento` | high | mitigate | Task 2(d): guarda antes do `prisma.venda.update` recusa o save quando o payload nao contem alguma parcela com `paga` verdadeiro. Registro de pagamento nunca e apagado por payload do cliente. |
| T-ddr-02 | Tampering | `updateVenda` — divergencia entre `parcelas` e `parcelasVencimento` | medium | mitigate | Task 2(d): recusa o save quando `parcelasForm.length !== parcelasNum`, o estado inconsistente observado na venda 182. Aplicada apos confirmar por grep que o unico chamador e o form do Historico. |
| T-ddr-03 | Denial of Service | `deleteMany` + `createMany` fora de transacao | low | accept | Fora do escopo travado (D-06 nao inclui refatorar a persistencia). Registrar como follow-up: envolver os dois em `prisma.$transaction`. |
| T-ddr-SC | Tampering | instalacao de pacotes npm | low | accept | Nenhuma dependencia nova neste plano (restricao do CLAUDE.md: `npm install` falha por permissoes). Sem superficie de supply chain. |
</threat_model>

<verification>
1. `npx vitest run src/__tests__/parcelas-ajuste.test.ts src/__tests__/edit-venda-form-ux.test.ts src/__tests__/antecipacao-custo-edicao.test.ts`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `grep -n "initialParcelas.length" src/components/edit-parcelas-section.tsx` nao retorna mais o
   gatilho errado do `disableAutoInit`.
5. Conforme D-07, se algum comando nao subir por ambiente, registrar a saida no SUMMARY e deixar
   o CI ser o gate — nao travar a entrega por isso.
</verification>

<success_criteria>
- Mudar a quantidade de parcelas na edicao de uma venda ja parcelada atualiza a lista de datas de
  vencimento, no dialog e no payload enviado (o defeito relatado pelo Andre).
- Abrir a edicao sem mexer no numero de parcelas nao altera nenhuma data — a regressao que o
  `disableAutoInit` existia para evitar continua evitada.
- Cabecalho (`parcelas`) e linhas (`parcelas_vencimento`) nao podem mais divergir: a tela mantem
  os dois em sincronia e o servidor recusa o payload inconsistente.
- Nenhuma parcela paga e apagada em silencio, nem pela tela nem por payload direto.
- O formulario de edicao esta agrupado em secoes tituladas, com a acao destrutiva separada do
  salvar e o rotulo do submit acentuado.
- Nada fora do escopo travado foi tocado: sem venda-rapida, sem migration, sem schema, sem
  correcao de dados em producao, sem os arquivos reservados a outros agentes.
</success_criteria>

<output>
Criar `.planning/quick/260811-ddr-parcelas-na-edicao-de-venda-e-ux-do-form/260811-ddr-SUMMARY.md` ao terminar.

Registrar obrigatoriamente no SUMMARY:
- A mensagem da falha do teste na fase RED da Task 1 (prova do TDD exigido por D-03).
- Quais comandos de verificacao rodaram de fato e quais falharam por ambiente (D-07).
- O resultado do grep por outros chamadores de `updateVenda` e se a checagem de consistencia
  cabecalho-vs-linhas foi aplicada ou virou follow-up.
- Follow-ups conhecidos: envolver `deleteMany`/`createMany` de parcelas em `prisma.$transaction`
  (T-ddr-03) e corrigir os dados ja inconsistentes em producao, comecando pela venda 182 — esta
  ultima fica com o orquestrador, fora deste plano (D-06).
</output>
