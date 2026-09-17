-- Parcelas das vendas em desconto em folha que ficaram sem linhas — 2026-09-17.
-- Ver docs/superpowers/specs/2026-09-17-parcela-venda-folha-1x.md.
--
-- A venda rápida só gravava `parcelas_vencimento` com mais de uma parcela: a venda em folha em 1x
-- (e vendas antigas) não tinham linha, então não entravam na fila da Prudent nem na planilha de
-- controle, e não dava para dar baixa nem antecipar. Aqui elas ganham as linhas pela mesma regra
-- que o código passa a usar (`parcelaUnicaDaFolha`) e que a planilha da folha já calculava
-- (`parcelasDaVenda`): primeiro vencimento no dia 10 do mês seguinte à venda, ou dois meses à
-- frente se a venda foi depois do dia 20; uma por mês; total dividido igualmente e o resto de
-- centavos na última.
--
-- Guardas:
--   - o recorte de WHERE_VENDA_ANTECIPAVEL (fora cancelada/estornada; forma DESCONTO_FOLHA, ou forma
--     nula com o flag legado desconto_em_folha);
--   - boleto = false: os crons de cobrança por WhatsApp só olham venda com boleto, e nenhuma linha
--     nova pode virar mensagem de "parcela vencida" para o cliente;
--   - só venda sem nenhuma linha (rodar de novo não cria nada) e com total > 0;
--   - flag legado `antecipada` só 0, 1 ou nulo. Os flags 2 (em andamento) e 3 (parcial) não dizem
--     QUAIS parcelas foram antecipadas: dar linhas abertas a essas vendas as devolveria à fila da
--     Prudent e elas poderiam ser vendidas de novo. Ficam como estão, para conferência manual.
-- Venda com o flag legado antecipada = 1 ganha as linhas antecipadas e pagas pela Prudent, como a
-- carga de 16/09. O flag da venda e a taxa gravada não são alterados. Fica registrado em audit_logs.
WITH candidatas AS (
  SELECT v."id",
         v."data_venda",
         COALESCE(v."antecipada", 0) = 1 AS antecipada,
         GREATEST(1, COALESCE(v."parcelas", 1)) AS quantidade,
         ROUND((
           CASE
             WHEN EXISTS (SELECT 1 FROM "itens_venda" i WHERE i."venda_id" = v."id")
               THEN (SELECT SUM(i."subtotal") FROM "itens_venda" i WHERE i."venda_id" = v."id")
             ELSE COALESCE(v."valorVenda", 0) * COALESCE(v."quantidade", 1)
           END + COALESCE(v."valor_frete", 0) - COALESCE(v."desconto", 0)
         )::numeric * 100)::bigint AS total_centavos
    FROM "vendas" v
   WHERE v."status" NOT IN ('cancelada', 'estornada')
     AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
     AND v."boleto" = false
     AND COALESCE(v."antecipada", 0) IN (0, 1)
     AND NOT EXISTS (SELECT 1 FROM "parcelas_vencimento" p WHERE p."venda_id" = v."id")
),
novas AS (
  INSERT INTO "parcelas_vencimento"
    ("venda_id", "numero_parcela", "data_vencimento", "valor_parcela", "paga", "antecipada", "origem_pagamento")
  SELECT c."id",
         n,
         date_trunc('month', c."data_venda")
           + make_interval(months => ((CASE WHEN EXTRACT(DAY FROM c."data_venda") <= 20 THEN 1 ELSE 2 END) + n - 1)::int)
           + interval '9 days',
         (CASE
            WHEN n = c.quantidade THEN c.total_centavos - (c.total_centavos / c.quantidade) * (c.quantidade - 1)
            ELSE c.total_centavos / c.quantidade
          END)::numeric / 100,
         c.antecipada,
         c.antecipada,
         CASE WHEN c.antecipada THEN 'prudent' END
    FROM candidatas c
   CROSS JOIN LATERAL generate_series(1, c.quantidade) AS n
   WHERE c.total_centavos > 0
  RETURNING "id", "venda_id", "valor_parcela", "antecipada"
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now(), 'Sistema (migração)', 'parcela:carga-venda-folha-sem-linhas',
       json_build_object(
         'vendas', (SELECT count(DISTINCT "venda_id") FROM novas),
         'parcelas', (SELECT count(*) FROM novas),
         'antecipadas', (SELECT count(*) FROM novas WHERE "antecipada"),
         'valor', (SELECT coalesce(round(sum("valor_parcela")::numeric, 2), 0) FROM novas),
         'vendaIds', (SELECT coalesce(json_agg(DISTINCT "venda_id"), '[]'::json) FROM novas)
       )::text
 WHERE EXISTS (SELECT 1 FROM novas);

-- As vendas que ficaram de fora por flag legado (2 = em andamento, 3 = parcial, ou valor sujo)
-- continuam sem parcelas: sem este registro, ninguém descobre quais são para conferir à mão.
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now(), 'Sistema (migração)', 'parcela:carga-venda-folha-pulada',
       json_build_object(
         'vendas', count(*),
         'motivo', 'flag antecipada fora de 0/1: não dá para saber quais parcelas já foram antecipadas',
         'vendaIds', coalesce(json_agg(v."id" ORDER BY v."id"), '[]'::json)
       )::text
  FROM "vendas" v
 WHERE v."status" NOT IN ('cancelada', 'estornada')
   AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
   AND v."boleto" = false
   AND COALESCE(v."antecipada", 0) NOT IN (0, 1)
   AND NOT EXISTS (SELECT 1 FROM "parcelas_vencimento" p WHERE p."venda_id" = v."id")
   -- Rodar de novo não duplica o registro.
   AND NOT EXISTS (SELECT 1 FROM "audit_logs" a WHERE a."acao" = 'parcela:carga-venda-folha-pulada')
HAVING count(*) > 0;
