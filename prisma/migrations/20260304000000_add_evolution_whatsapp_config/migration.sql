-- AlterTable: config - Evolution API e colunas WhatsApp (Configurações)
-- Corrige erro: The column config.evolution_api_url does not exist

ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "evolution_api_url" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "evolution_api_key" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "evolution_instance" TEXT;

ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_enabled" INTEGER DEFAULT 1;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_recibo" INTEGER DEFAULT 1;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_boleto" INTEGER DEFAULT 1;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_lembrete" INTEGER DEFAULT 1;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_reativacao" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_aniversario" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_inadimplencia" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_nps" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_boas_vindas" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_auto_agradecimento" INTEGER DEFAULT 0;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_dias_inativo" INTEGER DEFAULT 60;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_pre_atendimento" INTEGER DEFAULT 0;
