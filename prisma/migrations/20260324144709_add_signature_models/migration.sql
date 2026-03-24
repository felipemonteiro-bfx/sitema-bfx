/*
  Warnings:

  - You are about to drop the column `assinatura_em` on the `vendas` table. All the data in the column will be lost.
  - You are about to drop the column `assinatura_status` on the `vendas` table. All the data in the column will be lost.
  - You are about to drop the column `comprovante_pdf` on the `vendas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vendas" DROP COLUMN "assinatura_em",
DROP COLUMN "assinatura_status",
DROP COLUMN "comprovante_pdf";

-- CreateTable
CREATE TABLE "whatsapp_envio_log" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" INTEGER,
    "data_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_envio_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER NOT NULL,
    "assinatura_status" TEXT,
    "assinatura_em" TIMESTAMP(3),

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "link" TEXT,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_envio_log_cliente_id_tipo_idx" ON "whatsapp_envio_log"("cliente_id", "tipo");

-- CreateIndex
CREATE INDEX "whatsapp_envio_log_tipo_referencia_idx" ON "whatsapp_envio_log"("tipo", "referencia");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_venda_id_key" ON "assinaturas"("venda_id");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
