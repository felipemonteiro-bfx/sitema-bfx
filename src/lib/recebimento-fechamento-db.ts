/**
 * Recebimentos do fechamento (Fase 6; spec 2026-09-30 §5.2 e §5.3) — gravações.
 *
 * - `processarPagamentoFechamento`: o webhook do Asaas desvia para cá quando a cobrança é de um
 *   fechamento. O status aplicado é o atual da cobrança (o evento é só gatilho). Pago → um
 *   recebimento `confirmado` (único por `asaasPaymentId`: evento repetido não duplica); estorno →
 *   o recebimento vira `estornado`. Pagamento de cobrança já cancelada é dinheiro real e entra.
 * - Manual em dois passos: `registrarRecebimentoManual` (pendente) → `confirmarRecebimento`. Só
 *   `confirmado` conta; anexar comprovante nunca confirma.
 * - `recalcularFechamento`: a situação pelos recebimentos confirmados contra o valor final da
 *   versão atual (já enviada ao RH) → enviado / pago_parcial / pago. Entrou em `pago`: liquida as parcelas reservadas
 *   (`liquidadaEm`); as não antecipadas ganham também `paga`, origem `pix_fechamento`. Saiu de
 *   `pago`: desfaz. Só mexe no status de fechamento já enviado; reaberto, o dinheiro fica
 *   registrado e o próximo envio cobra só o saldo.
 *
 * Toda operação trava a linha do fechamento primeiro (update no-op) e só depois lê os
 * recebimentos: dois eventos em paralelo do mesmo fechamento são serializados.
 */
import { prisma } from "@/lib/db";
import type { AsaasPagamentoDetalhe } from "@/lib/asaas";
import { STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";
import { lerReferenciaExterna, situacaoRecebimento } from "@/lib/recebimento-fechamento";
import { hojeDataPura } from "@/lib/data-pura";
import { prepararArquivoFinanceiro, salvarArquivoFinanceiro } from "@/lib/arquivo-financeiro";
import { formatBRL } from "@/lib/utils";

export const STATUS_RECEBIMENTO = { pendente: "pendente", confirmado: "confirmado", estornado: "estornado" } as const;
export const STATUS_COBRANCA = { ativa: "ativa", cancelada: "cancelada", paga: "paga" } as const;
export const ORIGEM_PIX_FECHAMENTO = "pix_fechamento";

/** Status do Asaas em que o dinheiro entrou. */
export const ASAAS_PAGO = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "DUNNING_RECEIVED"]);
/** Status do Asaas em que o dinheiro voltou (ou está em disputa) — o recebimento deixa de contar. */
export const ASAAS_ESTORNO = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
  "RECEIVED_IN_CASH_UNDONE",
]);

const ERRO_MUDOU = "Outra operação mudou este recebimento. Recarregue.";

type Tx = Pick<
  typeof prisma,
  "fechamento" | "recebimentoFechamento" | "cobrancaFechamento" | "parcelaVencimento" | "fechamentoVersao" | "arquivoFinanceiro"
>;

const STATUS_COM_RECEBIMENTO: string[] = [STATUS_FECHAMENTO.enviado, STATUS_FECHAMENTO.pagoParcial, STATUS_FECHAMENTO.pago];

/** "YYYY-MM-DD" do Asaas (ou hoje em Manaus) como data pura à meia-noite UTC. */
function dataPura(valor: string | null | undefined): Date {
  const dia = (valor || hojeDataPura()).slice(0, 10);
  return new Date(`${dia}T00:00:00.000Z`);
}

function ehP2002(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002";
}

/** Trava a linha do fechamento até o commit. */
async function travar(tx: Tx, fechamentoId: number): Promise<void> {
  const r = await tx.fechamento.updateMany({ where: { id: fechamentoId }, data: { atualizadoEm: new Date() } });
  if (r.count !== 1) throw new Error("Fechamento não encontrado.");
}

export type Recalculo = {
  fechamentoId: number;
  empresa: string;
  competencia: string;
  antes: string;
  depois: string;
  mudou: boolean;
  recebido: number;
  saldo: number;
  excedente: number;
  liquidou: boolean;
  desfez: boolean;
};

/**
 * Recalcula status e liquidação pelo que foi confirmado. Chamar dentro da transação, depois de
 * travar o fechamento. Devolve null se o fechamento não existe.
 */
