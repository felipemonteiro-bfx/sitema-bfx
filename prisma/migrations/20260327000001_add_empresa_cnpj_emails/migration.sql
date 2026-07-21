-- AlterTable: add cnpj and emailsExtras to EmpresaParceira
ALTER TABLE "empresas_parceiras" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;
ALTER TABLE "empresas_parceiras" ADD COLUMN IF NOT EXISTS "emails_extras" TEXT;
