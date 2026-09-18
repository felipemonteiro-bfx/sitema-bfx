# Antecipação com retorno: lote em andamento até o André confirmar

Data: 2026-09-17. Pedido do André: "eu vou selecionar os clientes e compras que quero antecipar,
vai gerar Excel pra que eu possa enviar, a antecipação vai ficar salva como em andamento; assim que
eu tiver um retorno vou no histórico e mudo essa antecipação pra concluído".

## Comportamento atual × esperado

Hoje (`src/app/(app)/prudent/page.tsx:23-124`) o clique em "Antecipar" faz tudo de uma vez: gera o
arquivo da financeira, marca as parcelas como `antecipada = true`, grava `paga = true` com
`origem_pagamento = 'prudent'` (dinheiro recebido) e recalcula o flag da venda. Não existe estado
entre "mandei para a Prudent" e "a Prudent confirmou": tudo que foi antecipado por fora continua
como "a antecipar", e o que foi enviado já conta como pago mesmo sem retorno.

Esperado: o envio cria um **lote em andamento**. As parcelas saem da fila, mas não são antecipadas
nem pagas. Quando o retorno chega, o André marca o lote como **concluído** no histórico, e só então
as parcelas viram antecipadas e pagas pela Prudent.

## Os três baldes (decisão do André)

| Balde | Como se reconhece | Conta como dinheiro? |
|---|---|---|
| Já antecipado | `parcela.antecipada = true` | sim (`paga`, origem `prudent`) |
| Em andamento | parcela ligada a lote com status `em_andamento` | não |
| A antecipar | nem uma coisa nem outra, vencimento no futuro | não |

"Vencidas sem antecipação" continua como está. Os selos "Em andamento" e o filtro já existem na
fila (`src/components/antecipacao-client.tsx:86-92, 321, 459`) e o mapeamento `vendas.antecipada = 2`
também (`prudent/page.tsx:270`) — hoje ninguém grava esse valor.

## Modelo de dados

1. `antecipacao_batches` ganha: `status` (`em_andamento` | `concluido` | `cancelado`, padrão
   `em_andamento`), `concluida_em`, `concluida_por`, `observacao` e `origem` (`envio` |
   `registro` | `conciliacao`).
2. `parcelas_vencimento` ganha `antecipacao_lote_id` (FK, nulo). É por parcela, não por venda: o
   lote já nasce de um recorte de parcelas (`page.tsx:43-53`), e `venda_ids` em JSON não diz quais.
3. `vendas.antecipada` passa a receber **2** quando todas as parcelas em aberto da venda estão num
   lote em andamento; 1 (todas concluídas), 3 (parcial) e 0 seguem a regra de hoje.

## Fluxo

1. **Enviar** (botão de hoje): gera o Excel, cria o lote `em_andamento`, liga as parcelas e grava
   `vendas.antecipada = 2`. **Não** grava `paga`, `data_pagamento`, `origem_pagamento` nem
   `parcela.antecipada`. Tudo numa transação (hoje são 3+ queries soltas por venda).
2. **Concluir** (histórico): pede a data do retorno (padrão hoje), grava nas parcelas do lote
   `antecipada = true`, `paga = true`, `origem_pagamento = 'prudent'`, `data_pagamento` = data
   informada; recalcula o flag da venda; lote vira `concluido`.
3. **Cancelar** (histórico): a Prudent recusou. As parcelas voltam para a fila (perdem o vínculo),
   o flag da venda volta a 0/3, e o lote fica `cancelado` no histórico.
4. **Registrar antecipação já concluída** (para o atraso): mesma seleção da fila, sem gerar Excel,
   cria o lote já `concluido` com origem `registro` e a data informada.
5. **Conciliação pela planilha** (segunda frente do atraso): migração que marca as parcelas
   "ANTECIPAÇÃO OK" da planilha de controle que ainda estão abertas, criando um lote `concluido`
   com origem `conciliacao` — mesma ideia da migração de 11/09, agora com histórico. Depende da
   planilha atualizada.

