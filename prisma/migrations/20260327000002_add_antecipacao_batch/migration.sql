-- CreateTable: antecipacao_batches
CREATE TABLE IF NOT EXISTS "antecipacao_batches" (
    "id" SERIAL NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venda_ids" TEXT NOT NULL,
    "valor_total" DOUBLE PRECISION NOT NULL,
    "quantidade_vendas" INTEGER NOT NULL,
    "periodo_descricao" TEXT,
    "periodo_inicio" TIMESTAMP(3),
    "periodo_fim" TIMESTAMP(3),

    CONSTRAINT "antecipacao_batches_pkey" PRIMARY KEY ("id")
);
