-- Conferência da migração 20260930130000_confirmacao_rh_e_lote.
-- Falha com exceção na primeira divergência; imprime OK no fim.
DO $$
DECLARE
  obtido text;
  n int;
  det json;
BEGIN
  -- 1. As três parcelas anteriores viraram confirmadas de origem legado, com data, sem envio ao RH.
  SELECT string_agg(format('%s|%s|%s|%s|%s|%s', id, confirmacao_rh, confirmacao_origem,
                           (confirmacao_em IS NOT NULL), coalesce(enviada_rh_em::text, '-'),
                           coalesce(confirmacao_por, '-')), ',' ORDER BY id)
    INTO obtido FROM parcelas_vencimento;
  IF obtido IS DISTINCT FROM '80|confirmada|legado|t|-|-,81|confirmada|legado|t|-|-,82|confirmada|legado|t|-|-' THEN
    RAISE EXCEPTION 'parcelas divergem: %', obtido;
  END IF;

  -- 2. Nada mais nas parcelas mudou (lote, paga, antecipada).
  SELECT string_agg(format('%s|%s|%s|%s', id, paga, antecipada, coalesce(antecipacao_lote_id::text, '-')), ',' ORDER BY id)
    INTO obtido FROM parcelas_vencimento;
  IF obtido IS DISTINCT FROM '80|t|t|20,81|t|t|20,82|f|f|-' THEN
    RAISE EXCEPTION 'campos antigos das parcelas mudaram: %', obtido;
  END IF;

  -- 3. Lote antigo com as colunas novas nulas.
  SELECT count(*) INTO n FROM antecipacao_batches
   WHERE empresa_parceira_id IS NULL AND taxa_mensal IS NULL AND valor_liquido_solicitado IS NULL
     AND valor_aprovado IS NULL AND valor_depositado IS NULL AND data_deposito_prevista IS NULL
     AND data_deposito IS NULL AND comprovante_key IS NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'lote antigo com coluna nova preenchida'; END IF;

  -- 4. Um audit com a contagem.
  SELECT count(*) INTO n FROM audit_logs WHERE acao = 'prudent:confirmacao-rh-legado';
  IF n <> 1 THEN RAISE EXCEPTION 'audit_logs: esperado 1 registro, obtido %', n; END IF;
  SELECT detalhes::json INTO det FROM audit_logs WHERE acao = 'prudent:confirmacao-rh-legado';
  IF (det->>'parcelas') <> '3' OR (det->>'vendas') <> '2' THEN
    RAISE EXCEPTION 'audit: detalhes = %', det;
  END IF;

  -- 5. O índice existe.
  SELECT count(*) INTO n FROM pg_indexes WHERE indexname = 'parcelas_vencimento_confirmacao_rh_idx';
  IF n <> 1 THEN RAISE EXCEPTION 'índice de confirmacao_rh ausente'; END IF;

  RAISE NOTICE 'OK';
END $$;
