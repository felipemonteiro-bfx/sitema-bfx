-- Cobrança Pix e recebimentos do fechamento — 2026-09-30 (Fase 6).
-- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.6, §5.2 e §5.3.
--
-- Migração aditiva: duas tabelas novas (`cobrancas_fechamento`, `recebimentos_fechamento`) e uma
-- coluna nula em `empresas_parceiras` (`asaas_customer_id`, o cliente Asaas da empresa). Nenhum
-- dado existente muda; as cobranças nascem no envio do fechamento.
--
-- Fora do schema.prisma (o Prisma não representa índice parcial): uma cobrança `ativa` por
-- fechamento — duas cobranças vivas para o mesmo mês seriam cobrança dupla.

-- AlterTable
ALTER TABLE "empresas_parceiras" ADD COLUMN     "asaas_customer_id" TEXT;

-- CreateTable
CREATE TABLE "cobrancas_fechamento" (
    "id" SERIAL NOT NULL,
    "fechamento_id" INTEGER NOT NULL,
    "versao_id" INTEGER NOT NULL,
    "asaas_payment_id" TEXT NOT NULL,
    "external_reference" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "pix_copia_e_cola" TEXT,
    "qr_code_png" BYTEA,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelada_em" TIMESTAMP(3),

    CONSTRAINT "cobrancas_fechamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos_fechamento" (
    "id" SERIAL NOT NULL,
    "fechamento_id" INTEGER NOT NULL,
    "cobranca_id" INTEGER,
    "origem" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data_recebimento" TIMESTAMP(3) NOT NULL,
    "asaas_payment_id" TEXT,
    "end_to_end_id" TEXT,
    "comprovante_arquivo_id" INTEGER,
    "status" TEXT NOT NULL,
    "registrado_por" TEXT,
    "confirmado_por" TEXT,
    "confirmado_em" TIMESTAMP(3),
    "estornado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimentos_fechamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cobrancas_fechamento_asaas_payment_id_key" ON "cobrancas_fechamento"("asaas_payment_id");

-- CreateIndex
CREATE INDEX "cobrancas_fechamento_fechamento_id_idx" ON "cobrancas_fechamento"("fechamento_id");

-- CreateIndex
CREATE INDEX "cobrancas_fechamento_versao_id_idx" ON "cobrancas_fechamento"("versao_id");

-- CreateIndex
CREATE UNIQUE INDEX "recebimentos_fechamento_asaas_payment_id_key" ON "recebimentos_fechamento"("asaas_payment_id");

-- CreateIndex
CREATE INDEX "recebimentos_fechamento_fechamento_id_idx" ON "recebimentos_fechamento"("fechamento_id");

-- CreateIndex
CREATE INDEX "recebimentos_fechamento_cobranca_id_idx" ON "recebimentos_fechamento"("cobranca_id");

-- AddForeignKey
ALTER TABLE "cobrancas_fechamento" ADD CONSTRAINT "cobrancas_fechamento_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_fechamento" ADD CONSTRAINT "cobrancas_fechamento_versao_id_fkey" FOREIGN KEY ("versao_id") REFERENCES "fechamento_versoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_fechamento" ADD CONSTRAINT "recebimentos_fechamento_fechamento_id_fkey" FOREIGN KEY ("fechamento_id") REFERENCES "fechamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_fechamento" ADD CONSTRAINT "recebimentos_fechamento_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "cobrancas_fechamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_fechamento" ADD CONSTRAINT "recebimentos_fechamento_comprovante_arquivo_id_fkey" FOREIGN KEY ("comprovante_arquivo_id") REFERENCES "arquivos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Uma cobrança ativa por fechamento (índice parcial).
CREATE UNIQUE INDEX "cobrancas_fechamento_uma_ativa" ON "cobrancas_fechamento" ("fechamento_id")
  WHERE "status" = 'ativa';
