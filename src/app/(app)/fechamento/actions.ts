"use server";

// Fechamento mensal por empresa (2026-09-30, Fase 5): actions finas sobre `@/lib/fechamento-db` e
// `@/lib/fechamento-envio`. Guarda própria em cada action: o Action ID vive no bundle e é
// invocável sem passar pelo layout. As travas de concorrência (status no where) estão nas libs.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import {
  adicionarAjuste,
  conferirFechamento,
  gerarOuAtualizarFechamento,
  reabrirFechamento,
  removerAjuste,
} from "@/lib/fechamento-db";
import { enviarFechamento } from "@/lib/fechamento-envio";
import { confirmarRecebimento, estornarRecebimento, registrarRecebimentoManual } from "@/lib/recebimento-fechamento-db";
import { validarRecebimentoManual } from "@/lib/recebimento-fechamento";
import { arquivoGrandeDemais } from "@/lib/arquivo-limite";
import { ajustarCobrancaAoSaldo, encerrarCobrancasDoFechamento } from "@/lib/cobranca-fechamento-db";

/** `aviso`: deu certo, mas algo no Asaas ficou para trás (a tela mostra; os admins foram avisados). */
type Resp<T = object> = ({ ok: true; aviso?: string } & T) | { ok: false; erro: string };

function comAviso(aviso: string | null): { ok: true; aviso?: string } {
  return aviso ? { ok: true, aviso } : { ok: true };
}

const ROTA = "/fechamento";

function usuarioDe(sessao: { nomeExibicao?: string | null; username?: string | null }): string | null {
  return sessao.nomeExibicao || sessao.username || null;
}

