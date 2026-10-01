/**
 * Gravações do fechamento mensal por empresa (Fase 5). Cada operação roda numa transação e trava
 * pelo status anterior no `where` de um `updateMany` (clique duplo e duas abas). A regra é pura e
 * está em `@/lib/fechamento`.
 *
 * - `gerarOuAtualizarFechamento`: cria o fechamento (unique empresa × competência) e reserva
 *   (`ParcelaVencimento.fechamentoId`) as parcelas elegíveis; solta as que deixaram de ser.
 * - `adicionarAjuste` / `removerAjuste`: só em preparação; remoção lógica.
 * - `conferirFechamento`: revalida as reservas, congela a versão N+1 (foto das linhas, totais,
 *   ajustes) e gera o XLSX.
 * - `reabrirFechamento`: volta a preparação; a próxima conferência gera a versão seguinte.
 * - `reivindicarEnvio` / `desfazerReivindicacao` / `marcarEnviado`: o envio em `@/lib/fechamento-envio`
 *   (conferido → enviado antes do SMTP; volta se o e-mail falha; grava o PDF na versão depois).
 *
 * Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.6 e §5.
 */
import { prisma } from "@/lib/db";
import {
  STATUS_FECHAMENTO,
  ROTULO_STATUS_FECHAMENTO,
  elegibilidadeFechamento,
  identificadorParcela,
  intervaloCompetencia,
  podeEditar,
  podeReabrir,
  rotuloCompetencia,
  totaisFechamento,
  validarAjuste,
  type DemonstrativoDados,
  type MotivoBloqueio,
  type ParcelaParaFechamento,
} from "@/lib/fechamento";
import { gerarFechamentoXlsx } from "@/lib/fechamento-xlsx";
import { sha256Hex } from "@/lib/arquivo-financeiro";
import { regraVigente, type RegraEmpresaDados } from "@/lib/regra-empresa";
import { regrasDaEmpresa } from "@/lib/regra-empresa-db";
import { XLSX_MIME } from "@/lib/relatorio-mensal-xlsx";
import { WHERE_VENDA_ANTECIPAVEL, vendaEhAntecipavel } from "@/lib/antecipacao";

const ERRO_CORRIDA = "Outra operação pegou parcelas deste fechamento. Recarregue.";
const ERRO_MUDOU = "Outra operação mudou este fechamento. Recarregue.";
const ERRO_PARCELAS_MUDARAM = "Parcelas mudaram desde a geração. Clique em Atualizar parcelas.";
const ERRO_SO_EM_PREPARACAO = "Isso só pode ser feito com o fechamento em preparação.";

/** O que o fechamento precisa ler de cada parcela. */
export const SELECT_PARCELA = {
  id: true,
  vendaId: true,
  numeroParcela: true,
  dataVencimento: true,
  valorParcela: true,
  paga: true,
  antecipada: true,
  liquidadaEm: true,
  fechamentoId: true,
  confirmacaoRh: true,
  antecipacaoLoteId: true,
  boletoPrudentId: true,
  antecipacaoLote: { select: { status: true } },
  boletoPrudent: { select: { direcionamento: true } },
  venda: {
    select: {
      id: true,
      status: true,
      formaPagamento: true,
      descontoEmFolha: true,
      cliente: { select: { nome: true, matricula: true, empresaParceiraId: true } },
      _count: { select: { parcelasVencimento: true } },
    },
  },
} as const;

export type ParcelaLida = {
  id: number;
  vendaId: number;
  numeroParcela: number;
  dataVencimento: Date;
  valorParcela: number;
  paga: boolean;
  antecipada: boolean;
  liquidadaEm: Date | null;
  fechamentoId: number | null;
  confirmacaoRh: string | null;
  antecipacaoLoteId: number | null;
  boletoPrudentId: number | null;
  antecipacaoLote: { status: string } | null;
  boletoPrudent: { direcionamento: string } | null;
  venda: {
    id: number;
    status: string;
    formaPagamento: string | null;
    descontoEmFolha: boolean | null;
    cliente: { nome: string; matricula: string | null; empresaParceiraId: number | null } | null;
    _count: { parcelasVencimento: number };
  };
};

