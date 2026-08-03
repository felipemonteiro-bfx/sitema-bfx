import { classificarProntidaoUber } from "@/lib/uber-quote-result";

export async function GET() {
  const prontidao = classificarProntidaoUber({
    customerId: process.env.UBER_DIRECT_CUSTOMER_ID,
    token: process.env.UBER_DIRECT_TOKEN,
    pickupAddressJson: process.env.UBER_PICKUP_ADDRESS_JSON,
  });

  return Response.json({
    enabled: prontidao.pronto,
    motivo: prontidao.motivo,
    mensagem: prontidao.mensagem,
    pickupAddress: prontidao.pickupAddress ?? undefined,
  });
}
