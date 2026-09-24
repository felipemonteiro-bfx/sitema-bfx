-- Conciliação: vendas feitas até 31/08/2026 já foram antecipadas — 2026-09-23.
-- Ver docs/superpowers/specs/2026-09-18-conciliacao-vendas-ate-agosto.md.
--
-- Regra do André (18/09/2026), no lugar da conciliação pela planilha de controle: toda venda em
-- desconto em folha feita até 31/08/2026 já foi antecipada na Prudent. O banco só sabia das 211
-- parcelas que casaram com a planilha em 11/09, então o resto aparecia como "a antecipar" ou
-- "vencida sem antecipar" em /prudent — e podia ser enviado de novo à financeira.
--
-- Um lote por empresa conveniada: `validarUmaEmpresa` (23/09) proíbe lote misto, e um lote único
-- apareceria quebrado em vários cartões no histórico.
--
-- Guardas, para nunca marcar o que não deve:
--   - o recorte de WHERE_VENDA_ANTECIPAVEL (fora cancelada/estornada; forma DESCONTO_FOLHA, ou
--     forma nula com o flag legado desconto_em_folha);
--   - venda com data_venda < 2026-09-01 (data pura, meia-noite UTC, como a venda rápida grava);
--   - venda sem boleto: a de boleto tem cobrança viva no Asaas, e marcá-la como paga pela Prudent
--     calaria os crons de aviso e faria a baixa do boleto ser recusada depois
--     (`decidirBaixaAsaas` → baixada_por_outra_origem). Mesma guarda da migração de 17/09;
--   - só parcela com antecipada = false e fora de qualquer lote: lote em andamento espera o
--     retorno da Prudent e não pode ser fechado por aqui;
--   - só parcela em aberto ou já quitada pela Prudent. Quitada por boleto do Asaas ou por baixa
--     manual contradiz "foi antecipada", já conta como antecipada no resumo desde 23/09 e já está
--     fora da fila (`titulosDeVenda`): marcá-la apagaria a origem real do dinheiro.
-- `data_pagamento` não é inventada — a data real da antecipação não existe no banco, mesma
-- decisão da carga de 16/09. O flag da venda segue `flagDaVenda` (todas → 1, algumas → 3), sem
-- nunca rebaixar venda que já está em 1, como na migração de 11/09.
-- Um único comando: os CTEs de escrita rodam atomicamente, e rodar de novo não muda nada, porque
-- o recorte fica vazio. Fica registrado em audit_logs.
WITH candidatas AS (
  SELECT p."id",
         p."venda_id",
         p."valor_parcela",
         p."data_vencimento",
         p."paga",
         -- Empresa pelo mesmo critério do histórico (`prudent/page.tsx`): texto sem espaços nas
         -- pontas, vazio ou nulo = "Sem empresa". Assim cada lote é exatamente um cartão na tela.
         -- Duas grafias da mesma empresa ("AMAZON FIVE" e "amazon five") viram dois lotes de
         -- propósito: a tela já as mostraria em cartões separados, e `validarUmaEmpresa` aceita
         -- as duas como a mesma empresa.
         coalesce(nullif(trim(c."empresa"), ''), 'Sem empresa') AS empresa_chave
    FROM "parcelas_vencimento" p
    JOIN "vendas" v ON v."id" = p."venda_id"
    LEFT JOIN "clientes" c ON c."id" = v."cliente_id"
   WHERE v."data_venda" < TIMESTAMP '2026-09-01 00:00:00'
     AND v."status" NOT IN ('cancelada', 'estornada')
     AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
     AND v."boleto" = false
     AND p."antecipada" = false
     AND p."antecipacao_lote_id" IS NULL
     AND (p."paga" = false OR p."origem_pagamento" = 'prudent')
),
vendas_por_grupo AS (
  SELECT DISTINCT empresa_chave, venda_id FROM candidatas
),
grupos AS (
  SELECT c.empresa_chave,
         -- O id sai da sequência antes do INSERT: é o que liga cada parcela ao lote da sua
         -- empresa dentro do mesmo comando.
         nextval(pg_get_serial_sequence('antecipacao_batches', 'id')) AS lote_id,
         -- `floor(v * 100 + 0.5)` em float8 é o mesmo arredondamento do `Math.round(valor * 100)`
         -- de `totalCentavos`. Converter para numeric antes de multiplicar divergiria em valor com
         -- três casas (1,005 → 101 no Postgres, 100 no JS).
         sum(floor(c."valor_parcela" * 100 + 0.5)::bigint) AS centavos,
         min(c."data_vencimento") AS venc_inicio,
         max(c."data_vencimento") AS venc_fim,
         (SELECT count(*) FROM vendas_por_grupo g WHERE g.empresa_chave = c.empresa_chave) AS vendas,
         (SELECT '[' || string_agg(g.venda_id::text, ',' ORDER BY g.venda_id) || ']'
            FROM vendas_por_grupo g WHERE g.empresa_chave = c.empresa_chave) AS venda_ids
    FROM candidatas c
   GROUP BY c.empresa_chave
),
lotes AS (
  INSERT INTO "antecipacao_batches"
    ("id", "criada_em", "venda_ids", "valor_total", "quantidade_vendas", "periodo_descricao",
     "periodo_inicio", "periodo_fim", "status", "origem", "concluida_em", "concluida_por", "observacao")
  SELECT g.lote_id,
         -- UTC explícito: `now()` é timestamptz e a coluna não tem fuso, então num banco fora de
         -- UTC o lote nasceria horas atrás de todo lote gravado pelo app (que grava UTC) e o
         -- histórico, ordenado por `criada_em`, o poria no lugar errado.
         now() AT TIME ZONE 'UTC',
         g.venda_ids,
         (g.centavos / 100.0)::double precision,
         g.vendas,
         -- Mesmo texto que `periodoDoLote` grava ("mai. de 2026 - nov. de 2026"), um mês só quando
         -- início e fim caem no mesmo mês.
         CASE WHEN to_char(g.venc_inicio, 'YYYY-MM') = to_char(g.venc_fim, 'YYYY-MM')
                THEN (ARRAY['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'])[EXTRACT(MONTH FROM g.venc_inicio)::int]
                     || ' de ' || EXTRACT(YEAR FROM g.venc_inicio)::int
              ELSE (ARRAY['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'])[EXTRACT(MONTH FROM g.venc_inicio)::int]
                     || ' de ' || EXTRACT(YEAR FROM g.venc_inicio)::int || ' - '
                     || (ARRAY['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'])[EXTRACT(MONTH FROM g.venc_fim)::int]
                     || ' de ' || EXTRACT(YEAR FROM g.venc_fim)::int
         END,
         g.venc_inicio,
         g.venc_fim,
         'concluido',
         'conciliacao',
         -- Dia em que o André confirmou a regra. A data de cada antecipação não existe no banco.
         TIMESTAMP '2026-09-18 00:00:00',
         'Sistema (migração)',
         'Conciliação: vendas feitas até 31/08/2026 já antecipadas (' || g.empresa_chave || ')'
    FROM grupos g
  RETURNING "id"
),
marcadas AS (
  -- Todas as guardas de parcela voltam no WHERE. Sem a de pagamento, uma baixa do Asaas ou manual
  -- que commitasse entre o snapshot e o lock desta linha teria a origem do dinheiro reescrita para
  -- 'prudent' (reproduzido em Postgres 16 na revisão de 23/09): o EvalPlanQual só reavalia o que
  -- está aqui. A guarda de venda vai no EXISTS pelo mesmo motivo — venda cancelada ou com forma
  -- trocada no meio do deploy não pode ser marcada.
  UPDATE "parcelas_vencimento" p
     SET "antecipada" = true,
         "antecipacao_lote_id" = g.lote_id,
         "paga" = true,
         "origem_pagamento" = 'prudent'
    FROM candidatas c
    JOIN grupos g ON g.empresa_chave = c.empresa_chave
   WHERE p."id" = c."id"
     AND p."antecipada" = false
     AND p."antecipacao_lote_id" IS NULL
     AND (p."paga" = false OR p."origem_pagamento" = 'prudent')
     AND EXISTS (
       SELECT 1 FROM "vendas" v2
        WHERE v2."id" = p."venda_id"
          AND v2."status" NOT IN ('cancelada', 'estornada')
          AND (v2."forma_pagamento" = 'DESCONTO_FOLHA' OR (v2."forma_pagamento" IS NULL AND v2."desconto_em_folha" = true))
          AND v2."boleto" = false
     )
  RETURNING p."id", p."venda_id", p."valor_parcela", c."paga" AS ja_paga
),
novas AS (
  SELECT "venda_id", count(*) AS n FROM marcadas GROUP BY "venda_id"
),
contagem AS (
  -- Retrato anterior ao UPDATE acima (os CTEs enxergam o mesmo snapshot): ja_marcadas conta só as
  -- que já estavam antecipadas; as recém-marcadas vêm de `novas`.
  SELECT x."venda_id", count(*) AS total, count(*) FILTER (WHERE x."antecipada") AS ja_marcadas
    FROM "parcelas_vencimento" x
   WHERE x."venda_id" IN (SELECT "venda_id" FROM novas)
   GROUP BY x."venda_id"
),
vendas_atualizadas AS (
  UPDATE "vendas" v
     SET "antecipada" = CASE WHEN ct.ja_marcadas + nv.n >= ct.total THEN 1 ELSE 3 END
    FROM contagem ct
    JOIN novas nv ON nv."venda_id" = ct."venda_id"
   WHERE v."id" = ct."venda_id"
     AND coalesce(v."antecipada", 0) <> 1
  RETURNING v."id"
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now() AT TIME ZONE 'UTC', 'Sistema (migração)', 'antecipacao:conciliacao-ate-agosto',
       json_build_object(
         'corte', '2026-08-31',
         'regra', 'venda em desconto em folha feita até 31/08/2026 já foi antecipada (André, 18/09/2026)',
         'lotes', (SELECT count(*) FROM lotes),
         'loteIds', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM lotes),
         'parcelas', (SELECT count(*) FROM marcadas),
         'vendas', (SELECT count(DISTINCT "venda_id") FROM marcadas),
         -- Soma em float8 arredondada no fim: pode diferir um centavo da soma dos `valor_total`
         -- dos lotes, que é feita centavo a centavo. Serve de conferência, não de fechamento.
         'valor', (SELECT coalesce(round(sum("valor_parcela")::numeric, 2), 0) FROM marcadas),
         'parcelasQueViraramPagas', (SELECT count(*) FROM marcadas WHERE NOT ja_paga),
         'vendasComFlagAtualizado', (SELECT count(*) FROM vendas_atualizadas),
         'parcelaIds', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM marcadas)
       )::text
 WHERE EXISTS (SELECT 1 FROM marcadas);

