# Planilha de controle (.xlsx) no formato da equipe

Data: 2026-09-11 · Pedido do André: "baixar essa informação em xls, formatado igual à planilha que
enviei, com todas as informações, cores, espaçamentos". Design aprovado no artifact v7 (artboards
"Planilha xls · …"), **sem** criar os campos de cargo e secretaria.

## Comportamento atual vs. esperado

- **Hoje**: o único download é o botão "Planilha" do card de seleção — só as vendas marcadas, em
  `.xls` XML 2003 (sem cor nem largura, o Excel avisa ao abrir). Fica como está (não foi pedido).
- **Esperado**: botão **"Baixar planilha de controle"** no card da fila → popover com meses de
  desconto, empresa, "Incluir meses que já passaram", resumo contado no servidor
  ("N abas · N parcelas · R$ X já antecipados") e **Baixar .xlsx**.

## O arquivo

Medido na aba AGOSTO 2026 de `CONTROLE ATUALIZADO DE COMPRAS BFXSHOP - ESSÊNCIA DA MODA (AMAZON FIVE).xlsx`.

- `.xlsx` de verdade (Office Open XML), gerado no servidor sem dependência nova (zip com o `zlib`
  do Node — `npm install` não roda neste projeto).
- **Uma aba por mês de desconto**, nome "SETEMBRO 2026". Mês do desconto = mês do vencimento − 1
  (o sistema vence no dia 10 do mês seguinte ao desconto em folha).
- **Um bloco por empresa conveniada** (sem campo de secretaria): linha de título
  "DESCONTOS EM FOLHA {EMPRESA} - AF/BFX", mesclada A:I, Calibri 28 negrito, fundo `#92D050`,
  altura 36; linha em branco entre blocos.
- **Cabeçalho**: NOME · CPF · CARGO · DATA DA COMPRA · PRODUTO · VALOR DA PARCELA ·
  QUANT. DE PARCELAS · DATA DE DESCONTO · STATUS DA DÍVIDA — Calibri 11 negrito, NOME à esquerda.
- **Linhas**: uma por parcela. CARGO vazio (não há o campo). Datas como data do Excel (formato 14,
  dd/mm/aaaa em pt-BR); valor em R$ contábil; parcela como texto "2/4"; desconto = último dia do mês
  da aba. Borda fina em toda célula, centralizado (NOME à esquerda).
- **STATUS**: `ANTECIPAÇÃO OK` (parcela antecipada, ou venda legada com o flag), `À VENCER` (vence de
  hoje em diante), `VENCIDA - CONFERIR REPASSE` (venceu sem antecipar — o sistema não sabe se foi
  PAGO ou PENDENTE DE REPASSE). Mesma regra de `parcelasDaVenda`.
- **Coluna K**: K1 "ANTECIPAÇÃO OK" negrito, fundo `#548235`; de K2 para baixo, o valor de cada
  parcela antecipada da aba; duas linhas abaixo, a soma `=SUM(K2:Kn)` em negrito, fundo `#FFFF00`,
  mesclada em 2 linhas.
- **Larguras** (caracteres): A 63.71 · B 17.71 · C 15 · D 27.29 · E 138.29 · F 25.86 · G 28.29 ·
  H 25.86 · I 29.43 · K 32.86. Zoom 80%.
- Venda cancelada/estornada não entra; só venda em desconto em folha (`WHERE_VENDA_ANTECIPAVEL`).

## Arquivos

- `src/lib/planilha-controle.ts` (novo, puro): monta abas, blocos, linhas, coluna K e resumo.
- `src/lib/xlsx/zip.ts` e `src/lib/xlsx/planilha-controle-xlsx.ts` (novos): zip e o XML do Excel.
- `src/app/api/relatorios/controle-xlsx/route.ts` (novo, só admin): o download.
- `src/app/(app)/prudent/actions.ts`: `resumoPlanilhaControleAction` para o resumo do popover.
- `src/components/planilha-controle-popover.tsx` (novo) e `antecipacao-client.tsx` (o botão).

## Fora do escopo

- Campos de secretaria e cargo (André: não precisa). Um bloco por empresa; CARGO vazio.
- PAGO / PENDENTE DE REPASSE e marcações pintadas à mão: o sistema não tem esses dados.
- Botão "Planilha" do card de seleção: continua como está.

## Premissas

- Vencimento no dia 10 do mês seguinte ao desconto. Parcela com vencimento editado para outro
  mês (a edição foi liberada no commit 935d709) cai na aba do mês anterior ao vencimento editado.
- Empresa comparada sem diferenciar maiúsculas, no filtro e no bloco ("Amazon Five" e
  "AMAZON FIVE" são o mesmo bloco).
