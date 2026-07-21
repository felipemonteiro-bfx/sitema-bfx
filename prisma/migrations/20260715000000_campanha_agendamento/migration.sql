-- CRM: agendamento de campanhas (disparo automático via cron).
ALTER TABLE "campanhas" ADD COLUMN IF NOT EXISTS "agendada_para" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "campanhas_agendada_para_idx" ON "campanhas" ("agendada_para");
