-- Confirmação do RH por parcela e valores do lote da Prudent — 2026-09-30 (Fase 3).
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.2, §3.3 e §4.
--
-- Migração aditiva: só colunas nulas e um índice. O consolidado semanal passa a gravar
-- `enviada_rh_em`; a BFX registra à mão a confirmação ou a recusa do RH; só parcela confirmada
-- entra na fila da Prudent. O lote passa a guardar empresa, taxa, líquido solicitado, aprovado,
-- depositado e datas.

ALTER TABLE "parcelas_vencimento"
  ADD COLUMN "enviada_rh_em" TIMESTAMP(3),
  ADD COLUMN "confirmacao_rh" TEXT,
  ADD COLUMN "confirmacao_origem" TEXT,
  ADD COLUMN "confirmacao_em" TIMESTAMP(3),
  ADD COLUMN "confirmacao_por" TEXT,
  ADD COLUMN "confirmacao_motivo" TEXT;

CREATE INDEX "parcelas_vencimento_confirmacao_rh_idx" ON "parcelas_vencimento"("confirmacao_rh");

ALTER TABLE "antecipacao_batches"
  ADD COLUMN "empresa_parceira_id" INTEGER,
  ADD COLUMN "taxa_mensal" DOUBLE PRECISION,
  ADD COLUMN "valor_liquido_solicitado" DOUBLE PRECISION,
  ADD COLUMN "valor_aprovado" DOUBLE PRECISION,
  ADD COLUMN "valor_depositado" DOUBLE PRECISION,
  ADD COLUMN "data_deposito_prevista" TIMESTAMP(3),
  ADD COLUMN "data_deposito" TIMESTAMP(3),
  ADD COLUMN "comprovante_key" TEXT;

-- Toda parcela que já existe entra como confirmada de origem "legado": sem isso a fila da
-- Prudent fica vazia no dia do deploy. A tela mostra "legado — sem confirmação do RH".
-- `now() AT TIME ZONE 'UTC'` como nas outras migrações (a coluna é timestamp sem fuso, em UTC).
-- Um único comando: o CTE de escrita e o audit rodam juntos; rodar de novo não muda nada e não
-- grava audit, porque o recorte fica vazio.
WITH marcadas AS (
  UPDATE "parcelas_vencimento"
     SET "confirmacao_rh" = 'confirmada',
         "confirmacao_origem" = 'legado',
         "confirmacao_em" = now() AT TIME ZONE 'UTC'
   WHERE "confirmacao_rh" IS NULL
  RETURNING "id", "venda_id"
)
INSERT INTO "audit_logs" ("data_hora", "usuario", "acao", "detalhes")
SELECT now() AT TIME ZONE 'UTC', 'Sistema (migração)', 'prudent:confirmacao-rh-legado',
       json_build_object(
         'regra', 'parcelas anteriores à Fase 3 entram como confirmadas, origem legado',
         'parcelas', (SELECT count(*) FROM marcadas),
         'vendas', (SELECT count(DISTINCT "venda_id") FROM marcadas)
       )::text
 WHERE EXISTS (SELECT 1 FROM marcadas);
