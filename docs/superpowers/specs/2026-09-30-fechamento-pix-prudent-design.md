# Fechamento mensal por empresa, Pix único e boletos Prudent pagos pela BFX

Data: 2026-09-30 · Autor do pedido: André · Design aprovado em sessão de brainstorming, revisado
criticamente pelo Codex (7 ajustes incorporados, marcados **[Codex]**).

## 1. Objetivo

A empresa conveniada passa a fazer **um único Pix por mês** à BFX (no dia configurado, padrão 15).
A BFX recebe, concilia e **ela mesma quita os boletos da Prudent** das parcelas antecipadas. A
empresa não recebe boletos da Prudent. O trabalho do RH vira: conferir um demonstrativo e pagar
um Pix. A antecipação semanal das vendas confirmadas continua.

Uma competência (empresa × mês de vencimento) só aparece **concluída** quando o Pix da empresa,
as parcelas do demonstrativo e os boletos Prudent dessas parcelas estiverem conciliados.

**Regra dura:** a mesma parcela nunca é cobrada duas vezes — pela Prudent à empresa **e** pela
BFX via Pix.

**Pré-requisito externo:** confirmar por escrito com a Prudent o direcionamento da cobrança à BFX.
Até lá, `RegraEmpresa.cobrancaViaBfx` fica desligado em todas as empresas e o fluxo novo só
registra (regras, confirmação, agenda), sem gerar fechamento nem cobrar Pix.

## 2. Decisões de negócio (do André)

| Tema | Decisão |
|---|---|
| Boletos Prudent | 1 boleto por **lote × vencimento**. Lote já é de uma empresa só (`lote-antecipacao-db.ts:80`). Chegam em PDF por e-mail |
| Vencimento | **Varia por empresa** — vira `RegraEmpresa.diaVencimento`. Default = comportamento atual (corte 20, vencimento dia 10) |
| Pix | **Cobrança Pix no Asaas**, confirmada por webhook. Fallback manual em dois passos |
| Confirmação do RH | **Registrada manualmente pela BFX** (sem link público) |
| Cenário de antecipação na Venda Rápida | **Só simulação** — `lucroLiquido` gravado não muda |
| `paga` × `liquidadaEm` | `paga` continua = "o dinheiro desta parcela entrou na BFX" (da Prudent ou da empresa). Novo `liquidadaEm` = "a empresa pagou esta parcela no fechamento" |
| Fechamento | **Por empresa** (não por grupo econômico) |
| Pagamento parcial | Não liquida nenhuma parcela; o saldo fica no fechamento |
| Repasse Ouro Preto | 10% nos 3 primeiros meses, 7% depois — **base e forma de pagamento indefinidas**. Parametrizado; na simulação aparece como "estimado"; nunca entra no valor cobrado; no fechamento, só como ajuste manual justificado |

## 3. Modelo de dados

Todas as migrações são **aditivas** (colunas nulas ou com default, tabelas novas). Nomes Prisma em
camelCase com `@map` snake_case, como o resto do schema.

### 3.1 `RegraEmpresa` (`regras_empresa`)

| Campo | Tipo | Nota |
|---|---|---|
| id | Int | |
| empresaParceiraId | Int FK | Cascade |
| vigenteDe | DateTime (data pura) | inclusive |
| vigenteAte | DateTime? | exclusive; nulo = aberta |
| diaCorte | Int default 20 | venda até este dia → 1º vencimento no mês seguinte; depois → dois meses à frente |
| diaVencimento | Int default 10 | 1–28 |
| diaPix | Int default 15 | 1–28 |
| repassePct | Float? | ex.: 10, 7 |
| repasseBase | String? | `"venda"` (único valor por ora; indefinido pelo negócio) |
| cobrancaViaBfx | Boolean default false | liga o fluxo novo |
| observacao | String? | |
| criadaEm / criadaPor | | |

