ALTER TABLE "parcelas_vencimento" ADD COLUMN IF NOT EXISTS "antecipada" BOOLEAN NOT NULL DEFAULT false;
