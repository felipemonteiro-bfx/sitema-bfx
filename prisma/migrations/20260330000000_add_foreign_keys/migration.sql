-- Migration: add foreign keys and integer ID references
-- 1. itens_venda.produto_id → produtos.id
-- 2. vendas.vendedor_id → usuarios.id
-- 3. pagamentos.vendedor_id → usuarios.id
-- 4. whatsapp_envio_log.cliente_id → clientes.id (FK constraint)

-- ============================================================
-- 1. itens_venda: adicionar produto_id
-- ============================================================
ALTER TABLE "itens_venda" ADD COLUMN "produto_id" INTEGER;

-- Populr produto_id a partir do nome (match pelo nome mais recente)
UPDATE "itens_venda" iv
SET "produto_id" = (
  SELECT p.id FROM "produtos" p
  WHERE p.nome = iv."produto_nome"
  ORDER BY p.id ASC
  LIMIT 1
);

CREATE INDEX "itens_venda_produto_id_idx" ON "itens_venda"("produto_id");

ALTER TABLE "itens_venda"
  ADD CONSTRAINT "itens_venda_produto_id_fkey"
  FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 2. vendas: adicionar vendedor_id
-- ============================================================
ALTER TABLE "vendas" ADD COLUMN "vendedor_id" INTEGER;

-- Popular vendedor_id a partir do username
UPDATE "vendas" v
SET "vendedor_id" = (
  SELECT u.id FROM "usuarios" u
  WHERE u.username = v.vendedor
  LIMIT 1
);

ALTER TABLE "vendas"
  ADD CONSTRAINT "vendas_vendedor_id_fkey"
  FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 3. pagamentos: adicionar vendedor_id
-- ============================================================
ALTER TABLE "pagamentos" ADD COLUMN "vendedor_id" INTEGER;

-- Popular vendedor_id a partir do username
UPDATE "pagamentos" p
SET "vendedor_id" = (
  SELECT u.id FROM "usuarios" u
  WHERE u.username = p.vendedor
  LIMIT 1
);

ALTER TABLE "pagamentos"
  ADD CONSTRAINT "pagamentos_vendedor_id_fkey"
  FOREIGN KEY ("vendedor_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 4. whatsapp_envio_log: adicionar FK em cliente_id
-- Limpar orfãos antes de criar constraint
-- ============================================================
DELETE FROM "whatsapp_envio_log"
WHERE "cliente_id" NOT IN (SELECT id FROM "clientes");

ALTER TABLE "whatsapp_envio_log"
  ADD CONSTRAINT "whatsapp_envio_log_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