export function paraRegra(p: ParcelaLida): ParcelaParaFechamento {
  return {
    id: p.id,
    vendaStatus: p.venda.status,
    // Sem o status: cancelada/estornada já sai como "venda inativa".
    vendaEmFolha: vendaEhAntecipavel({ formaPagamento: p.venda.formaPagamento, descontoEmFolha: p.venda.descontoEmFolha }),
    liquidadaEm: p.liquidadaEm,
    fechamentoId: p.fechamentoId,
    confirmacaoRh: p.confirmacaoRh,
    antecipada: p.antecipada,
    paga: p.paga,
    antecipacaoLoteId: p.antecipacaoLoteId,
    loteStatus: p.antecipacaoLote?.status ?? null,
    boletoDirecionamento: p.boletoPrudent?.direcionamento ?? null,
    empresaParceiraId: p.venda.cliente?.empresaParceiraId ?? null,
  };
}

/**
 * Busca do fechamento: parcelas da empresa que vencem na competência, só de venda em desconto em
 * folha (a forma de `WHERE_VENDA_ANTECIPAVEL`, a mesma da fila da Prudent; o status não é filtrado,
 * a cancelada aparece bloqueada), mais as já reservadas neste fechamento (para soltar as que saíram).
 */
export function whereParcelasDoFechamento(empresaParceiraId: number, inicio: Date, fim: Date, fechamentoId: number) {
  return {
    OR: [
      {
        dataVencimento: { gte: inicio, lt: fim },
        venda: { cliente: { empresaParceiraId }, OR: WHERE_VENDA_ANTECIPAVEL.OR },
      },
      { fechamentoId },
    ],
  };
}

/** Parcela é desta empresa e vence nesta competência? (a regra pura não sabe do fechamento) */
export function pertence(p: ParcelaLida, empresaParceiraId: number, inicio: Date, fim: Date): boolean {
  const t = p.dataVencimento.getTime();
  return p.venda.cliente?.empresaParceiraId === empresaParceiraId && t >= inicio.getTime() && t < fim.getTime();
}

function rotuloStatus(status: string): string {
  return ROTULO_STATUS_FECHAMENTO[status] ?? status;
}

/** Regra vigente da empresa no dia 1º da competência. */
async function regraDaCompetencia(empresaParceiraId: number, inicio: Date): Promise<RegraEmpresaDados> {
  return regraVigente(await regrasDaEmpresa(empresaParceiraId), inicio);
}

/** Dia `dia` do mês da competência, em data pura UTC. */
export function diaDaCompetencia(competencia: string, dia: number): Date {
  const { inicio } = intervaloCompetencia(competencia);
  return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), dia));
}

/** Rótulo da situação de uma linha no demonstrativo. */
export function situacaoDaLinha(antecipada: boolean): string {
  return antecipada ? "Antecipada · boleto à BFX" : "Fica com a BFX";
}

export async function gerarOuAtualizarFechamento(e: {
  empresaParceiraId: number;
  competencia: string;
  usuario: string | null;
}): Promise<{
  fechamentoId: number;
  reservadas: number;
  liberadas: number;
  bloqueadas: { parcelaId: number; motivo: MotivoBloqueio }[];
}> {
  const { inicio, fim } = intervaloCompetencia(e.competencia);
  const regra = await regraDaCompetencia(e.empresaParceiraId, inicio);
  if (!regra.cobrancaViaBfx) {
    throw new Error(
      `A cobrança via BFX não está ligada para esta empresa em ${rotuloCompetencia(e.competencia)}. ` +
        "Ligue em Cadastros › Empresas › Regras."
    );
  }

  return prisma.$transaction(async (tx) => {
    const fechamento = await tx.fechamento.upsert({
      where: { empresaParceiraId_competencia: { empresaParceiraId: e.empresaParceiraId, competencia: e.competencia } },
      create: { empresaParceiraId: e.empresaParceiraId, competencia: e.competencia, responsavel: e.usuario },
      update: {},
      select: { id: true, status: true },
    });
    if (!podeEditar(fechamento.status)) {
      throw new Error(
        `O fechamento de ${rotuloCompetencia(e.competencia)} está ${rotuloStatus(fechamento.status).toLowerCase()}. ` +
          "Reabra para corrigir antes de atualizar as parcelas."
      );
    }
    // Trava primeiro: segura a linha do fechamento contra conferir/ajustar em paralelo.
    const trava = await tx.fechamento.updateMany({
      where: { id: fechamento.id, status: STATUS_FECHAMENTO.emPreparacao },
      data: { desatualizado: false },
    });
    if (trava.count !== 1) throw new Error(ERRO_MUDOU);

    const parcelas = (await tx.parcelaVencimento.findMany({
      where: whereParcelasDoFechamento(e.empresaParceiraId, inicio, fim, fechamento.id),
      select: SELECT_PARCELA,
      orderBy: [{ vendaId: "asc" }, { numeroParcela: "asc" }],
    })) as ParcelaLida[];

    const reservar: number[] = [];
    const liberar: number[] = [];
    const bloqueadas: { parcelaId: number; motivo: MotivoBloqueio }[] = [];
    let jaReservadas = 0;

    for (const p of parcelas) {
      const minha = p.fechamentoId === fechamento.id;
      if (!pertence(p, e.empresaParceiraId, inicio, fim)) {
        if (minha) liberar.push(p.id);
        continue;
      }
      const r = elegibilidadeFechamento(paraRegra(p), fechamento.id);
      if (r.ok) {
        if (minha) jaReservadas++;
        else reservar.push(p.id);
      } else {
        if (minha) liberar.push(p.id);
        bloqueadas.push({ parcelaId: p.id, motivo: r.motivo });
      }
    }

    if (liberar.length > 0) {
      await tx.parcelaVencimento.updateMany({
        where: { id: { in: liberar }, fechamentoId: fechamento.id },
        data: { fechamentoId: null },
      });
    }
    if (reservar.length > 0) {
      // `fechamentoId: null` + `liquidadaEm: null` + (antecipada, ou não paga e sem lote): a parcela
      // continua como foi lida — outro fechamento, baixa, liquidação ou lote aberto no meio derruba o
      // count. Não antecipada com lote é sempre lote em andamento (concluir marca `antecipada`;
      // cancelar solta o lote); a antecipada mantém o lote concluído e continua reservável.
      const r = await tx.parcelaVencimento.updateMany({
        where: {
          id: { in: reservar },
          fechamentoId: null,
          liquidadaEm: null,
          OR: [{ antecipada: true }, { paga: false, antecipacaoLoteId: null }],
        },
        data: { fechamentoId: fechamento.id },
      });
      if (r.count !== reservar.length) throw new Error(ERRO_CORRIDA);
    }

    return {
      fechamentoId: fechamento.id,
      reservadas: jaReservadas + reservar.length,
      liberadas: liberar.length,
      bloqueadas,
    };
  });
}

