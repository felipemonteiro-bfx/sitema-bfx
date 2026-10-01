/**
 * Leitura do fechamento para as telas (Fase 5): o detalhe de um fechamento (linhas, bloqueadas com
 * motivo, ajustes, versões) e a grade empresa × competência. Só lê; as gravações estão em
 * `@/lib/fechamento-db`.
 */
import { prisma } from "@/lib/db";
import {
  ROTULO_MOTIVO,
  STATUS_FECHAMENTO,
  competenciaDe,
  elegibilidadeFechamento,
  identificadorParcela,
  intervaloCompetencia,
  totaisFechamento,
  type MotivoBloqueio,
} from "@/lib/fechamento";
import { SELECT_PARCELA, diaDaCompetencia, paraRegra, pertence, type ParcelaLida } from "@/lib/fechamento-db";
import { regraVigente, type RegraComVigencia } from "@/lib/regra-empresa";
import { regrasDaEmpresa } from "@/lib/regra-empresa-db";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export type LinhaDetalhe = {
  chave: string;
  identificador: string;
  colaborador: string;
  vencimento: string;
  valor: number;
  loteId: number | null;
  antecipada: boolean;
};

export type BloqueadaDetalhe = {
  parcelaId: number;
  identificador: string;
  motivo: MotivoBloqueio;
  rotulo: string;
  valor: number;
};

export type VersaoDetalhe = {
  numero: number;
  totalFinal: number;
  criadaEm: string;
  criadaPor: string | null;
  enviadaEm: string | null;
  enviadaPor: string | null;
  xlsxArquivoId: number | null;
  pdfArquivoId: number | null;
};

export type DetalheFechamento = {
  id: number;
  empresa: { id: number; nome: string; emailRh: string | null };
  competencia: string;
  status: string;
  responsavel: string | null;
  versaoAtual: number;
  desatualizado: boolean;
  diaCorte: number;
  vencimentoPix: string;
  /** "reservas" = parcelas reservadas agora (em preparação); "versao" = a foto da versão atual. */
  fonteLinhas: "reservas" | "versao";
  linhas: LinhaDetalhe[];
  bloqueadas: BloqueadaDetalhe[];
  /** Elegíveis do mês ainda sem reserva: "Atualizar parcelas" as traz. */
  novasElegiveis: number;
  /** Reservadas que saíram do mês ou ficaram inelegíveis: "Atualizar parcelas" as solta. */
  reservasInvalidas: number;
  /** Em preparação, os ajustes vivos (com id, removíveis); fora dela, os da foto da versão (sem id). */
  ajustes: { id: number | null; valor: number; justificativa: string }[];
  totalBruto: number;
  totalAjustes: number;
  totalFinal: number;
  versoes: VersaoDetalhe[];
};

type ParcelaComMotivo = ParcelaLida & { confirmacaoMotivo: string | null };

/**
 * Separa as parcelas lidas: as reservadas neste fechamento, as do mês/empresa bloqueadas (com o
 * motivo) e quantas elegíveis ainda não foram reservadas. Pura.
 */
