-- AlterTable: remover unique global de nome e adicionar unique composto (nome, fornecedor_id)
ALTER TABLE "produtos" DROP CONSTRAINT IF EXISTS "produtos_nome_key";

-- CreateIndex
CREATE UNIQUE INDEX "produtos_nome_fornecedor_id_key" ON "produtos"("nome", "fornecedor_id");
