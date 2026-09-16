-- Backfill de vendas.valor_parcela (2026-09-16)
--
-- Por quê: até o commit 786146a, `updateVenda` gravava `parcelas` e o total, mas nunca
-- `valor_parcela`. Vendas editadas ficaram com a parcela da versão anterior (ex.: venda
-- 80, R$ 1.785 em 5x, com parcela 1.639), e o limite de crédito e o consignado contam
-- errado. Ver docs/superpowers/specs/2026-09-16-e-consignado-correcoes-auditoria.md, 9.1.
--
-- Alvo: parcela gravada difere de total/parcelas em mais de 2 centavos, a venda foi
-- editada (audit `venda:update`) e as linhas de vencimento batem com o cabeçalho
-- (mesma quantidade, ou pagamento único sem linhas). Fica de fora a venda 205: nunca foi
-- editada e tem 4 parcelas no cabeçalho contra 6 linhas — divergência de outra origem.
--
-- Valor novo: TRUNC(total / parcelas, 2), a mesma conta de criarVendaV2 e updateVenda.
-- Valores antigos: docs/backfills/2026-09-16-valor-parcela-antes.csv e uma linha
-- `venda:backfill_valor_parcela` em audit_logs por venda (de/para).
-- Os clientes afetados têm consignado_mes_ref zerado para a faixa ser recalculada no
-- próximo acesso a /cadastros.
--
-- Rodar: kubectl exec -i -n bfx bfx-db-0 -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < este-arquivo
BEGIN;

CREATE TEMP TABLE alvo ON COMMIT DROP AS
WITH tot AS (
  SELECT v.id, v.cliente_id, v.parcelas, v.valor_parcela,
         COALESCE((SELECT SUM(i.subtotal) FROM itens_venda i WHERE i.venda_id = v.id),
                  COALESCE(v."valorVenda", 0) * COALESCE(v.quantidade, 1))
         + COALESCE(v.valor_frete, 0) - COALESCE(v.desconto, 0) AS total,
         (SELECT COUNT(*) FROM parcelas_vencimento p WHERE p.venda_id = v.id) AS n_linhas,
         (SELECT COUNT(*) FROM audit_logs a
           WHERE a.acao = 'venda:update' AND a.detalhes LIKE '%"vendaId":' || v.id || ',%') AS n_edicoes
  FROM vendas v
)
SELECT id, cliente_id, valor_parcela AS de, TRUNC((total / parcelas)::numeric, 2)::double precision AS para
FROM tot
WHERE parcelas > 0
  AND ABS(COALESCE(valor_parcela, 0) - total / parcelas) > 0.02
  AND n_edicoes >= 1
  AND (n_linhas = parcelas OR (n_linhas = 0 AND parcelas = 1));

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM alvo;
  IF n <> 34 THEN
    RAISE EXCEPTION 'Backfill abortado: esperava 34 vendas, achou %', n;
  END IF;
END $$;

INSERT INTO audit_logs (data_hora, usuario, acao, detalhes)
SELECT NOW(), 'backfill-2026-09-16', 'venda:backfill_valor_parcela',
       json_build_object('vendaId', id, 'de', de, 'para', para)::text
FROM alvo;

UPDATE vendas v SET valor_parcela = a.para FROM alvo a WHERE v.id = a.id;

UPDATE clientes c SET consignado_mes_ref = NULL
WHERE c.id IN (SELECT cliente_id FROM alvo WHERE cliente_id IS NOT NULL);

SELECT COUNT(*) AS vendas_corrigidas FROM alvo;

COMMIT;
