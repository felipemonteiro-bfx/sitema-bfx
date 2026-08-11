"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow, requireSessionOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { hashSenha, verificarSenha } from "@/lib/senha";
import { validarForcaMinima, validarTrocaDeSenha } from "@/lib/senha-politica";

export type ResultadoSenhaAction = { ok: boolean; erro?: string };

/**
 * Troca a propria senha (D-03). O id vem SEMPRE da sessao, nunca do
 * FormData — o mesmo cuidado ja documentado em savePerfil de /perfil.
 * Devolve objeto em vez de lancar nos erros de validacao: o Next mascara
 * mensagem de erro lancada por Server Action em producao, e o usuario veria
 * um texto generico em vez do motivo real. Erros de autorizacao continuam
 * lancando.
 */
export async function trocarMinhaSenha(formData: FormData): Promise<ResultadoSenhaAction> {
  const sessao = await requireSessionOrThrow();

  const atual = String(formData.get("atual") || "");
  const nova = String(formData.get("nova") || "");
  const confirmacao = String(formData.get("confirmacao") || "");

  const user = await prisma.usuario.findUnique({ where: { id: sessao.id } });
  if (!user) {
    return { ok: false, erro: "Usuário não encontrado." };
  }

  const senhaAtualOk = await verificarSenha(atual, user.password);
  if (!senhaAtualOk) {
    return { ok: false, erro: "Senha atual incorreta." };
  }

  const igualAtual = await verificarSenha(nova, user.password);
  const politica = validarTrocaDeSenha({ nova, confirmacao, igualAtual });
  if (!politica.ok) {
    return politica;
  }

  await prisma.usuario.update({
    where: { id: sessao.id },
    data: { password: await hashSenha(nova) },
  });
  await createAuditLog("usuario:trocar-senha", { usuarioId: sessao.id });

  return { ok: true };
}

/**
 * Admin redefine a senha de qualquer usuario (D-02). `requireAdminOrThrow()`
 * e' a PRIMEIRA linha: o guard do layout/pagina roda no render, depois da
 * action, e o Action ID vive no bundle servido estaticamente — sem guarda
 * propria a action seria invocavel direto por um vendedor (T-CYM-01).
 */
export async function redefinirSenhaDeUsuario(formData: FormData): Promise<ResultadoSenhaAction> {
  const admin = await requireAdminOrThrow();

  const alvoId = Number(formData.get("usuarioId") || 0);
  if (!Number.isInteger(alvoId) || alvoId <= 0) {
    return { ok: false, erro: "Usuário inválido." };
  }

  const alvo = await prisma.usuario.findUnique({ where: { id: alvoId } });
  if (!alvo) {
    return { ok: false, erro: "Usuário não encontrado." };
  }

  const nova = String(formData.get("nova") || "");
  const politica = validarForcaMinima(nova);
  if (!politica.ok) {
    return politica;
  }

  await prisma.usuario.update({
    where: { id: alvo.id },
    data: { password: await hashSenha(nova) },
  });
  // O admin redefinindo a propria senha por esta via e' permitido de
  // proposito (valvula de escape, D-02) e fica registrado igual.
  await createAuditLog("usuario:reset-senha", {
    usuarioId: alvo.id,
    alvo: alvo.username,
    porAdmin: admin.username,
  });

  return { ok: true };
}