export async function recalcularFechamento(tx: Tx, fechamentoId: number): Promise<Recalculo | null> {
  const f = await tx.fechamento.findUnique({
    where: { id: fechamentoId },
    select: {
      id: true,
      status: true,
      versaoAtual: true,
      competencia: true,
      empresaParceira: { select: { nome: true } },
      versoes: { orderBy: { numero: "desc" }, take: 1, select: { numero: true, totalFinal: true, enviadaEm: true } },
    },
  });
  if (!f) return null;
  const recebimentos = await tx.recebimentoFechamento.findMany({
    where: { fechamentoId, status: STATUS_RECEBIMENTO.confirmado },
    select: { valor: true, status: true, dataRecebimento: true },
  });
  const versao = f.versoes[0];
  const totalFinal = versao && versao.numero === f.versaoAtual ? versao.totalFinal : null;
  // Envio em andamento (reivindicado, e-mail ainda não saiu): a versão não chegou ao RH. O status
  // só muda depois do envio (`recalcularEAvisar` após `marcarEnviado`); se o e-mail falhar, o
  // desfazer encontra o fechamento como deixou.
  const enviada = versao != null && versao.numero === f.versaoAtual && versao.enviadaEm != null;
  const base = {
    fechamentoId,
    empresa: f.empresaParceira.nome,
    competencia: f.competencia,
    antes: f.status,
    depois: f.status,
    mudou: false,
    liquidou: false,
    desfez: false,
  };
  // Sem versão enviada valendo (reaberto, em preparação) ou valor final ≤ 0 (o conferir já recusa):
  // o dinheiro fica registrado, mas não há status a mudar nem data de liquidação a inventar.
  if (totalFinal === null || totalFinal <= 0 || !enviada || !STATUS_COM_RECEBIMENTO.includes(f.status)) {
    const sit = situacaoRecebimento(Math.max(totalFinal ?? 0, 0), recebimentos);
    return { ...base, recebido: sit.recebido, saldo: totalFinal && totalFinal > 0 ? sit.saldo : 0, excedente: totalFinal && totalFinal > 0 ? sit.excedente : 0 };
  }

  const sit = situacaoRecebimento(totalFinal, recebimentos);
  const r: Recalculo = { ...base, recebido: sit.recebido, saldo: sit.saldo, excedente: sit.excedente, depois: sit.status };
  if (sit.status === f.status) return r;

  const trocou = await tx.fechamento.updateMany({ where: { id: fechamentoId, status: f.status }, data: { status: sit.status } });
  if (trocou.count !== 1) throw new Error("Outra operação mudou este fechamento. Recarregue.");
  r.mudou = true;

  if (sit.status === STATUS_FECHAMENTO.pago) {
    const ultima = recebimentos.reduce<Date | null>(
      (max, x) => (!max || x.dataRecebimento.getTime() > max.getTime() ? x.dataRecebimento : max),
      null
    );
    if (!ultima) throw new Error("Fechamento pago sem recebimento confirmado.");
    await tx.parcelaVencimento.updateMany({
      where: { fechamentoId, liquidadaEm: null },
      data: { liquidadaEm: ultima },
    });
    await tx.parcelaVencimento.updateMany({
      where: { fechamentoId, antecipada: false, paga: false },
      data: { paga: true, dataPagamento: ultima, origemPagamento: ORIGEM_PIX_FECHAMENTO },
    });
    r.liquidou = true;
  } else if (f.status === STATUS_FECHAMENTO.pago) {
    await tx.parcelaVencimento.updateMany({
      where: { fechamentoId, liquidadaEm: { not: null } },
      data: { liquidadaEm: null },
    });
    await tx.parcelaVencimento.updateMany({
      where: { fechamentoId, paga: true, origemPagamento: ORIGEM_PIX_FECHAMENTO },
      data: { paga: false, dataPagamento: null, origemPagamento: null },
    });
    r.desfez = true;
  }
  return r;
}

export type MotivoAlerta = "recebimento" | "estorno";

