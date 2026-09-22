ALTER TABLE "empresas_parceiras"
  ADD COLUMN "dia_relatorio_mensal" INTEGER;

ALTER TABLE "empresas_parceiras"
  ADD CONSTRAINT "empresas_parceiras_dia_relatorio_mensal_check"
  CHECK (
    "dia_relatorio_mensal" IS NULL
    OR "dia_relatorio_mensal" BETWEEN 1 AND 31
  );
