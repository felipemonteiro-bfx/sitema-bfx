-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "venda_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "conteudo" BYTEA NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "documentos_venda_id_idx" ON "documentos"("venda_id");

-- CreateIndex
CREATE INDEX "documentos_tipo_idx" ON "documentos"("tipo");