- Vigências de uma empresa **não podem se sobrepor** (validado no save; função pura).
- `regraVigente(regras, data)` → a regra cuja janela contém a data; sem regra → `REGRA_PADRAO`
  `{ diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, cobrancaViaBfx: false }`.
- A empresa de uma venda é `cliente.empresaParceiraId`. Cliente sem empresa parceira usa
  `REGRA_PADRAO` e não entra em fechamento (bloqueio "cliente sem empresa parceira").

### 3.2 `ParcelaVencimento` — campos novos

| Campo | Tipo | Nota |
|---|---|---|
| enviadaRhEm | DateTime? | gravado pelo consolidado semanal |
| confirmacaoRh | String? | `"confirmada"` \| `"recusada"`; nulo = aguardando |
| confirmacaoOrigem | String? | `"rh"` \| `"legado"` **[Codex]** |
| confirmacaoEm / confirmacaoPor / confirmacaoMotivo | | motivo obrigatório na recusa |
| boletoPrudentId | Int? FK | Restrict |
| fechamentoId | Int? FK | a **reserva**; SetNull |
| liquidadaEm | DateTime? | |
| `@@unique([vendaId, numeroParcela])` | | identificador legível `V{vendaId}-{n}/{total}` |

**[Codex] Antes da unique:** a migração começa com um bloco que conta duplicatas de
`(venda_id, numero_parcela)` e aborta com mensagem clara se houver (em vez de CrashLoop anônimo).
Antes do deploy, a contagem é feita no banco de produção (leitura). A edição de venda passa a
recusar payload com número de parcela repetido.

**[Codex] Edição de venda apaga e recria as parcelas** (`historico/actions.ts:435/476`). O mapa de
preservação por `numeroParcela` passa a carregar também `enviadaRhEm`, `confirmacao*`,
`boletoPrudentId`, `liquidadaEm`. Regras para `fechamentoId`:
- fechamento **em preparação** → a edição **solta a reserva** (não preserva `fechamentoId`); o
  fechamento mostra "parcelas mudaram — atualizar" e o botão recalcula;
- fechamento **conferido ou posterior** → a edição que muda valor/vencimento/quantidade de parcela
  reservada é **recusada** com a mensagem "parcela no fechamento X/AAAA-MM; retire-a pelo
  fechamento antes". Edições que não tocam parcelas continuam permitidas;
- parcela com `boletoPrudentId` → a edição de valor/vencimento dela é recusada (a Prudent já
  emitiu o boleto).

**[Codex] Cancelar/estornar venda** com parcela reservada: fechamento em preparação → solta a
reserva; conferido/enviado → o fechamento vai para `retificacao` com alerta, e só sai de lá com
nova versão (a parcela sai da versão N+1).

### 3.3 `AnticipacaoBatch` — campos novos

`taxaMensal Float?`, `valorLiquidoSolicitado Float?`, `valorAprovado Float?`,
`valorDepositado Float?`, `dataDepositoPrevista DateTime?`, `dataDeposito DateTime?`,
`comprovanteKey String?`, `empresaParceiraId Int?` (preenchido na abertura a partir das parcelas).

### 3.4 `BoletoPrudent` (`boletos_prudent`)

| Campo | Nota |
|---|---|
| loteId FK, empresaParceiraId? | |
| vencimento (data pura) | vencimento contratual = data de vencimento das parcelas agrupadas |
| valorEsperado | soma em centavos dos `valorParcela` das parcelas ligadas |
| valorDocumento?, vencimentoDocumento? | lidos da linha digitável ou digitados |
| linhaDigitavel String? @unique | só dígitos |
| pdfKey? | MinIO |
| direcionamento | `"empresa"` \| `"bfx"` |
| status | `aguardando_documento` → `a_pagar` → `pago_parcial` → `pago`; ou `substituido` / `cancelado` |
| divergenciaJustificativa? | obrigatória se valor/vencimento do documento ≠ esperado |
| substituiId Int? @unique | self FK — o boleto que este substitui |
| criadoEm / atualizadoEm | |