function idPositivo(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Erro das libs vira mensagem; erro do Prisma (com `code`, ou de classe `PrismaClient*`, como o de
 * inicialização sem `code`) não vaza host nem consulta — vai para o log.
 */
function mensagem(e: unknown): string {
  const doPrisma =
    (e && typeof e === "object" && "code" in e) || (e instanceof Error && e.constructor.name.startsWith("PrismaClient"));
  if (doPrisma) {
    if ((e as { code?: string }).code === "P2002") return "Outra operação está gerando este fechamento. Recarregue.";
    console.error("[fechamento]", e);
    return "Não foi possível gravar. Recarregue e tente de novo.";
  }
  return e instanceof Error && e.message ? e.message : "Não foi possível concluir. Tente de novo.";
}

function revalidar(id?: number) {
  revalidatePath(ROTA);
  if (id) revalidatePath(`${ROTA}/${id}`);
}

export async function gerarFechamento(
  empresaParceiraId: number,
  competencia: string
): Promise<Resp<{ fechamentoId: number }>> {
  const sessao = await requireAdminOrThrow();
  const empresa = idPositivo(empresaParceiraId);
  if (!empresa || typeof competencia !== "string") return { ok: false, erro: "Empresa ou competência inválida." };
  try {
    const r = await gerarOuAtualizarFechamento({ empresaParceiraId: empresa, competencia, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:gerar", { fechamentoId: r.fechamentoId, empresaParceiraId: empresa, competencia, reservadas: r.reservadas });
    revalidar(r.fechamentoId);
    return { ok: true, fechamentoId: r.fechamentoId };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function atualizarParcelas(
  fechamentoId: number
): Promise<Resp<{ reservadas: number; liberadas: number; bloqueadas: number }>> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(fechamentoId);
  if (!id) return { ok: false, erro: "Fechamento inválido." };
  const f = await prisma.fechamento.findUnique({ where: { id }, select: { empresaParceiraId: true, competencia: true } });
  if (!f) return { ok: false, erro: "Fechamento não encontrado." };
  try {
    const r = await gerarOuAtualizarFechamento({ ...f, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:atualizar", { fechamentoId: id, reservadas: r.reservadas, liberadas: r.liberadas });
    revalidar(id);
    return { ok: true, reservadas: r.reservadas, liberadas: r.liberadas, bloqueadas: r.bloqueadas.length };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function adicionarAjusteFechamento(fechamentoId: number, valor: string, justificativa: string): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(fechamentoId);
  if (!id) return { ok: false, erro: "Fechamento inválido." };
  try {
    await adicionarAjuste({ fechamentoId: id, valor: String(valor ?? ""), justificativa: String(justificativa ?? ""), usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:ajuste", { fechamentoId: id, valor, justificativa });
    revalidar(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function removerAjusteFechamento(ajusteId: number): Promise<Resp> {
  await requireAdminOrThrow();
  const id = idPositivo(ajusteId);
  if (!id) return { ok: false, erro: "Ajuste inválido." };
  try {
    await removerAjuste({ ajusteId: id });
    const a = await prisma.fechamentoAjuste.findUnique({ where: { id }, select: { fechamentoId: true } });
    await createAuditLog("fechamento:ajuste-removido", { ajusteId: id, fechamentoId: a?.fechamentoId ?? null });
    revalidar(a?.fechamentoId);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function conferirFechamentoAction(fechamentoId: number): Promise<Resp<{ versao: number }>> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(fechamentoId);
  if (!id) return { ok: false, erro: "Fechamento inválido." };
  try {
    const r = await conferirFechamento({ fechamentoId: id, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:conferir", { fechamentoId: id, versao: r.versao });
    revalidar(id);
    return { ok: true, versao: r.versao };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function reabrirFechamentoAction(fechamentoId: number): Promise<Resp> {
  await requireAdminOrThrow();
  const id = idPositivo(fechamentoId);
  if (!id) return { ok: false, erro: "Fechamento inválido." };
  try {
    await reabrirFechamento({ fechamentoId: id });
    // Depois do status (fora da transação): o Pix enviado ao RH deixa de valer — paga vira
    // recebimento, senão é cancelada no Asaas. Falha não desfaz o reabrir: vira aviso.
    const { encerradas, aviso } = await encerrarCobrancasDoFechamento(id);
    await createAuditLog("fechamento:reabrir", { fechamentoId: id, cobrancasEncerradas: encerradas });
    revalidar(id);
    return comAviso(aviso);
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

export async function enviarFechamentoAction(
  fechamentoId: number,
  versao: number
): Promise<Resp<{ versao: number; para: string }>> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(fechamentoId);
  const numero = idPositivo(versao);
  if (!id || !numero) return { ok: false, erro: "Fechamento inválido." };
  try {
    const r = await enviarFechamento({ fechamentoId: id, versao: numero, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:enviar", { fechamentoId: id, versao: r.versao, para: r.para });
    revalidar(id);
    return { ok: true, versao: r.versao, para: r.para };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

/** Recebimentos mudam o status e o caixa: a grade, o detalhe e as obrigações. */
function revalidarRecebimento() {
  revalidatePath(ROTA, "layout");
  revalidatePath("/obrigacoes");
}

/** Passo 1 de 2 do recebimento manual (fica pendente). FormData: fechamentoId, valor, data, comprovante?. */
export async function registrarRecebimentoManualAction(fd: FormData): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(fd.get("fechamentoId"));
  if (!id) return { ok: false, erro: "Fechamento inválido." };
  const grande = arquivoGrandeDemais(fd);
  if (grande) return { ok: false, erro: grande };
  const v = validarRecebimentoManual({ valor: fd.get("valor"), data: fd.get("data") });
  if (!v.ok) return { ok: false, erro: v.erro };
  const arquivo = fd.get("comprovante");
  const comprovante = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;
  try {
    const r = await registrarRecebimentoManual({ fechamentoId: id, valor: v.valor, data: v.data, comprovante, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:recebimento-manual", { fechamentoId: id, recebimentoId: r.recebimentoId, valor: v.valor });
    revalidarRecebimento();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

/** Passo 2 de 2: quem conferiu o extrato confirma — conta no saldo e pode liquidar. */
export async function confirmarRecebimentoAction(recebimentoId: number): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(recebimentoId);
  if (!id) return { ok: false, erro: "Recebimento inválido." };
  try {
    const { fechamentoId } = await confirmarRecebimento({ recebimentoId: id, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:recebimento-confirmado", { recebimentoId: id });
    // Pago → o Pix antigo é cancelado; parcial → outro Pix pelo saldo.
    const { aviso } = await ajustarCobrancaAoSaldo(fechamentoId);
    revalidarRecebimento();
    return comAviso(aviso);
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}

/** Estorno do recebimento manual (o do Asaas chega pelo webhook). */
export async function estornarRecebimentoAction(recebimentoId: number): Promise<Resp> {
  const sessao = await requireAdminOrThrow();
  const id = idPositivo(recebimentoId);
  if (!id) return { ok: false, erro: "Recebimento inválido." };
  try {
    const { fechamentoId } = await estornarRecebimento({ recebimentoId: id, usuario: usuarioDe(sessao) });
    await createAuditLog("fechamento:recebimento-estornado", { recebimentoId: id, por: usuarioDe(sessao) });
    const { aviso } = fechamentoId != null ? await ajustarCobrancaAoSaldo(fechamentoId) : { aviso: null };
    revalidarRecebimento();
    return comAviso(aviso);
  } catch (e) {
    return { ok: false, erro: mensagem(e) };
  }
}
