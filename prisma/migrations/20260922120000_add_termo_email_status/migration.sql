ALTER TABLE "vendas"
  ADD COLUMN "termo_email_status" TEXT,
  ADD COLUMN "termo_email_enviado_em" TIMESTAMP(3),
  ADD COLUMN "termo_email_erro" TEXT;
