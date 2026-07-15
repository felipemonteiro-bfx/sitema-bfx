"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrThrow } from "@/lib/guards";
import { resgatarPontos } from "@/lib/fidelidade-service";

/** Resgata pontos de um cliente (gera desconto a aplicar manualmente na venda). */
export async function resgatarPontosCliente(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const clienteId = Number(formData.get("clienteId") || 0);
  const pontos = Number(formData.get("pontos") || 0);
  if (!clienteId || !pontos) return;
  await resgatarPontos(clienteId, pontos, "Resgate manual (desconto)");
  revalidatePath("/crm/fidelidade");
}
