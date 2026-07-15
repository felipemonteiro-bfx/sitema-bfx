-- CRM Fase 1: estagio no funil + origem no Cliente, e tags (segmentacao).

-- 1. Campos CRM no Cliente. Clientes existentes recebem estagio "cliente" (ja compraram).
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "estagio_crm" TEXT DEFAULT 'cliente';
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "origem" TEXT;

CREATE INDEX IF NOT EXISTS "clientes_estagio_crm_idx" ON "clientes" ("estagio_crm");

-- Backfill defensivo: quem ja tem venda e um cliente; quem nao tem fica como esta
-- (default 'cliente'); leads futuros virao com 'novo_lead' na importacao.
UPDATE "clientes" SET "estagio_crm" = 'cliente' WHERE "estagio_crm" IS NULL;

-- 2. Tags (segmentacao manual).
CREATE TABLE IF NOT EXISTS "tags" (
  "id"   SERIAL PRIMARY KEY,
  "nome" TEXT NOT NULL,
  "cor"  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "tags_nome_key" ON "tags" ("nome");

-- 3. Join Cliente <-> Tag.
CREATE TABLE IF NOT EXISTS "cliente_tags" (
  "cliente_id" INTEGER NOT NULL,
  "tag_id"     INTEGER NOT NULL,
  CONSTRAINT "cliente_tags_pkey" PRIMARY KEY ("cliente_id", "tag_id")
);
CREATE INDEX IF NOT EXISTS "cliente_tags_tag_id_idx" ON "cliente_tags" ("tag_id");

ALTER TABLE "cliente_tags"
  ADD CONSTRAINT "cliente_tags_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cliente_tags"
  ADD CONSTRAINT "cliente_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
