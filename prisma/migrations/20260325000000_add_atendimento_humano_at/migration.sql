-- AlterTable: add atendimento_humano_at to clientes
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "atendimento_humano_at" TIMESTAMP(3);

-- AlterTable: add whatsapp_takeover_minutos to config
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "whatsapp_takeover_minutos" INTEGER DEFAULT 60;
