import { NextRequest } from "next/server";
import { getUberDirectConfig, getDeliveryQuote, type UberAddress } from "@/lib/uber";
import { statusHttpParaFalhaUber, mensagemFalhaUber } from "@/lib/uber-quote-result";

export async function POST(req: NextRequest) {
  const config = await getUberDirectConfig();
  if (!config) {
    const motivo = "sem_credencial" as const;
    const mensagem = mensagemFalhaUber(motivo);
    return Response.json(
      { motivo, mensagem, error: mensagem },
      { status: statusHttpParaFalhaUber(motivo) }
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

  const resultado = await getDeliveryQuote(config, {
    pickupAddress,
    dropoffAddress,
    pickupPhone,
    dropoffPhone,
    orderValueCents,
  });

  if (!resultado.ok) {
    const mensagem = mensagemFalhaUber(resultado.motivo);
    return Response.json(
      { motivo: resultado.motivo, mensagem, error: mensagem },
      { status: statusHttpParaFalhaUber(resultado.motivo) }
    );
  }

  return Response.json({
    fee: resultado.fee,
    feeCents: resultado.feeCents,
    duration: resultado.duration,
    quoteId: resultado.quoteId,
    currency: resultado.currency,
  });
}
