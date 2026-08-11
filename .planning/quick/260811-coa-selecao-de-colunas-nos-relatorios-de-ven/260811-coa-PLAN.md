---
phase: quick-260811-coa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/relatorio-vendas-colunas.ts
  - src/__tests__/relatorio-vendas-colunas.test.ts
  - src/app/api/relatorios/vendas/route.ts
  - src/app/api/relatorios/vendas/pdf/route.ts
  - src/components/report-buttons-client.tsx
autonomous: true
requirements: [QT-260811-coa]

estimate:
  tokens: 96000
  raw_tokens: 48000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Na tela /relatorios o usuario escolhe quais colunas saem no relatorio de vendas, e o CSV baixado contem exatamente essas colunas na ordem canonica (D-03, D-04, D-05)"
    - "O PDF baixado contem exatamente as colunas escolhidas, com larguras calculadas a partir da selecao e sem texto sobreposto (D-02, D-04)"
    - "As colunas pedidas pelo dono existem e trazem valor real: empresa, matricula, nome, Margem %, Margem consignavel, valor total, parcelas, forma de pagamento (D-01)"
    - "Um link antigo sem o parametro colunas (Exportacao Rapida por empresa, link salvo) continua produzindo exatamente o relatorio de hoje (D-03)"
    - "Desmarcar todas as colunas desabilita os dois botoes de download (D-05)"
    - "Margem % e Margem consignavel nao saem no relatorio quando quem baixa nao e admin (T-QT-01)"
    - "O PDF passa a exibir a data da venda em UTC, igual ao CSV e ao /historico (regressao d9064ee)"
  artifacts:
    - "src/lib/relatorio-vendas-colunas.ts — catalogo unico compartilhado por CSV e PDF (D-02)"
    - "src/__tests__/relatorio-vendas-colunas.test.ts — suite TDD do catalogo e do parser (D-07)"
    - "src/app/api/relatorios/vendas/route.ts — CSV derivado do catalogo"
    - "src/app/api/relatorios/vendas/pdf/route.ts — PDF com layout calculado a partir da selecao"
    - "src/components/report-buttons-client.tsx — seletor de colunas com Popover + Checkbox"
  key_links:
    - "ReportButtonsClient.buildUrl -> query string ?colunas= -> resolverColunas() nos dois endpoints (contrato da URL, D-03)"
    - "COLUNAS_VENDAS (ordem canonica) -> cabecalhoCsv() + calcularLayoutPdf() (fonte unica de ordem, D-04)"
    - "margemPct -> margemVenda() -> exige itens.custoProduto no select do Prisma, senao retorna null sempre"
    - "margemConsignavel -> cliente.renda no select do Prisma, senao retorna null sempre"
    - "filtrarColunasPorPerfil() -> getSession().role — o middleware autentica /api mas nao autoriza por perfil"
---

<objective>
Permitir que o usuario escolha, na tela `/relatorios`, quais colunas saem no relatorio de vendas
exportado em CSV e em PDF.

Purpose: o dono pede colunas que hoje nao existem no relatorio (empresa, margem) e nao tem como
tirar as que nao usa. Hoje as duas rotas tem lista de colunas fixa e duplicada, e o PDF tem
posicoes X literais — nenhum dos dois aceita selecao.

Output: um catalogo unico de colunas em `src/lib/`, os dois endpoints derivando cabecalho, celulas
e layout desse catalogo, e um seletor de colunas na tela.
</objective>

<execution_context>
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/workflows/execute-plan.md
@/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.claude/skills/shadcn-bfx/SKILL.md
@src/lib/venda-utils.ts
@src/lib/forma-pagamento.ts
@src/lib/periodo-data.ts
@src/lib/data-pura.ts
@src/app/api/relatorios/vendas/route.ts
@src/app/api/relatorios/vendas/pdf/route.ts
@src/components/report-buttons-client.tsx
@src/__tests__/relatorio-mensal.test.ts
</context>

<scope_boundary>
## O que fica de fora, e por que

