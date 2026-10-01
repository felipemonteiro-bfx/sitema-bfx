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
import type { FechamentoPix } from "@/lib/pix-fechamento";
import { conciliarBoletosComDemonstrativo, estadoFinal, type Divergencia } from "@/lib/conciliacao-fechamento";
import { situacaoRecebimento } from "@/lib/recebimento-fechamento";
import { formatBRL } from "@/lib/utils";

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
  /** Cobrança Pix ativa e recebimentos (Fase 6). */
  pix: PixDetalhe;
  /** Conciliação boletos Prudent × demonstrativo da versão atual; null sem versão conferida. */
  conciliacao: ConciliacaoDetalhe | null;
};

export type RecebimentoDetalhe = {
  id: number;
  origem: string;
  valor: number;
  data: string;
  status: string;
  comprovanteArquivoId: number | null;
  registradoPor: string | null;
  confirmadoPor: string | null;
};

export type PixDetalhe = {
  cobranca: {
    asaasPaymentId: string;
    copiaECola: string | null;
    qrDataUrl: string | null;
    valor: number;
    vencimento: string;
    identificacao: string;
    link: string;
  } | null;
  recebido: number;
  saldo: number;
  excedente: number;
  recebimentos: RecebimentoDetalhe[];
  /** Recebimento manual só depois de alguma versão ter ido ao RH. */
  podeRegistrar: boolean;
};

export type ConciliacaoDetalhe = {
  somaLinhasAntecipadas: number;
  somaBoletos: number;
  diferenca: number;
  divergencias: { chave: string; texto: string }[];
  conciliado: boolean;
  concluido: boolean;
};

/** Fatura pública da cobrança no Asaas ("pay_080225913252" → ".../i/080225913252"). */
export function linkCobrancaAsaas(asaasPaymentId: string, asaasEnv: string | null | undefined): string {
  const base = asaasEnv?.toLowerCase() === "production" ? "https://www.asaas.com" : "https://sandbox.asaas.com";
  return `${base}/i/${encodeURIComponent(asaasPaymentId.replace(/^pay_/, ""))}`;
}

function textoDivergencia(d: Divergencia): string {
  switch (d.tipo) {
    case "antecipada_sem_boleto":
      return `${d.identificador}: antecipada sem boleto Prudent que a BFX pague (${formatBRL(d.valor)}).`;
    case "boleto_valor_diferente":
      return `Boleto #${d.boletoId}: valor do documento ${formatBRL(d.documento)}, parcelas somam ${formatBRL(d.esperado)}.`;
    case "boleto_com_parcela_fora":
      return `Boleto #${d.boletoId}: cobre parcela fora do demonstrativo (${d.identificador}), ${formatBRL(d.valor)}.`;
  }
}

/** Conciliação + estado final, com as divergências em texto. Pura. */
export function montarConciliacao(
  linhas: Parameters<typeof conciliarBoletosComDemonstrativo>[0],
  boletos: Parameters<typeof conciliarBoletosComDemonstrativo>[1],
  status: string
): ConciliacaoDetalhe {
  const c = conciliarBoletosComDemonstrativo(linhas, boletos);
  const ligados = new Set(c.boletosLigados);
  const final = estadoFinal({ status }, boletos.filter((b) => ligados.has(b.id)), c.divergencias);
  return {
    somaLinhasAntecipadas: c.somaLinhasAntecipadas,
    somaBoletos: c.somaBoletos,
    diferenca: c.diferenca,
    divergencias: c.divergencias.map((d, i) => ({ chave: `${d.tipo}-${i}`, texto: textoDivergencia(d) })),
    ...final,
  };
}

/**
 * Lê a versão atual (linhas da foto) e os boletos da empresa com vencimento na competência,
 * mais os que a foto aponta, e concilia. null sem versão conferida.
 */
