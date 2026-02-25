import { getUberDirectConfig } from "@/lib/uber";
import type { UberAddress } from "@/lib/uber";

export async function GET() {
  const config = getUberDirectConfig();
  if (!config) {
    return Response.json({ enabled: false });
  }

  let pickupAddress: UberAddress | undefined;
  const pickupJson = process.env.UBER_PICKUP_ADDRESS_JSON?.trim();
  if (pickupJson) {
    try {
      pickupAddress = JSON.parse(pickupJson) as UberAddress;
    } catch {
      // ignore
    }
  }

  return Response.json({
    enabled: true,
    pickupAddress: pickupAddress ?? undefined,
  });
}
