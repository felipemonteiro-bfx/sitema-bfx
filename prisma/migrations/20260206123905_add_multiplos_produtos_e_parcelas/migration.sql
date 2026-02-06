-- CreateTable
CREATE TABLE IF NOT EXISTS "itens_venda" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "produto_nome" TEXT NOT NULL,
    "custo_produto" DOUBLE PRECISION NOT NULL,
    "valor_venda" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "itens_venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "parcelas_vencimento" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "numero_parcela" INTEGER NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "valor_parcela" DOUBLE PRECISION NOT NULL,
    "paga" BOOLEAN NOT NULL DEFAULT false,
    "data_pagamento" TIMESTAMP(3),

    CONSTRAINT "parcelas_vencimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "itens_venda_venda_id_idx" ON "itens_venda"("venda_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "parcelas_vencimento_venda_id_idx" ON "parcelas_vencimento"("venda_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "parcelas_vencimento_data_vencimento_idx" ON "parcelas_vencimento"("data_vencimento");

-- AddForeignKey
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas_vencimento" ADD CONSTRAINT "parcelas_vencimento_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