export function classificarParcelas(
  parcelas: ParcelaComMotivo[],
  fechamento: { id: number; empresaParceiraId: number; competencia: string }
): { reservadas: ParcelaComMotivo[]; bloqueadas: BloqueadaDetalhe[]; novasElegiveis: number; reservasInvalidas: number } {
  const { inicio, fim } = intervaloCompetencia(fechamento.competencia);
  const reservadas: ParcelaComMotivo[] = [];
  const bloqueadas: BloqueadaDetalhe[] = [];
  let novasElegiveis = 0;
  let reservasInvalidas = 0;
  for (const p of parcelas) {
    const minha = p.fechamentoId === fechamento.id;
    if (!pertence(p, fechamento.empresaParceiraId, inicio, fim)) {
      if (minha) reservasInvalidas++;
      continue;
    }
    const r = elegibilidadeFechamento(paraRegra(p), fechamento.id);
    if (r.ok) {
      if (minha) reservadas.push(p);
      else novasElegiveis++;
      continue;
    }
    // Reservada que ficou inelegível: sai das linhas (o conferir recusaria) e aparece só bloqueada.
    if (minha) reservasInvalidas++;
    const rotulo =
      r.motivo === "recusada_rh" && p.confirmacaoMotivo
        ? `${ROTULO_MOTIVO.recusada_rh} — ${p.confirmacaoMotivo}`
        : ROTULO_MOTIVO[r.motivo];
    bloqueadas.push({
      parcelaId: p.id,
      identificador: identificadorParcela(p.vendaId, p.numeroParcela, p.venda._count.parcelasVencimento),
      motivo: r.motivo,
      rotulo,
      valor: p.valorParcela,
    });
  }
  return { reservadas, bloqueadas, novasElegiveis, reservasInvalidas };
}

export async function lerDetalheFechamento(id: number): Promise<DetalheFechamento | null> {
  const f = await prisma.fechamento.findUnique({
    where: { id },
    select: {
      id: true,
      empresaParceiraId: true,
      competencia: true,
      status: true,
      responsavel: true,
      versaoAtual: true,
      desatualizado: true,
      empresaParceira: { select: { id: true, nome: true, emailRh: true } },
      ajustes: {
        where: { removidoEm: null },
        orderBy: { id: "asc" },
        select: { id: true, valor: true, justificativa: true, criadoPor: true, removidoEm: true },
      },
      versoes: {
        orderBy: { numero: "desc" },
        select: {
          numero: true,
          totalBruto: true,
          totalAjustes: true,
          totalFinal: true,
          ajustesJson: true,
          criadaEm: true,
          criadaPor: true,
          enviadaEm: true,
          enviadaPor: true,
          xlsxArquivoId: true,
          pdfArquivoId: true,
        },
      },
    },
  });
  if (!f) return null;

  const { inicio, fim } = intervaloCompetencia(f.competencia);
  const regra = regraVigente(await regrasDaEmpresa(f.empresaParceiraId), inicio);
  const parcelas = (await prisma.parcelaVencimento.findMany({
    where: {
      OR: [
        { dataVencimento: { gte: inicio, lt: fim }, venda: { cliente: { empresaParceiraId: f.empresaParceiraId } } },
        { fechamentoId: f.id },
      ],
    },
    select: { ...SELECT_PARCELA, confirmacaoMotivo: true },
    orderBy: [{ dataVencimento: "asc" }, { vendaId: "asc" }, { numeroParcela: "asc" }],
  })) as ParcelaComMotivo[];
  const { reservadas, bloqueadas, novasElegiveis, reservasInvalidas } = classificarParcelas(parcelas, f);

  // Fora de preparação, o que vale é a foto da versão conferida, não as reservas de agora.
  const versaoAtual = f.versoes.find((v) => v.numero === f.versaoAtual) ?? null;
  const usarVersao = f.status !== STATUS_FECHAMENTO.emPreparacao && versaoAtual !== null;

  let linhas: LinhaDetalhe[];
  let totais: { totalBruto: number; totalAjustes: number; totalFinal: number };
  if (usarVersao) {
    const foto = await prisma.fechamentoLinha.findMany({
      where: { versao: { fechamentoId: f.id, numero: f.versaoAtual } },
      orderBy: [{ vencimento: "asc" }, { vendaId: "asc" }, { numeroParcela: "asc" }],
      select: {
        id: true,
        vendaId: true,
        numeroParcela: true,
        totalParcelas: true,
        clienteNome: true,
        valor: true,
        vencimento: true,
        loteId: true,
        antecipada: true,
      },
    });
    linhas = foto.map((l) => ({
      chave: `l${l.id}`,
      identificador: identificadorParcela(l.vendaId, l.numeroParcela, l.totalParcelas),
      colaborador: l.clienteNome,
      vencimento: iso(l.vencimento),
      valor: l.valor,
      loteId: l.loteId,
      antecipada: l.antecipada,
    }));
    totais = { totalBruto: versaoAtual.totalBruto, totalAjustes: versaoAtual.totalAjustes, totalFinal: versaoAtual.totalFinal };
  } else {
    linhas = reservadas.map((p) => ({
      chave: `p${p.id}`,
      identificador: identificadorParcela(p.vendaId, p.numeroParcela, p.venda._count.parcelasVencimento),
      colaborador: p.venda.cliente?.nome ?? "—",
      vencimento: iso(p.dataVencimento),
      valor: p.valorParcela,
      loteId: p.antecipacaoLoteId,
      antecipada: p.antecipada,
    }));
    totais = totaisFechamento(
      reservadas.map((p) => ({ valor: p.valorParcela })),
      f.ajustes
    );
  }

  return {
    id: f.id,
    empresa: f.empresaParceira,
    competencia: f.competencia,
    status: f.status,
    responsavel: f.responsavel,
    versaoAtual: f.versaoAtual,
    desatualizado: f.desatualizado,
    diaCorte: regra.diaCorte,
    vencimentoPix: iso(diaDaCompetencia(f.competencia, regra.diaPix)),
    fonteLinhas: usarVersao ? "versao" : "reservas",
    linhas,
    bloqueadas,
    novasElegiveis,
    reservasInvalidas,
    ajustes: usarVersao
      ? (JSON.parse(versaoAtual.ajustesJson) as { valor: number; justificativa: string }[]).map((a) => ({ id: null, ...a }))
      : f.ajustes.map((a) => ({ id: a.id, valor: a.valor, justificativa: a.justificativa })),
    ...totais,
    versoes: f.versoes.map((v) => ({
      numero: v.numero,
      totalFinal: v.totalFinal,
      criadaEm: v.criadaEm.toISOString(),
      criadaPor: v.criadaPor,
      enviadaEm: v.enviadaEm ? v.enviadaEm.toISOString() : null,
      enviadaPor: v.enviadaPor,
      xlsxArquivoId: v.xlsxArquivoId,
      pdfArquivoId: v.pdfArquivoId,
    })),
  };
}

