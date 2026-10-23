-- Mídias do atendimento WhatsApp. Aditiva: coluna com DEFAULT (não reescreve a tabela) e tabela nova.

-- AlterTable
ALTER TABLE "whatsapp_mensagens" ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'texto';
ALTER TABLE "whatsapp_mensagens" ADD CONSTRAINT "whatsapp_mensagens_tipo_check"
  CHECK ("tipo" IN ('texto', 'audio', 'imagem', 'video', 'figurinha', 'documento'));

-- CreateTable
CREATE TABLE "whatsapp_midias" (
    "id" TEXT NOT NULL,
    "mensagem_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "meta_media_id" TEXT NOT NULL,
    "upload_media_id" TEXT,
    "upload_em" TIMESTAMP(3),
    "mime" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "tamanho" INTEGER,
    "nome_exibicao" TEXT,
    "legenda" TEXT,
    "voz" BOOLEAN NOT NULL DEFAULT false,
    "animada" BOOLEAN NOT NULL DEFAULT false,
    "chave_storage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_midias_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "whatsapp_midias_tipo_check" CHECK ("tipo" IN ('audio', 'imagem', 'video', 'figurinha', 'documento')),
    CONSTRAINT "whatsapp_midias_status_check" CHECK ("status" IN ('pendente', 'baixando', 'salva', 'falhou', 'indisponivel')),
    CONSTRAINT "whatsapp_midias_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_midias_mensagem_id_key" ON "whatsapp_midias"("mensagem_id");

-- CreateIndex
CREATE INDEX "whatsapp_midias_status_atualizado_em_idx" ON "whatsapp_midias"("status", "atualizado_em");

-- AddForeignKey
ALTER TABLE "whatsapp_midias" ADD CONSTRAINT "whatsapp_midias_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "whatsapp_mensagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
