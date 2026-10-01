-- Antes da Fase 4: um lote concluído com duas parcelas antecipadas (sem boleto) e um lote em
-- andamento. A migração não pode mexer em nenhuma delas.
INSERT INTO clientes (id, nome, empresa) VALUES (1, 'CLIENTE A', 'AMAZON FIVE');

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (61, 1, '2026-08-20 00:00:00', 600, 1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true, false, 'ativa'),
 (62, 1, '2026-09-10 00:00:00', 300, 1, 0, 0, 1, 2, 'DESCONTO_FOLHA', true, false, 'ativa');

INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, status, origem) VALUES
 (20, '2026-09-23 10:00:00', '[61]', 600, 1, 'concluido', 'envio'),
 (21, '2026-09-29 10:00:00', '[62]', 300, 1, 'em_andamento', 'envio');

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, antecipacao_lote_id) VALUES
 (80, 61, 1, '2026-10-10 00:00:00', 300, true,  true,  'prudent', 20),
 (81, 61, 2, '2026-11-10 00:00:00', 300, true,  true,  'prudent', 20),
 (82, 62, 1, '2026-10-10 00:00:00', 300, false, false, NULL,      21);

-- A tabela config já nasce com a linha 1 (migrações anteriores).