/** Trava o fechamento em preparação dentro da transação; erro se não está. */
async function travarEmPreparacao(
  tx: Pick<typeof prisma, "fechamento">,
  fechamentoId: number
): Promise<void> {
  const r = await tx.fechamento.updateMany({
    where: { id: fechamentoId, status: STATUS_FECHAMENTO.emPreparacao },
    data: { atualizadoEm: new Date() },
  });
  if (r.count !== 1) throw new Error(ERRO_SO_EM_PREPARACAO);
}

export async function adicionarAjuste(e: {
  fechamentoId: number;
  valor: number | string;
  justificativa: string;
  usuario: string | null;
}): Promise<void> {
  const v = validarAjuste(e.valor, e.justificativa);
  if (!v.ok) throw new Error(v.erro);
  await prisma.$transaction(async (tx) => {
    await travarEmPreparacao(tx, e.fechamentoId);
    await tx.fechamentoAjuste.create({
      data: { fechamentoId: e.fechamentoId, valor: v.valor, justificativa: v.justificativa, criadoPor: e.usuario },
    });
  });
}

export async function removerAjuste(e: { ajusteId: number }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ajuste = await tx.fechamentoAjuste.findUnique({
      where: { id: e.ajusteId },
      select: { id: true, fechamentoId: true, removidoEm: true },
    });
    if (!ajuste) throw new Error("Ajuste não encontrado.");
    await travarEmPreparacao(tx, ajuste.fechamentoId);
    await tx.fechamentoAjuste.updateMany({
      where: { id: ajuste.id, removidoEm: null },
      data: { removidoEm: new Date() },
    });
  });
}

/** Monta o que o demonstrativo mostra a partir da foto de uma versão. */
export function montarDemonstrativo(e: {
  empresa: { nome: string; cnpj: string | null };
  competencia: string;
  versao: number;
  regra: Pick<RegraEmpresaDados, "diaCorte" | "diaPix">;
  responsavel: string | null;
  linhas: {
    vendaId: number;
    numeroParcela: number;
    totalParcelas: number;
    clienteNome: string;
    matricula: string | null;
    valor: number;
    vencimento: Date;
    loteId: number | null;
    antecipada: boolean;
  }[];
  ajustes: { valor: number; justificativa: string }[];
  totalBruto: number;
  totalAjustes: number;
  totalFinal: number;
}): DemonstrativoDados {
  return {
    empresa: e.empresa,
    competencia: e.competencia,
    versao: e.versao,
    diaCorte: e.regra.diaCorte,
    vencimentoPix: diaDaCompetencia(e.competencia, e.regra.diaPix),
    responsavel: e.responsavel,
    linhas: e.linhas.map((l) => ({
      identificador: identificadorParcela(l.vendaId, l.numeroParcela, l.totalParcelas),
      colaborador: l.clienteNome,
      matricula: l.matricula,
      valor: l.valor,
      vencimento: l.vencimento,
      lote: l.loteId,
      situacao: situacaoDaLinha(l.antecipada),
    })),
    ajustes: e.ajustes,
    totalBruto: e.totalBruto,
    totalAjustes: e.totalAjustes,
    totalFinal: e.totalFinal,
  };
}

