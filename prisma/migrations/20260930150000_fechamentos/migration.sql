-- Fechamento mensal por empresa — 2026-09-30 (Fase 5).
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.2 e §3.6.
--
-- Migração aditiva: quatro tabelas novas (fechamentos, versões, linhas e ajustes) e duas colunas
-- nulas em `parcelas_vencimento` (`fechamento_id`, a reserva, e `liquidada_em`). Nenhum dado
-- existente muda; os fechamentos nascem pela tela /fechamento.

-- AlterTable
ALTER TABLE "parcelas_vencimento" ADD COLUMN     "fechamento_id" INTEGER,
ADD COLUMN     "liquidada_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "fechamentos" (
    "id" SERIAL NOT NULL,
    "empresa_parceira_id" INTEGER NOT NULL,
    "competencia" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_preparacao',
    "responsavel" TEXT,
    "versao_atual" INTEGER NOT NULL DEFAULT 0,
    "desatualizado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fechamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamento_versoes" (
    "id" SERIAL NOT NULL,
    "fechamento_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "total_bruto" DOUBLE PRECISION NOT NULL,
    "total_ajustes" DOUBLE PRECISION NOT NULL,
    "total_final" DOUBLE PRECISION NOT NULL,
    "ajustes_json" TEXT NOT NULL,
    "xlsx_arquivo_id" INTEGER,
    "pdf_arquivo_id" INTEGER,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criada_por" TEXT,
    "enviada_em" TIMESTAMP(3),
    "enviada_por" TEXT,

    CONSTRAINT "fechamento_versoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamento_linhas" (
    "id" SERIAL NOT NULL,
    "versao_id" INTEGER NOT NULL,
    "parcela_id" INTEGER,
    "venda_id" INTEGER NOT NULL,
    "numero_parcela" INTEGER NOT NULL,
    "total_parcelas" INTEGER NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "matricula" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "lote_id" INTEGER,
    "antecipada" BOOLEAN NOT NULL,
    "boleto_prudent_id" INTEGER,

    CONSTRAINT "fechamento_linhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechamento_ajustes" (
    "id" SERIAL NOT NULL,
    "fechamento_id" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "justificativa" TEXT NOT NULL,
    "criado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removido_em" TIMESTAMP(3),

    CONSTRAINT "fechamento_ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fechamentos_empresa_parceira_id_competencia_key" ON "fechamentos"("empresa_parceira_id", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "fechamento_versoes_fechamento_id_numero_key" ON "fechamento_versoes"("fechamento_id", "numero");

-- CreateIndex
CREATE INDEX "fechamento_linhas_versao_id_idx" ON "fechamento_linhas"("versao_id");

-- CreateIndex
CREATE INDEX "fechamento_linhas_parcela_id_idx" ON "fechamento_linhas"("parcela_id");

-- CreateIndex
CREATE INDEX "fechamento_ajustes_fechamento_id_idx" ON "fechamento_ajustes"("fechamento_id");

-- CreateIndex
CREATE INDEX "parcelas_vencimento_fechamento_id_idx" ON "parcelas_vencimento"("fechamento_id");

-- AddForeignKey
ALTER TABLE "parcelas_vencimento" ADD CONSTRAINT "parcelas_vencimento_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamentos" ADD CONSTRAINT "fechamentos_empresa_parceira_id_fkey" FOREIGN KEY ("empresa_parceira_id") REFERENCES "empresas_parceiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_versoes" ADD CONSTRAINT "fechamento_versoes_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_versoes" ADD CONSTRAINT "fechamento_versoes_xlsx_arquivo_id_fkey" FOREIGN KEY ("xlsx_arquivo_id") REFERENCES "arquivos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_versoes" ADD CONSTRAINT "fechamento_versoes_pdf_arquivo_id_fkey" FOREIGN KEY ("pdf_arquivo_id") REFERENCES "arquivos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_linhas" ADD CONSTRAINT "fechamento_linhas_versao_id_fkey" FOREIGN KEY ("versao_id") REFERENCES "fechamento_versoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_linhas" ADD CONSTRAINT "fechamento_linhas_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "parcelas_vencimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechamento_ajustes" ADD CONSTRAINT "fechamento_ajustes_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

