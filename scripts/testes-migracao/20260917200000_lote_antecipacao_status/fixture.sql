-- Estado anterior à migração: um lote do comportamento antigo (tudo marcado no clique) e uma
-- parcela dele já antecipada.
INSERT INTO vendas (id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (1, '2026-07-12 00:00:00', 900, 1, 0, 0, 3, 1, 'DESCONTO_FOLHA', true, false, 'ativa');
INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento) VALUES
 (1, 1, 1, '2026-08-10 00:00:00', 300, true, true, 'prudent'),
 (2, 1, 2, '2026-09-10 00:00:00', 300, true, true, 'prudent'),
 (3, 1, 3, '2026-10-10 00:00:00', 300, true, true, 'prudent');
INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, periodo_descricao) VALUES
 (1, '2026-08-01 10:00:00', '[1]', 900, 1, 'ago/2026 - out/2026');
SELECT setval(pg_get_serial_sequence('vendas', 'id'), 100);
SELECT setval(pg_get_serial_sequence('parcelas_vencimento', 'id'), 100);
SELECT setval(pg_get_serial_sequence('antecipacao_batches', 'id'), 100);
