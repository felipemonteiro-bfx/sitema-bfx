-- Resposta com citação no atendimento WhatsApp. Aditiva: coluna anulável, sem DEFAULT (não reescreve a tabela).
-- Guarda o wa_message_id da mensagem citada. `wa_message_id` já tem índice único, então a busca da citada é por índice.

-- AlterTable
ALTER TABLE "whatsapp_mensagens" ADD COLUMN     "responde_a_wa_id" TEXT;
