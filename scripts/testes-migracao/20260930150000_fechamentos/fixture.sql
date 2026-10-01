-- Antes da Fase 5: uma empresa com um cliente, uma venda de duas parcelas (uma antecipada, com
-- boleto) e um arquivo financeiro. A migração não pode mexer em nenhum deles.
INSERT INTO empresas_parceiras (id, nome) VALUES (1, 'AMAZON FIVE');
INSERT INTO clientes (id, nome, empresa, empresa_parceira_id) VALUES (1, 'CLIENTE A', 'AMAZON FIVE', 1);

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (61, 1, '2026-08-20 00:00:00', 600, 1, 0, 0, 2, 1, 'DESCONTO_FOLHA', true, false, 'ativa');

INSERT INTO antecipacao_batches (id, criada_em, venda_ids, valor_total, quantidade_vendas, status, origem) VALUES
 (20, '2026-09-23 10:00:00', '[61]', 300, 1, 'concluido', 'envio');

INSERT INTO boletos_prudent (id, lote_id, vencimento, valor_esperado, direcionamento, atualizado_em) VALUES
 (1, 20, '2026-10-10', 300, 'bfx', now());

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, origem_pagamento, antecipacao_lote_id, boleto_prudent_id) VALUES
 (80, 61, 1, '2026-10-10 00:00:00', 300, true,  true,  'prudent', 20, 1),
 (81, 61, 2, '2026-11-10 00:00:00', 300, false, false, NULL,      NULL, NULL);

INSERT INTO arquivos_financeiros (id, nome, content_type, tamanho, sha256, conteudo) VALUES
 (1, 'demonstrativo.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 4, 'abc', '\x504b0304');
