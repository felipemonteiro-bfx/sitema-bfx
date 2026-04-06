-- AlterTable: add empresa_parceira_id FK to clientes
ALTER TABLE "clientes" ADD COLUMN "empresa_parceira_id" INTEGER;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_parceira_id_fkey" FOREIGN KEY ("empresa_parceira_id") REFERENCES "empresas_parceiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing data: match clientes.empresa (text) to empresas_parceiras.nome (case-insensitive)
UPDATE "clientes" c
SET "empresa_parceira_id" = ep.id
FROM "empresas_parceiras" ep
WHERE c."empresa" IS NOT NULL
  AND c."empresa" != ''
  AND LOWER(TRIM(c."empresa")) = LOWER(TRIM(ep."nome"))
  AND c."empresa_parceira_id" IS NULL;