/** Nome de arquivo do demonstrativo: "demonstrativo-amazon-five-2026-10-v1.xlsx". */
export function nomeArquivoDemonstrativo(empresa: string, competencia: string, versao: number, ext: "xlsx" | "pdf"): string {
  const slug =
    empresa
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "empresa";
  return `demonstrativo-${slug}-${competencia}-v${versao}.${ext}`;
}

export async function conferirFechamento(e: { fechamentoId: number; usuario: string | null }): Promise<{ versao: number }> {
  const fechamento = await prisma.fechamento.findUnique({
    where: { id: e.fechamentoId },
    select: {
      id: true,
      empresaParceiraId: true,
      competencia: true,
      status: true,
      versaoAtual: true,
      desatualizado: true,
      responsavel: true,
      empresaParceira: { select: { id: true, nome: true, cnpj: true } },
    },
  });
  if (!fechamento) throw new Error("Fechamento não encontrado.");
  if (!podeEditar(fechamento.status)) throw new Error("Só um fechamento em preparação pode ser conferido.");
  if (fechamento.desatualizado) throw new Error(ERRO_PARCELAS_MUDARAM);

  const { inicio, fim } = intervaloCompetencia(fechamento.competencia);
  const regra = await regraDaCompetencia(fechamento.empresaParceiraId, inicio);
  const numero = fechamento.versaoAtual + 1;

  await prisma.$transaction(async (tx) => {
    // Trava primeiro: status + versão no where. Clique duplo ou ajuste em paralelo esperam a linha.
    const trava = await tx.fechamento.updateMany({
      where: {
        id: fechamento.id,
        status: STATUS_FECHAMENTO.emPreparacao,
        versaoAtual: fechamento.versaoAtual,
        // Edição/exclusão de venda que soltou reserva no meio marca desatualizado (historico/actions).
        desatualizado: false,
      },
      data: { status: STATUS_FECHAMENTO.conferido, versaoAtual: numero, desatualizado: false },
    });
    if (trava.count !== 1) throw new Error(ERRO_MUDOU);

    const parcelas = (await tx.parcelaVencimento.findMany({
      where: { fechamentoId: fechamento.id },
      select: SELECT_PARCELA,
      orderBy: [{ vendaId: "asc" }, { numeroParcela: "asc" }],
    })) as ParcelaLida[];
    if (parcelas.length === 0) throw new Error("Nenhuma parcela neste fechamento. Clique em Atualizar parcelas.");
    for (const p of parcelas) {
      if (!pertence(p, fechamento.empresaParceiraId, inicio, fim)) throw new Error(ERRO_PARCELAS_MUDARAM);
      if (!elegibilidadeFechamento(paraRegra(p), fechamento.id).ok) throw new Error(ERRO_PARCELAS_MUDARAM);
    }
    // Boletos das antecipadas: o update no-op com `direcionamento: "bfx"` no where trava as linhas até
    // o commit. Um "devolver à empresa" em paralelo espera, ou já passou e derruba o count.
    const boletoIds = [...new Set(parcelas.map((p) => p.boletoPrudentId).filter((id): id is number => id != null))];
    if (boletoIds.length > 0) {
      const travados = await tx.boletoPrudent.updateMany({
        where: { id: { in: boletoIds }, direcionamento: "bfx" },
        data: { direcionamento: "bfx" },
      });
      if (travados.count !== boletoIds.length) throw new Error(ERRO_PARCELAS_MUDARAM);
    }

    // Ajustes lidos depois da trava: um ajuste gravado (ou removido) entre o clique e aqui conta.
    const ajustes = await tx.fechamentoAjuste.findMany({
      where: { fechamentoId: fechamento.id, removidoEm: null },
      select: { id: true, valor: true, justificativa: true },
      orderBy: { id: "asc" },
    });
    const linhas = parcelas.map((p) => ({
      parcelaId: p.id,
      vendaId: p.vendaId,
      numeroParcela: p.numeroParcela,
      totalParcelas: p.venda._count.parcelasVencimento,
      clienteNome: p.venda.cliente?.nome ?? "",
      matricula: p.venda.cliente?.matricula ?? null,
      valor: p.valorParcela,
      vencimento: p.dataVencimento,
      loteId: p.antecipacaoLoteId,
      antecipada: p.antecipada,
      boletoPrudentId: p.boletoPrudentId,
    }));
    const totais = totaisFechamento(linhas, ajustes.map((a) => ({ valor: a.valor, removidoEm: null })));
    if (totais.totalFinal <= 0) throw new Error("O valor final do demonstrativo precisa ser maior que zero.");

    const ajustesFoto = ajustes.map((a) => ({ valor: a.valor, justificativa: a.justificativa }));
    const xlsx = gerarFechamentoXlsx(
      montarDemonstrativo({
        empresa: { nome: fechamento.empresaParceira.nome, cnpj: fechamento.empresaParceira.cnpj },
        competencia: fechamento.competencia,
        versao: numero,
        regra,
        responsavel: fechamento.responsavel,
        linhas,
        ajustes: ajustesFoto,
        ...totais,
      })
    );
    const arquivo = await tx.arquivoFinanceiro.create({
      data: {
        nome: nomeArquivoDemonstrativo(fechamento.empresaParceira.nome, fechamento.competencia, numero, "xlsx"),
        contentType: XLSX_MIME,
        tamanho: xlsx.length,
        sha256: sha256Hex(xlsx),
        conteudo: Buffer.from(xlsx),
        criadoPor: e.usuario,
      },
      select: { id: true },
    });

    await tx.fechamentoVersao.create({
      data: {
        fechamentoId: fechamento.id,
        numero,
        totalBruto: totais.totalBruto,
        totalAjustes: totais.totalAjustes,
        totalFinal: totais.totalFinal,
        ajustesJson: JSON.stringify(ajustesFoto),
        xlsxArquivoId: arquivo.id,
        criadaPor: e.usuario,
        linhas: { create: linhas },
      },
      select: { id: true },
    });
  });

  return { versao: numero };
}

