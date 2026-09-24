# Conciliação: vendas feitas até 31/08/2026 já foram antecipadas

Data: 2026-09-18 (migração escrita em 2026-09-23). Resposta do André à pendência "planilha de
controle atualizada, para a conciliação marcar de uma vez o que a Prudent já comprou": "Consegue
fazer assim? Vendas feitas até final de agosto já foram antecipadas".

É o item 5 do fluxo de `2026-09-17-antecipacao-em-andamento.md` (conciliação com lote `concluido`
de origem `conciliacao`), com a regra por data da venda no lugar da planilha.

## Comportamento atual × esperado

Hoje o banco só sabe da antecipação feita pela fila e da conciliação de 11/09 (211 parcelas que
casaram com a planilha). O resto das vendas antigas em desconto em folha aparece como "a antecipar"
ou "vencida sem antecipar" em `/prudent`, e pode ser selecionado e enviado de novo à Prudent.

Esperado: toda parcela em aberto de venda em folha feita até 31/08/2026 passa a constar como
antecipada e paga pela Prudent, em lotes de conciliação no histórico. Essas vendas saem da fila.

## Recorte (migração `20260923160000_conciliacao_vendas_ate_agosto`)

Parcela entra quando **tudo** vale:

- venda com `data_venda < 2026-09-01` (data pura, meia-noite UTC, como a venda rápida grava);
- venda antecipável: o recorte de `WHERE_VENDA_ANTECIPAVEL` (fora cancelada/estornada; forma
  `DESCONTO_FOLHA`, ou forma nula com o flag legado `desconto_em_folha`);
- venda sem boleto (`boleto = false`), como na carga de 17/09: venda com boleto tem cobrança viva
  no Asaas, e marcá-la como paga pela Prudent calaria os crons de aviso e faria a baixa do boleto
  ser recusada depois (`decidirBaixaAsaas` → `baixada_por_outra_origem`), com o mesmo dinheiro
  contado duas vezes;
- parcela com `antecipada = false`;
- parcela fora de qualquer lote (`antecipacao_lote_id` nulo): lote em andamento não é mexido;
- parcela em aberto, ou já quitada pela Prudent (`paga = false` ou `origem_pagamento = 'prudent'`).
  Parcela quitada por boleto do Asaas ou baixa manual contradiz "foi antecipada" e fica de fora —
  desde 23/09 ela já conta como antecipada no resumo e já está fora da fila (`titulosDeVenda`),
  então marcá-la não mudaria a tela e apagaria a origem real do dinheiro.

## O que a migração grava

1. **Um lote por empresa conveniada** em `antecipacao_batches` (`cliente.empresa`, sem empresa =
   "Sem empresa"): `status = concluido`, `origem = conciliacao`, `concluida_em = 2026-09-18` (o dia
   em que o André confirmou), `concluida_por = 'Sistema (migração)'`, `observacao` com a regra e a
   empresa, e período, total e vendas calculados das parcelas, no mesmo formato que `criarLote`
   grava. Um lote por empresa porque `validarUmaEmpresa` (23/09) passou a proibir lote misto — um
   lote único apareceria quebrado em vários cartões no histórico. Sem parcela no recorte, nenhum
   lote é criado.
2. Nas parcelas: `antecipada = true`, vínculo com o lote da empresa, `paga = true` e
   `origem_pagamento = 'prudent'`. `data_pagamento` **não é inventada**: a data real da
   antecipação não existe no banco, mesma decisão da carga de 16/09.
3. Flag da venda pela regra de `flagDaVenda`: todas antecipadas → 1, algumas → 3. Como na
   migração de 11/09, venda que já está em 1 nunca é rebaixada.
4. `audit_logs` `antecipacao:conciliacao-ate-agosto` com lotes, contagens, valor e ids das parcelas.
5. `audit_logs` `antecipacao:conciliacao-ate-agosto-fora` com o que ficou de fora para conferir à
   mão: parcelas em lote em andamento, parcelas penduradas em lote já fechado, parcelas quitadas
   por outra origem, parcelas de venda com boleto e vendas sem parcelas.

## Concorrência com o deploy (achados da revisão de 23/09)

**Todas** as guardas de parcela voltam no `WHERE` do `UPDATE`, e as de venda num `EXISTS`. O
`EvalPlanQual` do Postgres só reavalia o que está ali: sem a guarda de pagamento, uma baixa do
Asaas ou manual que commitasse entre o snapshot e o lock da linha teria a origem do dinheiro
reescrita para `prudent` — reproduzido em Postgres 16 na revisão, e agora coberto por
`scripts/testes-migracao/.../rodar-concorrencia.sh`.

Total, vendas e ids do lote saem do snapshot, então um envio concorrente poderia deixar o lote
afirmando dinheiro que não tem (no limite, lote sem nenhuma parcela — o estado que `concluirLote`
recusa). Uma segunda instrução reconcilia os três campos a partir do que ficou ligado de fato,
apaga lote que ficou sem parcela e registra `antecipacao:conciliacao-ate-agosto-ajuste`. Em
execução tranquila ela não mexe em nada e não registra nada.

Outros dois pontos da revisão: `now()` vira `now() AT TIME ZONE 'UTC'` (a coluna não tem fuso; num
banco fora de UTC o lote nasceria horas atrás de todo lote gravado pelo app e o histórico o
ordenaria errado), e os centavos usam `floor(valor * 100 + 0.5)` em float8, que é o mesmo
arredondamento do `Math.round(valor * 100)` de `totalCentavos` (converter para `numeric` antes de
multiplicar divergiria em valor com três casas). Rodar de novo não muda nada (o recorte fica vazio).

## Efeitos fora da migração (sem mudança de código)

- `/prudent`: "já antecipado" sobe, "falta antecipar" e "vencidas" caem; as vendas somem da fila.
- Planilha de controle: essas parcelas saem como ANTECIPAÇÃO OK.
- Planilha da folha: nada muda — parcela paga pela Prudent continua sendo descontada
  (`planilha-folha.ts:88`).
- Relatório de inadimplência e alertas de vencidas: saem, porque viram pagas.
- DRE: não muda (`finance.ts` só usa o flag para venda sem parcelas, que a migração não toca).

## Medir em produção antes do deploy

1. Quantas parcelas o recorte pega, por mês da venda, e quantas já venceram.
2. Quantas parcelas de venda **com boleto** ficariam de fora (se for 0, a guarda só documenta).
3. Quantas grafias distintas de `clientes.empresa` existem no recorte: cada uma vira um lote, e o
   histórico só lê os 50 lotes mais recentes — se passar disso, lote antigo cai da página e as
   vendas dele voltam a aparecer no painel "antecipações sem lote", contando o mesmo dinheiro duas
   vezes. Com cauda longa de variantes, normalizar `empresa` antes.
4. `SHOW timezone` no banco, para saber se o `AT TIME ZONE 'UTC'` era problema real.

Consulta pronta (somente leitura, em `BEGIN READ ONLY`): pedir ao André para rodar, porque o hook
de segurança do projeto bloqueia `kubectl` a partir do agente.

## Fora do escopo

- Vendas sem parcelas: continuam como estão (a carga de 17/09 pulou as de flag 2/3); os ids ficam
  no registro de auditoria.
- Setembro em diante continua pela fila (envio + conclusão, ou "Registrar já concluída").
- Nenhuma mudança de tela.
- `whereParcelasLivres` (`lote-antecipacao-db.ts`) ainda aceita parcela paga num lote novo, embora
  `titulosDeVenda` já a exclua desde 23/09. Divergência anotada para a próxima rodada; a migração
  não depende dela.
