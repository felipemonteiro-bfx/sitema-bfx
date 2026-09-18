/**
 * As gravações do lote de antecipação (2026-09-17). Cada operação roda numa transação: o lote, o
 * vínculo das parcelas e o flag das vendas precisam andar juntos.
 *
 * - `abrirLote`: o envio à Prudent. Liga as parcelas ao lote e nada mais — não é dinheiro ainda.
 * - `concluirLote`: o retorno chegou. Aí sim antecipada + paga com origem `prudent`.
 * - `cancelarLote`: a Prudent recusou. As parcelas voltam para a fila.
 * - `registrarLoteConcluido`: antecipação que já tinha sido feita fora do sistema.
 *
 * Ver docs/superpowers/specs/2026-09-17-antecipacao-em-andamento.md.
 */
import { prisma } from "@/lib/db";
import { WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";
import { ORIGEM_LOTE, STATUS_LOTE, dataPuraOuNula, flagDaVenda, periodoDoLote } from "@/lib/lote-antecipacao";

/** Filtro de meses da tela; sem ele, o período do lote sai dos vencimentos escolhidos. */
export interface PeriodoLote {
  inicio: Date;
  fim: Date;
}

interface ParcelaDoLote {
  id: number;
  vendaId: number;
  valorParcela: number;
  dataVencimento?: Date;
}

export interface ResultadoLote {
  loteId: number;
  parcelas: number;
  vendas: number;
  valor: number;
}

type Tx = Pick<typeof prisma, "parcelaVencimento" | "anticipacaoBatch" | "venda">;

/** Transação com folga: o recálculo do flag anda venda a venda e o lote pode ter centenas. */
const OPCOES_TRANSACAO = { timeout: 30_000, maxWait: 10_000 } as const;

/**
 * Liga as parcelas ao lote exigindo que continuem livres. Dois envios ao mesmo tempo leem a mesma
 * lista (read committed), então sem este filtro o segundo roubaria as parcelas do primeiro e
 * deixaria um lote sem nenhuma.
 */
async function ligarParcelas(tx: Tx, ids: number[], loteId: number, extra: Record<string, unknown> = {}) {
  const { count } = await tx.parcelaVencimento.updateMany({
    where: { id: { in: ids }, antecipacaoLoteId: null },
    data: { antecipacaoLoteId: loteId, ...extra },
  });
  if (count !== ids.length) {
    throw new Error("Outro lote pegou parte destas parcelas enquanto este era montado. Recarregue e tente de novo.");
  }
}

/** Fecha o lote só se ele ainda estiver em andamento — o `where` é a trava contra clique duplo. */
async function fecharLote(tx: Tx, loteId: number, data: Record<string, unknown>) {
  const { count } = await tx.anticipacaoBatch.updateMany({
    where: { id: loteId, status: STATUS_LOTE.emAndamento },
    data,
  });
  if (count === 0) throw new Error("Este lote não está mais em andamento. Recarregue a página.");
}

/** Parcela livre para entrar num lote: não antecipada e fora de qualquer lote. */
function whereParcelasLivres(vendaIds: number[], periodo: PeriodoLote | null) {
  return {
    vendaId: { in: vendaIds },
    antecipada: false,
    antecipacaoLoteId: null,
    venda: WHERE_VENDA_ANTECIPAVEL,
    ...(periodo ? { dataVencimento: { gte: periodo.inicio, lte: periodo.fim } } : {}),
  };
}

function totalCentavos(parcelas: ParcelaDoLote[]): number {
  return parcelas.reduce((soma, p) => soma + Math.round(p.valorParcela * 100), 0);
}

/**
 * Reescreve `vendas.antecipada` a partir das parcelas de cada venda tocada. Vínculo com lote sem
 * antecipação já quer dizer "em andamento": concluir o lote marca `antecipada` nas parcelas dele,
 * e cancelar desfaz o vínculo — nenhuma parcela fica pendurada num lote fechado.
 */
async function recalcularFlags(tx: Tx, vendaIds: number[]): Promise<void> {
  for (const vendaId of [...new Set(vendaIds)]) {
    const parcelas = await tx.parcelaVencimento.findMany({
      where: { vendaId },
      select: { antecipada: true, antecipacaoLoteId: true },
    });
    const flag = flagDaVenda(
      parcelas.map((p) => ({ antecipada: p.antecipada, emAndamento: p.antecipacaoLoteId != null }))
    );
    await tx.venda.update({ where: { id: vendaId }, data: { antecipada: flag } });
  }
}

async function criarLote(
  tx: Tx,
  parcelas: ParcelaDoLote[],
  dados: { periodo: PeriodoLote | null; status: string; origem: string; concluidaEm: Date | null; usuario: string | null }
) {
  const vendas = new Set(parcelas.map((p) => p.vendaId));
  const periodo = periodoDoLote(
    dados.periodo,
    parcelas.map((p) => p.dataVencimento).filter((d): d is Date => d instanceof Date)
  );
  return tx.anticipacaoBatch.create({
    data: {
      vendaIds: JSON.stringify([...vendas]),
      valorTotal: totalCentavos(parcelas) / 100,
      quantidadeVendas: vendas.size,
      periodoDescricao: periodo?.descricao ?? null,
      periodoInicio: periodo?.inicio ?? null,
      periodoFim: periodo?.fim ?? null,
      status: dados.status,
      origem: dados.origem,
      concluidaEm: dados.concluidaEm,
      concluidaPor: dados.usuario,
    },
  });
}

/** Envio à Prudent: abre o lote em andamento. Devolve `null` quando não há parcela elegível. */
export async function abrirLote(entrada: {
  vendaIds: number[];
  periodo: PeriodoLote | null;
}): Promise<ResultadoLote | null> {
  return prisma.$transaction(async (tx) => {
    const parcelas = await tx.parcelaVencimento.findMany({
      where: whereParcelasLivres(entrada.vendaIds, entrada.periodo),
      select: { id: true, vendaId: true, valorParcela: true, dataVencimento: true },
    });
    if (parcelas.length === 0) return null;

    const lote = await criarLote(tx, parcelas, {
      periodo: entrada.periodo,
      status: STATUS_LOTE.emAndamento,
      origem: ORIGEM_LOTE.envio,
      concluidaEm: null,
      usuario: null,
    });
    await ligarParcelas(tx, parcelas.map((p) => p.id), lote.id);
    await recalcularFlags(tx, parcelas.map((p) => p.vendaId));

    return {
      loteId: lote.id,
      parcelas: parcelas.length,
      vendas: new Set(parcelas.map((p) => p.vendaId)).size,
      valor: totalCentavos(parcelas) / 100,
    };
  }, OPCOES_TRANSACAO);
}

/** O retorno da Prudent chegou: as parcelas do lote viram antecipadas e quitadas. */
export async function concluirLote(entrada: {
  loteId: number;
  dataRetorno: string;
  usuario: string | null;
}): Promise<ResultadoLote> {
  const data = dataPuraOuNula(entrada.dataRetorno);
  if (!data) throw new Error("Data do retorno inválida.");

  return prisma.$transaction(async (tx) => {
    // O status entra no `where` do update: dois cliques ao mesmo tempo, só um fecha o lote.
    await fecharLote(tx, entrada.loteId, {
      status: STATUS_LOTE.concluido,
      concluidaEm: data,
      concluidaPor: entrada.usuario,
    });

    const parcelas = await tx.parcelaVencimento.findMany({
      where: { antecipacaoLoteId: entrada.loteId },
      select: { id: true, vendaId: true, valorParcela: true, dataVencimento: true },
    });
    // Lote sem parcela ligada é sintoma de problema (venda editada, disputa): concluir em silêncio
    // diria "R$ 0,00 concluído" como se o dinheiro tivesse entrado.
    if (parcelas.length === 0) {
      throw new Error("Este lote está sem parcela ligada. Confira se a venda foi editada depois do envio.");
    }
    await tx.parcelaVencimento.updateMany({ where: { antecipacaoLoteId: entrada.loteId }, data: { antecipada: true } });
    // Só parcela ainda aberta recebe a baixa: uma quitada por boleto antes do retorno fica como está.
    await tx.parcelaVencimento.updateMany({
      where: { antecipacaoLoteId: entrada.loteId, paga: false },
      data: { paga: true, dataPagamento: data, origemPagamento: "prudent" },
    });
    await recalcularFlags(tx, parcelas.map((p) => p.vendaId));

    return {
      loteId: entrada.loteId,
      parcelas: parcelas.length,
      vendas: new Set(parcelas.map((p) => p.vendaId)).size,
      valor: totalCentavos(parcelas) / 100,
    };
  }, OPCOES_TRANSACAO);
}

/** A Prudent recusou: as parcelas voltam para a fila e o lote fica no histórico como cancelado. */
export async function cancelarLote(entrada: { loteId: number; observacao?: string | null }): Promise<ResultadoLote> {
  return prisma.$transaction(async (tx) => {
    await fecharLote(tx, entrada.loteId, { status: STATUS_LOTE.cancelado, observacao: entrada.observacao ?? null });

    const parcelas = await tx.parcelaVencimento.findMany({
      where: { antecipacaoLoteId: entrada.loteId },
      select: { id: true, vendaId: true, valorParcela: true, dataVencimento: true },
    });
    await tx.parcelaVencimento.updateMany({ where: { antecipacaoLoteId: entrada.loteId }, data: { antecipacaoLoteId: null } });
    await recalcularFlags(tx, parcelas.map((p) => p.vendaId));

    return {
      loteId: entrada.loteId,
      parcelas: parcelas.length,
      vendas: new Set(parcelas.map((p) => p.vendaId)).size,
      valor: totalCentavos(parcelas) / 100,
    };
  }, OPCOES_TRANSACAO);
}

/** Antecipação que já tinha sido feita fora do sistema: nasce concluída, sem gerar arquivo. */
export async function registrarLoteConcluido(entrada: {
  vendaIds: number[];
  periodo: PeriodoLote | null;
  dataRetorno: string;
  usuario: string | null;
  origem?: string;
}): Promise<ResultadoLote | null> {
  const data = dataPuraOuNula(entrada.dataRetorno);
  if (!data) throw new Error("Data da antecipação inválida.");

  return prisma.$transaction(async (tx) => {
    const parcelas = await tx.parcelaVencimento.findMany({
      where: whereParcelasLivres(entrada.vendaIds, entrada.periodo),
      select: { id: true, vendaId: true, valorParcela: true, dataVencimento: true },
    });
    if (parcelas.length === 0) return null;

    const lote = await criarLote(tx, parcelas, {
      periodo: entrada.periodo,
      status: STATUS_LOTE.concluido,
      origem: entrada.origem ?? ORIGEM_LOTE.registro,
      concluidaEm: data,
      usuario: entrada.usuario,
    });
    const ids = parcelas.map((p) => p.id);
    await ligarParcelas(tx, ids, lote.id, { antecipada: true });
    await tx.parcelaVencimento.updateMany({
      where: { id: { in: ids }, paga: false },
      data: { paga: true, dataPagamento: data, origemPagamento: "prudent" },
    });
    await recalcularFlags(tx, parcelas.map((p) => p.vendaId));

    return {
      loteId: lote.id,
      parcelas: parcelas.length,
      vendas: new Set(parcelas.map((p) => p.vendaId)).size,
      valor: totalCentavos(parcelas) / 100,
    };
  }, OPCOES_TRANSACAO);
}
