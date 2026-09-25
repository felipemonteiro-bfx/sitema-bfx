# Dashboard: clientes que compraram, mês a mês · Boletos: filtros — spec

Aprovado pelo André em 25/09 no artboard "E-mail em Cópia BFX", seção "Proposta 25/09 (tarde)"
(Dashboard.dc.html e Boletos.dc.html), a partir do post-it "Quant. de clientes que compraram /
Comparação mês a mês" e do print do filtro de período do Asaas.

## Dashboard

- Cartão novo **Clientes que compraram**: clientes distintos com venda no período filtrado (mesmos
  filtros de data e vendedor e mesmo critério de venda do resto do dashboard: status fora de
  cancelada/estornada). Descrição: `N novos · M recorrentes` (novo = primeira compra da vida no
  período).
- Faturamento, Lucro, Ticket e Clientes mostram a variação contra o **período anterior comparável**:
  o mesmo intervalo um mês antes (1–25/set → 1–25/ago; dia além do fim do mês cai no último dia).
  Sem base (anterior zero) não mostra percentual. A margem continua na descrição do Lucro.
- Card **Clientes que compraram, mês a mês**: últimos 6 meses, barras empilhadas novos/recorrentes
  com total no topo, legenda, tooltip, e tabela ao lado (Clientes, Novos, Vendas, vs mês anterior);
  o mês corrente compara com os mesmos dias do mês anterior. Como o gráfico de faturamento, ignora o
  filtro de vendedor.
- Cores por tokens novos `--chart-novos`/`--chart-recorrentes` (claro #358F33/#2B74C2, escuro
  #46A843/#3A86D6), validados com o validador de paleta (CVD e contraste ≥3:1).

## Boletos

- Filtro de **período** (Hoje, Esta semana, Este mês — padrão —, Este ano, Desde o início,
  Personalizado de/até), **empresa** e busca por cliente ou descrição. Tudo na URL.
- A vencer filtra por vencimento; pagos por data do pagamento. **Vencidos ignoram o período**: é
  todo o atraso, de qualquer mês (decisão do André em 25/09 — atraso não pode sumir com o filtro).
  Empresa e busca valem para os três. Cartões e abas obedecem.
- Cartões mostram `N boletos · M clientes`.
- Correção junto: a lista do Asaas vinha só com os 100 primeiros de cada status (os cartões
  mostravam 100/200 redondos). Agora pagina até esgotar (teto 2.000 por status).
- Empresa e cliente vêm da venda (`externalReference` = id da venda).

## Fora do escopo

- Filtro por vendedor nos boletos; exportação dos boletos filtrados.