export async function lerConciliacao(f: {
  id: number;
  empresaParceiraId: number;
  competencia: string;
  status: string;
  versaoAtual: number;
}): Promise<ConciliacaoDetalhe | null> {
  if (f.versaoAtual < 1) return null;
  const linhas = await prisma.fechamentoLinha.findMany({
    where: { versao: { fechamentoId: f.id, numero: f.versaoAtual } },
    select: { vendaId: true, numeroParcela: true, totalParcelas: true, parcelaId: true, antecipada: true, boletoPrudentId: true, valor: true },
  });
  const { inicio, fim } = intervaloCompetencia(f.competencia);
  const daFoto = [...new Set(linhas.map((l) => l.boletoPrudentId).filter((id): id is number => id != null))];
  const boletos = await prisma.boletoPrudent.findMany({
    where: {
      OR: [
        { empresaParceiraId: f.empresaParceiraId, vencimento: { gte: inicio, lt: fim } },
        ...(daFoto.length > 0 ? [{ id: { in: daFoto } }] : []),
      ],
    },
    select: { id: true, status: true, valorEsperado: true, valorDocumento: true, direcionamento: true, parcelas: { select: { id: true } } },
  });
  return montarConciliacao(
    linhas.map((l) => ({
      identificador: identificadorParcela(l.vendaId, l.numeroParcela, l.totalParcelas),
      parcelaId: l.parcelaId,
      antecipada: l.antecipada,
      boletoPrudentId: l.boletoPrudentId,
      valor: l.valor,
    })),
    boletos.map((b) => ({ ...b, parcelaIds: b.parcelas.map((p) => p.id) })),
    f.status
  );
}

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
    // Liquidada por este fechamento (pago): é dele, não uma parcela barrada.
    if (minha && p.liquidadaEm !== null) {
      reservadas.push(p);
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

  const [cobrancaAtiva, recebimentos, cfg, conciliacao] = await Promise.all([
    prisma.cobrancaFechamento.findFirst({
      where: { fechamentoId: f.id, status: "ativa" },
      select: { asaasPaymentId: true, pixCopiaECola: true, qrCodePng: true, valor: true, vencimento: true, externalReference: true },
    }),
    prisma.recebimentoFechamento.findMany({
      where: { fechamentoId: f.id },
      orderBy: [{ dataRecebimento: "desc" }, { id: "desc" }],
      select: {
        id: true,
        origem: true,
        valor: true,
        dataRecebimento: true,
        status: true,
        comprovanteArquivoId: true,
        registradoPor: true,
        confirmadoPor: true,
      },
    }),
    prisma.config.findFirst({ select: { asaasEnv: true } }),
    lerConciliacao(f),
  ]);
  const totalVersao = versaoAtual?.totalFinal ?? 0;
  const situacao = situacaoRecebimento(Math.max(totalVersao, 0), recebimentos);
  const pix: PixDetalhe = {
    cobranca: cobrancaAtiva
      ? {
          asaasPaymentId: cobrancaAtiva.asaasPaymentId,
          copiaECola: cobrancaAtiva.pixCopiaECola,
          qrDataUrl:
            cobrancaAtiva.qrCodePng && cobrancaAtiva.qrCodePng.length > 0
              ? `data:image/png;base64,${Buffer.from(cobrancaAtiva.qrCodePng).toString("base64")}`
              : null,
          valor: cobrancaAtiva.valor,
          vencimento: iso(cobrancaAtiva.vencimento),
          identificacao: cobrancaAtiva.externalReference,
          link: linkCobrancaAsaas(cobrancaAtiva.asaasPaymentId, cfg?.asaasEnv),
        }
      : null,
    recebido: situacao.recebido,
    saldo: totalVersao > 0 ? situacao.saldo : 0,
    excedente: totalVersao > 0 ? situacao.excedente : 0,
    recebimentos: recebimentos.map((r) => ({
      id: r.id,
      origem: r.origem,
      valor: r.valor,
      data: iso(r.dataRecebimento),
      status: r.status,
      comprovanteArquivoId: r.comprovanteArquivoId,
      registradoPor: r.registradoPor,
      confirmadoPor: r.confirmadoPor,
    })),
    podeRegistrar: f.versoes.some((v) => v.enviadaEm != null),
  };

  return {
    pix,
    conciliacao,
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
  | {
      tipo: "fechamento";
      id: number;
      status: string;
      total: number;
      parcelas: number;
      desatualizado: boolean;
      /** Estado final derivado (Fase 6): só para fechamento pago. */
      final: "conciliado" | "concluido" | null;
    }
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
    final?: "conciliado" | "concluido" | null;
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
            final: f.final ?? null,
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
  // Conciliado/concluído só existe para fechamento pago: concilia só esses.
  const finais = new Map<number, "conciliado" | "concluido" | null>();
  for (const f of fechamentos.filter((x) => x.status === STATUS_FECHAMENTO.pago)) {
    const c = await lerConciliacao(f);
    finais.set(f.id, c?.concluido ? "concluido" : c?.conciliado ? "conciliado" : null);
  }
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
        final: finais.get(f.id) ?? null,
      };
    }),
  });
}

