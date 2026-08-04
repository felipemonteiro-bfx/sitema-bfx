/**
 * Integração com Uber Direct API para cotação de frete.
 * Documentação: https://developer.uber.com/docs/deliveries/direct
 *
 * Credenciais: prioridade para a Config no banco (aba "Uber" em
 * /configuracoes, guarda client_id/client_secret e troca por access_token
 * via OAuth em `src/lib/uber-auth.ts` — nunca expira na mão do usuário).
 * Fallback para as variáveis de ambiente legadas (UBER_DIRECT_CUSTOMER_ID +
 * UBER_DIRECT_TOKEN, token estático hoje no AWS SSM), para não quebrar
 * produção enquanto a migração para a tela não acontece.
 */
import { prisma } from "@/lib/db";
import { obterTokenUber } from "@/lib/uber-auth";
import {
  interpretarRespostaUber,
  interpretarFalhaDeRede,
  type ResultadoCotacaoUber,
} from "@/lib/uber-quote-result";

const UBER_API_BASE = "https://api.uber.com/v1";

export type UberDirectConfig =
  | {
      source: "oauth";
      customerId: string;
      clientId: string;
      clientSecret: string;
      /** Header x-uber-organizationuuid, usado pelas rotas de Receipts (Uber for Business) — não usado na cotação do Direct. */
      organizationId?: string;
    }
  | { source: "static_token"; customerId: string; token: string };

export type UberConfigDB = {
  uberEnabled?: number | null;
  uberClientId?: string | null;
  uberClientSecret?: string | null;
  uberCustomerId?: string | null;
  uberOrganizationId?: string | null;
};

export type UberPickupConfigDB = { uberPickupAddress?: string | null };

/**
 * Resolve a config oauth a partir da Config do banco. Exige `uberEnabled === 1`
 * (opt-in explícito pela tela — o default da coluna é 0/null, então uma linha
 * de Config já existente antes desta feature nunca fica "ligada" sozinha) e
 * os três campos (client_id, client_secret, customer_id) preenchidos.
 */
export function resolveUberDirectConfigFromDb(
  cfg: UberConfigDB | null | undefined
): UberDirectConfig | null {
  if (!cfg || Number(cfg.uberEnabled) !== 1) return null;
  const clientId = (cfg.uberClientId ?? "").trim();
  const clientSecret = (cfg.uberClientSecret ?? "").trim();
  const customerId = (cfg.uberCustomerId ?? "").trim();
  if (!clientId || !clientSecret || !customerId) return null;
  const organizationId = (cfg.uberOrganizationId ?? "").trim() || undefined;
  return {
    source: "oauth",
    clientId,
    clientSecret,
    customerId,
    ...(organizationId ? { organizationId } : {}),
  };
}

/** Fallback legado: UBER_DIRECT_CUSTOMER_ID + UBER_DIRECT_TOKEN (token estático, hoje no SSM). */
export function resolveUberDirectConfigFromEnv(): UberDirectConfig | null {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID?.trim();
  const token = process.env.UBER_DIRECT_TOKEN?.trim();
  if (!customerId || !token) return null;
  return { source: "static_token", customerId, token };
}

/** Endereço de coleta salvo no banco, com fallback para UBER_PICKUP_ADDRESS_JSON. */
export function resolveUberPickupAddressJson(
  cfg: UberPickupConfigDB | null | undefined
): string | null {
  const fromDb = (cfg?.uberPickupAddress ?? "").trim();
  if (fromDb) return fromDb;
  const fromEnv = process.env.UBER_PICKUP_ADDRESS_JSON?.trim();
  return fromEnv || null;
}

/** Config Uber Direct: Config do banco (se habilitada) com fallback para as envs legadas. */
export async function getUberDirectConfig(): Promise<UberDirectConfig | null> {
  try {
    const cfg = await prisma.config.findFirst();
    const fromDb = resolveUberDirectConfigFromDb(cfg as UberConfigDB | null);
    if (fromDb) return fromDb;
  } catch (err) {
    console.error("[getUberDirectConfig] Erro ao ler Config:", err);
  }
  return resolveUberDirectConfigFromEnv();
}

