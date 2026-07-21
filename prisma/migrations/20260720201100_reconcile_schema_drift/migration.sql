/*
  RECONCILIAÇÃO DE DEFASAGEM DO SCHEMA (não relacionada ao WhatsApp).

  O branch `nextjs-migration` acumulou mudanças em `prisma/schema.prisma` de
  commits anteriores que nunca foram materializadas em migration. Esta migration
  reconcilia essa defasagem, isolada da migration do WhatsApp que a sucede, para
  que cada arquivo reflita o que realmente contém.

  ⚠️ ATENÇÃO — PERDA DE DADOS:
  Esta migration remove a coluna `itens_venda.produto_id`. Todos os dados dessa
  coluna serão perdidos ao aplicar em um banco que ainda a tenha populada.
  Confirme que o dado já foi migrado para `produto_nome` (ou equivalente) antes
  de aplicar em produção.
*/

-- DropForeignKey
ALTER TABLE "itens_venda" DROP CONSTRAINT "itens_venda_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_envio_log" DROP CONSTRAINT "whatsapp_envio_log_cliente_id_fkey";

-- DropIndex
DROP INDEX "campanhas_agendada_para_idx";

-- DropIndex
DROP INDEX "itens_venda_produto_id_idx";

-- DropIndex
DROP INDEX "vendas_forma_pagamento_idx";

-- AlterTable
ALTER TABLE "config" ADD COLUMN     "admin_email" TEXT,
ADD COLUMN     "smtp_from" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_pass" TEXT,
ADD COLUMN     "smtp_port" INTEGER,
ADD COLUMN     "smtp_user" TEXT;

-- AlterTable  ⚠️ perda de dados
ALTER TABLE "itens_venda" DROP COLUMN "produto_id";

-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "desconto" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "vozes_dubladores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "genero" TEXT,
    "estilo" TEXT,
    "minio_url" TEXT NOT NULL,
    "minio_key" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vozes_dubladores_pkey" PRIMARY KEY ("id")
);
