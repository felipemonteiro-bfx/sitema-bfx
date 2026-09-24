-- Conferência do cenário de concorrência (ver rodar-concorrencia.sh).
-- A parcela 1 recebeu baixa do Asaas no meio da migração. Falha com exceção na primeira
-- divergência; imprime OK no fim.
DO $$
DECLARE
  obtido text;
  lote_amazon int;
  n int;
BEGIN
  -- 1. A baixa concorrente sobreviveu inteira: origem, data e id da cobrança do Asaas. E a parcela
  --    NÃO entrou no lote da conciliação.
  SELECT format('%s|%s|%s|%s|%s|%s', antecipada, paga, coalesce(origem_pagamento, '-'),
                coalesce(to_char(data_pagamento, 'YYYY-MM-DD'), '-'), coalesce(asaas_payment_id, '-'),
                coalesce(antecipacao_lote_id::text, '-'))
    INTO obtido FROM parcelas_vencimento WHERE id = 1;
  IF obtido IS DISTINCT FROM 'f|t|asaas|2026-09-22|pay_concorrente|-' THEN
    RAISE EXCEPTION 'a migração passou por cima da baixa concorrente: %', obtido;
  END IF;

  -- 2. O resto da venda 1 foi marcado normalmente, então o flag dela é 3 (parcial), não 1.
  SELECT string_agg(format('%s|%s|%s', id, antecipada, coalesce(origem_pagamento, '-')), E'\n' ORDER BY id)
    INTO obtido FROM parcelas_vencimento WHERE id IN (2, 3);
  IF obtido IS DISTINCT FROM concat_ws(E'\n', '2|t|prudent', '3|t|prudent') THEN
    RAISE EXCEPTION 'as outras parcelas da venda 1 não foram marcadas: %', obtido;
  END IF;
  IF (SELECT coalesce(antecipada, 0) FROM vendas WHERE id = 1) <> 3 THEN
    RAISE EXCEPTION 'flag da venda 1 devia ser 3 (parcial), veio %', (SELECT antecipada FROM vendas WHERE id = 1);
  END IF;

  -- 3. A rede de segurança reconciliou o lote da AMAZON FIVE: o snapshot contava R$ 1.160,00 (com
  --    a parcela 1); ficaram R$ 860,00 ligados de fato.
  SELECT count(DISTINCT antecipacao_lote_id), min(antecipacao_lote_id) INTO n, lote_amazon
    FROM parcelas_vencimento WHERE id IN (2, 3, 22, 24, 32);
  IF n <> 1 THEN RAISE EXCEPTION 'AMAZON FIVE ficou em % lotes', n; END IF;
  SELECT format('%s|%s|%s', to_char(valor_total::numeric, 'FM999990.00'), quantidade_vendas, venda_ids)
    INTO obtido FROM antecipacao_batches WHERE id = lote_amazon;
  IF obtido IS DISTINCT FROM '860.00|4|[1,11,12,19]' THEN
    RAISE EXCEPTION 'lote da AMAZON FIVE não foi reconciliado: %', obtido;
  END IF;

  -- 4. O ajuste ficou registrado, nomeando o lote — é anomalia, não pode acontecer em silêncio.
  IF (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-ajuste') <> 1 THEN
    RAISE EXCEPTION 'esperava 1 registro de ajuste, veio %',
      (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-ajuste');
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-ajuste';
  IF (obtido::json ->> 'lotesAjustados') <> format('[%s]', lote_amazon)
     OR (obtido::json ->> 'lotesApagados') <> '[]' THEN
    RAISE EXCEPTION 'registro de ajuste errado: %', obtido;
  END IF;

  -- 5. A auditoria principal conta 16 parcelas (as 17 do cenário tranquilo menos a parcela 1), e a
  --    parcela 1 aparece no registro do que ficou de fora, como paga por outra origem.
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto';
  IF (obtido::json ->> 'parcelas')::int <> 16
     OR (obtido::json ->> 'parcelaIds') LIKE '[1,%' THEN
    RAISE EXCEPTION 'auditoria principal contou a parcela da baixa concorrente: %', obtido;
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-fora';
  IF (obtido::json ->> 'parcelasPagasOutraOrigem') <> '[1, 14, 21, 23]' THEN
    RAISE EXCEPTION 'a parcela da baixa concorrente não ficou listada para conferência: %', obtido;
  END IF;

  RAISE NOTICE 'OK';
END $$;