**`/api/relatorios/vendas-xlsx` NAO entra nesta task.** D-06 condicionava o XLSX a "se ele for
alcancavel pela UI". Verificado com grep: o unico call site e
`src/app/(app)/historico/page.tsx:211` — ou seja, ele e alcancavel pela tela `/historico`, **nao**
pela tela `/relatorios` que e o objeto deste pedido. Alem disso a ordem de colunas de hoje dele
(Cliente, Data, Vendedor, Produtos, Qtd, ...) **nao** e uma subsequencia da ordem canonica definida
abaixo, entao adotar D-04 la mudaria o layout da planilha que o `/historico` ja entrega hoje —
mudanca de comportamento numa tela fora do escopo. O catalogo desta task ja inclui as keys `qtd` e
`status` justamente para que o XLSX possa adotar o mesmo catalogo depois, sem alterar o modulo.
Registrar isso no SUMMARY como candidato de follow-up.

**Tambem fora:** relatorios mensais, inadimplencia, margem-produto, catalogo, antecipacao, comissoes
(D-06). E a protecao contra formula injection em CSV (valor comecando com `=`, `+`, `-`, `@`) —
e uma exposicao pre-existente que este plano nao piora nem melhora; registrada em `<threat_model>`
como aceita.
</scope_boundary>

<design_notes>
## Como D-03 e D-04 convivem sem conflito

D-03 exige que sem `colunas` a saida seja exatamente a de hoje. D-04 exige ordem canonica sempre.
Isso so nao conflita porque a ordem canonica foi escolhida de forma que **o conjunto padrao de hoje
seja uma subsequencia dela**: `matricula, nome, produtos, vendedor, data, valorTotal, parcelas,
formaPagamento` aparece nessa mesma ordem relativa em `COLUNAS_VENDAS`. Logo existe **uma unica
regra de ordenacao** (a canonica) e ela ja reproduz o padrao de hoje. Nao criar segunda regra de
ordem para o caso default.

## Pesos do PDF vieram das larguras atuais

