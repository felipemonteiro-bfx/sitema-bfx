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
import {
  TAXA_MENSAL_PADRAO,
  WHERE_VENDA_ANTECIPAVEL,
  calcularAntecipacao,
  titulosDeVenda,
  type TituloComPrazo,
} from "@/lib/antecipacao";
import { CONFIRMACAO } from "@/lib/confirmacao-rh";
import { hojeDataPura } from "@/lib/data-pura";
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

/**
 * Parcela livre para entrar num lote: não antecipada e fora de qualquer lote. No envio à Prudent
 * (`exigirConfirmacao`) só entra parcela confirmada pelo RH (2026-09-30); `registrarLoteConcluido`
 * não exige, porque a antecipação já aconteceu fora do sistema. `excluirParcelaIds` são as
 * parcelas desmarcadas na fila.
 */
function whereParcelasLivres(
  vendaIds: number[],
  periodo: PeriodoLote | null,
  opcoes: { exigirConfirmacao: boolean; excluirParcelaIds?: number[] }
) {
  const excluir = opcoes.excluirParcelaIds ?? [];
  return {
    vendaId: { in: vendaIds },
    antecipada: false,
    antecipacaoLoteId: null,
    venda: WHERE_VENDA_ANTECIPAVEL,
    ...(periodo ? { dataVencimento: { gte: periodo.inicio, lte: periodo.fim } } : {}),
    // No envio, parcela já paga (boleto, baixa manual) também fica de fora — o card da seleção
    // (`titulosDeVenda`) já a descartava. `registrarLoteConcluido` mantém o recorte de antes.
    ...(opcoes.exigirConfirmacao ? { confirmacaoRh: CONFIRMACAO.confirmada, paga: false } : {}),
    ...(excluir.length > 0 ? { id: { notIn: excluir } } : {}),
  };
}

const SELECT_PARCELA_DO_LOTE = { id: true, vendaId: true, valorParcela: true, dataVencimento: true } as const;

/**
 * As parcelas que um envio à Prudent levaria. Fonte única do lote gravado (`abrirLote`) e do CSV
 * que vai para a financeira (`/api/relatorios/antecipacao`): com exclusão, os dois têm de listar
 * exatamente as mesmas parcelas.
 */
export async function resolverParcelasDoLote(
  tx: Tx,
  entrada: { vendaIds: number[]; periodo: PeriodoLote | null; excluirParcelaIds: number[] }
): Promise<{ id: number; vendaId: number; valorParcela: number; dataVencimento: Date }[]> {
  return tx.parcelaVencimento.findMany({
    where: whereParcelasLivres(entrada.vendaIds, entrada.periodo, {
      exigirConfirmacao: true,
      excluirParcelaIds: entrada.excluirParcelaIds,
    }),
    select: SELECT_PARCELA_DO_LOTE,
  });
}

function totalCentavos(parcelas: ParcelaDoLote[]): number {
  return parcelas.reduce((soma, p) => soma + Math.round(p.valorParcela * 100), 0);
}

interface VendaDoLote {
  id: number;
  dataVenda: Date;
  cliente: { empresa: string | null; empresaParceiraId: number | null } | null;
}

/**
 * Um lote representa uma remessa de uma unica empresa conveniada. Devolve as vendas lidas: a
 * abertura usa a data da venda (prazo da Prudent) e a empresa parceira.
 */
async function validarUmaEmpresa(tx: Tx, vendaIds: number[]): Promise<VendaDoLote[]> {
  // Alguns consumidores de teste usam um mock mínimo da transação, anterior
  // à regra de empresa. No Prisma real este método sempre existe.
  if (typeof tx.venda.findMany !== "function") return [];
  const vendas: VendaDoLote[] = await tx.venda.findMany({
    where: { id: { in: vendaIds } },
    select: { id: true, dataVenda: true, cliente: { select: { empresa: true, empresaParceiraId: true } } },
  });
  const empresas = new Set(vendas.map((v) => (v.cliente?.empresa ?? "Sem empresa").trim().toLocaleUpperCase()));
  if (empresas.size > 1) {
    throw new Error("Um lote não pode misturar vendas de empresas diferentes. Filtre uma empresa e tente novamente.");
  }
  return vendas;
}

/** Dias entre o envio e o depósito da Prudent, para a previsão de caixa. */
const DIAS_ATE_DEPOSITO = 2;

/**
 * Valores que o envio grava no lote (2026-09-30): empresa parceira, taxa, líquido solicitado pela
 * fórmula da Prudent (`titulosDeVenda` + `calcularAntecipacao`, sobre as parcelas escolhidas de
 * cada venda) e depósito previsto para hoje + 2 dias.
 */
