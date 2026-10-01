# Data do desconto em venda 1x em folha

Data: 2026-10-01 · Pedido do André (com print da Venda Rápida em "Desconto em folha", 1 parcela).

## Comportamento atual

- Venda em **1x** com **Desconto em folha** grava uma linha em `parcelas_vencimento` com a data de
  `calcularPrimeiroVencimento(dataVenda, regra)` (`parcelaUnicaDaFolha`, `src/lib/parcelas.ts`).
- O campo de datas some em 1x: `ParcelasVencimentoForm` retorna `null` com `numeroParcelas <= 1`
  (`parcelas-vencimento-form.tsx:81`) e a edição também (`edit-parcelas-section.tsx:85`). O form só
  envia `parcelasVencimento` com `numParcelas > 1` (`venda-rapida-form-v2.tsx:714`).
- Resultado: a data do desconto de uma venda 1x não pode ser escolhida nem corrigida.

## Comportamento esperado

- Em 1x **e** forma "Desconto em folha", o card "Parcelamento" mostra o campo **"Data do desconto"**,
  já preenchido com a data da regra da empresa do cliente (mesma regra que a Fase 1 usa), editável.
  Abaixo: "Pela regra da empresa: DD/MM/AAAA." e, quando a data foi mudada, o link
  "Voltar para a data da regra".
- O form envia `dataDescontoUnica` (`AAAA-MM-DD`). O servidor usa essa data na linha única
  (`parcelaUnicaDaFolha` ganha `dataInformada?`); o valor continua sendo o total calculado no
  servidor (não vem do cliente). Sem o campo, comportamento atual.
- Validação no servidor: data válida, **não anterior à data da venda** e **no máximo 12 meses depois**
  dela. Fora disso: "Data do desconto deve ficar entre a data da venda e 12 meses depois."
- Resumo financeiro e taxa da Prudent usam a data escolhida (a simulação já lê a linha única).
- **Edição da venda (histórico):** o mesmo campo aparece em 1x em folha, com a data gravada. Mudar a
  data passa pelas travas que já existem para mudar vencimento de parcela: recusado se a parcela tem
  boleto da Prudent ou está em fechamento conferido ou posterior (`fechamento-reserva.ts`). Salvar
  sem mudar mantém a data gravada (idempotência, como no ajuste A de 30/09).
- Outras formas de pagamento em 1x: nada muda (não geram parcela).

## Arquivos

`src/lib/parcelas.ts`, `src/app/(app)/venda-rapida/actions.ts`, `src/components/venda-rapida-form-v2.tsx`,
componente novo `src/components/data-desconto-unica.tsx` (usado no PDV e na edição),
`src/app/(app)/historico/actions.ts` + o formulário de edição que renderiza `EditParcelasSection`.

## Fora de escopo

Data por parcela em vendas parceladas (já existe); mudar a regra de corte; vendas fora da folha.
