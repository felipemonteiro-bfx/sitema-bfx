-- CRM Fase 3: campanhas de WhatsApp por segmento.

CREATE TABLE IF NOT EXISTS "campanhas" (
  "id"            SERIAL PRIMARY KEY,
  "nome"          TEXT NOT NULL,
  "canal"         TEXT NOT NULL DEFAULT 'whatsapp',
  "filtro_json"   TEXT NOT NULL,
  "mensagem"      TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'rascunho',
  "total_alvo"    INTEGER NOT NULL DEFAULT 0,
  "total_enviado" INTEGER NOT NULL DEFAULT 0,
  "criada_em"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enviada_em"    TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "campanhas_status_idx" ON "campanhas" ("status");

CREATE TABLE IF NOT EXISTS "campanha_envios" (
  "id"          SERIAL PRIMARY KEY,
  "campanha_id" INTEGER NOT NULL,
  "cliente_id"  INTEGER NOT NULL,
  "status"      TEXT NOT NULL,
  "erro"        TEXT,
  "enviado_em"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "campanha_envios_campanha_id_cliente_id_key" ON "campanha_envios" ("campanha_id", "cliente_id");
CREATE INDEX IF NOT EXISTS "campanha_envios_cliente_id_idx" ON "campanha_envios" ("cliente_id");

ALTER TABLE "campanha_envios"
  ADD CONSTRAINT "campanha_envios_campanha_id_fkey"
  FOREIGN KEY ("campanha_id") REFERENCES "campanhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
