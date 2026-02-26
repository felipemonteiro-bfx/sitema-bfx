-- AlterTable: config - Asaas API Key e ambiente (Configurações → Asaas)
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "asaas_api_key" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "asaas_env" TEXT;
