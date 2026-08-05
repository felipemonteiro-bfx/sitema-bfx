-- AlterTable: guarda o provedor que gerou cada resposta da /inteligencia
-- (gemini | openai | litellm). Antes, a tela creditava toda resposta ao Gemini
-- por rotulo fixo no codigo — inclusive respostas que eram erro do LiteLLM.
--
-- Coluna anulavel de proposito: as linhas ja gravadas nao tem como saber com que
-- provedor foram geradas, e NULL ("desconhecido") e honesto. A tela omite a
-- pilula nesse caso em vez de inventar um nome. Sem backfill.
--
-- Idempotente: seguro rodar mais de uma vez.
ALTER TABLE "ai_mensagens" ADD COLUMN IF NOT EXISTS "provider" TEXT;
