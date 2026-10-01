-- Parcelas que existem antes da Fase 3: duas vendas, três parcelas, uma delas num lote concluído.
-- Todas têm de sair da migração como confirmadas de origem legado.
INSERT INTO clientes (id, nome, empresa) VALUES (1, 'CLIENTE A', 'AMAZON FIVE');

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (61, 1, '2026-08-20 00:00:00', 600, 1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (62, 1, '2026-09-10 00:00:00', 300, 1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true, false, 'ativa');

INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, status, origem) VALUES
 (20, '2026-09-23 10:00:00', '[61]', 600, 1, 'concluido', 'envio');

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, antecipacao_lote_id) VALUES
 (80, 61, 1, '2026-10-10 00:00:00', 300, true,  true,  'prudent', 20),
 (81, 61, 2, '2026-11-10 00:00:00', 300, true,  true,  'prudent', 20),
 (82, 62, 1, '2026-10-10 00:00:00', 300, false, false, NULL,      NULL);