As posicoes de hoje (`40, 95, 200, 360, 470, 555, 645, 685` em pagina de 842pt) implicam larguras
`55, 105, 160, 110, 85, 90, 40, 117`, somando 762 = largura util (842 - 2 x 40). Os `pesoPdf` da
tabela abaixo sao essas larguras em unidades relativas, entao **com a selecao padrao o layout
calculado reproduz o layout de hoje dentro de ~2pt**. Nao inventar outros pesos.
</design_notes>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Catalogo de colunas + parser de `colunas`, com CSV ligado de ponta a ponta</name>

  <files>
    src/__tests__/relatorio-vendas-colunas.test.ts (novo)
    src/lib/relatorio-vendas-colunas.ts (novo)
    src/app/api/relatorios/vendas/route.ts
  </files>

  <behavior>
  Escrever o teste PRIMEIRO (CLAUDE.md passo 2), rodar, ver falhar (o modulo nao existe), commitar
  como `test(...)`, e so entao implementar. Casos minimos obrigatorios:

  - `resolverColunas(null)`, `resolverColunas("")` e `resolverColunas("   ")` devolvem exatamente
    `COLUNAS_PADRAO`, nessa ordem (D-03).
  - `resolverColunas("banana,foo")` — nenhuma key valida — tambem devolve `COLUNAS_PADRAO`.
  - `resolverColunas("nome,banana,empresa")` devolve `["empresa","nome"]`: key desconhecida
    descartada e resultado em ordem canonica, **nao** na ordem em que o usuario digitou (D-03, D-04).
  - `resolverColunas("nome,nome,empresa")` deduplica.
  - `cabecalhoCsv(resolverColunas(null))` e exatamente
    `Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas,Pagamento` — byte a byte igual ao header
    de hoje (D-03).
  - Os `labelCurto` do conjunto padrao sao exatamente
    `["Mat.","Nome","Produtos","Vendedor","Data","Valor","Parc.","Pagto."]`.
  - `margemPct` com venda que tem `itens[].custoProduto > 0` devolve o percentual de lucro bruto;
    venda sem dado de custo devolve `null`, que vira `""` no CSV e `—` no PDF (D-01).
  - `margemConsignavel` com `cliente.renda = 3000` devolve `900`; com `renda` ausente devolve `null`
    e vira `—` (D-01).
  - `linhaCsv` envolve em aspas e escapa um nome de cliente que contenha virgula.
  - Celula de `data` a partir de um `Date` de meia-noite UTC formata o MESMO dia do calendario
    (guarda de regressao do commit d9064ee).
  - `filtrarColunasPorPerfil(COLUNAS_VENDAS, false)` remove `margemPct` e `margemConsignavel`;
    com `true` mantem as duas.
  </behavior>

  <action>
  Criar `src/lib/relatorio-vendas-colunas.ts` como a UNICA fonte de verdade de colunas do relatorio
  de vendas (D-02). Sem import de `@/lib/db`, de `@prisma/client` nem de qualquer coisa server-only:
  o modulo tambem e importado pelo componente client da Task 3. Tipar a venda de forma estrutural
  (interface local `VendaRelatorio` com os campos usados), nao pelo tipo gerado do Prisma.

  Exportar `COLUNAS_VENDAS` — array ORDENADO, e essa ordem e a ordem canonica de D-04:

  | # | key | label (CSV) | labelCurto (PDF) | tipo | pesoPdf | valor(v) |
  |---|-----|-------------|------------------|------|---------|----------|
  | 1 | empresa | Empresa | Empresa | texto | 22 | `cliente?.empresa ?? ""` |
  | 2 | matricula | Matricula | Mat. | texto | 11 | `cliente?.matricula ?? ""` |
  | 3 | nome | Nome | Nome | texto | 21 | `cliente?.nome ?? "N/D"` |
  | 4 | produtos | Produtos | Produtos | texto | 32 | `produtosTexto(v)` |
  | 5 | qtd | Qtd | Qtd | numero | 8 | `quantidadeTotal(v)` |
  | 6 | vendedor | Vendedor | Vendedor | texto | 22 | `v.vendedor ?? ""` |
  | 7 | data | Data | Data | data | 17 | `v.dataVenda` (o Date cru) |
  | 8 | valorTotal | Valor | Valor | moeda | 18 | `valorTotalVenda(v)` |
  | 9 | parcelas | Parcelas | Parc. | numero | 8 | `v.parcelas ?? 1` |
  | 10 | formaPagamento | Pagamento | Pagto. | texto | 23 | `formaPagamentoLabel(forma)` |
  | 11 | status | Status | Status | texto | 14 | `v.status ?? ""` |
  | 12 | margemPct | Margem % | Margem | percentual | 14 | `margemVenda(v)` |
  | 13 | margemConsignavel | Margem consignavel | M.consig. | moeda | 20 | `renda != null ? renda * 0.3 : null` |

  `valor()` devolve o valor CRU (`string | number | Date | null`) — quem formata e o renderizador de
  cada formato. Duas excecoes por coluna, ambas opcionais na interface: `sufixoPdf` (a coluna
  `parcelas` usa `"x"`, para o PDF continuar imprimindo `3x` como hoje) e `valorPdf(v)` (a coluna
  `formaPagamento` usa a versao compacta). Mover para dentro deste modulo a funcao
  `formaPagamentoLabelCurto` que hoje vive na rota do PDF, e derivar a forma com
  `v.formaPagamento ?? formaFromLegacyFlags(...)` exatamente como as duas rotas ja fazem.
  Exportar tambem `MARGEM_CONSIGNAVEL_FATOR = 0.3`, com comentario apontando que a mesma regra vive
  em `src/app/api/clientes/[id]/limite/route.ts`.

  Exportar `COLUNAS_PADRAO` = as 8 keys `matricula, nome, produtos, vendedor, data, valorTotal,
  parcelas, formaPagamento` (D-03).

  Exportar `resolverColunas(param)`: separa por virgula com `.split(",")`, faz trim, descarta key
  desconhecida, deduplica, e devolve as entradas do catalogo na ordem de `COLUNAS_VENDAS` (D-04).
  Param ausente, vazio, so espaco, ou sem nenhuma key valida cai no padrao (D-03). Nao usar
  `RegExp.exec` em lugar nenhum deste plano — o hook de seguranca do projeto bloqueia esse padrao.

  Exportar `COLUNAS_SENSIVEIS = ["margemPct","margemConsignavel"]` e
  `filtrarColunasPorPerfil(colunas, ehAdmin)`, que remove as sensiveis quando `ehAdmin` e falso.
  Isso fecha T-QT-01: o middleware protege `/api/*` mas so verifica autenticacao, nunca perfil —
  sem esse filtro qualquer vendedor logado leria custo e renda pela query string.

  Renderizadores CSV, tambem neste modulo: `cabecalhoCsv(colunas)` junta os `label` com virgula;
  `linhaCsv(colunas, venda)` formata cada celula — `data` vira `toISOString().slice(0,10)` (formato
  de hoje, ja UTC), `moeda` e `numero` viram o numero cru sem simbolo (formato de hoje, para o Excel
  somar), `percentual` vira o numero com uma casa decimal, `null` vira string vazia, e `texto` recebe
  aspas apenas quando contiver virgula, aspas ou quebra de linha, dobrando as aspas internas
  (RFC 4180). Hoje as colunas Produtos e Pagamento sao SEMPRE citadas e Nome NUNCA e — o que quebra
  a linha inteira quando o cliente tem virgula no nome. O quoting condicional corrige esse bug e
  mantem o header identico; anotar isso no SUMMARY como mudanca deliberada de comportamento.

  Renderizador de celula do PDF, tambem neste modulo, `celulaPdf(coluna, venda)`: usa `valorPdf`
  quando existir; `data` usa `formatarDataPura` de `@/lib/data-pura`; `moeda` usa `formatBRL`;
  `percentual` mostra uma casa decimal com virgula decimal e `%`; `numero` concatena `sufixoPdf`;
  `null` e string vazia viram `—`.

  Por fim, reescrever `src/app/api/relatorios/vendas/route.ts` para derivar tudo do catalogo:
  ler `searchParams.get("colunas")`, resolver, aplicar `filtrarColunasPorPerfil` com
  `(await getSession())?.role === "admin"`, e montar o CSV com `cabecalhoCsv` + `linhaCsv`. Manter
  intactos o filtro de empresa e o `resolverPeriodo` que ja estao la. **Ampliar o select do Prisma**
  ou as colunas novas nascem sempre vazias: `cliente` passa a incluir `renda`, e `itens` passa a
  incluir `custoProduto` — sem `custoProduto` a funcao `margemVenda` devolve `null` para toda venda
  e a coluna de margem fica inutil. O `include` de `venda` ja traz todos os escalares
  (`status`, `desconto`, `valorFrete`, `valorVenda`, `quantidade`), nao precisa mexer.

  Commitar em dois commits: `test(relatorios): ...` (RED) e `feat(relatorios): ...` (GREEN).
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/relatorio-vendas-colunas.test.ts --reporter=verbose; npx tsc --noEmit</automated>
    <note>Os testes nao rodam nesta maquina (D-08) — o CI e o gate real. Se o vitest falhar por
    ambiente (modulo nativo, permissao em node_modules), registrar a saida no SUMMARY e seguir.
    `npx tsc --noEmit` NAO tem essa tolerancia: precisa passar limpo antes do commit GREEN.</note>
  </verify>

  <done>
  `src/lib/relatorio-vendas-colunas.ts` existe com as 13 colunas na ordem da tabela acima;
  `grep -q "resolverColunas" src/app/api/relatorios/vendas/route.ts` e
  `grep -q "custoProduto" src/app/api/relatorios/vendas/route.ts` e
  `grep -q "renda" src/app/api/relatorios/vendas/route.ts` retornam sucesso;
  `npx tsc --noEmit` passa; o commit RED precede o GREEN no historico.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: PDF com layout calculado a partir das colunas escolhidas</name>

  <files>
    src/__tests__/relatorio-vendas-colunas.test.ts
    src/lib/relatorio-vendas-colunas.ts
    src/app/api/relatorios/vendas/pdf/route.ts
  </files>

  <behavior>
  Acrescentar a suite da Task 1, antes de implementar:

  - `calcularLayoutPdf(resolverColunas(null), 40, 762)` devolve 8 faixas: a primeira comeca em
    x = 40, os `x` sao estritamente crescentes, nenhuma faixa invade a seguinte, e
    `ultima.x + ultima.largura` nao passa de 802.
  - Com a selecao padrao, as larguras batem com as de hoje (55, 105, 160, 110, 85, 90, 40, 117)
    dentro de 2pt de tolerancia — e a prova de que o PDF padrao nao mudou.
  - `calcularLayoutPdf` com UMA coluna so devolve uma faixa ocupando a largura util inteira.
  - `calcularLayoutPdf` com as 13 colunas ainda cabe: soma das larguras <= 762 e nenhuma largura
    e negativa ou zero.
  - `truncarParaLargura(texto, larguraMax, medir)` com um medidor falso de 5pt por caractere corta
    para o maior prefixo que cabe, e devolve o texto inteiro quando ja cabe.
  </behavior>

  <action>
  Acrescentar ao catalogo duas funcoes puras (ficam testaveis sem carregar o pdf-lib):

  `calcularLayoutPdf(colunas, xInicio, larguraUtil)` devolve `{ coluna, x, largura }[]`. A largura de
  cada coluna e `larguraUtil * pesoPdf / somaDosPesosSelecionados`, e o `x` e o acumulado a partir de
  `xInicio`. E isso que substitui o array de posicoes literais que a rota tem hoje — com colunas
  selecionaveis nao existe posicao fixa que sirva.

  `truncarParaLargura(texto, larguraMax, medir)` recebe a funcao de medicao por injecao (a rota passa
  `(t) => font.widthOfTextAtSize(t, 8)`) e devolve o maior prefixo cuja medida cabe. Sem elipse, para
  nao arriscar caractere fora do WinAnsi da Helvetica. Isso substitui os `substring()` de tamanho
  fixo, que so funcionavam porque as larguras eram constantes.

  Reescrever `src/app/api/relatorios/vendas/pdf/route.ts`:

  1. Resolver as colunas igual a Task 1 (`resolverColunas` + `filtrarColunasPorPerfil` com o perfil
     da sessao) e calcular o layout com `xInicio = 40` e `larguraUtil = width - 80`.
  2. Cabecalho da tabela: desenhar `labelCurto` de cada faixa em `layout[i].x`, truncado pela largura
     da faixa menos 4pt de calha, com `fontBold` em 9.
  3. Linhas: para cada venda e cada faixa, `celulaPdf(coluna, venda)` truncado pela largura da faixa
     menos 4pt, desenhado em `layout[i].x` com `font` em 8.
  4. **Corrigir o periodo**: trocar o parse local `new Date(from + "T00:00:00")` /
     `new Date(to + "T23:59:59")` por `resolverPeriodo(from, to)` de `@/lib/periodo-data`, e o filtro
     do Prisma de `lte: end` para `lt: fimExclusivo` — o fim de `resolverPeriodo` e EXCLUSIVO. E o
     mesmo bug de data um dia antes corrigido no commit d9064ee, que sobreviveu nesta rota. No texto
     "Periodo: X ate Y" do cabecalho, mostrar o fim INCLUSIVO: `fimInclusivoParaInput(fimExclusivo)`
     passado por `formatarDataPura`, e o inicio por `formatarDataPura` tambem — trocar o
     `formatDateBR` de `@/lib/utils`, que formata no fuso local e em America/Manaus mostra o dia
     anterior.
  5. **Ampliar o select do Prisma** pelo mesmo motivo da Task 1: `cliente` ganha `renda`, `itens`
     ganha `custoProduto`.
  6. Manter o retangulo de cabecalho, o rodape de TOTAL DO PERIODO, o `Vendas: N` e o comportamento
     de quebra de pagina como estao — nao e escopo desta task melhora-los.

  Commitar RED e GREEN separados, como na Task 1.
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/relatorio-vendas-colunas.test.ts --reporter=verbose; npx tsc --noEmit; grep -q "calcularLayoutPdf" src/app/api/relatorios/vendas/pdf/route.ts && grep -q "resolverPeriodo" src/app/api/relatorios/vendas/pdf/route.ts && echo "PDF ligado ao catalogo e ao periodo UTC"</automated>
    <note>Mesma tolerancia da Task 1 quanto ao runner; `tsc` e o grep sao obrigatorios.</note>
  </verify>

  <done>
  A rota do PDF nao tem mais nenhuma posicao de coluna escrita a mao — toda posicao vem de
  `calcularLayoutPdf`, e todo corte de texto vem de `truncarParaLargura`. O periodo e resolvido por
  `resolverPeriodo` com limite superior exclusivo. `npx tsc --noEmit` passa.
  </done>
