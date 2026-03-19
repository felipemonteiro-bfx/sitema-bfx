-- AlterTable: adicionar estoque_minimo em produtos
ALTER TABLE "produtos" ADD COLUMN "estoque_minimo" INTEGER DEFAULT 5;

-- CreateTable: movimentos_estoque
CREATE TABLE "movimentos_estoque" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custo_unitario" DOUBLE PRECISION,
    "motivo_tipo" TEXT NOT NULL,
    "observacao" TEXT,
    "nota_fiscal" TEXT,
    "fornecedor_id" INTEGER,
    "venda_id" INTEGER,
    "usuario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimentos_estoque_produto_id_idx" ON "movimentos_estoque"("produto_id");
CREATE INDEX "movimentos_estoque_tipo_idx" ON "movimentos_estoque"("tipo");
CREATE INDEX "movimentos_estoque_criado_em_idx" ON "movimentos_estoque"("criado_em");
CREATE INDEX "movimentos_estoque_motivo_tipo_idx" ON "movimentos_estoque"("motivo_tipo");

-- AddForeignKey
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
