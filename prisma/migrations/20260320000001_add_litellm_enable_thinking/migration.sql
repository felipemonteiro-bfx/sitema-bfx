-- Add litellmEnableThinking field to config table
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "litellm_enable_thinking" BOOLEAN DEFAULT false;