</task>

<task type="auto">
  <name>Task 3: Seletor de colunas na tela /relatorios</name>

  <files>
    src/components/report-buttons-client.tsx
  </files>

  <action>
  Acrescentar o seletor de colunas ao `ReportButtonsClient`, ao lado dos filtros que ja existem
  (D-05). Importar `COLUNAS_VENDAS` e `COLUNAS_PADRAO` do catalogo criado na Task 1 — o componente
  usa so `key` e `label`, e nada no modulo e server-only, entao o import e seguro no client.

  Estado novo: `colunas`, inicializado com `COLUNAS_PADRAO`.

  Usar os componentes shadcn/ui que o projeto ja tem, nunca HTML cru (skill `shadcn-bfx`):
  `Popover` + `PopoverTrigger` + `PopoverContent` de `@/components/ui/popover`, `Button` como
  gatilho (variant `outline`) rotulado com a contagem atual, por exemplo `Colunas (8)`, e um
  `Checkbox` de `@/components/ui/checkbox` com um `Label` clicavel por coluna do catalogo. Como sao
  13 itens, envolver a lista num `ScrollArea` de `@/components/ui/scroll-area` com altura limitada em
  vez de deixar o popover crescer alem da viewport. Dentro do popover, dois botoes `ghost` de
  tamanho `sm`: "Todas" (seleciona todas as keys) e "Padrao" (volta para `COLUNAS_PADRAO`).

  Toda cor tem que vir de token semantico — classe de cor crua do Tailwind reprova o build na catraca
  de CI. Para texto auxiliar usar `text-muted-foreground`, que ja e o padrao do arquivo.

  Em `buildUrl`, acrescentar `params.set("colunas", colunas.join(","))` quando houver ao menos uma
  coluna marcada. Os links de "Exportacao Rapida (PDF)" renderizados no servidor em
  `src/app/(app)/relatorios/page.tsx` continuam sem o parametro e por isso continuam caindo no
  conjunto padrao — e exatamente a garantia de D-03, entao **nao** alterar aquele arquivo.

  Estado vazio (a escolha exigida por D-05): quando `colunas.length === 0`, desabilitar os dois
  botoes de download com `disabled` e mostrar uma linha de ajuda em `text-muted-foreground` dizendo
  que e preciso escolher ao menos uma coluna. Desabilitar da retorno visivel; voltar ao padrao em
  silencio faria o usuario baixar um relatorio que ele nao pediu.

  Depois de implementar, cumprir o passo 4 do fluxo do CLAUDE.md: disparar subagente de review sobre
  o diff completo das tres tasks (Agent tool, nao inline) e aplicar os findings confirmados antes do
  commit final.
  </action>

  <verify>
    <automated>npx tsc --noEmit; npx eslint src/components/report-buttons-client.tsx src/lib/relatorio-vendas-colunas.ts; npm run cores:check</automated>
    <human-check>Abrir /relatorios como admin. Baixar CSV sem tocar no seletor e conferir que o header e `Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas,Pagamento`. Marcar so Empresa, Nome, Margem % e Valor e baixar CSV e PDF: as duas saidas trazem so essas 4 colunas, nessa ordem, e no PDF nenhuma coluna invade a vizinha. Desmarcar tudo e conferir que os dois botoes ficam desabilitados. Clicar num botao de "Exportacao Rapida (PDF)" e conferir que o PDF sai com as 8 colunas de sempre e com a data correta (nao um dia antes).</human-check>
  </verify>

  <done>
  O seletor aparece na tela, monta `?colunas=` na URL dos dois downloads, desabilita os botoes quando
  nada esta marcado, e usa Popover/Checkbox/ScrollArea/Button do `src/components/ui/` sem nenhum
  elemento HTML cru equivalente. `npx tsc --noEmit`, `npx eslint` nos arquivos tocados e
  `npm run cores:check` passam. O review por subagente foi executado e os findings confirmados foram
  aplicados.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| navegador -> `GET /api/relatorios/vendas` e `/pdf` | query string controlada pelo usuario atravessa aqui; o middleware autentica mas nao autoriza por perfil |