/**
 * Fechamentos aguardando o Pix (enviado ou pago em parte), com o que a agenda precisa: valor final
 * da versão atual, recebimentos confirmados, dia do Pix (regra da competência, ou o vencimento da
 * cobrança ativa quando é depois) e os boletos das parcelas reservadas. Usado pelo cron de alertas
 * e pela projeção de caixa de /obrigacoes.
 */
export async function lerFechamentosComPix(): Promise<FechamentoPix[]> {
  const fechamentos = await prisma.fechamento.findMany({
    where: { status: { in: [STATUS_FECHAMENTO.enviado, STATUS_FECHAMENTO.pagoParcial] } },
    select: {
      id: true,
      competencia: true,
      status: true,
      versaoAtual: true,
      empresaParceiraId: true,
      empresaParceira: { select: { nome: true } },
      versoes: { orderBy: { numero: "desc" }, take: 1, select: { numero: true, totalFinal: true } },
      recebimentos: { where: { status: "confirmado" }, select: { valor: true, status: true } },
      cobrancas: { where: { status: "ativa" }, select: { vencimento: true } },
      parcelas: {
        where: { boletoPrudentId: { not: null } },
        select: {
          boletoPrudent: {
            select: {
              id: true,
              status: true,
              direcionamento: true,
              valorEsperado: true,
              valorDocumento: true,
              pagamentos: { select: { valorPrincipal: true, estornadoEm: true } },
            },
          },
        },
      },
    },
    orderBy: [{ competencia: "asc" }, { id: "asc" }],
  });
  if (fechamentos.length === 0) return [];
  const regras = await prisma.regraEmpresa.findMany({
    where: { empresaParceiraId: { in: [...new Set(fechamentos.map((f) => f.empresaParceiraId))] } },
    orderBy: { vigenteDe: "asc" },
  });
  return fechamentos.map((f) => {
    const daEmpresa: RegraComVigencia[] = regras
      .filter((r) => r.empresaParceiraId === f.empresaParceiraId)
      .map((r) => ({ ...r, repasseBase: r.repasseBase === "venda" ? "venda" : null }));
    const regra = regraVigente(daEmpresa, intervaloCompetencia(f.competencia).inicio);
    const diaPix = diaDaCompetencia(f.competencia, regra.diaPix);
    const cobranca = f.cobrancas[0]?.vencimento ?? null;
    const versao = f.versoes[0];
    return {
      id: f.id,
      empresa: f.empresaParceira.nome,
      competencia: f.competencia,
      status: f.status,
      totalFinal: versao && versao.numero === f.versaoAtual ? versao.totalFinal : null,
      recebimentos: f.recebimentos,
      dataPix: cobranca && cobranca.getTime() > diaPix.getTime() ? cobranca : diaPix,
      boletos: f.parcelas.flatMap((p) => (p.boletoPrudent ? [p.boletoPrudent] : [])),
    };
  });
}
