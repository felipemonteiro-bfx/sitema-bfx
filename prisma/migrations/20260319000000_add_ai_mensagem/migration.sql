-- CreateTable
CREATE TABLE "ai_mensagens" (
    "id" SERIAL NOT NULL,
    "sessao_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_original" TEXT,
    "actions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'done',
    "links" JSONB,
    "usuario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_mensagens_sessao_id_criado_em_idx" ON "ai_mensagens"("sessao_id", "criado_em");
