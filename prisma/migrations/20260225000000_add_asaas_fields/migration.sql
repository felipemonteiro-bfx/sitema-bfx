-- AlterTable: clientes - Asaas customer ID
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "asaas_customer_id" TEXT;

-- AlterTable: vendas - Asaas payment ID and boleto URL
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "asaas_payment_id" TEXT;
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "boleto_url" TEXT;
