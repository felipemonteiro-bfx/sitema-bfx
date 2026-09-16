-- Venda 205: cabeçalho com 4 parcelas contra 6 linhas de vencimento (2026-09-16)
--
-- Evidências de 6x: 6 linhas (set/26 a fev/27) de R$ 386,66; valor_parcela 386,66 = 2.320 / 6;
-- soma das linhas R$ 2.319,96 = total. Nada guarda R$ 580 (o que seria 4x). Sem audit de
-- criação nem de edição. Decisão do André: 6x. Só o campo `parcelas` muda.
--
-- Rodar: kubectl exec -i -n bfx bfx-db-0 -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < este-arquivo
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT COUNT(*) INTO n FROM vendas v
   WHERE v.id = 205 AND v.parcelas = 4
     AND (SELECT COUNT(*) FROM parcelas_vencimento p WHERE p.venda_id = 205) = 6;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Abortado: venda 205 não está no estado esperado (4 parcelas e 6 linhas)';
  END IF;
END $$;

INSERT INTO audit_logs (data_hora, usuario, acao, detalhes)
VALUES (NOW(), 'backfill-2026-09-16', 'venda:backfill_parcelas',
        json_build_object('vendaId', 205, 'de', 4, 'para', 6)::text);

UPDATE vendas SET parcelas = 6 WHERE id = 205;

UPDATE clientes SET consignado_mes_ref = NULL
 WHERE id = (SELECT cliente_id FROM vendas WHERE id = 205);

SELECT id, parcelas, valor_parcela,
       (SELECT COUNT(*) FROM parcelas_vencimento p WHERE p.venda_id = 205) AS linhas
  FROM vendas WHERE id = 205;

COMMIT;
