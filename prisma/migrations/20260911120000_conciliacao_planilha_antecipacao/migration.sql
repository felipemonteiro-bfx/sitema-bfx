-- Conciliação com a planilha de controle da antecipação (2026-09-11).
--
-- A antecipação na Prudent vinha sendo controlada numa planilha ("CONTROLE ATUALIZADO DE
-- COMPRAS BFXSHOP - ESSÊNCIA DA MODA (AMAZON FIVE)"), fora do sistema: no banco nenhuma
-- parcela em desconto em folha estava com `antecipada = true`. As 211 parcelas abaixo são as
-- linhas "ANTECIPAÇÃO OK" da planilha que casaram com uma parcela do sistema (comprador por CPF
-- ou nome, mesmo número de parcela, valor com tolerância de R$ 0,05, vencimento no mês do
-- desconto ou no seguinte). Detalhes em .planning/quick/260911-cpl-conciliacao-planilha-e-visao-mensal/.
--
-- Guardas, para a migração nunca marcar o que não deve:
--   - a parcela tem de ser a mesma: id, venda e número da parcela (num banco com ids diferentes,
--     um restore, por exemplo, o id sozinho poderia apontar para outra parcela de mesmo valor);
--   - só parcela ainda com antecipada = false;
--   - só se o valor gravado ainda for o da conciliação (±R$ 0,01) — parcela editada depois fica;
--   - só venda ativa e em desconto em folha (o mesmo recorte de WHERE_VENDA_ANTECIPAVEL).
-- Depois o flag da venda segue a regra da action `antecipar` (todas → 1, algumas → 3), sem nunca
-- rebaixar venda que já está em 1. Um único comando: os CTEs de escrita rodam atomicamente, e
-- rodar de novo não muda nada. Fica registrado em audit_logs.
WITH conciliacao(id, venda_id, numero_parcela, valor) AS (
  VALUES
    (40, 52, 1, 219.00),
    (47, 57, 1, 120.00),
    (59, 61, 1, 350.00),
    (60, 61, 2, 350.00),
    (61, 61, 3, 350.00),
    (62, 61, 4, 350.00),
    (67, 64, 1, 450.00),
    (68, 64, 2, 450.00),
    (69, 64, 3, 450.00),
    (70, 64, 4, 450.00),
    (81, 68, 1, 199.00),
    (82, 68, 2, 199.00),
    (136, 83, 2, 370.00),
    (137, 83, 3, 370.00),
    (138, 83, 4, 370.00),
    (162, 89, 2, 450.00),
    (163, 89, 3, 450.00),
    (164, 89, 4, 450.00),
    (165, 89, 5, 450.00),
    (166, 91, 1, 337.50),
    (167, 91, 2, 337.50),
    (168, 91, 3, 337.50),
    (169, 91, 4, 337.50),
    (180, 65, 1, 312.50),
    (181, 65, 2, 312.50),
    (182, 65, 3, 312.50),
    (183, 65, 4, 312.50),
    (184, 94, 1, 331.25),
    (185, 94, 2, 331.25),
    (186, 94, 3, 331.25),
    (187, 94, 4, 331.25),
    (189, 95, 2, 170.00),
    (190, 59, 1, 237.50),
    (191, 59, 2, 237.50),
    (192, 59, 3, 237.50),
    (193, 59, 4, 237.50),
    (194, 97, 1, 197.50),
    (195, 97, 2, 197.50),
    (196, 97, 3, 197.50),
    (197, 97, 4, 197.50),
    (236, 58, 1, 235.00),
    (237, 58, 2, 235.00),
    (238, 60, 1, 450.00),
    (239, 60, 2, 450.00),
    (240, 60, 3, 450.00),
    (241, 60, 4, 450.00),
    (242, 60, 5, 450.00),
    (255, 101, 1, 400.00),
    (256, 101, 2, 400.00),
    (257, 101, 3, 400.00),
    (258, 101, 4, 400.00),
    (259, 101, 5, 400.00),
    (260, 102, 1, 349.75),
    (261, 102, 2, 349.75),
    (262, 102, 3, 349.75),
    (263, 102, 4, 349.75),
    (276, 93, 1, 287.50),
    (277, 93, 2, 287.50),
    (278, 93, 3, 287.50),
    (279, 93, 4, 287.50),
    (284, 104, 1, 370.00),
    (285, 104, 2, 370.00),
    (286, 104, 3, 370.00),
    (287, 104, 4, 370.00),
    (288, 105, 1, 399.75),
    (289, 105, 2, 399.75),
    (290, 105, 3, 399.75),
    (291, 105, 4, 399.75),
    (327, 144, 1, 245.00),
    (328, 144, 2, 245.00),
    (329, 144, 3, 245.00),
    (330, 144, 4, 245.00),
    (335, 145, 1, 237.50),
    (336, 145, 2, 237.50),
    (337, 145, 3, 237.50),
    (338, 145, 4, 237.50),
    (401, 148, 1, 310.00),
    (402, 148, 2, 310.00),
    (403, 148, 3, 310.00),
    (404, 148, 4, 310.00),
    (405, 148, 5, 310.00),
    (507, 167, 1, 450.00),
    (508, 167, 2, 450.00),
    (509, 167, 3, 450.00),
    (510, 167, 4, 450.00),
    (523, 168, 1, 245.00),
    (524, 168, 2, 245.00),
    (525, 168, 3, 245.00),
    (526, 168, 4, 245.00),
    (527, 169, 1, 450.00),
    (528, 169, 2, 450.00),
    (529, 169, 3, 450.00),
    (530, 169, 4, 450.00),
    (531, 171, 1, 280.00),
    (532, 171, 2, 280.00),
    (533, 171, 3, 280.00),
    (538, 172, 1, 290.00),
    (539, 172, 2, 290.00),
    (540, 172, 3, 290.00),
    (541, 172, 4, 290.00),
    (542, 173, 1, 450.00),
    (543, 173, 2, 450.00),
    (544, 173, 3, 450.00),
    (545, 173, 4, 450.00),
    (546, 174, 1, 206.66),
    (547, 174, 2, 206.68),
    (548, 174, 3, 206.66),
    (549, 175, 1, 238.33),
    (550, 175, 2, 238.33),
    (551, 175, 3, 238.34),
    (552, 176, 1, 392.50),
    (553, 176, 2, 392.50),
    (554, 176, 3, 392.50),
    (555, 176, 4, 392.50),
    (556, 177, 1, 295.00),
    (558, 177, 3, 295.00),
    (559, 177, 4, 295.00),
    (560, 178, 1, 293.33),
    (561, 178, 2, 293.33),
    (562, 178, 3, 293.34),
    (566, 180, 1, 425.00),
    (567, 180, 2, 425.00),
    (568, 180, 3, 425.00),
    (569, 180, 4, 425.00),
    (570, 181, 1, 512.50),
    (571, 181, 2, 512.50),
    (572, 181, 3, 512.50),
    (573, 181, 4, 512.50),
    (592, 188, 1, 57.50),
    (593, 188, 2, 57.50),
    (594, 188, 3, 57.50),
    (595, 188, 4, 57.50),
    (596, 190, 1, 255.00),
    (597, 190, 2, 255.00),
    (606, 193, 1, 375.00),
    (607, 193, 2, 375.00),
    (608, 193, 3, 375.00),
    (609, 193, 4, 375.00),
    (636, 199, 1, 110.00),
    (637, 199, 2, 110.00),
    (638, 199, 3, 110.00),
    (639, 199, 4, 110.00),
    (642, 202, 1, 175.00),
    (643, 202, 2, 175.00),
    (693, 214, 1, 360.00),
    (694, 214, 2, 360.00),
    (695, 214, 3, 360.00),
    (696, 214, 4, 360.00),
    (697, 214, 5, 360.00),
    (713, 204, 1, 276.66),
    (714, 204, 2, 276.66),
    (715, 204, 3, 276.68),
    (716, 218, 1, 215.00),
    (717, 218, 2, 215.00),
    (724, 220, 1, 205.00),
    (725, 220, 2, 205.00),
    (726, 220, 3, 205.00),
    (727, 220, 4, 205.00),
    (786, 206, 1, 333.33),
    (787, 206, 2, 333.33),
    (788, 206, 3, 333.33),
    (789, 206, 4, 333.33),
    (790, 206, 5, 333.33),
    (792, 197, 1, 291.42),
    (793, 197, 2, 291.42),
    (794, 197, 3, 291.42),
    (795, 197, 4, 291.42),
    (796, 197, 5, 291.42),
    (809, 225, 1, 400.00),
    (810, 225, 2, 400.00),
    (811, 225, 3, 400.00),
    (812, 225, 4, 400.00),
    (819, 227, 1, 200.00),
    (820, 227, 2, 200.00),
    (829, 230, 1, 250.00),
    (830, 230, 2, 250.00),
    (831, 230, 3, 250.00),
    (832, 231, 1, 175.00),
    (833, 231, 2, 175.00),
    (838, 233, 1, 405.00),
    (839, 233, 2, 405.00),
    (840, 233, 3, 405.00),
    (841, 233, 4, 405.00),
    (842, 229, 1, 155.00),
    (843, 229, 2, 155.00),
    (844, 229, 3, 155.00),
    (845, 229, 4, 155.00),
    (849, 234, 1, 25.00),
    (850, 234, 2, 25.00),
    (851, 234, 3, 25.00),
    (865, 235, 1, 195.00),
    (866, 235, 2, 370.00),
    (867, 235, 3, 370.00),
    (870, 236, 1, 240.00),
    (871, 236, 2, 240.00),
    (872, 236, 3, 240.00),
    (960, 224, 1, 116.67),
    (961, 224, 2, 116.67),
    (962, 224, 3, 116.67),
    (963, 224, 4, 116.67),
    (965, 226, 1, 400.00),
    (966, 226, 2, 400.00),
    (967, 226, 3, 400.00),
    (976, 228, 1, 206.33),
    (977, 228, 2, 206.33),
    (978, 228, 3, 206.34),
    (979, 232, 1, 100.00),
    (980, 232, 2, 100.00),
    (983, 238, 1, 100.00),
    (985, 238, 3, 100.00),
    (986, 238, 4, 100.00)
),
marcadas AS (
  UPDATE parcelas_vencimento p
     SET antecipada = true
    FROM conciliacao c, vendas v
   WHERE p.id = c.id
     AND p.venda_id = c.venda_id
     AND p.numero_parcela = c.numero_parcela
     AND v.id = p.venda_id
     AND p.antecipada = false
     AND abs(p.valor_parcela - c.valor::double precision) < 0.01
     AND v.status = 'ativa'
     AND (v.forma_pagamento = 'DESCONTO_FOLHA' OR (v.forma_pagamento IS NULL AND v.desconto_em_folha))
  RETURNING p.id, p.venda_id, p.valor_parcela
),
novas AS (
  SELECT venda_id, count(*) AS n FROM marcadas GROUP BY venda_id
),
contagem AS (
  -- Retrato anterior ao UPDATE acima (os CTEs enxergam o mesmo snapshot): ja_marcadas conta só
  -- as que já estavam antecipadas; as recém-marcadas vêm de `novas`.
  SELECT x.venda_id, count(*) AS total, count(*) FILTER (WHERE x.antecipada) AS ja_marcadas
    FROM parcelas_vencimento x
   WHERE x.venda_id IN (SELECT venda_id FROM novas)
   GROUP BY x.venda_id
),
vendas_atualizadas AS (
  UPDATE vendas v
     SET antecipada = CASE WHEN ct.ja_marcadas + nv.n >= ct.total THEN 1 ELSE 3 END
    FROM contagem ct
    JOIN novas nv ON nv.venda_id = ct.venda_id
   WHERE v.id = ct.venda_id
     AND coalesce(v.antecipada, 0) <> 1
  RETURNING v.id
)
INSERT INTO audit_logs (data_hora, usuario, acao, detalhes)
SELECT now(), 'Sistema (migração)', 'antecipacao:conciliacao-planilha',
       json_build_object(
         'conciliadoEm', '2026-09-11',
         'parcelasNaLista', 211,
         'parcelasMarcadas', (SELECT count(*) FROM marcadas),
         'valorMarcado', (SELECT coalesce(round(sum(valor_parcela)::numeric, 2), 0) FROM marcadas),
         'vendasComFlagAtualizado', (SELECT count(*) FROM vendas_atualizadas),
         'parcelaIds', (SELECT coalesce(json_agg(id ORDER BY id), '[]'::json) FROM marcadas)
       )::text;