- Índice único **parcial** (SQL cru na migração): um boleto vivo (status fora de
  `substituido`/`cancelado`) por `(lote_id, vencimento)`. **[Codex]**
- Nascem em `concluirLote`, agrupando as parcelas do lote por `dataVencimento`; cada parcela
  recebe `boletoPrudentId`. `direcionamento` = `"bfx"` se a regra vigente da empresa na data do
  vencimento tem `cobrancaViaBfx`, senão `"empresa"`.
- Mudar direcionamento `empresa → bfx` é ação de admin com audit. `bfx → empresa` só se nenhuma
  parcela do boleto estiver em fechamento conferido ou posterior.
- **Substituição:** cria boleto novo com `substituiId`, move as parcelas, marca o original
  `substituido`. O original continua listado.
- **[Codex] Desfazer antecipação** (voltar `antecipada`/`paga` de origem `prudent`) é recusado
  para parcela com `boletoPrudentId`.

### 3.5 `BoletoPagamento` (`boletos_prudent_pagamentos`)

`boletoId` (obrigatório), `dataPagamento`, `valorPrincipal`, `valorEncargos` (juros/multa/diferença,
default 0), `comprovanteKey?`, `comprovanteHash String? @unique` (sha256 do arquivo),
`autenticacao?`, `registradoPor`, `criadoEm`, `estornadoEm?`, `estornadoPor?`.

- Soma do principal não estornado + novo ≤ `valorDocumento ?? valorEsperado` (+R$ 0,01).
- Registro numa transação que atualiza o status do boleto com o status anterior no `where`
  (trava de clique duplo, mesmo padrão de `fecharLote`).
- Pagamento em boleto `substituido`/`cancelado` é recusado.

### 3.6 Fechamento

- **`Fechamento`** (`fechamentos`): `empresaParceiraId`, `competencia` (`"AAAA-MM"`), `status`
  (`em_preparacao` | `conferido` | `enviado` | `pago_parcial` | `pago` | `retificacao`),
  `responsavel`, `versaoAtual` (0 enquanto não conferido), timestamps.
  `@@unique([empresaParceiraId, competencia])`. **"Conciliado" e "concluído" são derivados.**
- **`FechamentoVersao`**: `fechamentoId`, `numero`, `totalBruto`, `totalAjustes`, `totalFinal`,
  `ajustesJson`, `pdfKey?`, `xlsxKey?`, `criadaEm/Por`, `enviadaEm?`. `@@unique([fechamentoId, numero])`.
- **`FechamentoLinha`** (foto da versão): `versaoId`, `parcelaId Int?` (SetNull — a edição de
  venda recria parcelas), `vendaId`, `numeroParcela`, `totalParcelas`, `clienteNome`,
  `matricula?`, `valor`, `vencimento`, `loteId?`, `antecipada`, `boletoPrudentId?`.
- **`FechamentoAjuste`**: `fechamentoId`, `valor` (±), `justificativa` (obrigatória, ≥ 5 chars),
  `criadoPor`, `criadoEm`, `removidoEm?`. Só editável em `em_preparacao`.
- **`CobrancaFechamento`** **[Codex]**: `fechamentoId`, `versaoId`, `asaasPaymentId @unique`
  (identifica cobrança e eventos), `externalReference` (`FEC-{empresaId}-{AAAA-MM}-v{N}`, identifica
  fechamento/versão), `valor`, `vencimento`, `status` (`ativa` | `cancelada` | `paga`),
  `pixCopiaECola?`, `criadaEm`, `canceladaEm?`.
- **`RecebimentoFechamento`**: `fechamentoId` (o recebimento pertence ao **fechamento**, não à
  versão **[Codex]**), `cobrancaId?`, `origem` (`asaas` | `manual`), `valor`, `dataRecebimento`,
  `asaasPaymentId String? @unique`, `endToEndId?` **[Codex]**, `comprovanteKey?`, `status`
  (`pendente` | `confirmado` | `estornado`), `registradoPor`, `confirmadoPor?`, `confirmadoEm?`.