export async function reabrirFechamento(e: { fechamentoId: number }): Promise<void> {
  const f = await prisma.fechamento.findUnique({ where: { id: e.fechamentoId }, select: { id: true, status: true } });
  if (!f) throw new Error("Fechamento não encontrado.");
  if (!podeReabrir(f.status)) {
    throw new Error(`Um fechamento ${rotuloStatus(f.status).toLowerCase()} não pode ser reaberto.`);
  }
  const r = await prisma.fechamento.updateMany({
    where: { id: f.id, status: f.status },
    data: { status: STATUS_FECHAMENTO.emPreparacao },
  });
  if (r.count !== 1) throw new Error(ERRO_MUDOU);
}

/**
 * Reivindica o envio antes do SMTP: conferido → enviado, com a versão no where. Duas abas (ou dois
 * pods) não mandam dois e-mails; o segundo recebe erro. Falha no SMTP → `desfazerReivindicacao`.
 */
export async function reivindicarEnvio(e: { fechamentoId: number; versao: number }): Promise<void> {
  const r = await prisma.fechamento.updateMany({
    where: { id: e.fechamentoId, status: STATUS_FECHAMENTO.conferido, versaoAtual: e.versao },
    data: { status: STATUS_FECHAMENTO.enviado },
  });
  if (r.count !== 1) throw new Error(ERRO_MUDOU);
}

/** O e-mail não saiu: volta a conferido, se ainda é aquela versão marcada como enviada. */
export async function desfazerReivindicacao(e: { fechamentoId: number; versao: number }): Promise<void> {
  const r = await prisma.fechamento.updateMany({
    where: { id: e.fechamentoId, status: STATUS_FECHAMENTO.enviado, versaoAtual: e.versao },
    data: { status: STATUS_FECHAMENTO.conferido },
  });
  if (r.count !== 1) {
    console.error(`[fechamento] envio desfeito, mas o fechamento ${e.fechamentoId} não estava mais enviado na versão ${e.versao}.`);
  }
}

/** Depois do e-mail: grava na versão o PDF enviado, quando e quem. */
export async function marcarEnviado(e: {
  fechamentoId: number;
  versao: number;
  pdfArquivoId: number;
  usuario: string | null;
}): Promise<void> {
  await prisma.fechamentoVersao.updateMany({
    where: { fechamentoId: e.fechamentoId, numero: e.versao },
    data: { pdfArquivoId: e.pdfArquivoId, enviadaEm: new Date(), enviadaPor: e.usuario },
  });
}