/** Endereço de coleta: Config do banco com fallback para UBER_PICKUP_ADDRESS_JSON. */
export async function getUberPickupAddressJson(): Promise<string | null> {
  try {
    const cfg = await prisma.config.findFirst();
    return resolveUberPickupAddressJson(cfg as UberPickupConfigDB | null);
  } catch (err) {
    console.error("[getUberPickupAddressJson] Erro ao ler Config:", err);
    return process.env.UBER_PICKUP_ADDRESS_JSON?.trim() || null;
  }
}

/** Resolve o bearer a usar: token estático (legado) ou access_token OAuth (banco, sob demanda e cacheado). */
async function resolveUberBearerToken(config: UberDirectConfig): Promise<string> {
  if (config.source === "static_token") return config.token;
  return obterTokenUber(config.clientId, config.clientSecret, "eats.deliveries");
}

export type UberAddress = {
  street_address: string[];
  city: string;
  state: string;
  zip_code: string;
  country: string;
};

export type UberQuoteRequest = {
  pickupAddress: UberAddress;
  dropoffAddress: UberAddress;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupPhone?: string;
  dropoffPhone?: string;
  orderValueCents: number;
};

function formatPhone(phone: string | null | undefined): string | undefined {
  if (!phone || typeof phone !== "string") return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return `+55${digits.length === 11 ? digits : "11" + digits}`;
  return undefined;
}

export async function getDeliveryQuote(
  config: UberDirectConfig,
  req: UberQuoteRequest
): Promise<ResultadoCotacaoUber> {
  const pickupAddressJson = JSON.stringify(req.pickupAddress);
  const dropoffAddressJson = JSON.stringify(req.dropoffAddress);

  const now = new Date();
  const pickupReady = new Date(now.getTime() + 10 * 60 * 1000);
  const pickupDeadline = new Date(now.getTime() + 25 * 60 * 1000);
  const dropoffReady = new Date(now.getTime() + 25 * 60 * 1000);
  const dropoffDeadline = new Date(now.getTime() + 55 * 60 * 1000);

  const body: Record<string, unknown> = {
    pickup_address: pickupAddressJson,
    dropoff_address: dropoffAddressJson,
    pickup_ready_dt: pickupReady.toISOString(),
    pickup_deadline_dt: pickupDeadline.toISOString(),
    dropoff_ready_dt: dropoffReady.toISOString(),
    dropoff_deadline_dt: dropoffDeadline.toISOString(),
    manifest_total_value: Math.round(req.orderValueCents),
  };

  if (req.pickupLat != null && req.pickupLng != null) {
    body.pickup_latitude = req.pickupLat;
    body.pickup_longitude = req.pickupLng;
  }
  if (req.dropoffLat != null && req.dropoffLng != null) {
    body.dropoff_latitude = req.dropoffLat;
    body.dropoff_longitude = req.dropoffLng;
  }
  const pickupPhone = formatPhone(req.pickupPhone);
  if (pickupPhone) body.pickup_phone_number = pickupPhone;
  const dropoffPhone = formatPhone(req.dropoffPhone);
  if (dropoffPhone) body.dropoff_phone_number = dropoffPhone;

  const url = `${UBER_API_BASE}/customers/${config.customerId}/delivery_quotes`;

  try {
    const token = await resolveUberBearerToken(config);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      // Corpo cru da Uber so aparece aqui (servidor) — nunca na resposta ao navegador (T-09-01).
      console.error("Uber Direct quote error:", data);
    }

    return interpretarRespostaUber(res.status, data);
  } catch (err) {
    // Cobre tanto falha de rede na cotacao quanto falha ao obter o access_token via OAuth
    // (client_secret errado, 429 no endpoint de token, etc.) — mesmo formato de erro para
    // quem chama, sem vazar detalhe da credencial (T-09-02).
    console.error("Uber Direct API error:", err);
    return interpretarFalhaDeRede();
  }
}
