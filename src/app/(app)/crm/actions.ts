"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { ESTAGIOS_ORDEM } from "@/lib/crm";

/** Muda o estágio de funil de um cliente. */
export async function mudarEstagioCliente(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const clienteId = Number(formData.get("clienteId"));
  const estagio = String(formData.get("estagio") || "");
  if (!clienteId || !(ESTAGIOS_ORDEM as string[]).includes(estagio)) return;
  await prisma.cliente.update({ where: { id: clienteId }, data: { estagioCrm: estagio } });
  revalidatePath("/crm");
}

/** Cria uma tag (nome único, normalizado). */
export async function criarTag(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const nome = String(formData.get("nome") || "").trim();
  const cor = String(formData.get("cor") || "").trim() || null;
  if (!nome) return;
  try {
    await prisma.tag.create({ data: { nome, cor } });
  } catch {
    // nome duplicado — ignora
  }
  revalidatePath("/crm");
}

/** Adiciona/remove uma tag de um cliente (toggle). */
export async function toggleTagCliente(formData: FormData): Promise<void> {
  await requireAdminOrThrow();
  const clienteId = Number(formData.get("clienteId"));
  const tagId = Number(formData.get("tagId"));
  if (!clienteId || !tagId) return;

  const existente = await prisma.clienteTag.findUnique({
    where: { clienteId_tagId: { clienteId, tagId } },
  });
  if (existente) {
    await prisma.clienteTag.delete({ where: { clienteId_tagId: { clienteId, tagId } } });
  } else {
    await prisma.clienteTag.create({ data: { clienteId, tagId } });
  }
  revalidatePath("/crm");
}
