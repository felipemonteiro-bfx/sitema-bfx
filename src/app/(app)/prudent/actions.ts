"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import { calcularSelecao, type ResultadoSelecao } from "@/lib/fila-antecipacao";
import {
  SELECT_VENDA_PLANILHA,
  montarPlanilhaControle,
  normalizarFiltroPlanilha,
  type ResumoPlanilha,
} from "@/lib/planilha-controle";
import { SELECT_VENDA_FOLHA, montarPlanilhaFolha, normalizarCompetencia } from "@/lib/planilha-folha";
import { hojeDataPura } from "@/lib/data-pura";
import { cancelarLote, concluirLote, registrarLoteConcluido } from "@/lib/lote-antecipacao-db";
import { revalidarVenda } from "@/lib/revalidacao";
import { valorTotalVenda } from "@/lib/venda-utils";
import { idsValidos } from "@/lib/ids-validos";
import { CONFIRMACAO } from "@/lib/confirmacao-rh";

/** Teto de ids por chamada: a fila inteira tem poucas centenas de vendas. */
const LIMITE_IDS = 1000;

export type RespostaSelecao = { ok: true; resultado: ResultadoSelecao } | { ok: false; erro: string };

/**
 * Card de seleção da fila de antecipação: total, parcelas, prazo médio, taxa,
 * líquido e vencidas das vendas marcadas — calculado aqui, no servidor, a
 * cada mudança de seleção ou período (pedido do André: "o front só mostra").
 *
 * Guarda própria: o Action ID vive no bundle e a action é invocável sem passar
 * pelo layout (ver memória "Server Action destrutiva precisa da própria
 * guarda" — vale também para leitura de dado financeiro). Só lê; não grava nada.
 */
