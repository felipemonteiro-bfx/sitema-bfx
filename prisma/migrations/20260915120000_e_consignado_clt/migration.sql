ALTER TABLE "clientes" ADD COLUMN "pct_consignado" DOUBLE PRECISION;
ALTER TABLE "clientes" ADD COLUMN "faixa_consignado" TEXT;

CREATE INDEX "clientes_faixa_consignado_idx" ON "clientes"("faixa_consignado");

CREATE TABLE "contratos_consignados" (
    "id" SERIAL NOT NULL,
    "if_concessora_codigo" TEXT NOT NULL,
    "contrato" TEXT NOT NULL,
    "if_concessora_descricao" TEXT,
    "cpf" TEXT NOT NULL DEFAULT '',
    "matricula" TEXT,
    "nome_trabalhador" TEXT NOT NULL,
    "nome_empregador" TEXT,
    "numero_inscricao_empregador" TEXT,
    "numero_inscricao_estabelecimento" TEXT,
    "competencia_inicio_desconto" TEXT NOT NULL,
    "competencia_fim_desconto" TEXT NOT NULL,
    "valor_parcela" DOUBLE PRECISION NOT NULL,
    "total_parcelas" INTEGER,
    "valor_emprestimo" DOUBLE PRECISION,
    "valor_liberado" DOUBLE PRECISION,
    "data_inicio_contrato" TEXT,
    "data_fim_contrato" TEXT,
    "data_admissao" TEXT,
    "categoria_trabalhador" TEXT,
    "competencia_arquivo" TEXT,
    "cliente_id" INTEGER NOT NULL,
    "empresa_parceira_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_consignados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contratos_consignados_if_concessora_codigo_contrato_key" ON "contratos_consignados"("if_concessora_codigo", "contrato");
CREATE INDEX "contratos_consignados_cliente_id_idx" ON "contratos_consignados"("cliente_id");
CREATE INDEX "contratos_consignados_cpf_idx" ON "contratos_consignados"("cpf");
CREATE INDEX "contratos_consignados_empresa_parceira_id_idx" ON "contratos_consignados"("empresa_parceira_id");

ALTER TABLE "contratos_consignados" ADD CONSTRAINT "contratos_consignados_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contratos_consignados" ADD CONSTRAINT "contratos_consignados_empresa_parceira_id_fkey" FOREIGN KEY ("empresa_parceira_id") REFERENCES "empresas_parceiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
