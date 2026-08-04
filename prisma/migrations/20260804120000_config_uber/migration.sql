-- AlterTable: Uber Direct via aba "Uber" em /configuracoes, em vez de AWS SSM.
-- Guarda client_id/client_secret (OAuth client_credentials) — nunca um token estático,
-- que expira em ~30 dias sem refresh e sem aviso. Idempotente: seguro rodar mais de uma vez.
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_client_id" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_client_secret" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_customer_id" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_organization_id" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_pickup_address" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "uber_enabled" INTEGER DEFAULT 0;
