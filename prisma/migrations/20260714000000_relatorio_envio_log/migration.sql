-- Relatorio de envios (mensal/semanal) por empresa parceira + coluna provider no log de WhatsApp.

-- 1. Coluna provider no log de WhatsApp (usada na abstracao de provider da Fase 2).
ALTER TABLE "whatsapp_envio_log" ADD COLUMN IF NOT EXISTS "provider" TEXT;

-- 1b. Campos de provider WhatsApp na tabela config (Evolution vs Meta Cloud API oficial).
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_provider" TEXT DEFAULT 'evolution';
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "meta_whatsapp_token" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "meta_whatsapp_phone_number_id" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "meta_whatsapp_business_id" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "meta_whatsapp_api_version" TEXT DEFAULT 'v21.0';
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "meta_webhook_verify_token" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_fallback_evolution" INTEGER DEFAULT 1;

-- 2. Tabela de log de envio de relatorios agendados por empresa.
CREATE TABLE IF NOT EXISTS "relatorio_envio_log" (
  "id"            SERIAL PRIMARY KEY,
  "empresa_id"    INTEGER NOT NULL,
  "periodo"       TEXT NOT NULL,
  "tipo"          TEXT NOT NULL DEFAULT 'mensal',
  "destinatarios" TEXT,
  "status"        TEXT NOT NULL,
  "erro"          TEXT,
  "total_vendas"  INTEGER NOT NULL DEFAULT 0,
  "valor_total"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pdf_key"       TEXT,
  "xlsx_key"      TEXT,
  "enviado_em"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "relatorio_envio_log_empresa_id_periodo_tipo_key"
  ON "relatorio_envio_log" ("empresa_id", "periodo", "tipo");

CREATE INDEX IF NOT EXISTS "relatorio_envio_log_periodo_idx"
  ON "relatorio_envio_log" ("periodo");

ALTER TABLE "relatorio_envio_log"
  ADD CONSTRAINT "relatorio_envio_log_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas_parceiras"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
