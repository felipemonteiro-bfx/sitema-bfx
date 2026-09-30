/**
 * Leitura das regras por empresa no banco (spec 2026-09-30 §3.1). A regra em si é pura e está em
 * `@/lib/regra-empresa`. A empresa de uma venda é `cliente.empresaParceiraId`; cliente sem empresa
 * parceira usa `REGRA_PADRAO` sem consultar a tabela.
 */
import { prisma } from "@/lib/db";
import { REGRA_PADRAO, regraVigente, type RegraComVigencia, type RegraEmpresaDados } from "@/lib/regra-empresa";

export async function regrasDaEmpresa(empresaParceiraId: number): Promise<RegraComVigencia[]> {
  const linhas = await prisma.regraEmpresa.findMany({ where: { empresaParceiraId }, orderBy: { vigenteDe: "asc" } });
  return linhas.map((r) => ({
    id: r.id,
    vigenteDe: r.vigenteDe,
    vigenteAte: r.vigenteAte,
    diaCorte: r.diaCorte,
    diaVencimento: r.diaVencimento,
    diaPix: r.diaPix,
    repassePct: r.repassePct,
    repasseBase: r.repasseBase === "venda" ? "venda" : null,
    cobrancaViaBfx: r.cobrancaViaBfx,
  }));
}

export async function regraDaEmpresaNaData(
  empresaParceiraId: number | null | undefined,
  data: Date
): Promise<RegraEmpresaDados> {
  if (!empresaParceiraId) return { ...REGRA_PADRAO };
  return regraVigente(await regrasDaEmpresa(empresaParceiraId), data);
}

export async function regraDoClienteNaData(clienteId: number, data: Date): Promise<RegraEmpresaDados> {
  const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { empresaParceiraId: true } });
  return regraDaEmpresaNaData(c?.empresaParceiraId ?? null, data);
}
