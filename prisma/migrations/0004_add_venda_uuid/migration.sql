-- Add optional UUID v7 field for receipt links
ALTER TABLE "vendas" ADD COLUMN "uuid" UUID;

-- Unique index for UUID when present
CREATE UNIQUE INDEX "vendas_uuid_key" ON "vendas"("uuid");
