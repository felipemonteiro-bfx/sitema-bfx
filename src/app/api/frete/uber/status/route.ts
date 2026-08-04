import { prisma } from "@/lib/db";
import { classificarProntidaoUber } from "@/lib/uber-quote-result";
import {
  resolveUberDirectConfigFromDb,
  resolveUberDirectConfigFromEnv,
  resolveUberPickupAddressJson,
  type UberConfigDB,
  type UberPickupConfigDB,
} from "@/lib/uber";

export async function GET() {
  // Config vem da Config no banco (aba "Uber" em /configuracoes) com fallback para as
  // envs legadas (UBER_DIRECT_CUSTOMER_ID/UBER_DIRECT_TOKEN/UBER_PICKUP_ADDRESS_JSON,
  // hoje no AWS SSM) — mesma resolução usada em /api/frete/uber/quote. Uma única leitura
  // de Config aqui (em vez de chamar getUberDirectConfig() + getUberPickupAddressJson(),
  // que fariam duas idas ao banco) e reaproveitada para credencial e endereço.
  let dbConfig: (UberConfigDB & UberPickupConfigDB) | null = null;
  try {
    dbConfig = (await prisma.config.findFirst()) as (UberConfigDB & UberPickupConfigDB) | null;
  } catch (err) {
    console.error("[GET /api/frete/uber/status] Erro ao ler Config:", err);
  }
  const config = resolveUberDirectConfigFromDb(dbConfig) ?? resolveUberDirectConfigFromEnv();
  const pickupAddressJson = resolveUberPickupAddressJson(dbConfig);

  // `classificarProntidaoUber` só olha presença/ausência de string, nunca o valor: em modo
  // oauth (client_id/client_secret, sem token estático) o client_secret entra no lugar do
  // "token" só para essa checagem de presença — nunca sai no JSON de resposta (T-09-02).
  const prontidao = classificarProntidaoUber({
    customerId: config?.customerId ?? null,
    token: config ? (config.source === "static_token" ? config.token : config.clientSecret) : null,
    pickupAddressJson,
  });

  return Response.json({
    enabled: prontidao.pronto,
    motivo: prontidao.motivo,
    mensagem: prontidao.mensagem,
    pickupAddress: prontidao.pickupAddress ?? undefined,
  });
}
