"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { gerarTokenWebhook } from "@/lib/webhook-asaas-token";

/**
 * Gera (ou troca) o token do webhook do Asaas. Trocar invalida o anterior: o último aviso volta a
 * nulo para a tela mostrar "Falta cadastrar no Asaas" até o painel ser atualizado. O token não
 * vai para o audit log.
 */
export async function gerarTokenWebhookAsaas(): Promise<{ success: boolean; error?: string }> {
  await requireAdminOrThrow();
  const token = gerarTokenWebhook();
  const data = { asaasWebhookToken: token, asaasWebhookUltimoAvisoEm: null };

  const cfg = await prisma.config.findFirst({ select: { id: true } });
  if (cfg) {
    await prisma.config.updateMany({ where: { id: cfg.id }, data });
  } else {
    await prisma.config.create({ data });
  }

  await createAuditLog("config:asaas-webhook-token", { acao: cfg ? "trocado" : "criado" });
  revalidatePath("/configuracoes");
  return { success: true };
}

/**
 * Token completo para o botão Copiar. A página só recebe a versão mascarada: o token não fica no
 * HTML nem no payload da rota, e sai do servidor só quando o admin pede.
 */
export async function lerTokenWebhookAsaas(): Promise<{ success: boolean; token?: string; error?: string }> {
  await requireAdminOrThrow();
  const cfg = await prisma.config.findFirst({ select: { asaasWebhookToken: true } });
  if (!cfg?.asaasWebhookToken) return { success: false, error: "Nenhum token gerado ainda." };
  return { success: true, token: cfg.asaasWebhookToken };
}
