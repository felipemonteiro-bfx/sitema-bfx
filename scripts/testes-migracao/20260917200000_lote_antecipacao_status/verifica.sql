-- Falha com exceção na primeira divergência; imprime OK no fim.
DO $$
DECLARE
  obtido text;
  n int;
BEGIN
  -- Lote antigo vira concluído, com a data da criação (o comportamento antigo marcava tudo no clique).
  SELECT format('%s|%s|%s|%s', "status", "origem", to_char("concluida_em", 'YYYY-MM-DD HH24:MI'), "concluida_por")
    INTO obtido FROM "antecipacao_batches" WHERE "id" = 1;
  IF obtido IS DISTINCT FROM 'concluido|envio|2026-08-01 10:00|Sistema (migração)' THEN
    RAISE EXCEPTION 'lote antigo ficou: %', obtido;
  END IF;

  -- Lote novo nasce em andamento, sem conclusão.
  INSERT INTO "antecipacao_batches" ("criada_em", "venda_ids", "valor_total", "quantidade_vendas")
  VALUES (now(), '[1]', 300, 1);
  SELECT format('%s|%s|%s', "status", "origem", coalesce(to_char("concluida_em", 'YYYY-MM-DD'), '-'))
    INTO obtido FROM "antecipacao_batches" ORDER BY "id" DESC LIMIT 1;
  IF obtido IS DISTINCT FROM 'em_andamento|envio|-' THEN
    RAISE EXCEPTION 'lote novo nasceu: %', obtido;
  END IF;

  -- A parcela aponta para o lote, e apagar o lote não apaga a parcela.
  UPDATE "parcelas_vencimento" SET "antecipacao_lote_id" = (SELECT max("id") FROM "antecipacao_batches") WHERE "id" = 3;
  DELETE FROM "antecipacao_batches" WHERE "id" = (SELECT max("id") FROM "antecipacao_batches");
  SELECT count(*) INTO n FROM "parcelas_vencimento" WHERE "id" = 3 AND "antecipacao_lote_id" IS NULL;
  IF n <> 1 THEN
    RAISE EXCEPTION 'parcela deveria sobreviver ao lote apagado, com o vínculo nulo';
  END IF;

  -- Lote aberto DEPOIS da migração (id 500) tem de sobreviver a uma reaplicação do SQL: fechá-lo
  -- marcaria como concluído um lote que ainda espera retorno da Prudent.
  INSERT INTO "antecipacao_batches" ("id", "criada_em", "venda_ids", "valor_total", "quantidade_vendas")
  VALUES (500, now(), '[1]', 300, 1)
  ON CONFLICT ("id") DO NOTHING;
  SELECT count(*) INTO n FROM "antecipacao_batches" WHERE "id" = 500 AND "status" = 'em_andamento';
  IF n <> 1 THEN
    RAISE EXCEPTION 'a reaplicação fechou um lote aberto depois da migração';
  END IF;

  -- Vínculo para lote inexistente é recusado pelo banco.
  BEGIN
    UPDATE "parcelas_vencimento" SET "antecipacao_lote_id" = 99999 WHERE "id" = 3;
    RAISE EXCEPTION 'aceitou vínculo com lote inexistente';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  RAISE NOTICE 'OK';
END $$;