-- Rede de segurança contra escrita concorrente durante o rolling update. Total, vendas e ids do
-- lote saem do snapshot; se um envio pela tela tiver levado alguma parcela do recorte no meio, o
-- lote afirmaria dinheiro que não tem — e, no limite, nasceria sem nenhuma parcela, o estado que
-- `concluirLote` se recusa a criar. Aqui os três campos são reescritos a partir do que ficou
-- ligado de fato, e lote sem parcela é apagado. Numa execução tranquila nada muda e nada é
-- registrado; se mexer, fica em audit_logs, porque isso é anomalia que alguém precisa olhar.
WITH meus AS (
  SELECT b."id", b."valor_total", b."quantidade_vendas", b."venda_ids"
    FROM "antecipacao_batches" b
   WHERE b."origem" = 'conciliacao'
     AND b."observacao" LIKE 'Conciliação: vendas feitas até 31/08/2026%'
),
reais AS (
  SELECT m."id",
         m."valor_total",
         m."quantidade_vendas",
         m."venda_ids",
         (SELECT count(*) FROM "parcelas_vencimento" p WHERE p."antecipacao_lote_id" = m."id") AS parcelas,
         (SELECT count(DISTINCT p."venda_id") FROM "parcelas_vencimento" p WHERE p."antecipacao_lote_id" = m."id") AS vendas,
         (SELECT coalesce(sum(floor(p."valor_parcela" * 100 + 0.5)::bigint), 0)
            FROM "parcelas_vencimento" p WHERE p."antecipacao_lote_id" = m."id") AS centavos,
         (SELECT '[' || coalesce(string_agg(d."venda_id"::text, ',' ORDER BY d."venda_id"), '') || ']'
            FROM (SELECT DISTINCT p."venda_id" FROM "parcelas_vencimento" p WHERE p."antecipacao_lote_id" = m."id") d) AS ids
    FROM meus m
),
apagados AS (
  DELETE FROM "antecipacao_batches" b
   USING reais r
   WHERE b."id" = r."id" AND r.parcelas = 0
  RETURNING b."id"
),
ajustados AS (
  UPDATE "antecipacao_batches" b
     SET "valor_total" = (r.centavos / 100.0)::double precision,
         "quantidade_vendas" = r.vendas,
         "venda_ids" = r.ids
    FROM reais r
   WHERE b."id" = r."id"
     AND r.parcelas > 0
     AND (r."valor_total" <> (r.centavos / 100.0)::double precision
       OR r."quantidade_vendas" <> r.vendas
       OR r."venda_ids" <> r.ids)
  RETURNING b."id"
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now() AT TIME ZONE 'UTC', 'Sistema (migração)', 'antecipacao:conciliacao-ate-agosto-ajuste',
       json_build_object(
         'motivo', 'escrita concorrente durante a migração: lote reconciliado com as parcelas que ficaram ligadas',
         'lotesAjustados', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM ajustados),
         'lotesApagados', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM apagados)
       )::text
 WHERE EXISTS (SELECT 1 FROM ajustados) OR EXISTS (SELECT 1 FROM apagados);

