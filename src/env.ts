import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
// Aceita apenas "1"/"true" como sinal de pular — "false"/"0"/"" NAO pulam a validacao.
// (o `!!` antigo tratava qualquer string nao-vazia, incl. "false", como verdadeira).
const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "1" || process.env.SKIP_ENV_VALIDATION === "true";

const envSchema = z.object({
  // Obrigatorias
  DATABASE_URL: z.string().min(1, "DATABASE_URL e obrigatoria"),
  SESSION_SECRET: isProduction
    ? z.string().min(32, "SESSION_SECRET precisa ter minimo 32 chars em producao")
    : z.string().default("dev-secret"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Opcionais — App
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // Segredo do MCP do agente de WhatsApp (docs/MCP-AGENTE-SPEC.md). Separado do
  // SESSION_SECRET de proposito: aquele assina sessao de usuario interno,
  // inclusive admin. Opcional porque o servidor MCP falha fechado sem ele — a
  // rota devolve 401 e nao consulta nada.
  MCP_AGENTE_SECRET: z.string().min(32, "MCP_AGENTE_SECRET precisa ter minimo 32 chars").optional(),
  // Busca semantica do catalogo no MCP do agente (src/lib/busca-produtos.ts).
  // Opcionais: sem elas a busca cai para lexical (unaccent + trigrama), que
  // degrada o resultado mas nao derruba a consulta.
  EMBEDDING_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_MODELO: z.string().optional(),

  // Opcionais — MinIO
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  MINIO_PUBLIC_URL: z.string().optional(),

  // Opcionais — Asaas
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_ENV: z.enum(["sandbox", "production"]).default("sandbox"),

  // Opcionais — WhatsApp (Evolution API)
  EVOLUTION_API_URL: z.string().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE: z.string().optional(),

  // Opcionais — AI providers
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LITELLM_URL: z.string().optional(),
  LITELLM_KEY: z.string().optional(),
  LITELLM_MODEL: z.string().optional(),
  LITELLM_ENABLE_THINKING: z.string().optional(),

  // Opcionais — Uber Direct
  UBER_DIRECT_CUSTOMER_ID: z.string().optional(),
  UBER_DIRECT_TOKEN: z.string().optional(),
  UBER_PICKUP_ADDRESS_JSON: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  if (skipValidation) {
    return process.env as unknown as Env;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs || []).join(", ")}`)
      .join("\n");
    throw new Error(`Env vars invalidas:\n${formatted}`);
  }
  return parsed.data;
}

export const env = validateEnv();
