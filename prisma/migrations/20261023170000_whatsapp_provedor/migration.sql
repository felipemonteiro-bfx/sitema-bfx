ALTER TABLE "whatsapp_mensagens" ADD COLUMN "provedor" TEXT;
ALTER TABLE "whatsapp_mensagens" ADD CONSTRAINT "whatsapp_mensagens_provedor_check" CHECK ("provedor" IS NULL OR "provedor" IN ('meta_cloud', 'evolution'));
CREATE INDEX "whatsapp_mensagens_provedor_telefone_criado_em_idx" ON "whatsapp_mensagens"("provedor", "telefone", "criado_em");