| banco -> arquivo exportado | nome de cliente e de produto entram sem sanitizacao no CSV e no XML do PDF |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QT-01 | Information Disclosure | `GET /api/relatorios/vendas[/pdf]?colunas=margemPct,margemConsignavel` | high | mitigate | `filtrarColunasPorPerfil()` remove as duas colunas quando `getSession()?.role !== "admin"`. A pagina `/relatorios` e `requireAdmin()`, mas `middleware.ts` so faz `jwtVerify` — qualquer vendedor logado alcancaria custo (margem bruta) e renda do cliente montando a URL na mao |
| T-QT-02 | Tampering | parametro `colunas` da query string | medium | mitigate | allowlist estrita em `resolverColunas`: so passa key presente em `COLUNAS_VENDAS`; nenhuma key do usuario e interpolada em SQL, em XML, em nome de campo do Prisma nem em nome de arquivo |
| T-QT-03 | Tampering | linha do CSV com nome de cliente contendo virgula ou aspas | medium | mitigate | `linhaCsv` aplica quoting RFC 4180 condicional com aspas duplicadas; hoje `Nome` sai sem aspas e uma virgula no nome desloca todas as colunas seguintes |
| T-QT-04 | Information Disclosure | formula injection no CSV (valor iniciado por `=`, `+`, `-`, `@`) | medium | accept | exposicao pre-existente, identica antes e depois desta task; corrigir mudaria o conteudo das celulas de todos os relatorios e esta fora do escopo travado (D-06). Registrar como follow-up no SUMMARY |
| T-QT-SC | Tampering | instalacoes npm/pip/cargo | low | accept | nenhum pacote novo: o CLAUDE.md proibe instalar, e o catalogo usa apenas `venda-utils`, `forma-pagamento`, `periodo-data`, `data-pura` e `utils`, todos ja no repo. Sem instalacao, nao ha superficie de supply chain nesta task |
</threat_model>