/** Competência seguinte: "2026-12" → "2027-01". */
export function competenciaSeguinte(c: string): string {
  const { fim } = intervaloCompetencia(c);
  return competenciaDe(fim);
}

export type CelulaGrade =
  | { tipo: "fechamento"; id: number; status: string; total: number; parcelas: number; desatualizado: boolean }
  | { tipo: "gerar" }
  | { tipo: "desligada" };

export type GradeFechamento = {
  competencias: string[];
  empresas: { id: number; nome: string; celulas: Record<string, CelulaGrade> }[];
};

/**
 * Monta a grade empresa × competência. Pura. Empresas: as que têm alguma regra com cobrança via
 * BFX (ou algum fechamento). Competências: o mês anterior a `hoje`, o de `hoje` e os dois
 * seguintes, mais as que já têm fechamento.
 */
export function montarGrade(e: {
  hoje: Date;
  empresas: { id: number; nome: string }[];
  regras: (RegraComVigencia & { empresaParceiraId: number })[];
  fechamentos: {
    id: number;
    empresaParceiraId: number;
    competencia: string;
    status: string;
    desatualizado: boolean;
    totalVersao: number | null;
    totalReservado: number;
    parcelas: number;
  }[];
}): GradeFechamento {
  const atual = competenciaDe(e.hoje);
  // O mês anterior também: o fechamento esquecido ainda pode ser gerado no começo do mês seguinte.
  const anterior = competenciaDe(new Date(Date.UTC(e.hoje.getUTCFullYear(), e.hoje.getUTCMonth() - 1, 1)));
  const proximas = [anterior, atual, competenciaSeguinte(atual), competenciaSeguinte(competenciaSeguinte(atual))];
  const competencias = [...new Set([...proximas, ...e.fechamentos.map((f) => f.competencia)])].sort();

  const regrasPorEmpresa = new Map<number, RegraComVigencia[]>();
  for (const r of e.regras) {
    const lista = regrasPorEmpresa.get(r.empresaParceiraId) ?? [];
    lista.push(r);
    regrasPorEmpresa.set(r.empresaParceiraId, lista);
  }
  const comBfx = new Set(e.regras.filter((r) => r.cobrancaViaBfx).map((r) => r.empresaParceiraId));
  const comFechamento = new Set(e.fechamentos.map((f) => f.empresaParceiraId));

  const empresas = e.empresas
    .filter((emp) => comBfx.has(emp.id) || comFechamento.has(emp.id))
    .map((emp) => {
      const celulas: Record<string, CelulaGrade> = {};
      for (const c of competencias) {
        const f = e.fechamentos.find((x) => x.empresaParceiraId === emp.id && x.competencia === c);
        if (f) {
          celulas[c] = {
            tipo: "fechamento",
            id: f.id,
            status: f.status,
            total: f.status === STATUS_FECHAMENTO.emPreparacao || f.totalVersao === null ? f.totalReservado : f.totalVersao,
            parcelas: f.parcelas,
            desatualizado: f.desatualizado,
          };
          continue;
        }
        const regra = regraVigente(regrasPorEmpresa.get(emp.id) ?? [], intervaloCompetencia(c).inicio);
        celulas[c] = regra.cobrancaViaBfx ? { tipo: "gerar" } : { tipo: "desligada" };
      }
      return { id: emp.id, nome: emp.nome, celulas };
    });
  return { competencias, empresas };
}

