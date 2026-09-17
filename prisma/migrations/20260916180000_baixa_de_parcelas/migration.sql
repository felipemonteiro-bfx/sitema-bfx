-- Baixa de parcelas pagas (Asaas, Prudent, manual) — 2026-09-16.
-- Ver docs/superpowers/specs/2026-09-16-baixa-de-parcelas.md.

ALTER TABLE "parcelas_vencimento" ADD COLUMN "origem_pagamento" TEXT;
ALTER TABLE "parcelas_vencimento" ADD COLUMN "asaas_payment_id" TEXT;
ALTER TABLE "parcelas_vencimento" ADD COLUMN "baixa_por" TEXT;
CREATE UNIQUE INDEX "parcelas_vencimento_asaas_payment_id_key" ON "parcelas_vencimento"("asaas_payment_id");

ALTER TABLE "config" ADD COLUMN "asaas_webhook_token" TEXT;

-- Carga inicial da Prudent (decisão do André: antecipada = paga). Parcela de venda em desconto
-- em folha que já foi antecipada — marcada na parcela ou pelo flag legado da venda inteira
-- (antecipada = 1) — passa a constar como paga. A data real da antecipação não existe no banco
-- (antecipacao_batches vazio), então data_pagamento fica nula em vez de inventada. Não altera
-- `antecipada`, não toca parcela já paga.
WITH marcadas AS (
  UPDATE "parcelas_vencimento" p
     SET "paga" = true,
         "origem_pagamento" = 'prudent'
    FROM "vendas" v
   WHERE p."venda_id" = v."id"
     AND p."paga" = false
     AND v."status" = 'ativa'
     AND (v."forma_pagamento" = 'DESCONTO_FOLHA' OR (v."forma_pagamento" IS NULL AND v."desconto_em_folha" = true))
     AND (p."antecipada" = true OR v."antecipada" = 1)
  RETURNING p."id", p."valor_parcela"
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now(), 'Sistema (migração)', 'parcela:baixa-carga-prudent',
       json_build_object(
         'parcelas', (SELECT count(*) FROM marcadas),
         'valor', (SELECT coalesce(round(sum("valor_parcela")::numeric, 2), 0) FROM marcadas),
         'parcelaIds', (SELECT coalesce(json_agg("id" ORDER BY "id"), '[]'::json) FROM marcadas)
       )::text;
