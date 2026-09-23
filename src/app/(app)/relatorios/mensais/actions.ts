"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizarEmailsCopia } from "@/lib/email-copia";
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

export type SalvarEmailCopiaEstado =
  | { ok: true; valor: string | null }
  | { ok: false; erro: string }
  | undefined;

/** Grava o e-mail em copia (Cc) de uma empresa; vazio remove. Usado com useActionState. */
export async function salvarEmailCopia(
  _estado: SalvarEmailCopiaEstado,
  formData: FormData
): Promise<SalvarEmailCopiaEstado> {
  await requireAdminOrThrow();
  const empresaId = Number(formData.get("empresaId"));
  if (!Number.isInteger(empresaId) || empresaId <= 0) return { ok: false, erro: "Empresa inválida" };

  const normalizado = normalizarEmailsCopia(String(formData.get("emailCopia") ?? ""));
  if (!normalizado.ok) return { ok: false, erro: `E-mail inválido: ${normalizado.invalidos.join(", ")}` };

  await prisma.empresaParceira.update({ where: { id: empresaId }, data: { emailCopia: normalizado.valor } });
  revalidatePath("/relatorios/mensais");
  return { ok: true, valor: normalizado.valor };
}
