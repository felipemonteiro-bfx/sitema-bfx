-- Conferência da deduplicação de parcelas exatas da migração 20260930120000_regras_empresa.
-- Falha com exceção na primeira divergência; imprime OK no fim.
DO $$
DECLARE
  esperado text;
  obtido text;
  n int;
  det json;
BEGIN
  -- 1. Uma linha por grupo: 38 (menor id, ambas no lote), 41 (a do lote), 42 (menor id).
  SELECT string_agg(format('%s|%s|%s|%s', id, venda_id, numero_parcela, coalesce(antecipacao_lote_id::text, '-')), E'\n' ORDER BY id)
    INTO obtido FROM parcelas_vencimento;
  esperado := concat_ws(E'\n',
    '38|51|1|13', '41|52|1|13', '42|53|1|13', '44|54|1|13', '45|54|2|13', '46|55|1|14', '47|55|2|14');
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'parcelas divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  -- 2. Lote 13 sem as cópias 39 e 43 (1769 - 475); lote 14 intocado.
  SELECT string_agg(format('%s|%s', id, valor_total), ',' ORDER BY id) INTO obtido FROM antecipacao_batches;
  IF obtido IS DISTINCT FROM '13|1294,14|500' THEN
    RAISE EXCEPTION 'valor_total dos lotes diverge: %', obtido;
  END IF;
  -- O valor gravado fecha com as parcelas que ficaram no lote.
  SELECT count(*) INTO n FROM antecipacao_batches b
   WHERE b.valor_total <> (SELECT sum(valor_parcela) FROM parcelas_vencimento p WHERE p.antecipacao_lote_id = b.id);
  IF n <> 0 THEN RAISE EXCEPTION 'lote com valor_total diferente da soma das parcelas: %', n; END IF;

  -- 3. Um registro de auditoria, com as três linhas apagadas e o lote ajustado.
  SELECT count(*) INTO n FROM audit_logs WHERE acao = 'parcelas:dedup-duplicatas-exatas';
  IF n <> 1 THEN RAISE EXCEPTION 'audit_logs: esperado 1 registro, obtido %', n; END IF;
  SELECT detalhes::json INTO det FROM audit_logs WHERE acao = 'parcelas:dedup-duplicatas-exatas';
  SELECT string_agg(e->>'id', ',' ORDER BY (e->>'id')::int) INTO obtido FROM json_array_elements(det->'apagadas') e;
  IF obtido IS DISTINCT FROM '39,40,43' THEN RAISE EXCEPTION 'audit: apagadas = %', obtido; END IF;
  SELECT format('%s|%s|%s|%s', e->>'id', e->>'valorAnterior', e->>'abatido', e->>'valorTotal') INTO obtido
    FROM json_array_elements(det->'lotesAjustados') e;
  IF obtido IS DISTINCT FROM '13|1769|475|1294' OR json_array_length(det->'lotesAjustados') <> 1 THEN
    RAISE EXCEPTION 'audit: lotesAjustados = %', det->'lotesAjustados';
  END IF;
  IF (SELECT usuario FROM audit_logs WHERE acao = 'parcelas:dedup-duplicatas-exatas') <> 'Sistema (migração)' THEN
    RAISE EXCEPTION 'audit: usuario errado';
  END IF;

  -- 4. O resto da migração entrou: a unique e a tabela de regras.
  PERFORM 1 FROM pg_indexes WHERE indexname = 'parcelas_vencimento_venda_id_numero_parcela_key';
  IF NOT FOUND THEN RAISE EXCEPTION 'unique (venda_id, numero_parcela) não foi criada'; END IF;
  PERFORM 1 FROM information_schema.tables WHERE table_name = 'regras_empresa';
  IF NOT FOUND THEN RAISE EXCEPTION 'tabela regras_empresa não foi criada'; END IF;

  RAISE NOTICE 'OK — duplicatas exatas deduplicadas, lote ajustado, 1 audit, unique criada';
END $$;
