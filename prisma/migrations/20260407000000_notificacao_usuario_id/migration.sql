-- AlterTable: add usuario_id to notificacoes (nullable, for directed notifications)
ALTER TABLE "notificacoes" ADD COLUMN "usuario_id" INTEGER;

-- CreateIndex for fast lookup
CREATE INDEX "notificacoes_usuario_id_lida_idx" ON "notificacoes"("usuario_id", "lida");
