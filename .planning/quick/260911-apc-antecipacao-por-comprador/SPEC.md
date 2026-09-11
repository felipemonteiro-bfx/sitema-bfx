# SPEC — Antecipação por comprador: o que já foi e o que falta

Data: 2026-09-11
Tela: `/prudent` (Central de Antecipação Prudent)

## Pedido

> "Na parte de antecipação: o que já foi antecipado de cada comprador e quantas parcelas
> faltam antecipar. O valor total que foi antecipado e o que ainda vai ser antecipado."

Referência de uso real: planilha `CONTROLE ATUALIZADO DE COMPRAS BFXSHOP - ESSÊNCIA DA MODA
(AMAZON FIVE).xlsx`. Uma aba por mês de desconto, blocos por secretaria (SEMED, SEMTEPI,
ESCRITÓRIO, SEMASC), uma linha por parcela com `k/n` e três status: `PAGO`,
`ANTECIPAÇÃO OK` e `PENDENTE DE REPASSE`. O "falta antecipar" da equipe é o
`PENDENTE DE REPASSE` das abas futuras.

## Comportamento atual

A tela só mostra a fila de vendas e o total da **seleção**. Para saber quanto um comprador
já antecipou ou quantas parcelas dele faltam, é preciso abrir venda por venda. Não existe
total geral de "já antecipado" nem de "falta antecipar". A coluna Parcelas mostra só `4x`.

Medido em produção (VKE, 2026-09-11), vendas ativas em desconto em folha:

- 145 vendas: 121 com `antecipada = 0` e 24 com o flag legado `antecipada = 1`.
- **Nenhuma** parcela com `parcelas_vencimento.antecipada = true`; zero lotes.
- As 26 vendas com `antecipada = 1` têm parcelas, todas com o flag da parcela em `false`.
- Parcelas não antecipadas: 239 a vencer (R$ 77.841,88) e 209 **já vencidas** (R$ 68.876,61).
- 21 vendas ativas em folha **sem nenhuma** linha em `parcelas_vencimento`.
- `paga` nunca é gravado como `true` por nenhum fluxo — não serve para descartar parcela.

## Comportamento esperado

1. Topo da tela: três totais — **Já antecipado**, **Falta antecipar** e **Venceram sem
   antecipar** — cada um com valor e quantidade de parcelas.
2. Tabela **por comprador**: já antecipado (R$ e nº de parcelas), parcelas que faltam
   antecipar (nº e R$) e o próximo vencimento a antecipar. Busca por nome e opção de ver só
   quem ainda tem parcela a antecipar. Botão "Ver na fila" filtra a fila por aquele comprador.
3. Na fila, a coluna Parcelas diz quantas faltam antecipar em cada venda.

## Regras (módulo puro `src/lib/antecipacao-compradores.ts`)

- Parcela **antecipada** = `parcela.antecipada === true` **ou** venda com o flag legado
  `antecipada = 1` (é assim que as 26 vendas de produção estão; a fila já as trata como
  "Antecipado" e não deixa selecionar).
- Parcela **a antecipar** = não antecipada **e** vencimento >= hoje (vence hoje ainda conta).
- Parcela **vencida sem antecipar** = não antecipada **e** vencimento < hoje. Fica fora do
  "falta antecipar": o desconto em folha já aconteceu. Equivale ao `PAGO` da planilha, mas o
  sistema não sabe se foi recebido, por isso o rótulo neutro. **Corrigido na revisão:** a
  fila ainda deixa selecionar essas parcelas (`titulosDeVenda` e a action não têm piso de
  data, e o prazo conta da data da venda, então elas entram no lote com taxa cheia — não
  "prazo 0"). Excluí-las do lote muda a action e o custo no DRE e ficou fora do escopo; a
  tela passa a mostrar quantas vencidas cada venda e cada seleção carregam.
- "Hoje" é o dia civil em `America/Manaus`, comparado com o vencimento como data pura (UTC).
  Helper novo `hojeDataPura()` em `src/lib/data-pura.ts`.
- Vencimento ilegível é descartado (mesma regra de `titulosDeVenda`).
- Venda **cancelada/estornada** não entra em nenhum total (mesmo recorte de `finance.ts`).
- Venda **sem parcela cadastrada** não ganha parcela inventada: conta só em
  `vendasSemParcelas`, e a tela avisa que ela precisa de parcelas para ser antecipada.
- Comprador = `clienteId`. Venda sem cliente vira linha própria.
- Somas em centavos inteiros, para 0,1 + 0,2 dar 0,3.
- Ordem: maior valor a antecipar primeiro; empate pelo nome.

## Arquivos

- `src/lib/antecipacao-compradores.ts` (novo, puro) e `src/lib/data-pura.ts` (+`hojeDataPura`).
- `src/__tests__/antecipacao-compradores.test.ts` (novo).
- `src/components/antecipacao-compradores.tsx` (novo): card de totais e tabela por comprador.
- `src/components/antecipacao-client.tsx`: filtro por comprador, "faltam N" na coluna
  Parcelas e o card da fila, que passa a ser renderizado aqui (para compartilhar o filtro com o
  resumo).
- `src/app/(app)/prudent/page.tsx`: monta o resumo no servidor e repassa `clienteId` e
  "faltam" por venda.

## Fora do escopo (registrado como recomendação)

- **Conciliar com a planilha**: marcar como antecipadas as parcelas que a planilha diz
  `ANTECIPAÇÃO OK`. Hoje o sistema não sabe de nenhuma antecipação por parcela, então o
  "Falta antecipar" vai sair maior que o real até isso ser feito. Isso é escrita em dado de
  produção e precisa de autorização.
- Visão por mês de desconto e por secretaria, como as abas da planilha. O sistema não tem o
  campo secretaria: `cliente.empresa` é "AMAZON FIVE".
- Marcar parcela como recebida pela folha (`paga`), que hoje nunca é gravada.
- Venda cancelada continua aparecendo na fila (comportamento existente).
- Nenhuma mudança na fórmula da taxa, na server action `antecipar` ou nos relatórios.