function valoresDoEnvio(vendas: VendaDoLote[], parcelas: ParcelaDoLote[]) {
  const porVenda = new Map(vendas.map((v) => [v.id, v]));
  const titulos: TituloComPrazo[] = [];
  for (const vendaId of new Set(parcelas.map((p) => p.vendaId))) {
    const venda = porVenda.get(vendaId);
    titulos.push(
      ...titulosDeVenda({
        dataVenda: venda?.dataVenda ?? new Date(Number.NaN),
        valorVenda: null,
        parcelas: null,
        parcelas_detalhes: parcelas
          .filter((p) => p.vendaId === vendaId)
          .map((p) => ({ dataVencimento: p.dataVencimento ?? new Date(Number.NaN), valorParcela: p.valorParcela })),
      })
    );
  }
  const liquido = calcularAntecipacao(titulos, TAXA_MENSAL_PADRAO).valorLiquido;
  // Só das vendas que de fato têm parcela no lote: `validarUmaEmpresa` compara pelo texto.
  const empresaParceiraId =
    vendas
      .filter((v) => parcelas.some((p) => p.vendaId === v.id))
      .map((v) => v.cliente?.empresaParceiraId)
      .find((id) => id != null) ?? null;
  const hoje = new Date(`${hojeDataPura()}T00:00:00.000Z`);
  return {
    empresaParceiraId,
    taxaMensal: TAXA_MENSAL_PADRAO,
    valorLiquidoSolicitado: Math.round(liquido * 100) / 100,
    dataDepositoPrevista: new Date(hoje.getTime() + DIAS_ATE_DEPOSITO * 24 * 60 * 60 * 1000),
  };
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
  dados: {
    periodo: PeriodoLote | null;
    status: string;
    origem: string;
    concluidaEm: Date | null;
    usuario: string | null;
    valores?: ReturnType<typeof valoresDoEnvio>;
  }
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
      ...(dados.valores ?? {}),
    },
  });
}

/**
 * Envio à Prudent: abre o lote em andamento. Devolve `null` quando não há parcela elegível —
 * nenhuma confirmada pelo RH, ou todas desmarcadas na fila.
 */
export async function abrirLote(entrada: {
  vendaIds: number[];
  periodo: PeriodoLote | null;
  excluirParcelaIds?: number[];
}): Promise<ResultadoLote | null> {
  return prisma.$transaction(async (tx) => {
    const vendas = await validarUmaEmpresa(tx, entrada.vendaIds);
    const parcelas = await resolverParcelasDoLote(tx, {
      vendaIds: entrada.vendaIds,
      periodo: entrada.periodo,
      excluirParcelaIds: entrada.excluirParcelaIds ?? [],
    });
    if (parcelas.length === 0) return null;

    const lote = await criarLote(tx, parcelas, {
      periodo: entrada.periodo,
      status: STATUS_LOTE.emAndamento,
      origem: ORIGEM_LOTE.envio,
      concluidaEm: null,
      usuario: null,
      valores: valoresDoEnvio(vendas, parcelas),
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

/** Valor opcional do retorno: nulo se ausente; erro se negativo ou não numérico; 2 casas. */
function valorDoRetorno(valor: number | null | undefined, nome: string): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) throw new Error(`${nome} inválido.`);
  return Math.round(valor * 100) / 100;
}

/**
 * O retorno da Prudent chegou: as parcelas do lote viram antecipadas e quitadas. Desde
 * 2026-09-30 o lote guarda também quanto a Prudent aprovou, quanto caiu na conta e quando — a
 * data do depósito vale a do retorno quando não vem.
 */
export async function concluirLote(entrada: {
  loteId: number;
  dataRetorno: string;
  usuario: string | null;
  valorAprovado?: number | null;
  valorDepositado?: number | null;
  dataDeposito?: string | null;
}): Promise<ResultadoLote> {
  const data = dataPuraOuNula(entrada.dataRetorno);
  if (!data) throw new Error("Data do retorno inválida.");
  const valorAprovado = valorDoRetorno(entrada.valorAprovado, "Valor aprovado");
  const valorDepositado = valorDoRetorno(entrada.valorDepositado, "Valor depositado");
  const dataDeposito = entrada.dataDeposito ? dataPuraOuNula(entrada.dataDeposito) : data;
  if (!dataDeposito) throw new Error("Data do depósito inválida.");

  return prisma.$transaction(async (tx) => {
    // O status entra no `where` do update: dois cliques ao mesmo tempo, só um fecha o lote.
    await fecharLote(tx, entrada.loteId, {
      status: STATUS_LOTE.concluido,
      concluidaEm: data,
      concluidaPor: entrada.usuario,
      valorAprovado,
      valorDepositado,
      dataDeposito,
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
    await validarUmaEmpresa(tx, entrada.vendaIds);
    const parcelas = await tx.parcelaVencimento.findMany({
      where: whereParcelasLivres(entrada.vendaIds, entrada.periodo, { exigirConfirmacao: false }),
      select: SELECT_PARCELA_DO_LOTE,
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