/** Notificações que um recálculo pede. Pura. */
export function alertasDoRecalculo(r: Recalculo, motivo: MotivoAlerta): { mensagem: string; link: string }[] {
  const link = `/fechamento/${r.fechamentoId}`;
  const quem = `${r.empresa} — ${rotuloCompetencia(r.competencia)}`;
  const alertas: { mensagem: string; link: string }[] = [];
  if (motivo === "estorno") {
    alertas.push({
      mensagem:
        `[Alerta] Recebimento estornado: ${quem}. Recebido agora ${formatBRL(r.recebido)}, falta ${formatBRL(r.saldo)}.` +
        (r.desfez ? " A liquidação das parcelas foi desfeita." : ""),
      link,
    });
  } else if (r.mudou && r.depois === STATUS_FECHAMENTO.pagoParcial) {
    alertas.push({ mensagem: `[Alerta] Pix parcial: ${quem}. Recebido ${formatBRL(r.recebido)}, falta ${formatBRL(r.saldo)}.`, link });
  }
  if (motivo === "recebimento" && r.excedente > 0) {
    alertas.push({
      mensagem: `[Alerta] Crédito a resolver: ${quem}. Recebido ${formatBRL(r.recebido)}, ${formatBRL(r.excedente)} a mais que o demonstrativo.`,
      link,
    });
  }
  return alertas;
}

/** Notifica todos os admins. Falha aqui não desfaz o recebimento: só vai para o log. */
async function avisarAdmins(alertas: { mensagem: string; link: string }[]): Promise<void> {
  if (alertas.length === 0) return;
  try {
    const admins = await prisma.usuario.findMany({ where: { role: "admin" }, select: { id: true } });
    if (admins.length === 0) return;
    await prisma.notificacao.createMany({
      data: alertas.flatMap((a) => admins.map((u) => ({ mensagem: a.mensagem, link: a.link, usuarioId: u.id }))),
    });
  } catch (e) {
    console.error("[recebimento-fechamento] falha ao notificar os admins:", e);
  }
}

/** A cobrança do Asaas é de um fechamento? Referência `FEC-…` ou cobrança gravada. */
export async function ehCobrancaDeFechamento(p: { id: string; externalReference?: string | null }): Promise<boolean> {
  if (lerReferenciaExterna(p.externalReference)) return true;
  const c = await prisma.cobrancaFechamento.findUnique({ where: { asaasPaymentId: p.id }, select: { id: true } });
  return c != null;
}

export type ResultadoPagamentoFechamento = {
  acao: "registrado" | "ja_registrado" | "reativado" | "estornado" | "ignorado";
  motivo?: string;
  fechamentoId?: number;
};

/** Fechamento e cobrança de um pagamento do Asaas: pela cobrança gravada ou pela referência. */
async function localizar(tx: Tx, p: AsaasPagamentoDetalhe): Promise<{ fechamentoId: number; cobrancaId: number | null } | null> {
  const cobranca = await tx.cobrancaFechamento.findUnique({
    where: { asaasPaymentId: p.id },
    select: { id: true, fechamentoId: true },
  });
  if (cobranca) return { fechamentoId: cobranca.fechamentoId, cobrancaId: cobranca.id };
  const ref = lerReferenciaExterna(p.externalReference);
  if (!ref) return null;
  const f = await tx.fechamento.findUnique({
    where: { empresaParceiraId_competencia: { empresaParceiraId: ref.empresaId, competencia: ref.competencia } },
    select: { id: true },
  });
  return f ? { fechamentoId: f.id, cobrancaId: null } : null;
}