- `EmpresaParceira.asaasCustomerId String?` — cliente Asaas **da empresa**, criado pelo CNPJ
  (integração própria; não reaproveita o cadastro de colaborador) **[Codex]**.

## 4. Ciclo da parcela

```
gerada → enviada ao RH → confirmada (ou recusada) → em lote → antecipada (boleto Prudent)
                                                   ↘ fica com a BFX (não antecipada)
  → reservada no fechamento da competência do vencimento → liquidada pelo Pix
  → [se antecipada] boleto quitado → concluída
```

Etapas derivadas dos campos (função pura `etapaDaParcela`), sem coluna de status nova.

### 4.1 Consolidado semanal e confirmação (Fase 3)

- O envio semanal existente grava `enviadaRhEm = now` nas parcelas das vendas que foram no e-mail
  e ainda não tinham data.
- `/prudent`, aba **"Aguardando RH"**: parcelas com `confirmacaoRh = null`, agrupadas por empresa
  e data de envio. Ações: confirmar (em massa ou por título) e recusar (motivo obrigatório).
  Server actions com `requireAdminOrThrow()` na primeira linha.
- **Gate:** a fila de antecipação só oferece parcela `confirmada`.
- **Legado [Codex]:** migração marca as parcelas existentes com `confirmacaoRh = "confirmada"`,
  `confirmacaoOrigem = "legado"`, `confirmacaoEm = now()`. A tela mostra "legado (sem confirmação
  do RH)" nessas.

### 4.2 Antecipação por parcela (Fase 3)

- `abrirLote` passa a receber `parcelaIds`. A fila deixa desmarcar parcelas de uma venda (3 de 4);
  a seleção padrão continua sendo todas as parcelas elegíveis das vendas marcadas.
- O lote grava `empresaParceiraId`, `taxaMensal`, `valorLiquidoSolicitado` (calculado por
  `calcularAntecipacao`) e `dataDepositoPrevista` (default: data de envio + 2 dias, editável).
- `concluirLote` pede `valorAprovado`, `valorDepositado`, `dataDeposito` e comprovante opcional;
  cria os `BoletoPrudent` (3.4). Continua gravando `antecipada = true` e `paga = true`, origem
  `prudent` — semântica de `paga` inalterada.

## 5. Fechamento e Pix (Fases 5 e 6)

### 5.1 Tela `/fechamento` (admin)

Grade empresa × competência (mês de vencimento) com status, total, situação do Pix e dos boletos.
Só empresas com `cobrancaViaBfx` vigente na competência podem gerar fechamento.

**Gerar/atualizar (em preparação):** reserva (`fechamentoId`) as parcelas da empresa com
vencimento no mês que são **elegíveis** — função pura `elegibilidadeFechamento(parcela)`:

| Motivo de bloqueio | Condição |
|---|---|
| venda inativa | `venda.status ≠ "ativa"` |
| já liquidada | `liquidadaEm ≠ null` |
| em outro fechamento | `fechamentoId ≠ null` e ≠ este |
| recusada pelo RH | `confirmacaoRh = "recusada"` |
| boleto à empresa | antecipada e (sem boleto ou `direcionamento ≠ "bfx"`) |
| paga por outra via **[Codex]** | não antecipada e `paga = true` |
| lote em andamento | `antecipacaoLoteId` com lote `em_andamento` |
| cliente sem empresa parceira | |

Bloqueadas aparecem numa lista separada, com o motivo. A reserva usa `updateMany` com
`fechamentoId: null` no `where` e confere o `count` (corrida entre dois fechamentos).

**[Codex] Reserva vale contra os outros fluxos:** `baixa-parcelas-db` (Asaas), baixa manual e
desfazer-baixa recusam parcela com `fechamentoId ≠ null`. Só o fechamento liquida parcela
reservada.

### 5.2 Status

