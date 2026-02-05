-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "taxa_nota" DOUBLE PRECISION DEFAULT 5.97,
ADD COLUMN     "tem_nota" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
