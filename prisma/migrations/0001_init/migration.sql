-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "renda" DOUBLE PRECISION,
    "empresa" TEXT,
    "matricula" TEXT,
    "telefone" TEXT,
    "cpf" TEXT,
    "cnpj" TEXT,
    "tipo" TEXT,
    "data_nascimento" TIMESTAMP(3),
    "cep" TEXT,
    "endereco" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "custo_padrao" DOUBLE PRECISION,
    "marca" TEXT,
    "categoria" TEXT,
    "ncm" TEXT,
    "imagem" TEXT,
    "fornecedor_id" INTEGER,
    "qtd_estoque" INTEGER DEFAULT 0,
    "valor_venda" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" SERIAL NOT NULL,
    "data_venda" TIMESTAMP(3) NOT NULL,
    "vendedor" TEXT,
    "cliente_id" INTEGER,
    "produto_nome" TEXT,
    "custo_produto" DOUBLE PRECISION,
    "valorVenda" DOUBLE PRECISION,
    "valor_frete" DOUBLE PRECISION DEFAULT 0,
    "custo_envio" DOUBLE PRECISION DEFAULT 0,
    "parcelas" INTEGER,
    "valor_parcela" DOUBLE PRECISION,
    "taxa_financeira_valor" DOUBLE PRECISION,
    "lucro_liquido" DOUBLE PRECISION,
    "antecipada" INTEGER DEFAULT 1,
    "excedeu_limite" INTEGER DEFAULT 0,
    "comprovante_pdf" TEXT,

    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config" (
    "id" SERIAL NOT NULL,
    "modelo_contrato" TEXT,
    "logo_path" TEXT,
    "openai_key" TEXT,

    CONSTRAINT "config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT,
    "nome_exibicao" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "data_nascimento" TIMESTAMP(3),
    "endereco" TEXT,
    "cep" TEXT,
    "meta_mensal" DOUBLE PRECISION DEFAULT 50000.0,
    "comissao_pct" DOUBLE PRECISION DEFAULT 2.0,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_parceiras" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "responsavel_rh" TEXT,
    "telefone_rh" TEXT,
    "email_rh" TEXT,

    CONSTRAINT "empresas_parceiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "data_pagamento" TIMESTAMP(3) NOT NULL,
    "vendedor" TEXT,
    "valor" DOUBLE PRECISION,
    "obs" TEXT,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "usuario" TEXT,
    "acao" TEXT,
    "detalhes" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" SERIAL NOT NULL,
    "data_despesa" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT,
    "valor" DOUBLE PRECISION,
    "tipo" TEXT,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id" SERIAL NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL,
    "mensagem" TEXT,
    "ativo" INTEGER DEFAULT 1,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nome_key" ON "clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_nome_key" ON "produtos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_nome_key" ON "fornecedores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_parceiras_nome_key" ON "empresas_parceiras"("nome");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
