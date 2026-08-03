-- AlterTable: soft-delete support for fornecedores (D-02, DAT-02).
-- Idempotente: seguro rodar mais de uma vez.
ALTER TABLE "fornecedores" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fornecedores_deleted_at_idx" ON "fornecedores" ("deleted_at");
