# Baixa de parcelas pagas — Asaas, Prudent e manual

Data: 2026-09-16. Pedido do André: "do Asaas e da Prudent, mas pode ser manual se precisar".
Decisão Prudent: **antecipada = paga** (opção A). Plano revisado pelo Grok (parecer no fim).

## Estado atual (produção, VKE, 16/09)

- `parcelas_vencimento.paga` / `data_pagamento` existem e **nenhum fluxo grava** (0 de 547).
- Desconto em folha: 454 parcelas. Por flag da venda × parcela: flag 0 → 180 abertas; flag 1
  (antecipada inteira) → 164 marcadas + 41 só no cabeçalho; flag 3 (parcial) → 47 marcadas + 22
  abertas. `antecipacao_batches` vazio (datas das antecipações antigas desconhecidas).
- Boleto: 85 parcelas (67 vencidas). Asaas em produção; boleto criado como parcelamento com
  `externalReference = venda.id`; só 9 vendas com `asaas_payment_id`. **Sem webhook.**
- Parcela duplicada por (venda, número): vendas 51, 52, 53 → sem índice único possível agora.
- 11 rotas `/api/cron/*` autenticam com `if (cronSecret && header !== ...)`: **passam se o
  segredo estiver vazio**. `CRON_SECRET` está definido no pod.
- CronJobs agendados (GitOps, outro dono): `bfx-parcela-vencida` roda 12:00 UTC diário.

## Decisões

### Modelo (migração)

`parcelas_vencimento`: `origem_pagamento` TEXT (`asaas` | `prudent` | `manual`),
`asaas_payment_id` TEXT **único** (uma cobrança quita no máximo uma parcela), `baixa_por` TEXT.
`config.asaas_webhook_token` TEXT. `paga` + `data_pagamento` seguem como fonte da verdade.

### Asaas

- Regra pura `decidirBaixaAsaas(pagamento, parcelas)` sobre o **status atual** da cobrança (não
  sobre o evento): `RECEIVED`, `CONFIRMED`, `RECEIVED_IN_CASH`, `DUNNING_RECEIVED` → baixa; qualquer
  outro status ou `deleted` → desfaz **só** baixa `origem = asaas` com o mesmo `asaas_payment_id`.
  Nunca pisa baixa `manual`/`prudent`. Casamento: `externalReference` = venda (ativa);
  `installmentNumber` = número; sem parcelamento → parcela 1; parcelamento sem número → ignora.
  Zero ou mais de uma parcela com o número → ignora e loga.
- Webhook `POST /api/webhooks/asaas`: token do header `asaas-access-token` comparado em tempo
  constante com `config.asaas_webhook_token`; sem token configurado → 401 (fechado). O corpo só
  serve de gatilho: a rota busca a cobrança na API (`GET /v3/payments/{id}`) e aplica o status
  atual — evento fora de ordem ou reenviado não deixa estado errado. Falha na API → 200 com
  `ok:false` (a sincronização diária corrige). Sem par → 200.
- Sincronização `sincronizarBaixasAsaas()`: vendas ativas com boleto, lista cobranças por
  `externalReference` (paginado) e aplica a mesma regra. Chamada no começo de
  `/api/cron/parcela-vencida` (já agendado; sem CronJob novo) — antes da checagem do WhatsApp.
- Aplicação idempotente: `updateMany` condicionado ao estado lido (`paga`, `origem`,
  `asaas_payment_id`) — webhook e cron concorrentes não gravam duas vezes; audit só quando muda.
- Registrar o webhook no painel do Asaas (URL + token) é passo do admin; a tela de configuração
  entra na fase de UI.

### Prudent (A)

- Ação `antecipar` da `/prudent`: além de `antecipada = true`, dá baixa (`origem = prudent`,
  `data_pagamento` = agora) nas parcelas do lote que ainda não estão pagas.
- Carga inicial na migração: parcelas de venda em folha com `antecipada = true` **ou** venda com
  flag `antecipada = 1` → `paga = true`, `origem = prudent`, `data_pagamento` nulo (data real
  desconhecida). Não altera `antecipada`. Registro em `audit_logs`.

### Manual

- Server actions `darBaixaParcela` / `desfazerBaixaParcela` (admin na primeira linha): data de
  pagamento informada ou hoje (Manaus), `baixa_por` = usuário. Desfazer baixa de origem `asaas` ou
  `prudent` exige `confirmar=1`.
- **Tela vem depois, com artifact aprovado** (lista de parcelas no `/historico`, card do webhook em
  `/configuracoes`).

