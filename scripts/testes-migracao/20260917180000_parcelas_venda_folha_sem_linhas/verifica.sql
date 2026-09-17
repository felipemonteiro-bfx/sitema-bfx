-- Falha com exceção na primeira divergência; imprime OK no fim.
DO $$
DECLARE
  esperado text;
  obtido text;
BEGIN
  SELECT string_agg(format('%s|%s|%s|%s|%s|%s|%s', venda_id, numero_parcela, to_char(data_vencimento, 'YYYY-MM-DD HH24:MI'),
                           to_char(valor_parcela, 'FM999990.00'), paga, antecipada, coalesce(origem_pagamento, '-')), E'\n'
                    ORDER BY venda_id, numero_parcela)
    INTO obtido FROM parcelas_vencimento;
  esperado := concat_ws(E'\n',
    '1|1|2026-09-10 00:00|150.00|f|f|-',
    '2|1|2026-08-10 00:00|33.33|f|f|-',
    '2|2|2026-09-10 00:00|33.33|f|f|-',
    '2|3|2026-10-10 00:00|33.35|f|f|-',
    '3|1|2026-10-10 00:00|50.00|f|f|-',
    '3|2|2026-11-10 00:00|50.00|f|f|-',
    '4|1|2026-07-10 00:00|100.00|t|t|prudent',
    '4|2|2026-08-10 00:00|100.00|t|t|prudent',
    '7|1|2026-09-10 00:00|149.99|f|f|-',
    '10|1|2026-09-10 00:00|70.00|f|f|-',
    '11|1|2027-02-10 00:00|99.90|f|f|-',
    '13|1|2026-09-10 00:00|80.00|f|f|-',
    -- Total com três casas: o ROUND do Postgres sobe (1,005 -> 1,01) e o Math.round do JS desce
    -- (1,00). Valor fora do padrão de moeda; fica registrado aqui para não surpreender depois.
    '16|1|2026-09-10 00:00|1.01|f|f|-');
  -- As vendas 14 (flag 3, parcial) e 15 (flag 2, em andamento) não podem ganhar linhas: sem saber
  -- quais parcelas foram antecipadas, elas voltariam à fila e poderiam ser vendidas de novo.
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'linhas divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  IF (SELECT count(*) FROM audit_logs WHERE acao = 'parcela:carga-venda-folha-sem-linhas') <> 1 THEN
    RAISE EXCEPTION 'esperava exatamente 1 registro de auditoria, veio %',
      (SELECT count(*) FROM audit_logs WHERE acao = 'parcela:carga-venda-folha-sem-linhas');
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'parcela:carga-venda-folha-sem-linhas';
  IF (obtido::json ->> 'vendas')::int <> 8 OR (obtido::json ->> 'parcelas')::int <> 12
     OR (obtido::json ->> 'antecipadas')::int <> 2 OR (obtido::json ->> 'valor')::numeric <> 800.92 THEN
    RAISE EXCEPTION 'auditoria errada: %', obtido;
  END IF;

  -- As vendas puladas (flag 2 ou 3, ou valor sujo) precisam ficar listadas: sem isso ninguém
  -- descobre que elas continuam sem parcelas.
  IF (SELECT count(*) FROM audit_logs WHERE acao = 'parcela:carga-venda-folha-pulada') <> 1 THEN
    RAISE EXCEPTION 'esperava 1 registro das vendas puladas';
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'parcela:carga-venda-folha-pulada';
  IF (obtido::json ->> 'vendaIds') <> '[14, 15]' THEN
    RAISE EXCEPTION 'vendas puladas erradas: %', obtido;
  END IF;

  IF (SELECT antecipada FROM vendas WHERE id = 4) <> 1 OR (SELECT antecipada FROM vendas WHERE id = 14) <> 3 THEN
    RAISE EXCEPTION 'flag da venda foi alterado';
  END IF;
  RAISE NOTICE 'OK';
END $$;
