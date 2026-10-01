"use server";

/**
 * Cadastro das regras por empresa conveniada (spec 2026-09-30 §3.1). Vigências de uma mesma
 * empresa não podem se sobrepor; a checagem usa a função pura `vigenciasSobrepostas`.
 * Ligar `cobrancaViaBfx` só registra no audit: o fluxo novo depende da confirmação formal da
 * Prudent, e a tela avisa isso.
 *
 * Ajuste de 30/09 (M2): vigência sempre no dia 1º; e salvar/excluir que troque a cobrança via BFX
 * (pelo flag ou pela vigência) num mês com boleto Prudent BFX vivo ou fechamento conferido ou
 * posterior da empresa é recusado — mudaria quem cobra a parcela depois do fato.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { createAuditLog } from "@/lib/audit";
import {
  cobrancaMudaEm,
  validarRegra,
  vigenciasSobrepostas,
  type RegraComVigencia,
} from "@/lib/regra-empresa";
import { ROTULO_STATUS_FECHAMENTO, STATUS_FECHAMENTO, intervaloCompetencia, rotuloCompetencia } from "@/lib/fechamento";
import { DIRECIONAMENTO, STATUS_BOLETO } from "@/lib/boleto-prudent";
import { formatarDataPura } from "@/lib/data-pura";

type Resultado = { ok: true } | { ok: false; erro: string };

const dataIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const SELECT_REGRA = {
  id: true,
  vigenteDe: true,
  vigenteAte: true,
  diaCorte: true,
  diaVencimento: true,
  diaPix: true,
  repassePct: true,
  repasseBase: true,
  cobrancaViaBfx: true,
} as const;

type RegraLida = Omit<RegraComVigencia, "repasseBase"> & { id: number; repasseBase: string | null };

function paraRegra(r: RegraLida): RegraComVigencia {
  return { ...r, repasseBase: r.repasseBase === "venda" ? "venda" : null };
}

const PREFIXO_CONFLITO = "Não é possível mudar a cobrança via BFX nesse período:";

/**
 * A troca das regras da empresa (antes → depois) muda a cobrança via BFX de algum mês em que já há
 * boleto Prudent pago pela BFX (vivo) ou fechamento conferido ou posterior? Devolve a recusa.
 */
async function conflitoComCobranca(
  empresaParceiraId: number,
  antes: RegraComVigencia[],
  depois: RegraComVigencia[]
): Promise<string | null> {
  const [boletos, fechamentos] = await Promise.all([
    prisma.boletoPrudent.findMany({
      where: {
        empresaParceiraId,
        direcionamento: DIRECIONAMENTO.bfx,
        status: { notIn: [STATUS_BOLETO.substituido, STATUS_BOLETO.cancelado] },
      },
      select: { id: true, vencimento: true },
    }),
    prisma.fechamento.findMany({
      where: { empresaParceiraId, status: { not: STATUS_FECHAMENTO.emPreparacao } },
      select: { competencia: true, status: true },
    }),
  ]);
  const boleto = boletos.find((b) => cobrancaMudaEm(antes, depois, b.vencimento));
  if (boleto) {
    return (
      `${PREFIXO_CONFLITO} o boleto Prudent #${boleto.id} (vencimento ${formatarDataPura(boleto.vencimento)}) é pago pela BFX. ` +
      "Devolva-o à empresa ou cancele-o antes."
    );
  }
  const f = fechamentos.find((x) => cobrancaMudaEm(antes, depois, intervaloCompetencia(x.competencia).inicio));
  if (f) {
    const rotulo = ROTULO_STATUS_FECHAMENTO[f.status] ?? f.status;
    const status = rotulo.charAt(0).toLowerCase() + rotulo.slice(1);
    return `${PREFIXO_CONFLITO} o fechamento de ${rotuloCompetencia(f.competencia)} está ${status}. Reabra-o antes.`;
  }
  return null;
}

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

  const todas = (
    (await prisma.regraEmpresa.findMany({ where: { empresaParceiraId }, select: SELECT_REGRA })) as RegraLida[]
  ).map(paraRegra);
  const outras = todas.filter((r) => r.id !== id);
  if (vigenciasSobrepostas([...outras, v.valor])) {
    return { ok: false, erro: "Vigência se sobrepõe a outra regra desta empresa." };
  }
  const conflito = await conflitoComCobranca(empresaParceiraId, todas, [...outras, v.valor]);
  if (conflito) return { ok: false, erro: conflito };

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
  const todas = (
    (await prisma.regraEmpresa.findMany({ where: { empresaParceiraId: regra.empresaParceiraId }, select: SELECT_REGRA })) as RegraLida[]
  ).map(paraRegra);
  const conflito = await conflitoComCobranca(
    regra.empresaParceiraId,
    todas,
    todas.filter((r) => r.id !== id)
  );
  if (conflito) return { ok: false, erro: conflito };
  await prisma.regraEmpresa.delete({ where: { id } });
  await createAuditLog("empresa:regra:delete", {
    regraId: id,
    empresaParceiraId: regra.empresaParceiraId,
    vigenteDe: dataIso(regra.vigenteDe),
  });
  revalidatePath("/cadastros");
  return { ok: true };
}
