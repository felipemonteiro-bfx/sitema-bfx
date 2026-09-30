"use server";

/**
 * Cadastro das regras por empresa conveniada (spec 2026-09-30 §3.1). Vigências de uma mesma
 * empresa não podem se sobrepor; a checagem usa a função pura `vigenciasSobrepostas`.
 * Ligar `cobrancaViaBfx` só registra no audit: o fluxo novo depende da confirmação formal da
 * Prudent, e a tela avisa isso.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import { validarRegra, vigenciasSobrepostas } from "@/lib/regra-empresa";

type Resultado = { ok: true } | { ok: false; erro: string };

const dataIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function salvarRegraEmpresa(formData: FormData): Promise<Resultado> {
  const sessao = await requireAdminOrThrow();
  const empresaParceiraId = Number(formData.get("empresaParceiraId") || 0);
  if (!Number.isInteger(empresaParceiraId) || empresaParceiraId <= 0) return { ok: false, erro: "Empresa inválida." };
  const idTxt = String(formData.get("id") ?? "").trim();
  const id = idTxt ? Number(idTxt) : null;
  if (id !== null && (!Number.isInteger(id) || id <= 0)) return { ok: false, erro: "Regra não encontrada." };

  const v = validarRegra(Object.fromEntries(formData));
  if (!v.ok) return v;

  if (id !== null) {
    const atual = await prisma.regraEmpresa.findUnique({ where: { id }, select: { empresaParceiraId: true } });
    if (!atual || atual.empresaParceiraId !== empresaParceiraId) return { ok: false, erro: "Regra não encontrada." };
  }

  const outras = (
    await prisma.regraEmpresa.findMany({
      where: { empresaParceiraId },
      select: { id: true, vigenteDe: true, vigenteAte: true },
    })
  ).filter((r) => r.id !== id);
  if (vigenciasSobrepostas([...outras, v.valor])) {
    return { ok: false, erro: "Vigência se sobrepõe a outra regra desta empresa." };
  }

  const dados = {
    vigenteDe: v.valor.vigenteDe,
    vigenteAte: v.valor.vigenteAte,
    diaCorte: v.valor.diaCorte,
    diaVencimento: v.valor.diaVencimento,
    diaPix: v.valor.diaPix,
    repassePct: v.valor.repassePct,
    repasseBase: v.valor.repasseBase,
    cobrancaViaBfx: v.valor.cobrancaViaBfx,
  };
  if (id === null) {
    await prisma.regraEmpresa.create({ data: { empresaParceiraId, ...dados, criadaPor: sessao.username } });
  } else {
    await prisma.regraEmpresa.update({ where: { id }, data: dados });
  }

  await createAuditLog("empresa:regra", {
    ...(id !== null ? { regraId: id } : {}),
    empresaParceiraId,
    vigenteDe: dataIso(dados.vigenteDe),
    vigenteAte: dataIso(dados.vigenteAte),
    diaCorte: dados.diaCorte,
    diaVencimento: dados.diaVencimento,
    diaPix: dados.diaPix,
    repassePct: dados.repassePct,
    cobrancaViaBfx: dados.cobrancaViaBfx,
  });
  revalidatePath("/cadastros");
  return { ok: true };
}

export async function excluirRegraEmpresa(id: number): Promise<Resultado> {
  await requireAdminOrThrow();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, erro: "Regra não encontrada." };
  const regra = await prisma.regraEmpresa.findUnique({ where: { id }, select: { empresaParceiraId: true, vigenteDe: true } });
  if (!regra) return { ok: false, erro: "Regra não encontrada." };
  await prisma.regraEmpresa.delete({ where: { id } });
  await createAuditLog("empresa:regra:delete", {
    regraId: id,
    empresaParceiraId: regra.empresaParceiraId,
    vigenteDe: dataIso(regra.vigenteDe),
  });
  revalidatePath("/cadastros");
  return { ok: true };
}
