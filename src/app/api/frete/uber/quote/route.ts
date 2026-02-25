import { NextRequest } from "next/server";
import { getUberDirectConfig, getDeliveryQuote, type UberAddress } from "@/lib/uber";

export async function POST(req: NextRequest) {
  const config = getUberDirectConfig();
  if (!config) {
    return Response.json(
      { error: "Uber Direct não configurado. Defina UBER_DIRECT_CUSTOMER_ID e UBER_DIRECT_TOKEN." },
      { status: 503 }
    );
  }

  let body: {
    pickupAddress: UberAddress;
    dropoffAddress: UberAddress;
    pickupPhone?: string;
    dropoffPhone?: string;
    orderValue: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { pickupAddress, dropoffAddress, pickupPhone, dropoffPhone, orderValue } = body;

  if (!pickupAddress?.street_address || !dropoffAddress?.street_address || orderValue == null) {
    return Response.json(
      { error: "Envie pickupAddress, dropoffAddress e orderValue (valor em reais)" },
      { status: 400 }
    );
  }

  const orderValueCents = Math.round(Number(orderValue) * 100);

  const quote = await getDeliveryQuote(config, {
    pickupAddress,
    dropoffAddress,
    pickupPhone,
    dropoffPhone,
    orderValueCents,
  });

  if (!quote) {
    return Response.json(
      { error: "Não foi possível obter cotação. Verifique os endereços ou tente novamente." },
      { status: 502 }
    );
  }

  return Response.json({
    fee: quote.fee / 100,
    feeCents: quote.fee,
    duration: quote.duration,
    quoteId: quote.id,
    currency: quote.currencyType,
  });
}
