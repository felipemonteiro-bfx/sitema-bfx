-- Conferência da conciliação "vendas até 31/08/2026 já antecipadas".
-- Falha com exceção na primeira divergência; imprime OK no fim. Não grava nada, então pode rodar
-- duas vezes (o runner roda, para provar que a segunda execução da migração não muda nada).
DO $$
DECLARE
  esperado text;
  obtido text;
  lote_amazon int;
  lote_amazon_minusculo int;
  lote_essencia int;
  lote_sem int;
  n int;
BEGIN
  -- 1. Estado parcela a parcela. Marcadas: antecipada + paga pela Prudent, sem data inventada.
  SELECT string_agg(format('%s|%s|%s|%s|%s', id, antecipada, paga, coalesce(origem_pagamento, '-'),
                           coalesce(to_char(data_pagamento, 'YYYY-MM-DD'), '-')), E'\n' ORDER BY id)
    INTO obtido FROM parcelas_vencimento;
  esperado := concat_ws(E'\n',
    '1|t|t|prudent|-',            -- V1, vencida sem antecipação: entra
    '2|t|t|prudent|-',
    '3|t|t|prudent|-',
    '4|t|t|prudent|-',            -- V2, venda de 31/08: borda inclusiva
    '5|t|t|prudent|-',
    '6|f|f|-|-',                  -- V3, venda de 01/09: fora
    '7|f|f|-|-',                  -- V4, cartão: fora
    '8|f|f|-|-',
    '9|f|f|-|-',                  -- V5, venda cancelada: fora
    '10|t|t|prudent|-',           -- V6, forma nula com flag de folha
    '11|t|t|prudent|-',
    '12|t|t|prudent|-',
    '13|t|t|prudent|-',           -- V7, já era antecipada: intocada
    '14|f|t|manual|2026-09-15',   -- baixa manual: fora, e a origem não é reescrita
    '15|t|t|prudent|-',
    '16|t|t|prudent|-',
    '17|f|f|-|-',                 -- V8, lote em andamento: intocada
    '18|f|f|-|-',
    '19|t|t|prudent|-',           -- V9, carga de 16/09: ganha o antecipada, mantém paga
    '20|t|t|prudent|-',
    '21|f|t|asaas|2026-09-11',    -- boleto do Asaas já pago: fora
    '22|t|t|prudent|-',
    '23|f|t|manual|2026-07-12',   -- baixa manual: fora
    '24|t|t|prudent|-',
    '25|t|t|prudent|-',           -- V13, venda às 23:30 de 31/08: entra
    '26|f|f|-|-',                 -- V14, 01/09 às 02:00: fora
    '27|f|f|-|-',                 -- V15, venda estornada: fora
    '28|f|f|-|-',                 -- V16, cartão com flag legado ligado: a forma manda
    '29|t|t|prudent|-',           -- V17, venda sem cliente
    '30|f|f|-|-',                 -- V18, venda com boleto vivo: fora
    '31|f|f|-|-',                 -- V19, pendurada em lote fechado: intocada
    '32|t|t|prudent|-');
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'parcelas divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  -- 2. Um lote por empresa, pelo mesmo critério de agrupamento do histórico. Cada grupo aponta
  --    para exatamente um lote (count(DISTINCT), porque `SELECT DISTINCT ... INTO` pegaria a
  --    primeira linha em silêncio se o grupo se partisse em dois lotes). A ESSENCIA DA MODA junta
  --    dois clientes: é o que prova que o agrupamento é por empresa, não por cliente.
  SELECT count(*) INTO n FROM antecipacao_batches WHERE origem = 'conciliacao';
  IF n <> 4 THEN
    RAISE EXCEPTION 'esperava 4 lotes de conciliação (um por empresa), veio %', n;
  END IF;
  SELECT count(DISTINCT antecipacao_lote_id), min(antecipacao_lote_id) INTO n, lote_amazon
    FROM parcelas_vencimento WHERE id IN (1, 2, 3, 22, 24, 32);
  IF n <> 1 THEN RAISE EXCEPTION 'AMAZON FIVE ficou em % lotes', n; END IF;
  SELECT count(DISTINCT antecipacao_lote_id), min(antecipacao_lote_id) INTO n, lote_amazon_minusculo
    FROM parcelas_vencimento WHERE id IN (4, 5);
  IF n <> 1 THEN RAISE EXCEPTION 'amazon five ficou em % lotes', n; END IF;
  SELECT count(DISTINCT antecipacao_lote_id), min(antecipacao_lote_id) INTO n, lote_essencia
    FROM parcelas_vencimento WHERE id IN (10, 11, 12, 15, 16, 25);
  IF n <> 1 THEN RAISE EXCEPTION 'ESSENCIA DA MODA (dois clientes) ficou em % lotes', n; END IF;
  SELECT count(DISTINCT antecipacao_lote_id), min(antecipacao_lote_id) INTO n, lote_sem
    FROM parcelas_vencimento WHERE id IN (19, 20, 29);
  IF n <> 1 THEN RAISE EXCEPTION 'Sem empresa ficou em % lotes', n; END IF;
  IF lote_amazon IS NULL OR lote_amazon_minusculo IS NULL OR lote_essencia IS NULL OR lote_sem IS NULL
     OR (SELECT count(DISTINCT x) FROM unnest(ARRAY[lote_amazon, lote_amazon_minusculo, lote_essencia, lote_sem]) AS x) <> 4 THEN
    RAISE EXCEPTION 'empresas diferentes caíram no mesmo lote: amazon=%, amazon minúsculo=%, essencia=%, sem empresa=%',
      lote_amazon, lote_amazon_minusculo, lote_essencia, lote_sem;
  END IF;

  -- 3. Cada lote nasce concluído, de conciliação, com a data em que o André confirmou, e com
  --    total, vendas, período e observação calculados das parcelas (mesmo formato de `criarLote`).
  SELECT string_agg(format('%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s', rotulo, status, origem,
                           to_char(concluida_em, 'YYYY-MM-DD'), concluida_por, venda_ids,
                           to_char(valor_total::numeric, 'FM999990.00'), quantidade_vendas, periodo_descricao,
                           to_char(periodo_inicio, 'YYYY-MM-DD'), to_char(periodo_fim, 'YYYY-MM-DD')),
                    E'\n' ORDER BY rotulo)
    INTO obtido
    FROM (
      SELECT CASE b.id
               WHEN lote_amazon THEN '1-amazon'
               WHEN lote_amazon_minusculo THEN '2-amazon-minusculo'
               WHEN lote_essencia THEN '3-essencia'
               ELSE '4-sem'
             END AS rotulo, b.*
        FROM antecipacao_batches b WHERE b.origem = 'conciliacao'
    ) x;
  esperado := concat_ws(E'\n',
    '1-amazon|concluido|conciliacao|2026-09-18|Sistema (migração)|[1,11,12,19]|1160.00|4|jul. de 2026 - out. de 2026|2026-07-10|2026-10-10',
    '2-amazon-minusculo|concluido|conciliacao|2026-09-18|Sistema (migração)|[2]|301.00|1|out. de 2026 - nov. de 2026|2026-10-10|2026-11-10',
    '3-essencia|concluido|conciliacao|2026-09-18|Sistema (migração)|[6,7,13]|690.00|3|mai. de 2026 - nov. de 2026|2026-05-10|2026-11-10',
    '4-sem|concluido|conciliacao|2026-09-18|Sistema (migração)|[9,17]|470.00|2|abr. de 2026 - set. de 2026|2026-04-10|2026-09-10');
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'lotes divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  -- A observação diz a regra e a empresa daquele lote, com o nome como está no cadastro.
  -- Ordem em COLLATE "C" (byte a byte): a collation do banco põe "amazon five" antes de
  -- "AMAZON FIVE", e a comparação aqui precisa de uma ordem estável.
  SELECT string_agg(observacao, E'\n' ORDER BY observacao COLLATE "C") INTO obtido
    FROM antecipacao_batches WHERE origem = 'conciliacao';
  esperado := concat_ws(E'\n',
    'Conciliação: vendas feitas até 31/08/2026 já antecipadas (AMAZON FIVE)',
    'Conciliação: vendas feitas até 31/08/2026 já antecipadas (ESSENCIA DA MODA)',
    'Conciliação: vendas feitas até 31/08/2026 já antecipadas (Sem empresa)',
    'Conciliação: vendas feitas até 31/08/2026 já antecipadas (amazon five)');
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'observação dos lotes divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  -- 4. Os lotes que já existiam não foram tocados: o em andamento continua aberto com as duas
  --    parcelas, e o fechado continua fechado com a sua.
  SELECT string_agg(format('%s|%s|%s', b.id, b.status, (SELECT count(*) FROM parcelas_vencimento p WHERE p.antecipacao_lote_id = b.id)), E'\n' ORDER BY b.id)
    INTO obtido FROM antecipacao_batches b WHERE b.origem = 'envio';
  IF obtido IS DISTINCT FROM concat_ws(E'\n', '10|em_andamento|2', '11|concluido|1') THEN
    RAISE EXCEPTION 'lotes anteriores mudaram: %', obtido;
  END IF;

  -- 5. Flag da venda pela regra de `flagDaVenda`; venda já em 1 nunca é rebaixada (V9 e V12).
  SELECT string_agg(format('%s|%s', id, coalesce(antecipada, 0)), E'\n' ORDER BY id) INTO obtido FROM vendas;
  esperado := concat_ws(E'\n',
    '1|1', '2|1', '3|0', '4|0', '5|0', '6|1',
    '7|3',   -- 3 de 4 antecipadas (a da baixa manual ficou de fora)
    '8|2',   -- em andamento, intocada
    '9|1', '10|0',
    '11|3',  -- 1 de 2 (a outra é do Asaas)
    '12|1',  -- já era 1: não rebaixa para 3
    '13|1', '14|0', '15|0', '16|0', '17|1', '18|0',
    '19|3'); -- 1 de 2 (a outra está pendurada no lote fechado)
  IF obtido IS DISTINCT FROM esperado THEN
    RAISE EXCEPTION E'flag das vendas divergem.\nesperado:\n%\nobtido:\n%', esperado, obtido;
  END IF;

  -- 6. Auditoria do que foi marcado — um registro só, com os números que o André vai conferir.
  IF (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto') <> 1 THEN
    RAISE EXCEPTION 'esperava 1 registro de auditoria da conciliação, veio %',
      (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto');
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto';
  IF (obtido::json ->> 'corte') <> '2026-08-31'
     OR (obtido::json ->> 'lotes')::int <> 4
     OR (obtido::json ->> 'parcelas')::int <> 17
     OR (obtido::json ->> 'vendas')::int <> 10
     OR (obtido::json ->> 'valor')::numeric <> 2621.00
     OR (obtido::json ->> 'parcelasQueViraramPagas')::int <> 15
     OR (obtido::json ->> 'vendasComFlagAtualizado')::int <> 8
     OR (obtido::json ->> 'parcelaIds') <> '[1, 2, 3, 4, 5, 10, 11, 12, 15, 16, 19, 20, 22, 24, 25, 29, 32]' THEN
    RAISE EXCEPTION 'auditoria da conciliação errada: %', obtido;
  END IF;

  -- 7. Auditoria do que ficou de fora: sem ela, ninguém descobre o que conferir à mão.
  IF (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-fora') <> 1 THEN
    RAISE EXCEPTION 'esperava 1 registro do que ficou de fora, veio %',
      (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-fora');
  END IF;
  SELECT detalhes INTO obtido FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-fora';
  IF (obtido::json ->> 'parcelasEmLoteAberto') <> '[17, 18]'
     OR (obtido::json ->> 'parcelasEmLoteFechado') <> '[31]'
     OR (obtido::json ->> 'parcelasPagasOutraOrigem') <> '[14, 21, 23]'
     OR (obtido::json ->> 'parcelasComBoleto') <> '[30]'
     OR (obtido::json ->> 'vendasSemParcelas') <> '[10]' THEN
    RAISE EXCEPTION 'auditoria do que ficou de fora errada: %', obtido;
  END IF;

  -- 8. Sem escrita concorrente, a rede de segurança não tem nada a corrigir: nenhum lote apagado,
  --    nenhum total reescrito, nenhum registro de ajuste.
  IF (SELECT count(*) FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-ajuste') <> 0 THEN
    RAISE EXCEPTION 'a reconciliação mexeu em lote numa execução tranquila: %',
      (SELECT detalhes FROM audit_logs WHERE acao = 'antecipacao:conciliacao-ate-agosto-ajuste');
  END IF;

  -- 9. Nenhum lote de conciliação ficou sem parcela ligada (o estado que `concluirLote` recusa).
  SELECT count(*) INTO n FROM antecipacao_batches b
   WHERE b.origem = 'conciliacao'
     AND NOT EXISTS (SELECT 1 FROM parcelas_vencimento p WHERE p.antecipacao_lote_id = b.id);
  IF n <> 0 THEN
    RAISE EXCEPTION '% lote(s) de conciliação sem parcela ligada', n;
  END IF;

  RAISE NOTICE 'OK';
END $$;
