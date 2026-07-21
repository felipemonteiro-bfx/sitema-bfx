-- Configura LiteLLM como provedor padrão de IA para o BFX
-- Chave virtual dedicada: bfx-sistema (alias sk-...KpWQ)
INSERT INTO "config" ("ai_provider", "litellm_url", "litellm_key", "litellm_model")
SELECT 'litellm', 'https://ai.softlive.dev', 'sk-rxY5z8ba1JjT0AKGdRKpWQ', 'gpt-4o'
WHERE NOT EXISTS (SELECT 1 FROM "config");

UPDATE "config" SET
  "ai_provider"   = 'litellm',
  "litellm_url"   = 'https://ai.softlive.dev',
  "litellm_key"   = 'sk-rxY5z8ba1JjT0AKGdRKpWQ',
  "litellm_model" = 'gpt-4o'
WHERE "ai_provider" IS NULL OR "ai_provider" IN ('gemini', 'litellm');