export async function processarPagamentoFechamento(
  p: AsaasPagamentoDetalhe,
  evento: string | null
): Promise<ResultadoPagamentoFechamento> {
  const pago = ASAAS_PAGO.has(p.status);
  const estorno = ASAAS_ESTORNO.has(p.status);
  if (!pago && !estorno) return { acao: "ignorado", motivo: `status_${p.status}` };

  if (pago) {
    const valor = typeof p.value === "number" && Number.isFinite(p.value) ? Math.round(p.value * 100) / 100 : null;
    if (valor == null || valor <= 0) {
      console.error(`[recebimento-fechamento] cobrança ${p.id} paga sem valor válido (${p.value}); evento ${evento}`);
      return { acao: "ignorado", motivo: "sem_valor" };
    }
    let resultado: ResultadoPagamentoFechamento;
    let recalculo: Recalculo | null = null;
    try {
      ({ resultado, recalculo } = await prisma.$transaction(async (tx) => {
        const alvo = await localizar(tx, p);
        if (!alvo) return { resultado: { acao: "ignorado" as const, motivo: "fechamento_nao_encontrado" }, recalculo: null };
        await travar(tx, alvo.fechamentoId);
        const existente = await tx.recebimentoFechamento.findUnique({
          where: { asaasPaymentId: p.id },
          select: { id: true, status: true, fechamentoId: true },
        });
        let acao: ResultadoPagamentoFechamento["acao"];
        if (existente) {
          if (existente.status !== STATUS_RECEBIMENTO.estornado) {
            return { resultado: { acao: "ja_registrado" as const, fechamentoId: alvo.fechamentoId }, recalculo: null };
          }
          // Disputa revertida: o mesmo pagamento volta a contar (o id é único, não cria outro).
          const r = await tx.recebimentoFechamento.updateMany({
            where: { id: existente.id, status: STATUS_RECEBIMENTO.estornado },
            data: { status: STATUS_RECEBIMENTO.confirmado, estornadoEm: null },
          });
          if (r.count !== 1) return { resultado: { acao: "ja_registrado" as const, fechamentoId: alvo.fechamentoId }, recalculo: null };
          acao = "reativado";
        } else {
          await tx.recebimentoFechamento.create({
            data: {
              fechamentoId: alvo.fechamentoId,
              cobrancaId: alvo.cobrancaId,
              origem: "asaas",
              valor,
              dataRecebimento: dataPura(p.paymentDate ?? p.clientPaymentDate ?? p.confirmedDate),
              asaasPaymentId: p.id,
              status: STATUS_RECEBIMENTO.confirmado,
              confirmadoPor: "asaas",
              confirmadoEm: new Date(),
            },
          });
          acao = "registrado";
        }
        if (alvo.cobrancaId != null) {
          // Cancelada e paga depois também vira paga: é o retrato do que aconteceu com ela.
          await tx.cobrancaFechamento.updateMany({
            where: { id: alvo.cobrancaId, status: { not: STATUS_COBRANCA.paga } },
            data: { status: STATUS_COBRANCA.paga },
          });
        }
        const rec = await recalcularFechamento(tx, alvo.fechamentoId);
        return { resultado: { acao, fechamentoId: alvo.fechamentoId }, recalculo: rec };
      }));
    } catch (e) {
      // Outro processo gravou o mesmo pagamento entre a leitura e o insert.
      if (ehP2002(e)) return { acao: "ja_registrado" };
      throw e;
    }
    if (recalculo) await avisarAdmins(alertasDoRecalculo(recalculo, "recebimento"));
    return resultado;
  }

  // Estorno (ou disputa): o recebimento deste pagamento deixa de contar.
  const { resultado, recalculo } = await prisma.$transaction(async (tx) => {
    const existente = await tx.recebimentoFechamento.findUnique({
      where: { asaasPaymentId: p.id },
      select: { id: true, status: true, fechamentoId: true },
    });
    if (!existente || existente.status !== STATUS_RECEBIMENTO.confirmado) {
      return { resultado: { acao: "ignorado" as const, motivo: existente ? "ja_estornado" : "sem_recebimento" }, recalculo: null };
    }
    await travar(tx, existente.fechamentoId);
    const r = await tx.recebimentoFechamento.updateMany({
      where: { id: existente.id, status: STATUS_RECEBIMENTO.confirmado },
      data: { status: STATUS_RECEBIMENTO.estornado, estornadoEm: new Date() },
    });
    if (r.count !== 1) return { resultado: { acao: "ignorado" as const, motivo: "ja_estornado" }, recalculo: null };
    const rec = await recalcularFechamento(tx, existente.fechamentoId);
    return { resultado: { acao: "estornado" as const, fechamentoId: existente.fechamentoId }, recalculo: rec };
  });
  if (recalculo) await avisarAdmins(alertasDoRecalculo(recalculo, "estorno"));
  return resultado;
}

