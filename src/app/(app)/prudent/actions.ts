"use server";

import { prisma } from "@/lib/db";
import { requireAdminOrThrow } from "@/lib/guards";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import { calcularSelecao, type ResultadoSelecao } from "@/lib/fila-antecipacao";
import { hojeDataPura } from "@/lib/data-pura";
import { valorTotalVenda } from "@/lib/venda-utils";

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
}): Promise<RespostaSelecao> {
  await requireAdminOrThrow();

  const ids = Array.isArray(entrada?.ids)
    ? [...new Set(entrada.ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, LIMITE_IDS)
    : [];
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
        select: { numeroParcela: true, dataVencimento: true, valorParcela: true, antecipada: true },
      },
    },
  });

  const resultado = calcularSelecao(
    vendas.map((v) => ({
      dataVenda: v.dataVenda,
      valorVenda: valorTotalVenda(v),
      parcelas: v.parcelas,
      parcelas_detalhes: v.parcelasVencimento,
    })),
    periodo,
    hoje
  );
  return { ok: true, resultado };
}