## Travas que a revisão exigiu (17/09)

- **Ninguém rouba parcela de outro lote:** o vínculo só é gravado onde `antecipacao_lote_id` ainda
  é nulo, e a operação aborta se pegar menos parcelas do que pediu (dois envios simultâneos).
- **Concluir e cancelar** fecham o lote por `updateMany` com `status = em_andamento` no `where`:
  clique duplo não fecha duas vezes.
- **Lote sem parcela ligada não conclui:** antes diria "0 parcelas, R$ 0,00" em verde.
- **Editar a venda preserva o vínculo** e recusa apagar parcela que está num lote, com mensagem
  própria; o flag da venda passa a sair de `flagDaVenda`, então o 2 sobrevive ao save.
- **Baixa manual não entra em parcela de lote aberto:** a baixa dela é a conclusão do lote.
- **Transações com folga** (30 s): o recálculo do flag anda venda a venda.

## O que muda fora da tela da Prudent

- **Recortes que não podem reenviar o mesmo título:** fila e cálculo da seleção
  (`src/lib/fila-antecipacao.ts:69,103`), CSV da financeira
  (`src/app/api/relatorios/antecipacao/route.ts:52`), xlsx e imagem
  (`antecipacao-xlsx/route.ts:118,150`, `antecipacao-imagem/route.ts:71`) e `titulosDeVenda`
  (`src/lib/antecipacao.ts:141`) passam a excluir também a parcela em andamento.
- **Baldes e resumos:** `baldeDaParcela` e os resumos por comprador e por mês
  (`src/lib/antecipacao-compradores.ts:223-233, 288, 382`) ganham o quarto balde.
- **Edição de venda:** parcela em lote em andamento passa a ser intocável, como paga ou antecipada
  (`src/app/(app)/historico/actions.ts:229, 259, 291`).
- **Planilha de controle:** em andamento sai como `À VENCER` (não é ANTECIPAÇÃO OK) e não entra na
  coluna K (`src/lib/planilha-controle.ts`).
- **Popover de parcelas da fila:** a célula "4 / 2 / 1 / 1" vira quatro contadores, com o balde
  novo na legenda e no texto para leitor de tela.
- **Planilha da folha:** não muda. Em andamento não é paga, então a folha continua descontando —
  é o que já acontece (`src/lib/planilha-folha.ts:88`).
- **DRE:** em andamento não vira entrada; `src/lib/finance.ts:216` só olha flag 1, então não muda.
- **Desfazer baixa da Prudent** (`historico/baixa-actions.ts:57-91`) continua desfazendo só a
  baixa; o lote permanece concluído. Fica anotado como limitação.

## Entrou junto (parte 3, com artboard aprovado)

O aviso de matrícula repetida no popover da planilha da folha: a regra
(`matriculasRepetidas`) e o aviso amarelo com matrícula e nomes. A planilha em si não muda.

## Fora do escopo

- Integração com a Prudent (não há API, portal nem arquivo de retorno).
- Reverter lote concluído (o caminho é desfazer a baixa parcela a parcela).
- Mexer no custo de antecipação da venda (`src/lib/antecipacao-custo.ts`), que de propósito não
  olha o flag.
- Conciliação pela planilha de controle (item 5 do fluxo): `registrarLoteConcluido` já aceita a
  origem `conciliacao`, mas a migração depende da planilha atualizada do André.
- Reemitir o arquivo do lote pelo vínculo (`antecipacao_lote_id`) em vez do período gravado —
  melhoria sugerida na revisão, anotada para a próxima rodada.

## Telas (artboard antes do código)

1. `/prudent`: quarto card "Em andamento" no topo, e a coluna equivalente nos resumos por comprador
   e por mês.
2. Histórico de Antecipações: status do lote, botões Concluir e Cancelar, data do retorno.
3. Fila: botão "Registrar antecipação já concluída" ao lado de "Antecipar".
