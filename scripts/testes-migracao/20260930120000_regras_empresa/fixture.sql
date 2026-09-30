-- Duplicatas exatas de parcela como estão na produção em 30/09/2026 (consulta só-leitura no VKE).
--
-- Vendas 51, 52 e 53 são 1x com a parcela 1 gravada duas vezes (ids 38–43, mesmos valores da
-- produção). Na 52 as duas linhas só diferem no lote: a 40 não tem lote, a 41 está no lote 13 —
-- tem de sobrar a 41. O lote 13 (conciliação, concluído) soma as cópias 39 e 43 no valor_total,
-- como na produção (lá 9.624,88 com 33 parcelas; aqui as parcelas da venda 54 fazem o papel das
-- outras). Venda 55 e lote 14 não têm duplicata e não podem mudar.
INSERT INTO clientes (id, nome, empresa) VALUES (1, 'CLIENTE A', 'AMAZON FIVE');

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (51, 1, '2026-03-20 00:00:00', 220, 1, 0, 0, 1, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (52, 1, '2026-03-20 00:00:00', 219, 1, 0, 0, 1, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (53, 1, '2026-03-20 00:00:00', 255, 1, 0, 0, 1, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (54, 1, '2026-03-20 00:00:00', 600, 1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (55, 1, '2026-06-10 00:00:00', 500, 1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true, false, 'ativa');

-- 13: 220 + 220 + 219 + 255 + 255 + 300 + 300 = 1769 (com as cópias 39 e 43; a 40 está fora do lote).
INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, periodo_descricao, status, origem, concluida_em, concluida_por) VALUES
 (13, '2026-09-23 10:00:00', '[51,52,53,54]', 1769, 4, 'abr. de 2026 - mai. de 2026', 'concluido', 'conciliacao', '2026-09-18 00:00:00', 'Sistema (migração)'),
 (14, '2026-09-23 10:00:00', '[55]',          500,  1, 'jul. de 2026 - ago. de 2026', 'concluido', 'conciliacao', '2026-09-18 00:00:00', 'Sistema (migração)');

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, data_pagamento, antecipacao_lote_id, asaas_payment_id, baixa_por) VALUES
 (38, 51, 1, '2026-04-30 00:00:00', 220, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (39, 51, 1, '2026-04-30 00:00:00', 220, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (40, 52, 1, '2026-04-30 00:00:00', 219, true, true, 'prudent', NULL, NULL, NULL, NULL),
 (41, 52, 1, '2026-04-30 00:00:00', 219, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (42, 53, 1, '2026-04-30 00:00:00', 255, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (43, 53, 1, '2026-04-30 00:00:00', 255, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (44, 54, 1, '2026-04-30 00:00:00', 300, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (45, 54, 2, '2026-05-30 00:00:00', 300, true, true, 'prudent', NULL, 13,   NULL, NULL),
 (46, 55, 1, '2026-07-10 00:00:00', 250, true, true, 'prudent', NULL, 14,   NULL, NULL),
 (47, 55, 2, '2026-08-10 00:00:00', 250, true, true, 'prudent', NULL, 14,   NULL, NULL);
SELECT setval(pg_get_serial_sequence('parcelas_vencimento', 'id'), 100);
SELECT setval(pg_get_serial_sequence('antecipacao_batches', 'id'), 100);