<verification>
1. `npx tsc --noEmit` limpo (gate local obrigatorio — os testes nao rodam nesta maquina, D-08).
2. `npx eslint` limpo nos arquivos tocados; `npm run cores:check` sem cor crua nova.
3. `npx vitest run src/__tests__/relatorio-vendas-colunas.test.ts` — resultado registrado no SUMMARY;
   falha por ambiente nao bloqueia, falha de asserção bloqueia. O CI e o gate real.
4. Historico do git mostra commit `test(...)` antes do `feat(...)` correspondente em cada task
   com `tdd="true"` (CLAUDE.md passo 2).
5. Review por subagente executado sobre o diff completo, findings confirmados aplicados
   (CLAUDE.md passo 4).
6. UAT manual da Task 3 executado.
</verification>

<success_criteria>
- O usuario escolhe colunas em `/relatorios` e o CSV e o PDF saem com exatamente essas colunas, em
  ordem canonica.
- As colunas pedidas pelo dono existem: empresa, matricula, nome, Margem %, Margem consignavel,
  valor total, parcelas, forma de pagamento — mais produtos, qtd, vendedor, data e status.
- Link sem `colunas` (Exportacao Rapida, link salvo) produz o relatorio de hoje, header do CSV
  byte a byte igual.
- Nenhuma lista de colunas duplicada: os dois endpoints derivam de `COLUNAS_VENDAS`.
- Nenhuma posicao X escrita a mao no PDF; layout calculado a partir da selecao.
- Nao-admin nao consegue extrair margem nem renda pela query string.
- PDF passa a exibir a data da venda em UTC.
- Tudo commitado e enviado ao remoto (CLAUDE.md: nunca deixar mudanca so local).
</success_criteria>

<output>
Create `.planning/quick/260811-coa-selecao-de-colunas-nos-relatorios-de-ven/260811-coa-SUMMARY.md` when done.

Registrar no SUMMARY, alem do padrao:
- o resultado (ou a falha de ambiente) do `npx vitest run`;
- o quoting condicional do CSV como mudanca deliberada de comportamento;
- o follow-up do `vendas-xlsx` do `/historico` adotar o mesmo catalogo;
- o follow-up de formula injection no CSV (T-QT-04).
</output>