- `em_preparacao` — edita linhas (atualizar) e ajustes (justificativa obrigatória).
- **Conferir** → cria `FechamentoVersao` N+1 com as linhas (foto), totais, PDF e XLSX no MinIO;
  status `conferido`. Revalida elegibilidade dentro da transação; se algo mudou, recusa e pede
  atualizar.
- **Enviar** → e-mail ao RH (`emailRh`, `emailsExtras`, Cc `emailCopia`) com PDF, XLSX e o Pix
  copia-e-cola; registra `EmailEnvio` (tipo `fechamento`); cria a `CobrancaFechamento` no Asaas
  (PIX, vencimento = `diaPix` da competência, `externalReference`); status `enviado`.
- **Reabrir para corrigir** (de `conferido`, `enviado`, `pago_parcial` ou `retificacao`) → volta a
  `em_preparacao`; na próxima conferência nasce a versão N+1. Ao enviar a N+1, a cobrança ativa
  anterior é cancelada no Asaas **se não estiver paga**. A troca é serializada pelo status da
  cobrança no `where`.
- **[Codex] Pagamento atrasado de cobrança cancelada** entra como recebimento real do fechamento;
  o saldo é recalculado; excedente vira "crédito a resolver" (alerta, sem ação automática).
- Recebido confirmado < `totalFinal` da versão vigente → `pago_parcial` + alerta. ≥ → `pago`:
  todas as parcelas reservadas ganham `liquidadaEm`; as **não antecipadas** ganham também
  `paga = true`, `dataPagamento`, `origemPagamento = "pix_fechamento"`. Excedente → crédito a
  resolver.
- **Conciliado** (derivado) = `pago` ∧ toda linha antecipada tem boleto `pago`.
  **Concluído** = conciliado ∧ nenhuma divergência aberta na conciliação boletos × demonstrativo.

### 5.3 Recebimento

- **Asaas:** a rota `api/webhooks/asaas` desvia para `processarEventoFechamento` quando a
  cobrança (buscada por `payment.id`) tem `externalReference` iniciando em `FEC-` ou existe em
  `CobrancaFechamento` **[Codex]**. `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` → insere
  `RecebimentoFechamento` confirmado (idempotente pelo `asaasPaymentId` único) e recalcula o
  status na mesma transação. `PAYMENT_REFUNDED` → estorna o recebimento e alerta. O caminho de
  baixa de parcela existente não muda.
- **Manual (dois passos):** registrar (valor, data, comprovante) → `pendente`; **Confirmar
  recebimento** (admin, conferiu o extrato) → `confirmado`. Só confirmado conta. Anexar
  comprovante nunca baixa sozinho.

### 5.4 Demonstrativo (PDF e XLSX)

Cabeçalho: empresa, CNPJ, competência, data de corte, vencimento do Pix, responsável, versão.
Linhas: colaborador, matrícula, venda (`V240-3/4`), valor, vencimento original, lote Prudent,
status. Rodapé: total bruto, ajustes (com justificativa), valor final, Pix copia-e-cola / QR.
PDF com `pdf-lib` (padrão de `relatorio-mensal-pdf.ts`); XLSX com a lib já usada nos relatórios.

## 6. Agenda de obrigações, caixa e alertas (Fase 4)

- Tela `/obrigacoes` (admin): boletos Prudent por vencimento, com empresa, lote, parcelas
  cobertas, valor esperado × documento, status, PDF, comprovantes.
- **Linha digitável:** `decodificarLinhaDigitavel` (pura) para boleto bancário de 47 dígitos
  (valida DVs, extrai fator de vencimento e valor). Linha de 48 dígitos (arrecadação/convênio) ou
  que não decodifica → valor e vencimento **digitados à mão** com conferência **[Codex]**.
  Diferença contra o esperado exige justificativa.
- **Conciliação boletos × demonstrativo** (pura) por empresa/competência: soma dos boletos vivos
  das linhas antecipadas × soma das linhas antecipadas do fechamento, listando: parcela antecipada
  sem boleto, boleto com valor ≠ soma das parcelas, parcela coberta por boleto mas fora do
  fechamento (bloqueada).