export async function lerGradeFechamento(hoje: Date): Promise<GradeFechamento> {
  const [regras, fechamentos] = await Promise.all([
    prisma.regraEmpresa.findMany({ orderBy: { vigenteDe: "asc" } }),
    prisma.fechamento.findMany({
      select: {
        id: true,
        empresaParceiraId: true,
        competencia: true,
        status: true,
        desatualizado: true,
        versaoAtual: true,
        versoes: { orderBy: { numero: "desc" }, take: 1, select: { numero: true, totalFinal: true } },
        ajustes: { where: { removidoEm: null }, select: { valor: true, removidoEm: true } },
      },
    }),
  ]);
  const empresaIds = [...new Set([...regras.map((r) => r.empresaParceiraId), ...fechamentos.map((f) => f.empresaParceiraId)])];
  const [empresas, somas] = await Promise.all([
    empresaIds.length
      ? prisma.empresaParceira.findMany({ where: { id: { in: empresaIds } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
      : Promise.resolve([]),
    fechamentos.length
      ? prisma.parcelaVencimento.groupBy({
          by: ["fechamentoId"],
          where: { fechamentoId: { in: fechamentos.map((f) => f.id) } },
          _sum: { valorParcela: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  const somaPorFechamento = new Map(somas.map((s) => [s.fechamentoId, s]));
  return montarGrade({
    hoje,
    empresas,
    regras: regras.map((r) => ({ ...r, repasseBase: r.repasseBase === "venda" ? "venda" : null })),
    fechamentos: fechamentos.map((f) => {
      const soma = somaPorFechamento.get(f.id);
      const versao = f.versoes[0];
      return {
        id: f.id,
        empresaParceiraId: f.empresaParceiraId,
        competencia: f.competencia,
        status: f.status,
        desatualizado: f.desatualizado,
        totalVersao: versao && versao.numero === f.versaoAtual ? versao.totalFinal : null,
        totalReservado: totaisFechamento([{ valor: soma?._sum.valorParcela ?? 0 }], f.ajustes).totalFinal,
        parcelas: soma?._count._all ?? 0,
      };
    }),
  });
}
