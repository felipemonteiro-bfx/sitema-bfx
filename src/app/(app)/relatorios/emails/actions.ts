"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { OrigemEmail, TipoEmail } from "@/lib/email-historico";
import { requireAdminOrThrow } from "@/lib/guards";

export type ReenviarEmailEstado = { ok: true } | { ok: false; erro: string } | undefined;

function lista(valor: string | null): string[] {
  return (valor ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

/** Reenvia um e-mail do histórico: mesmo corpo, mesmos anexos, mesmos destinatários. */
export async function reenviarEmail(_estado: ReenviarEmailEstado, formData: FormData): Promise<ReenviarEmailEstado> {
  await requireAdminOrThrow();
  const id = Number(formData.get("envioId"));
  if (!Number.isInteger(id) || id <= 0) return { ok: false, erro: "E-mail inválido" };

  const envio = await prisma.emailEnvio.findUnique({ where: { id }, include: { anexos: true } });
  if (!envio) return { ok: false, erro: "E-mail não encontrado" };

  const cc = lista(envio.cc);
  const origem: OrigemEmail = "manual";
  try {
    await sendEmail({
      to: lista(envio.para),
      ...(cc.length > 0 ? { cc } : {}),
      subject: envio.assunto,
      html: envio.corpoHtml,
      attachments: envio.anexos.map((a) => ({ filename: a.nome, contentType: a.contentType, content: Buffer.from(a.conteudo) })),
      registro: { tipo: envio.tipo as TipoEmail, empresaId: envio.empresaId, vendaId: envio.vendaId, origem },
    });
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Falha ao reenviar" };
  } finally {
    revalidatePath("/relatorios/emails");
  }
  return { ok: true };
}
