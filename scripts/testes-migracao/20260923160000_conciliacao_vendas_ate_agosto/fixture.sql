-- Estado anterior à conciliação "vendas até 31/08/2026 já antecipadas" (2026-09-23).
--
-- Cobre o recorte inteiro: as duas bordas da data (inclusive com hora, não só meia-noite), empresa
-- repetida escrita de outro jeito e empresa compartilhada por dois clientes (o lote é por empresa,
-- não por cliente), venda sem cliente, forma de pagamento fora do convênio inclusive com o flag
-- legado ligado, venda cancelada e estornada, flag legado da venda, parcela já antecipada, parcela
-- em lote aberto e em lote fechado, parcela quitada por outra origem, venda com boleto e venda sem
-- parcelas.
INSERT INTO clientes (id, nome, empresa) VALUES
 (1, 'CLIENTE A', 'AMAZON FIVE'),
 (2, 'CLIENTE B', '  amazon five '),   -- mesma empresa, grafia diferente: cartão e lote próprios
 (3, 'CLIENTE C', 'ESSENCIA DA MODA'),
 (4, 'CLIENTE D', NULL),               -- sem empresa
 (5, 'CLIENTE E', 'ESSENCIA DA MODA'); -- mesma empresa do cliente 3: um lote só para os dois

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 -- Entram
 (1,  1,    '2026-06-15 00:00:00', 900,  1, 0, 0, 3, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (2,  2,    '2026-08-31 00:00:00', 301,  1, 0, 0, 2, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (6,  3,    '2026-04-10 00:00:00', 100,  1, 0, 0, 3, 0, NULL,             true,  false, 'ativa'),
 (7,  3,    '2026-07-01 00:00:00', 1000, 1, 0, 0, 4, 3, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (9,  4,    '2026-03-10 00:00:00', 400,  1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (11, 1,    '2026-08-05 00:00:00', 240,  1, 0, 0, 2, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (12, 1,    '2026-06-01 00:00:00', 160,  1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (13, 5,    '2026-08-31 23:30:00', 90,   1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (17, NULL, '2026-06-10 00:00:00', 70,   1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (19, 1,    '2026-06-20 00:00:00', 120,  1, 0, 0, 2, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 -- Ficam de fora
 (3,  1,    '2026-09-01 00:00:00', 100,  1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (14, 5,    '2026-09-01 02:00:00', 90,   1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (4,  3,    '2026-05-10 00:00:00', 200,  1, 0, 0, 2, 0, 'CARTAO_CREDITO', false, false, 'ativa'),
 (16, 3,    '2026-05-10 00:00:00', 100,  1, 0, 0, 1, 0, 'CARTAO_CREDITO', true,  false, 'ativa'),
 (5,  3,    '2026-05-10 00:00:00', 100,  1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'cancelada'),
 (15, 3,    '2026-05-10 00:00:00', 100,  1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'estornada'),
 (8,  1,    '2026-07-20 00:00:00', 400,  1, 0, 0, 2, 2, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (18, 1,    '2026-07-15 00:00:00', 110,  1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  true,  'ativa'),
 (10, 4,    '2026-02-10 00:00:00', 500,  1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true,  false, 'ativa');

-- Lote em andamento (as parcelas não podem ser tocadas) e lote já fechado com parcela pendurada
-- sem antecipação (anomalia que o registro do que ficou de fora tem de mostrar).
INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, periodo_descricao, status, origem, concluida_em, concluida_por) VALUES
 (10, '2026-09-20 10:00:00', '[8]',  400, 1, 'set. de 2026 - out. de 2026', 'em_andamento', 'envio', NULL, NULL),
 (11, '2026-09-05 10:00:00', '[19]', 60,  1, 'set. de 2026',                'concluido',    'envio', '2026-09-08 00:00:00', 'Andre');

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, data_pagamento, antecipacao_lote_id, asaas_payment_id) VALUES
 -- V1: três em aberto, uma já vencida
 (1,  1,  1, '2026-07-10 00:00:00', 300,    false, false, NULL,      NULL,                  NULL, NULL),
 (2,  1,  2, '2026-08-10 00:00:00', 300,    false, false, NULL,      NULL,                  NULL, NULL),
 (3,  1,  3, '2026-09-10 00:00:00', 300,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V2: venda no último dia de agosto (borda inclusiva)
 (4,  2,  1, '2026-10-10 00:00:00', 150.50, false, false, NULL,      NULL,                  NULL, NULL),
 (5,  2,  2, '2026-11-10 00:00:00', 150.50, false, false, NULL,      NULL,                  NULL, NULL),
 -- V3: venda de 01/09 (borda exclusiva)
 (6,  3,  1, '2026-10-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V4: cartão de crédito sem flag de folha
 (7,  4,  1, '2026-09-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 (8,  4,  2, '2026-10-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V5: venda cancelada
 (9,  5,  1, '2026-09-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V6: forma nula com o flag legado de folha; centavos do resto na última
 (10, 6,  1, '2026-05-10 00:00:00', 33.33,  false, false, NULL,      NULL,                  NULL, NULL),
 (11, 6,  2, '2026-06-10 00:00:00', 33.33,  false, false, NULL,      NULL,                  NULL, NULL),
 (12, 6,  3, '2026-07-10 00:00:00', 33.34,  false, false, NULL,      NULL,                  NULL, NULL),
 -- V7: uma antecipada (conciliação de 11/09), uma com baixa manual, duas em aberto
 (13, 7,  1, '2026-08-10 00:00:00', 250,    true,  true,  'prudent', NULL,                  NULL, NULL),
 (14, 7,  2, '2026-09-10 00:00:00', 250,    true,  false, 'manual',  '2026-09-15 00:00:00', NULL, NULL),
 (15, 7,  3, '2026-10-10 00:00:00', 250,    false, false, NULL,      NULL,                  NULL, NULL),
 (16, 7,  4, '2026-11-10 00:00:00', 250,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V8: parcelas num lote em andamento
 (17, 8,  1, '2026-09-10 00:00:00', 200,    false, false, NULL,      NULL,                  10,   NULL),
 (18, 8,  2, '2026-10-10 00:00:00', 200,    false, false, NULL,      NULL,                  10,   NULL),
 -- V9: carga da Prudent de 16/09 (paga sem antecipada, sem data), flag legado 1
 (19, 9,  1, '2026-04-10 00:00:00', 200,    true,  false, 'prudent', NULL,                  NULL, NULL),
 (20, 9,  2, '2026-05-10 00:00:00', 200,    true,  false, 'prudent', NULL,                  NULL, NULL),
 -- V11: uma quitada por boleto do Asaas, uma em aberto
 (21, 11, 1, '2026-09-10 00:00:00', 120,    true,  false, 'asaas',   '2026-09-11 00:00:00', NULL, 'pay_1'),
 (22, 11, 2, '2026-10-10 00:00:00', 120,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V12: flag legado 1 com uma baixa manual — o flag não pode ser rebaixado
 (23, 12, 1, '2026-07-10 00:00:00', 80,     true,  false, 'manual',  '2026-07-12 00:00:00', NULL, NULL),
 (24, 12, 2, '2026-08-10 00:00:00', 80,     false, false, NULL,      NULL,                  NULL, NULL),
 -- V13: outro cliente da ESSENCIA DA MODA, venda às 23:30 de 31/08 (entra)
 (25, 13, 1, '2026-10-10 00:00:00', 90,     false, false, NULL,      NULL,                  NULL, NULL),
 -- V14: 01/09 às 02:00 (fica fora)
 (26, 14, 1, '2026-10-10 00:00:00', 90,     false, false, NULL,      NULL,                  NULL, NULL),
 -- V15: venda estornada
 (27, 15, 1, '2026-09-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V16: forma de cartão E flag legado de folha ligado — a forma é quem manda
 (28, 16, 1, '2026-09-10 00:00:00', 100,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V17: venda sem cliente (entra no lote "Sem empresa")
 (29, 17, 1, '2026-09-10 00:00:00', 70,     false, false, NULL,      NULL,                  NULL, NULL),
 -- V18: venda com boleto vivo no Asaas: não pode virar paga pela Prudent
 (30, 18, 1, '2026-09-10 00:00:00', 110,    false, false, NULL,      NULL,                  NULL, NULL),
 -- V19: uma parcela pendurada em lote já fechado (anomalia), outra em aberto
 (31, 19, 1, '2026-09-10 00:00:00', 60,     false, false, NULL,      NULL,                  11,   NULL),
 (32, 19, 2, '2026-10-10 00:00:00', 60,     false, false, NULL,      NULL,                  NULL, NULL);

SELECT setval(pg_get_serial_sequence('clientes', 'id'), 100);
SELECT setval(pg_get_serial_sequence('vendas', 'id'), 100);
SELECT setval(pg_get_serial_sequence('parcelas_vencimento', 'id'), 100);
SELECT setval(pg_get_serial_sequence('antecipacao_batches', 'id'), 100);
