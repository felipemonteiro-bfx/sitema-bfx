-- Schema FK Improvements: adiciona FKs faltantes sem perder nenhum dado.
-- Campos texto (vendedor, usuario) sao MANTIDOS para compatibilidade.

-- 1. vendas.vendedor_id: coluna + FK ja existem (migration 20260330).
--    Backfill das 32 vendas com vendedor_id NULL usando match por username/nome_exibicao.
UPDATE vendas v
SET vendedor_id = u.id
FROM usuarios u
WHERE v.vendedor_id IS NULL
  AND v.vendedor IS NOT NULL
  AND (LOWER(u.username) = LOWER(v.vendedor) OR LOWER(u.nome_exibicao) = LOWER(v.vendedor));

-- 2. pagamentos.vendedor_id: coluna + FK ja existem. Backfill (se houver dados).
UPDATE pagamentos p
SET vendedor_id = u.id
FROM usuarios u
WHERE p.vendedor_id IS NULL
  AND p.vendedor IS NOT NULL
  AND (LOWER(u.username) = LOWER(p.vendedor) OR LOWER(u.nome_exibicao) = LOWER(p.vendedor));

-- 3. notificacoes.usuario_id: coluna existe mas sem FK constraint.
ALTER TABLE "notificacoes"
  ADD CONSTRAINT "notificacoes_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. ai_mensagens: adicionar usuario_id com FK.
ALTER TABLE "ai_mensagens" ADD COLUMN IF NOT EXISTS "usuario_id" INTEGER;

UPDATE ai_mensagens am
SET usuario_id = u.id
FROM usuarios u
WHERE am.usuario_id IS NULL
  AND am.usuario IS NOT NULL
  AND u.username = am.usuario;

ALTER TABLE "ai_mensagens"
  ADD CONSTRAINT "ai_mensagens_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ai_mensagens_usuario_id_idx" ON "ai_mensagens"("usuario_id");

-- 5. audit_logs: adicionar usuario_id com FK.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "usuario_id" INTEGER;

UPDATE audit_logs al
SET usuario_id = u.id
FROM usuarios u
WHERE al.usuario_id IS NULL
  AND al.usuario IS NOT NULL
  AND (u.username = al.usuario OR u.nome_exibicao = al.usuario);

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "audit_logs_usuario_id_idx" ON "audit_logs"("usuario_id");
