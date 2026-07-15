-- CRM Fase 4: fidelidade por pontos.

-- Saldo de pontos no Cliente.
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "pontos" INTEGER DEFAULT 0;

-- Ledger de transacoes de pontos (ganho na venda, resgate, ajuste).
CREATE TABLE IF NOT EXISTS "ponto_transacoes" (
  "id"         SERIAL PRIMARY KEY,
  "cliente_id" INTEGER NOT NULL,
  "venda_id"   INTEGER,
  "tipo"       TEXT NOT NULL,
  "pontos"     INTEGER NOT NULL,
  "descricao"  TEXT,
  "criado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ponto_transacoes_cliente_id_idx" ON "ponto_transacoes" ("cliente_id");

ALTER TABLE "ponto_transacoes"
  ADD CONSTRAINT "ponto_transacoes_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