- **Projeção de caixa** (pura, 60 dias, dia a dia):
  - saídas: boletos vivos não pagos (saldo), na data de vencimento;
  - entradas: Pix esperado de cada fechamento enviado/não pago, no `diaPix` (saldo); recebimentos
    já confirmados não entram (já estão no caixa);
  - **[Codex]** entradas: depósito previsto de lote em andamento (`valorAprovado ??
    valorLiquidoSolicitado`, em `dataDepositoPrevista`);
  - cartões: a pagar **antes** do Pix, a pagar **depois** do Pix, **maior valor a financiar** =
    máximo do acumulado (saídas − entradas), com a data do pico.
- **Alertas** — estendem o cron existente `api/cron/alertas-admin` (já agendado em
  `deploy/bfx/cronjobs-app.yaml`; nenhuma mudança de infra), idempotentes em 20h como os atuais:
  - boleto a pagar vencendo em ≤ 3 dias;
  - boleto `aguardando_documento` a ≤ 5 dias do vencimento;
  - **dia do Pix passou e o fechamento não está `pago`** → notificação a todos os admins **e**
    e-mail para `Config.emailFinanceiro` (campo novo; sem ele, só notificação), com o valor dos
    boletos daquela empresa que a BFX cobre com capital próprio;
  - fechamento em `retificacao`; crédito a resolver.

## 7. Venda Rápida com margem real (Fase 2)

Painel "Resumo da venda" antes de finalizar, alimentado por `simularMargemVenda()` (pura):

- total, parcelas × valor, vencimentos (gerados pela `RegraEmpresa` vigente na data da venda);
- limite do colaborador antes → depois (mesma regra de `checkCredito`, com o corte da regra);
- custo dos produtos, frete, comissão, desconto, taxa da nota;
- antecipação em três cenários: **nenhuma**, **todas menos a última**, **todas**
  (`calcularAntecipacao` — fórmula inalterada);
- repasse: % e valor sobre o total, se houver repasse vigente, rotulado "estimado — regra a
  definir";
- lucro estimado e dinheiro disponível já (líquido Prudent do cenário) por cenário.

Só simulação: nada novo é gravado; `lucroLiquido` e `taxaFinanceiraValor` seguem a regra atual.

Corte e vencimento deixam de ser fixos: `calcularPrimeiroVencimento`, `parcelasDaVendaRapida` e
`checkCredito` passam a receber a regra (default = `REGRA_PADRAO`, idêntico ao código atual).

## 8. Fases

| # | Fase | Depende | Entrega |
|---|---|---|---|
| 1 | Regras por empresa + parcela única | — | `RegraEmpresa`, CRUD na empresa, vencimento/corte pela regra, unique + validação na edição |
| 2 | Venda Rápida com margem real | 1 | painel de resumo |
| 3 | Confirmação RH + lote por parcela + valores do lote | 1 | aba Aguardando RH, gate, `abrirLote(parcelaIds)`, conclusão com depósito, backfill legado |
| 4 | Boletos Prudent, caixa e alertas | 3 | boletos no `concluirLote`, `/obrigacoes`, pagamentos, projeção, alertas, travas de desfazer |
| 5 | Fechamento | 1, 3, 4 | `/fechamento` até `enviado` (sem Asaas), reserva e travas nos outros fluxos, PDF/XLSX, e-mail |
| 6 | Pix Asaas + recebimentos + conciliação | 5 | cobrança por versão, webhook, manual 2 passos, liquidação, conciliado/concluído |

Cada fase: spec desta seção → teste que falha → implementação → review em subagente → commit →
push. Migrações testadas num Postgres local aplicando todas as anteriores.

## 9. Testes

