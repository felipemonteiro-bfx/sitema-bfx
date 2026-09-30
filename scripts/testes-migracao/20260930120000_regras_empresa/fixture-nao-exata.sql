-- Duplicata NÃO exata: a parcela 1 da venda 61 aparece duas vezes com valores diferentes (220 e
-- 230). Não é cópia — alguém precisa olhar —, então a migração não pode apagar nada e tem de
-- abortar com a venda no texto.
INSERT INTO clientes (id, nome, empresa) VALUES (1, 'CLIENTE A', 'AMAZON FIVE');
INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (61, 1, '2026-03-20 00:00:00', 220, 1, 0, 0, 1, 0, 'DESCONTO_FOLHA', true, false, 'ativa');
INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, data_pagamento, antecipacao_lote_id, asaas_payment_id, baixa_por) VALUES
 (70, 61, 1, '2026-04-30 00:00:00', 220, true, true, 'prudent', NULL, NULL, NULL, NULL),
 (71, 61, 1, '2026-04-30 00:00:00', 230, true, true, 'prudent', NULL, NULL, NULL, NULL);