export async function calcularSelecaoAction(entrada: {
  ids: number[];
  mesInicio?: string;
  mesFim?: string;
  /** Parcelas desmarcadas na fila (2026-09-30): o card mostra o lote sem elas. */
  excluirParcelaIds?: number[];
}): Promise<RespostaSelecao> {
  await requireAdminOrThrow();

  const ids = Array.isArray(entrada?.ids)
    ? [...new Set(entrada.ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, LIMITE_IDS)
    : [];
  const excluir = new Set(Array.isArray(entrada?.excluirParcelaIds) ? idsValidos(entrada.excluirParcelaIds) : []);
  const mesInicio = typeof entrada?.mesInicio === "string" ? entrada.mesInicio : "";
  const mesFim = typeof entrada?.mesFim === "string" ? entrada.mesFim : "";
  const periodo = parsePeriodoMesAno(mesInicio, mesFim);
  if ((mesInicio || mesFim) && !periodo) return { ok: false, erro: "Período inválido." };

  const hoje = hojeDataPura();
  if (ids.length === 0) return { ok: true, resultado: calcularSelecao([], null, hoje) };

  // Mesmo recorte da action `antecipar`: só venda em desconto em folha.
  const vendas = await prisma.venda.findMany({
    where: { id: { in: ids }, ...WHERE_VENDA_ANTECIPAVEL },
    select: {
      dataVenda: true,
      valorVenda: true,
      quantidade: true,
      valorFrete: true,
      desconto: true,
      parcelas: true,
      itens: { select: { subtotal: true } },
      parcelasVencimento: {
        select: {
          id: true,
          numeroParcela: true,
          dataVencimento: true,
          valorParcela: true,
          antecipada: true,
          paga: true,
          antecipacaoLoteId: true,
          confirmacaoRh: true,
        },
      },
    },
  });

  // Mesmo recorte de `resolverParcelasDoLote`: fora de lote, confirmada pelo RH e não desmarcada.
  const resultado = calcularSelecao(
    vendas.map((v) => ({
      dataVenda: v.dataVenda,
      valorVenda: valorTotalVenda(v),
      parcelas: v.parcelas,
      parcelas_detalhes: v.parcelasVencimento.map((p) => ({
        numeroParcela: p.numeroParcela,
        dataVencimento: p.dataVencimento,
        valorParcela: p.valorParcela,
        antecipada: p.antecipada,
        paga: p.paga,
        emAndamento: p.antecipacaoLoteId != null,
        bloqueadaRh: p.confirmacaoRh !== CONFIRMACAO.confirmada,
        excluida: excluir.has(p.id),
      })),
    })),
    periodo,
    hoje
  );
  return { ok: true, resultado };
}

export type RespostaResumoPlanilha = { ok: true; resumo: ResumoPlanilha } | { ok: false; erro: string };

/**
 * Resumo do popover "Baixar planilha de controle" — quantas abas, parcelas e
 * quanto já foi antecipado nos filtros escolhidos. Mesmo modelo e mesmo recorte
 * do download (`/api/relatorios/controle-xlsx`), para os números baterem com o
 * arquivo. Guarda própria, como a de cima.
 */
export async function resumoPlanilhaControleAction(entrada: {
  mesInicio?: string;
  mesFim?: string;
  empresa?: string;
  incluirPassados?: boolean;
}): Promise<RespostaResumoPlanilha> {
  await requireAdminOrThrow();

  const filtro = normalizarFiltroPlanilha(entrada ?? {});
  if ((filtro.mesInicio || filtro.mesFim) && !parsePeriodoMesAno(filtro.mesInicio ?? "", filtro.mesFim ?? "")) {
    return { ok: false, erro: "Período inválido." };
  }

  const vendas = await prisma.venda.findMany({ where: WHERE_VENDA_ANTECIPAVEL, select: SELECT_VENDA_PLANILHA });
  return { ok: true, resumo: montarPlanilhaControle(vendas, filtro, hojeDataPura()).resumo };
}

export type RespostaResumoFolha =
  | {
      ok: true;
      resumo: {
        compradores: number;
        total: number;
        semMatricula: number;
        /** Mesma matrícula em cadastros diferentes: viram uma linha só na folha. */
        matriculasRepetidas: { matricula: string; nomes: string[] }[];
      };
    }
  | { ok: false; erro: string };

/**
 * Resumo do popover "Baixar planilha da folha" — quantos compradores, o total a
 * descontar e quantos estão sem matrícula na competência. Mesmo modelo e mesmo
 * recorte do download (`/api/relatorios/folha-xlsx`), que também exige a
 * empresa. Guarda própria.
 */
export async function resumoPlanilhaFolhaAction(entrada: { competencia?: string; empresa?: string }): Promise<RespostaResumoFolha> {
  await requireAdminOrThrow();

  const competencia = normalizarCompetencia(entrada?.competencia);
  if (!competencia) return { ok: false, erro: "Competência inválida." };
  const empresa = typeof entrada?.empresa === "string" ? entrada.empresa.trim() : "";
  if (!empresa || empresa === "todas") return { ok: false, erro: "Escolha a empresa." };

  const vendas = await prisma.venda.findMany({ where: WHERE_VENDA_ANTECIPAVEL, select: SELECT_VENDA_FOLHA });
  const planilha = montarPlanilhaFolha(vendas, { competencia, empresa });
  return {
    ok: true,
    resumo: {
      compradores: planilha.linhas.length,
      total: planilha.total,
      semMatricula: planilha.semMatricula,
      matriculasRepetidas: planilha.matriculasRepetidas,
    },
  };
}

export type RespostaLote = { ok: true; parcelas: number; vendas: number; valor: number } | { ok: false; erro: string };

/** Mensagem do erro para a tela, sem vazar detalhe do banco. */
function erroDoLote(e: unknown): RespostaLote {
  const msg = e instanceof Error ? e.message : "";
  return { ok: false, erro: msg && msg.length < 120 ? msg : "Não foi possível atualizar o lote." };
}

/**
 * O retorno da Prudent chegou (2026-09-17): as parcelas do lote viram antecipadas e quitadas na
 * data informada. Guarda própria — é gravação de dinheiro.
 */
export async function concluirLoteAction(entrada: {
  loteId: number;
  dataRetorno: string;
  /** Opcionais (2026-09-30): o que a Prudent aprovou e o que caiu na conta. */
  valorAprovado?: number | null;
  valorDepositado?: number | null;
  dataDeposito?: string | null;
}): Promise<RespostaLote> {
  const sessao = await requireAdminOrThrow();
  if (!Number.isInteger(entrada?.loteId) || entrada.loteId <= 0) return { ok: false, erro: "Lote inválido." };
  const valorValido = (v: unknown) => v === null || v === undefined || (typeof v === "number" && Number.isFinite(v) && v >= 0);
  if (!valorValido(entrada.valorAprovado)) return { ok: false, erro: "Valor aprovado inválido." };
  if (!valorValido(entrada.valorDepositado)) return { ok: false, erro: "Valor depositado inválido." };
  if (entrada.dataDeposito != null && typeof entrada.dataDeposito !== "string") {
    return { ok: false, erro: "Data do depósito inválida." };
  }
  try {
    const r = await concluirLote({
      loteId: entrada.loteId,
      dataRetorno: entrada.dataRetorno,
      usuario: sessao.nomeExibicao ?? sessao.username ?? null,
      valorAprovado: entrada.valorAprovado ?? null,
      valorDepositado: entrada.valorDepositado ?? null,
      dataDeposito: entrada.dataDeposito || null,
    });
    revalidarVenda();
    return { ok: true, parcelas: r.parcelas, vendas: r.vendas, valor: r.valor };
  } catch (e) {
    return erroDoLote(e);
  }
}

/** A Prudent recusou: as parcelas voltam para a fila e o lote fica cancelado no histórico. */
export async function cancelarLoteAction(entrada: { loteId: number }): Promise<RespostaLote> {
  await requireAdminOrThrow();
  if (!Number.isInteger(entrada?.loteId) || entrada.loteId <= 0) return { ok: false, erro: "Lote inválido." };
  try {
    const r = await cancelarLote({ loteId: entrada.loteId });
    revalidarVenda();
    return { ok: true, parcelas: r.parcelas, vendas: r.vendas, valor: r.valor };
  } catch (e) {
    return erroDoLote(e);
  }
}

/**
 * Antecipação que a Prudent já tinha comprado antes de o sistema saber: registra um lote já
 * concluído, sem gerar arquivo nenhum.
 */
export async function registrarAntecipacaoConcluidaAction(entrada: {
  ids: number[];
  mesInicio?: string;
  mesFim?: string;
  dataRetorno: string;
  /** Parcelas desmarcadas na fila (2026-09-30). */
  excluirParcelaIds?: number[];
}): Promise<RespostaLote> {
  const sessao = await requireAdminOrThrow();
  const ids = idsValidos(entrada?.ids ?? []);
  if (ids.length === 0) return { ok: false, erro: "Nenhuma venda selecionada." };

  const periodo = parsePeriodoMesAno(entrada.mesInicio ?? "", entrada.mesFim ?? "");
  if ((entrada.mesInicio || entrada.mesFim) && !periodo) return { ok: false, erro: "Período inválido." };

  try {
    const r = await registrarLoteConcluido({
      vendaIds: ids,
      periodo,
      dataRetorno: entrada.dataRetorno,
      usuario: sessao.nomeExibicao ?? sessao.username ?? null,
      excluirParcelaIds: Array.isArray(entrada.excluirParcelaIds) ? idsValidos(entrada.excluirParcelaIds) : [],
    });
    if (!r) return { ok: false, erro: "Nenhuma parcela elegível na seleção." };
    revalidarVenda();
    return { ok: true, parcelas: r.parcelas, vendas: r.vendas, valor: r.valor };
  } catch (e) {
    return erroDoLote(e);
  }
}