### Junto

- `updateVenda` copia `origem_pagamento`, `asaas_payment_id`, `baixa_por` ao recriar as linhas.
- `autorizarCron(req)` compartilhado e fechado: sem segredo ou header errado → 401, nas 11 rotas.

### Visão do cliente (achado da revisão)

`paga` é a visão da BFX. Parcela antecipada na Prudent está quitada para a BFX, mas a folha do
cliente continua descontando até o vencimento. `situacaoParaCliente` (antecipada: a vencer até
vencer; depois, descontada) e `FILTRO_PARCELA_COMPROMETIDA` (aberta **ou** origem prudent) são
usados pelo agente de WhatsApp (`minhas_parcelas`, `meu_limite`) e pela IA interna
(`consultar_parcelas_cliente`, `consultar_limite_cliente`). Sem isso, o cliente ouviria que a
parcela está paga e a margem de crédito apareceria livre.

### Ajustes da revisão

Timeout de 20 s nas chamadas ao Asaas; erro isolado por cobrança na sincronização; resultado da
sincronização no log do cron; carga da Prudent só em venda ativa; baixa manual sem data futura e
desfazer condicionado à origem lida; `updateVenda` não duplica `asaas_payment_id` quando o payload
repete número de parcela (evita P2002 depois do `deleteMany`).

### Telas (desenho aprovado pelo André em 2026-09-17)

Artifact: https://claude.ai/artifact/GJLH94z5xEt8H5xeNPAGVh

- **Ficha da venda (`/historico`) — "Recebimento das parcelas"**: todas as parcelas da venda
  (inclusive 1x), com vencimento, valor, situação (Paga / Vencida com dias de atraso / Em aberto)
  e origem da baixa (Prudent · antecipada; Asaas · boleto pago em data; Manual · data · por quem).
  "Recebido R$ X de R$ Y". Só admin vê "Dar baixa" (abre data, padrão hoje, sem data futura) e
  "Desfazer" (baixa manual desfaz direto; Asaas/Prudent pede confirmação). A baixa é gravada na
  hora, fora do "Salvar alterações" da venda. Regra de exibição pura em
  `src/lib/recebimento-parcelas.ts`.
- **Configurações › Asaas — "Baixa automática de boletos"**: URL
  `${NEXT_PUBLIC_APP_URL}/api/webhooks/asaas` para copiar; token mascarado com Copiar e
  "Gerar novo token" (confirmação quando já existe); passo a passo do painel do Asaas; aviso de
  gerar o token antes de cadastrar. Selo: sem token → "Sem token"; token sem aviso recebido →
  "Falta cadastrar no Asaas"; aviso recebido → "Recebendo avisos" com data do último.
  `config.asaas_webhook_ultimo_aviso_em` é gravado pelo webhook a cada chamada autenticada,
  condicionado ao token validado (aviso com o token antigo não marca o novo como cadastrado).
  Token: 48 caracteres aleatórios base64url, sem três caracteres iguais seguidos. A página recebe
  só o token mascarado; o Copiar busca o completo por action só de admin
  (`lerTokenWebhookAsaas`), e sem área de transferência mostra o token num diálogo.
- Ajustes da revisão: parcela com número repetido (vendas 51–53) mostra aviso e o "n/total" usa o
  maior número; calendário da baixa não deixa escolher data futura; URL em https fora de
  localhost quando `NEXT_PUBLIC_APP_URL` não está definido.

## Fora de escopo

Conciliação de PIX/cartão; reativar cobrança por WhatsApp; import do status `PAGO` da planilha
(repasse de folha não antecipada fica manual); CronJob novo; limpar as duplicatas 51–53.

## Efeitos esperados no deploy

Somem da inadimplência, do alerta diário e do card "a vencer" da `/prudent` as parcelas
antecipadas (~252) e, após a primeira sincronização, os boletos quitados no Asaas.

## Testes

`baixa-asaas` (regra pura), `baixa-asaas-db` (aplicação + webhook), `cron-auth`,
`baixa-manual`, `historico-edicao-preserva-antecipada` (campos novos), migração em Postgres local.

## Parecer do Grok (resumo)

Aprovou A e o desenho de webhook; exigiu: cron por status atual (não replay de evento), não pisar
origem manual/prudent, idempotência transacional, copiar campos no `updateVenda`, carga incluindo
flag legado `antecipada = 1`, `antecipar` no escopo, token fechado em tempo constante, unicidade do
`asaas_payment_id`. Unicidade (venda, número) adiada pelas duplicatas 51–53.
