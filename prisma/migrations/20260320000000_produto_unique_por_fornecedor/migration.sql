-- AlterTable: remover unique global de nome e adicionar unique composto (nome, fornecedor_id)
DROP INDEX IF EXISTS "produtos_nome_key";

-- CreateIndex
CREATE UNIQUE INDEX "produtos_nome_fornecedor_id_key" ON "produtos"("nome", "fornecedor_id");
