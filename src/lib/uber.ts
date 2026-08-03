/**
 * Integração com Uber Direct API para cotação de frete.
 * Documentação: https://developer.uber.com/docs/deliveries/direct
 */
import {
  interpretarRespostaUber,
  interpretarFalhaDeRede,
  type ResultadoCotacaoUber,
} from "@/lib/uber-quote-result";

const UBER_API_BASE = "https://api.uber.com/v1";

export type UberDirectConfig = {
  customerId: string;
  token: string;
};

export function getUberDirectConfig(): UberDirectConfig | null {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID?.trim();
  const token = process.env.UBER_DIRECT_TOKEN?.trim();
  if (!customerId || !token) return null;
  return { customerId, token };
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
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
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
    console.error("Uber Direct API error:", err);
    return interpretarFalhaDeRede();
  }
}
