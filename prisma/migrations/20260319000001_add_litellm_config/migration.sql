-- Add LiteLLM and AI provider fields to config table
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "ai_provider" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "litellm_url" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "litellm_key" TEXT;
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "litellm_model" TEXT;
