-- AlterTable: coluna para validar a assinatura do webhook da Meta
ALTER TABLE "config" ADD COLUMN     "meta_app_secret" TEXT;

-- AlterTable: liga o envio de campanha à mensagem registrada
ALTER TABLE "campanha_envios" ADD COLUMN     "mensagem_id" INTEGER;

-- CreateTable: registro unificado de mensagens WhatsApp (entrada e saída)
CREATE TABLE "whatsapp_mensagens" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER,
    "telefone" TEXT NOT NULL,
    "direcao" TEXT NOT NULL,
    "wa_message_id" TEXT,
    "origem" TEXT NOT NULL,
    "template_nome" TEXT,
    "corpo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "erro_codigo" INTEGER,
    "erro_msg" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_mensagens_wa_message_id_key" ON "whatsapp_mensagens"("wa_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_mensagens_cliente_id_criado_em_idx" ON "whatsapp_mensagens"("cliente_id", "criado_em");

-- CreateIndex
CREATE INDEX "whatsapp_mensagens_status_criado_em_idx" ON "whatsapp_mensagens"("status", "criado_em");

-- CreateIndex
CREATE INDEX "whatsapp_mensagens_telefone_direcao_criado_em_idx" ON "whatsapp_mensagens"("telefone", "direcao", "criado_em");

-- AddForeignKey
ALTER TABLE "campanha_envios" ADD CONSTRAINT "campanha_envios_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "whatsapp_mensagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
