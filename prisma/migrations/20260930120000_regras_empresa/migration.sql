-- Regras por empresa e parcela única — 2026-09-30.
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.1 e §3.2.

-- Duplicatas EXATAS de parcela (consulta só-leitura na produção, 30/09/2026): as vendas 51, 52 e 53
-- são 1x e têm duas linhas da parcela 1 cada (ids 38/39, 40/41, 42/43), iguais em tudo menos o id
-- e, na venda 52, o lote (40 sem lote, 41 no lote 13). É a mesma parcela gravada duas vezes, não
-- duas parcelas: a venda tem `parcelas = 1`. Sem isto a unique abaixo não entra e o bloco `DO $$`
-- aborta o deploy.
--
-- Só é tratada como cópia a linha idêntica às outras do grupo em vencimento, valor, pagamento,
-- antecipação, origem, data de pagamento, cobrança do Asaas e autor da baixa. Qualquer diferença
-- nesses campos é dado que alguém precisa olhar: fica, e o `DO $$` continua abortando com o nome
-- da venda.
--
-- Fica uma linha por grupo: a que está num lote da Prudent (é ela que o lote conhece), senão a de
-- menor id. As cópias apagadas que estavam num lote inflavam o `valor_total` dele — o lote 13
-- (conciliação, concluído) soma 9.624,88 contando as cópias 39 e 43, R$ 475,00 a mais. O total é
-- abatido do que foi apagado, e não recalculado das parcelas, para não mexer no que o lote tiver
-- de diferente por outro motivo. Um único comando: os CTEs de escrita rodam juntos, e o que foi
-- apagado fica inteiro em audit_logs, com os lotes ajustados.
WITH grupos_exatos AS (
  SELECT "venda_id", "numero_parcela"
    FROM "parcelas_vencimento"
   GROUP BY "venda_id", "numero_parcela"
  HAVING count(*) > 1
     -- `coalesce` porque `count(DISTINCT ...)` não conta a linha cujo valor é nulo e porque nulo
     -- em cada campo tem de valer como igual a nulo.
     AND count(DISTINCT ("data_vencimento", "valor_parcela", "paga", "antecipada",
                         coalesce("origem_pagamento", ''),
                         coalesce("data_pagamento", TIMESTAMP '-infinity'),
                         coalesce("asaas_payment_id", ''),
                         coalesce("baixa_por", ''))) = 1
),
ordenadas AS (
  SELECT p."id",
         row_number() OVER (PARTITION BY p."venda_id", p."numero_parcela"
                            ORDER BY (p."antecipacao_lote_id" IS NULL), p."id") AS ordem
    FROM "parcelas_vencimento" p
    JOIN grupos_exatos g ON g."venda_id" = p."venda_id" AND g."numero_parcela" = p."numero_parcela"
),
apagadas AS (
  DELETE FROM "parcelas_vencimento" p
   USING ordenadas o
   WHERE p."id" = o."id" AND o.ordem > 1
  RETURNING p.*
),
por_lote AS (
  SELECT "antecipacao_lote_id" AS lote_id, sum("valor_parcela") AS soma
    FROM apagadas
   WHERE "antecipacao_lote_id" IS NOT NULL
   GROUP BY "antecipacao_lote_id"
),
lotes_ajustados AS (
  UPDATE "antecipacao_batches" b
     SET "valor_total" = round((b."valor_total" - pl.soma)::numeric, 2)
    FROM por_lote pl
   WHERE b."id" = pl.lote_id
  RETURNING b."id", b."valor_total", pl.soma
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now() AT TIME ZONE 'UTC', 'Sistema (migração)', 'parcelas:dedup-duplicatas-exatas',
       json_build_object(
         'apagadas', (SELECT json_agg(row_to_json(a) ORDER BY a."id") FROM apagadas a),
         -- `valorAnterior` sai da tabela: o comando inteiro enxerga o retrato de antes do UPDATE.
         'lotesAjustados', (SELECT coalesce(json_agg(json_build_object(
                                     'id', l."id",
                                     'valorAnterior', b0."valor_total",
                                     'abatido', l.soma,
                                     'valorTotal', l."valor_total") ORDER BY l."id"), '[]'::json)
                              FROM lotes_ajustados l
                              JOIN "antecipacao_batches" b0 ON b0."id" = l."id")
       )::text
 WHERE EXISTS (SELECT 1 FROM apagadas);

-- A unique (venda_id, numero_parcela) abortaria com erro genérico se houvesse duplicata e o pod
-- ficaria em CrashLoop (P3009). O bloco abaixo aborta antes, dizendo quais vendas reparar.
DO $$
DECLARE dups text;
BEGIN
  SELECT string_agg(venda_id || '/' || numero_parcela, ', ') INTO dups
  FROM (SELECT venda_id, numero_parcela FROM parcelas_vencimento
        GROUP BY venda_id, numero_parcela HAVING count(*) > 1) d;
  IF dups IS NOT NULL THEN
    RAISE EXCEPTION 'parcelas_vencimento com numero repetido (venda/parcela): %', dups;
  END IF;
END $$;

-- Sem regra cadastrada a empresa segue o comportamento anterior (corte 20, vencimento dia 10).
CREATE TABLE "regras_empresa" (
    "id" SERIAL NOT NULL,
    "empresa_parceira_id" INTEGER NOT NULL,
    "vigente_de" TIMESTAMP(3) NOT NULL,
    "vigente_ate" TIMESTAMP(3),
    "dia_corte" INTEGER NOT NULL DEFAULT 20,
    "dia_vencimento" INTEGER NOT NULL DEFAULT 10,
    "dia_pix" INTEGER NOT NULL DEFAULT 15,
    "repasse_pct" DOUBLE PRECISION,
    "repasse_base" TEXT,
    "cobranca_via_bfx" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criada_por" TEXT,

    CONSTRAINT "regras_empresa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "regras_empresa_empresa_parceira_id_vigente_de_idx" ON "regras_empresa"("empresa_parceira_id", "vigente_de");

ALTER TABLE "regras_empresa" ADD CONSTRAINT "regras_empresa_empresa_parceira_id_fkey" FOREIGN KEY ("empresa_parceira_id") REFERENCES "empresas_parceiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "parcelas_vencimento_venda_id_numero_parcela_key" ON "parcelas_vencimento"("venda_id", "numero_parcela");