-- O que ficou de fora, para conferência manual: sem este registro ninguém descobre que sobrou
-- parcela de venda antiga fora da conciliação. Rodar de novo não duplica o registro.
WITH antigas AS (
  SELECT p."id", p."venda_id", p."paga", p."origem_pagamento", p."antecipacao_lote_id", v."boleto", b."status" AS status_lote
    FROM "parcelas_vencimento" p
    JOIN "vendas" v ON v."id" = p."venda_id"
    LEFT JOIN "antecipacao_batches" b ON b."id" = p."antecipacao_lote_id"
   WHERE v."data_venda" < TIMESTAMP '2026-09-01 00:00:00'
     AND v."status" NOT IN ('cancelada', 'estornada')
     AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
     AND p."antecipada" = false
),
em_lote_aberto AS (
  SELECT "id" FROM antigas WHERE status_lote = 'em_andamento'
),
em_lote_fechado AS (
  -- Parcela pendurada em lote já fechado é anomalia: não entra em lote novo (a fila a exclui) e
  -- não seria vista se este balde não existisse.
  SELECT "id" FROM antigas WHERE status_lote IS NOT NULL AND status_lote <> 'em_andamento'
),
pagas_outra_origem AS (
  SELECT "id" FROM antigas
   WHERE "paga" = true AND coalesce("origem_pagamento", '-') <> 'prudent' AND "antecipacao_lote_id" IS NULL
),
com_boleto AS (
  SELECT "id" FROM antigas WHERE "boleto" = true AND "antecipacao_lote_id" IS NULL
),
sem_parcelas AS (
  SELECT v."id"
    FROM "vendas" v
   WHERE v."data_venda" < TIMESTAMP '2026-09-01 00:00:00'
     AND v."status" NOT IN ('cancelada', 'estornada')
     AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
     AND NOT EXISTS (SELECT 1 FROM "parcelas_vencimento" p WHERE p."venda_id" = v."id")
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now() AT TIME ZONE 'UTC', 'Sistema (migração)', 'antecipacao:conciliacao-ate-agosto-fora',
       json_build_object(
         'motivo', 'venda em folha até 31/08/2026 com parcela que a conciliação não podia marcar',
         'parcelasEmLoteAberto', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM em_lote_aberto),
         'parcelasEmLoteFechado', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM em_lote_fechado),
         'parcelasPagasOutraOrigem', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM pagas_outra_origem),
         'parcelasComBoleto', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM com_boleto),
         'vendasSemParcelas', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM sem_parcelas)
       )::text
 WHERE (EXISTS (SELECT 1 FROM em_lote_aberto)
     OR EXISTS (SELECT 1 FROM em_lote_fechado)
     OR EXISTS (SELECT 1 FROM pagas_outra_origem)
     OR EXISTS (SELECT 1 FROM com_boleto)
     OR EXISTS (SELECT 1 FROM sem_parcelas))
   AND NOT EXISTS (SELECT 1 FROM "audit_logs" a WHERE a."acao" = 'antecipacao:conciliacao-ate-agosto-fora');
