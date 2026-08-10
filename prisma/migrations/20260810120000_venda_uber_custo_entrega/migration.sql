-- AlterTable: custo real de entrega Uber Direct (QK-F21-01/QK-F21-02).
--
-- uber_delivery_id guarda qual entrega da Uber gerou o custoEnvio da venda.
-- O indice UNIQUE existe para que o mesmo delivery id nunca seja lancado
-- como custo em duas vendas diferentes (T-F21-05) — em Postgres um indice
-- UNIQUE permite varios NULL, entao vendas sem entrega Uber nao colidem
-- entre si.
--
-- custo_envio_fonte guarda de onde o numero veio ("manual" | "uber_provisorio"
-- | "uber_final") para que um custo digitado a mao ou ja reconciliado nunca
-- seja sobrescrito por um valor provisorio (T-F21-04).
--
-- Idempotente: seguro rodar mais de uma vez (mesmo estilo de
-- 20260804120000_config_uber).
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "uber_delivery_id" TEXT;
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "custo_envio_fonte" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "vendas_uber_delivery_id_key" ON "vendas" ("uber_delivery_id");
