-- Vendas de exemplo para a migração 20260917180000_parcelas_venda_folha_sem_linhas.
INSERT INTO vendas (id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (1,  '2026-08-15 00:00:00', NULL,   1, 15, 5, 1,    0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (2,  '2026-07-12 00:00:00', 100.01, 1, 0,  0, 3,    0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (3,  '2026-08-25 00:00:00', 50,     2, 0,  0, 2,    0,    NULL,             true,  false, 'ativa'),
 (4,  '2026-06-05 00:00:00', 200,    1, 0,  0, 2,    1,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (5,  '2026-08-15 00:00:00', 150,    1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'cancelada'),
 (6,  '2026-08-15 00:00:00', 150,    1, 0,  0, 1,    0,    'PIX',            false, false, 'ativa'),
 (7,  '2026-08-15 00:00:00', 150,    1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (8,  '2026-08-15 00:00:00', 0,      1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (9,  '2026-08-15 00:00:00', 150,    1, 0,  0, 1,    0,    NULL,             true,  true,  'ativa'),
 (10, '2026-08-15 00:00:00', 70,     1, 0,  0, 1,    NULL, 'DESCONTO_FOLHA', true,  false, 'ativa'),
 (11, '2026-12-25 00:00:00', 99.9,   1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (12, '2026-08-20 23:30:00', 60,     1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'estornada'),
 (13, '2026-08-20 23:30:00', 80,     1, 0,  0, NULL, 0,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (14, '2026-08-15 00:00:00', 300,    1, 0,  0, 3,    3,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (15, '2026-08-15 00:00:00', 300,    1, 0,  0, 3,    2,    'DESCONTO_FOLHA', true,  false, 'ativa'),
 (16, '2026-08-15 00:00:00', 1.005,  1, 0,  0, 1,    0,    'DESCONTO_FOLHA', true,  false, 'ativa');
INSERT INTO itens_venda (venda_id, produto_nome, custo_produto, valor_venda, quantidade, subtotal) VALUES
 (1, 'FRITADEIRA', 80, 70, 2, 140);
INSERT INTO parcelas_vencimento (venda_id, numero_parcela, data_vencimento, valor_parcela, paga) VALUES
 (7, 1, '2026-09-10 00:00:00', 149.99, false);
SELECT setval(pg_get_serial_sequence('vendas', 'id'), 100);
