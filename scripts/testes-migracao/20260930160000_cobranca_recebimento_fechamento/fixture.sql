-- Antes da Fase 6: uma empresa com CNPJ, um cliente, uma venda de duas parcelas reservadas num
-- fechamento enviado (versão 1, com o PDF guardado) e um arquivo de comprovante. A migração não
-- pode mexer em nenhum deles.
INSERT INTO empresas_parceiras (id, nome, cnpj) VALUES (1, 'AMAZON FIVE', '12.345.678/0001-90');
INSERT INTO clientes (id, nome, empresa, empresa_parceira_id) VALUES (1, 'CLIENTE A', 'AMAZON FIVE', 1);

INSERT INTO vendas (id, cliente_id, data_venda, "valorVenda", quantidade, valor_frete, desconto, parcelas, antecipada, forma_pagamento, desconto_em_folha, boleto, status) VALUES
 (61, 1, '2026-08-20 00:00:00', 600, 1, 0, 0, 2, 0, 'DESCONTO_FOLHA', true, false, 'ativa');

INSERT INTO fechamentos (id, empresa_parceira_id, competencia, status, versao_atual, atualizado_em) VALUES
 (1, 1, '2026-10', 'enviado', 1, now());

INSERT INTO arquivos_financeiros (id, nome, content_type, tamanho, sha256, conteudo) VALUES
 (1, 'demonstrativo.pdf', 'application/pdf', 4, 'abc', '\x25504446'),
 (2, 'comprovante.pdf', 'application/pdf', 4, 'def', '\x25504446');

INSERT INTO fechamento_versoes (id, fechamento_id, numero, total_bruto, total_ajustes, total_final, ajustes_json, pdf_arquivo_id, enviada_em) VALUES
 (1, 1, 1, 600, 0, 600, '[]', 1, now());

INSERT INTO parcelas_vencimento (id, venda_id, numero_parcela, data_vencimento, valor_parcela, paga, antecipada, fechamento_id) VALUES
 (80, 61, 1, '2026-10-10 00:00:00', 300, false, false, 1),
 (81, 61, 2, '2026-10-20 00:00:00', 300, false, false, 1);
