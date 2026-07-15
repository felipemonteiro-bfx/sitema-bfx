-- CreateTable
CREATE TABLE "empresas_vinculos" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "vinculada_id" INTEGER NOT NULL,

    CONSTRAINT "empresas_vinculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_vinculos_empresa_id_vinculada_id_key" ON "empresas_vinculos"("empresa_id", "vinculada_id");

-- AddForeignKey
ALTER TABLE "empresas_vinculos" ADD CONSTRAINT "empresas_vinculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_parceiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_vinculos" ADD CONSTRAINT "empresas_vinculos_vinculada_id_fkey" FOREIGN KEY ("vinculada_id") REFERENCES "empresas_parceiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
