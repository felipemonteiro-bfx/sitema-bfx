-- Boletos Prudent, pagamentos e arquivos financeiros — 2026-09-30 (Fase 4).
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.4, §3.5 e §6.
--
-- Migração aditiva: três tabelas novas e duas colunas nulas (`parcelas_vencimento.boleto_prudent_id`
-- e `config.email_financeiro`). Nenhum dado existente muda; os boletos nascem na conclusão do lote.
--
-- O índice parcial do fim (um boleto vivo por lote e vencimento) não é representável no
-- schema.prisma. O `prisma migrate diff` do banco para o schema não o acusa como drift, e o
-- `migrate deploy` não remove índice que o schema não declara — conferido em
-- scripts/testes-migracao/20260930140000_boletos_prudent/rodar.sh.

-- AlterTable
ALTER TABLE "config" ADD COLUMN     "email_financeiro" TEXT;

-- AlterTable
ALTER TABLE "parcelas_vencimento" ADD COLUMN     "boleto_prudent_id" INTEGER;

-- CreateTable
CREATE TABLE "arquivos_financeiros" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criado_por" TEXT,

    CONSTRAINT "arquivos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletos_prudent" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "empresa_parceira_id" INTEGER,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor_esperado" DOUBLE PRECISION NOT NULL,
    "valor_documento" DOUBLE PRECISION,
    "vencimento_documento" TIMESTAMP(3),
    "linha_digitavel" TEXT,
    "pdf_arquivo_id" INTEGER,
    "direcionamento" TEXT NOT NULL DEFAULT 'empresa',
    "status" TEXT NOT NULL DEFAULT 'aguardando_documento',
    "divergencia_justificativa" TEXT,
    "substitui_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletos_prudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletos_prudent_pagamentos" (
    "id" SERIAL NOT NULL,
    "boleto_id" INTEGER NOT NULL,
    "data_pagamento" TIMESTAMP(3) NOT NULL,
    "valor_principal" DOUBLE PRECISION NOT NULL,
    "valor_encargos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comprovante_arquivo_id" INTEGER,
    "comprovante_hash" TEXT,
    "autenticacao" TEXT,
    "registrado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estornado_em" TIMESTAMP(3),
    "estornado_por" TEXT,

    CONSTRAINT "boletos_prudent_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arquivos_financeiros_sha256_idx" ON "arquivos_financeiros"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "boletos_prudent_linha_digitavel_key" ON "boletos_prudent"("linha_digitavel");

-- CreateIndex
CREATE UNIQUE INDEX "boletos_prudent_substitui_id_key" ON "boletos_prudent"("substitui_id");

-- CreateIndex
CREATE INDEX "boletos_prudent_vencimento_idx" ON "boletos_prudent"("vencimento");

-- CreateIndex
CREATE INDEX "boletos_prudent_lote_id_idx" ON "boletos_prudent"("lote_id");

-- CreateIndex
CREATE UNIQUE INDEX "boletos_prudent_pagamentos_comprovante_hash_key" ON "boletos_prudent_pagamentos"("comprovante_hash");

-- CreateIndex
CREATE INDEX "boletos_prudent_pagamentos_boleto_id_idx" ON "boletos_prudent_pagamentos"("boleto_id");

-- CreateIndex
CREATE INDEX "parcelas_vencimento_boleto_prudent_id_idx" ON "parcelas_vencimento"("boleto_prudent_id");

-- AddForeignKey
ALTER TABLE "parcelas_vencimento" ADD CONSTRAINT "parcelas_vencimento_boleto_prudent_id_fkey" FOREIGN KEY ("boleto_prudent_id") REFERENCES "boletos_prudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos_prudent" ADD CONSTRAINT "boletos_prudent_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "antecipacao_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos_prudent" ADD CONSTRAINT "boletos_prudent_pdf_arquivo_id_fkey" FOREIGN KEY ("pdf_arquivo_id") REFERENCES "arquivos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos_prudent" ADD CONSTRAINT "boletos_prudent_substitui_id_fkey" FOREIGN KEY ("substitui_id") REFERENCES "boletos_prudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos_prudent_pagamentos" ADD CONSTRAINT "boletos_prudent_pagamentos_boleto_id_fkey" FOREIGN KEY ("boleto_id") REFERENCES "boletos_prudent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletos_prudent_pagamentos" ADD CONSTRAINT "boletos_prudent_pagamentos_comprovante_arquivo_id_fkey" FOREIGN KEY ("comprovante_arquivo_id") REFERENCES "arquivos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Um boleto vivo por lote e vencimento; substituídos e cancelados ficam no histórico.
CREATE UNIQUE INDEX "boletos_prudent_lote_vencimento_vivo" ON "boletos_prudent" ("lote_id", "vencimento")
  WHERE "status" NOT IN ('substituido', 'cancelado');