/** Passo 1 de 2: o recebimento manual entra pendente (não conta até alguém confirmar). */
export async function registrarRecebimentoManual(e: {
  fechamentoId: number;
  valor: number;
  data: Date;
  comprovante: File | null;
  usuario: string | null;
}): Promise<{ recebimentoId: number }> {
  if (!Number.isFinite(e.valor) || Math.round(e.valor * 100) <= 0) throw new Error("Informe um valor recebido maior que zero.");
  const arquivo = e.comprovante && e.comprovante.size > 0 ? await prepararArquivoFinanceiro(e.comprovante) : null;
  if (arquivo && !arquivo.ok) throw new Error(arquivo.erro);

  return prisma.$transaction(async (tx) => {
    await travar(tx, e.fechamentoId);
    const enviadas = await tx.fechamentoVersao.count({ where: { fechamentoId: e.fechamentoId, enviadaEm: { not: null } } });
    if (enviadas === 0) throw new Error("Este fechamento ainda não foi enviado ao RH: não há o que receber.");
    const comprovante = arquivo ? await salvarArquivoFinanceiro(tx, arquivo, e.usuario) : null;
    const r = await tx.recebimentoFechamento.create({
      data: {
        fechamentoId: e.fechamentoId,
        origem: "manual",
        valor: Math.round(e.valor * 100) / 100,
        dataRecebimento: e.data,
        status: STATUS_RECEBIMENTO.pendente,
        registradoPor: e.usuario,
        comprovanteArquivoId: comprovante?.id ?? null,
      },
      select: { id: true },
    });
    return { recebimentoId: r.id };
  });
}

/** Passo 2 de 2: quem conferiu o extrato confirma — aí conta e pode liquidar. */
export async function confirmarRecebimento(e: { recebimentoId: number; usuario: string | null }): Promise<void> {
  const recalculo = await prisma.$transaction(async (tx) => {
    const rec = await tx.recebimentoFechamento.findUnique({
      where: { id: e.recebimentoId },
      select: { id: true, fechamentoId: true, status: true, origem: true },
    });
    if (!rec) throw new Error("Recebimento não encontrado.");
    if (rec.status !== STATUS_RECEBIMENTO.pendente) throw new Error("Só um recebimento pendente pode ser confirmado. Recarregue.");
    await travar(tx, rec.fechamentoId);
    const r = await tx.recebimentoFechamento.updateMany({
      where: { id: rec.id, status: STATUS_RECEBIMENTO.pendente },
      data: { status: STATUS_RECEBIMENTO.confirmado, confirmadoPor: e.usuario, confirmadoEm: new Date() },
    });
    if (r.count !== 1) throw new Error(ERRO_MUDOU);
    return recalcularFechamento(tx, rec.fechamentoId);
  });
  if (recalculo) await avisarAdmins(alertasDoRecalculo(recalculo, "recebimento"));
}

/**
 * Estorno pela tela: só do recebimento manual (pendente = descartar; confirmado = deixa de contar
 * e, se tinha liquidado, desfaz). O do Asaas é estornado pelo próprio Asaas (webhook).
 */
export async function estornarRecebimento(e: { recebimentoId: number; usuario: string | null }): Promise<void> {
  const recalculo = await prisma.$transaction(async (tx) => {
    const rec = await tx.recebimentoFechamento.findUnique({
      where: { id: e.recebimentoId },
      select: { id: true, fechamentoId: true, status: true, origem: true },
    });
    if (!rec) throw new Error("Recebimento não encontrado.");
    if (rec.origem !== "manual") {
      throw new Error("Recebimento do Pix do Asaas não é estornado aqui: o estorno chega pelo próprio Asaas.");
    }
    if (rec.status === STATUS_RECEBIMENTO.estornado) throw new Error("Este recebimento já foi estornado. Recarregue.");
    await travar(tx, rec.fechamentoId);
    const r = await tx.recebimentoFechamento.updateMany({
      where: { id: rec.id, status: rec.status },
      data: { status: STATUS_RECEBIMENTO.estornado, estornadoEm: new Date() },
    });
    if (r.count !== 1) throw new Error(ERRO_MUDOU);
    return rec.status === STATUS_RECEBIMENTO.confirmado ? recalcularFechamento(tx, rec.fechamentoId) : null;
  });
  if (recalculo) await avisarAdmins(alertasDoRecalculo(recalculo, "estorno"));
}

/** Recalcula fora de um recebimento (depois do envio, quando o já recebido cobre a versão nova). */
export async function recalcularEAvisar(fechamentoId: number): Promise<Recalculo | null> {
  const r = await prisma.$transaction(async (tx) => {
    await travar(tx, fechamentoId);
    return recalcularFechamento(tx, fechamentoId);
  });
  if (r) await avisarAdmins(alertasDoRecalculo(r, "recebimento"));
  return r;
}
