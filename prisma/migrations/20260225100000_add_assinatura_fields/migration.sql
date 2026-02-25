-- AlterTable
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "assinatura_token" TEXT,
ADD COLUMN IF NOT EXISTS "assinatura_status" TEXT,
ADD COLUMN IF NOT EXISTS "assinatura_em" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendas_assinatura_token_key" ON "vendas"("assinatura_token");