- **Puros (vitest):** `regraVigente` e sobreposição; vencimentos pela regra (inclui default =
  comportamento atual); `simularMargemVenda`; `etapaDaParcela`; `elegibilidadeFechamento`;
  agrupamento de boletos por vencimento; `decodificarLinhaDigitavel` (DVs, fator, valor, 48
  dígitos); status do boleto por pagamentos; status do fechamento por recebimentos; conciliação
  boletos × demonstrativo; projeção de caixa (pico, antes/depois do Pix, depósito de lote).
- **Com Prisma mockado (padrão de `baixa-asaas-db.test.ts`):** reserva com corrida; baixa Asaas e
  manual recusando parcela reservada; edição de venda preservando os campos novos e recusando
  parcela em fechamento conferido; webhook idempotente; pagamento atrasado de cobrança cancelada.
- **Migrações:** Postgres 16 local, todas as migrações em ordem, mais dados de exemplo com
  duplicata para provar que a checagem aborta com mensagem clara.

## 10. Fora de escopo

Conciliação por extrato (OFX); leitura automática do PDF do boleto; repasse pago à parte e
repasse abatido automaticamente no Pix; mudança no DRE; confirmação do RH por link público;
fechamento por grupo econômico; alerta por WhatsApp.

## 11. Ajustes pós-implementação (30/09)

Saídos da revisão final da feature. O que vale é o código; esta seção registra onde ele difere do
texto acima.

- **`retificacao` não foi implementado.** Em vez de levar o fechamento a um status que só sai com
  nova versão, a edição/exclusão de venda e a recusa do RH que tocariam parcela em fechamento
  conferido ou posterior são **recusadas** ("reabra o fechamento e retire-a antes"). O efeito é o
  mesmo — a parcela só sai na versão N+1 — sem um sexto status, sem alerta próprio e sem estado
  que trave o envio. O status e o alerta "fechamento em retificação" de §5.2 e §6 ficam fora.
- **Vigência no dia 1º.** `vigenteDe` e `vigenteAte` de `RegraEmpresa` só aceitam o dia 1º. O
  fechamento e o direcionamento do boleto Prudent leem a regra do **dia 1º da competência** (antes o
  boleto lia a do dia do vencimento). Salvar ou excluir regra que troque a cobrança via BFX de um
  mês com boleto BFX vivo ou fechamento conferido ou posterior da empresa é recusado.
- **Forma que não é desconto em folha fica fora.** Novo motivo de bloqueio `forma_nao_folha`
  ("Venda não é desconto em folha"); a busca do fechamento usa a forma de `WHERE_VENDA_ANTECIPAVEL`
  (a da fila da Prudent), sem filtrar o status. Cobrança Asaas paga em parcela reservada não baixa a
  parcela e gera alerta aos admins, uma vez por cobrança.
- **Reabrir encerra o Pix.** Reabrir (depois de gravar o status, fora da transação) encerra a
  cobrança ativa: paga vira recebimento, senão é cancelada no Asaas; falha vira aviso e alerta.
  Depois de recebimento confirmado, estorno ou webhook, a cobrança acompanha o saldo: pago → o Pix
  que sobrou é cancelado; saldo restante → novo Pix pelo saldo (sem Asaas: alerta). Parcela de
  versão já enviada, com Pix ativo ou recebimento confirmado no fechamento, não perde a reserva por
  edição/exclusão de venda nem tem o boleto devolvido à empresa.
- **Cancelar boleto.** Ação de admin em `/obrigacoes`: boleto vivo, sem pagamento vivo e sem parcela
  em fechamento conferido ou posterior → `cancelado`, parcelas sem boleto, motivo no audit. Depois
  disso a antecipação pode ser desfeita pela baixa (lote concluído por engano).
- Menores: reserva exige `antecipacaoLoteId: null` na parcela não antecipada; recusa do RH respeita o
  fechamento; parcela `pix_fechamento` conta como descontada em folha e aparece como "Pago no
  fechamento" sem "Desfazer"; o CSV da Prudent é baixado do lote já gravado (`?loteId=`).
