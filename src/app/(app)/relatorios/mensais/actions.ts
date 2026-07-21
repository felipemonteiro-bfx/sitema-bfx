"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrThrow } from "@/lib/guards";
import { processarRelatorioMensal } from "@/lib/relatorio-mensal-service";

/** Reenvia (force) o relatorio mensal de uma empresa para um periodo. */
export async function reenviarRelatorioMensal(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const empresaId = Number(formData.get("empresaId"));
  const periodo = String(formData.get("periodo") || "");
  if (!empresaId || !periodo) return;
  await processarRelatorioMensal({ periodo, empresaId, force: true });
  revalidatePath("/relatorios/mensais");
}

/** Gera/envia os relatorios de todas as empresas para um periodo (respeita idempotencia). */
export async function gerarRelatoriosMensais(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const periodo = String(formData.get("periodo") || "");
  if (!periodo) return;
  await processarRelatorioMensal({ periodo, force: false });
  revalidatePath("/relatorios/mensais");
}
