/**
 * Cobrança Pix do fechamento no Asaas (Fase 6; spec 2026-09-30 §3.6 e §5.2).
 *
 * - `encerrarCobrancasAnteriores`: antes de enviar a versão N+1, cada cobrança ativa de versão
 *   anterior é conferida no Asaas. Paga → vira recebimento (mesma função do webhook), não é
 *   cancelada. Senão → DELETE no Asaas e `cancelada` com o status no where. Se pagarem entre a
 *   consulta e o DELETE, o Asaas recusa remover cobrança recebida: o erro sobe e o envio para.
 * - `garantirCobrancaPix`: a cobrança da versão enviada, pelo saldo (valor final − recebido
 *   confirmado). Saldo ≤ 0 → nenhuma. A ativa da mesma versão com o mesmo valor é reaproveitada
 *   (reenvio depois de falha no e-mail). A cobrança é gravada logo depois de criada e só então o
 *   QR é buscado: falha no QR não deixa cobrança órfã no Asaas.
 *
 * Uma cobrança ativa por fechamento também é garantida no banco (índice parcial da migração
 * `20260930160000_cobranca_recebimento_fechamento`).
 */
import { prisma } from "@/lib/db";
import { cancelPayment, createPixPayment, getPayment, getPixQrCode, type AsaasConfig } from "@/lib/asaas";
import { ASAAS_ESTORNO, ASAAS_PAGO, STATUS_COBRANCA, STATUS_RECEBIMENTO, processarPagamentoFechamento } from "@/lib/recebimento-fechamento-db";
import { referenciaExterna, situacaoRecebimento } from "@/lib/recebimento-fechamento";
import { rotuloCompetencia } from "@/lib/fechamento";
import { diaDaCompetencia } from "@/lib/fechamento-db";

const centavos = (v: number) => Math.round(v * 100);

type CobrancaAtiva = {
  id: number;
  versaoId: number;
  asaasPaymentId: string;
  valor: number;
  vencimento: Date;
  externalReference: string;
  pixCopiaECola: string | null;
  qrCodePng: Uint8Array | null;
};

const SELECT_ATIVA = {
  id: true,
  versaoId: true,
  asaasPaymentId: true,
  valor: true,
  vencimento: true,
  externalReference: true,
  pixCopiaECola: true,
  qrCodePng: true,
} as const;

/** Paga → recebimento; senão → cancelada (no Asaas e no banco). */
async function encerrar(c: CobrancaAtiva, config: AsaasConfig): Promise<void> {
  const p = await getPayment(config, c.asaasPaymentId);
  if (ASAAS_PAGO.has(p.status) || ASAAS_ESTORNO.has(p.status)) {
    // Dinheiro entrou (ou entrou e voltou): o processamento do webhook registra e marca a cobrança.
    await processarPagamentoFechamento(p, null);
    if (ASAAS_PAGO.has(p.status)) {
      // O processamento já marca paga; aqui de novo para o caso de ele ignorar o pagamento (ex.:
      // sem valor): cobrança paga não pode ficar ativa travando o próximo envio.
      await prisma.cobrancaFechamento.updateMany({
        where: { id: c.id, status: STATUS_COBRANCA.ativa },
        data: { status: STATUS_COBRANCA.paga },
      });
      return;
    }
  } else if (!p.deleted) {
    await cancelPayment(config, c.asaasPaymentId);
  }
  await prisma.cobrancaFechamento.updateMany({
    where: { id: c.id, status: STATUS_COBRANCA.ativa },
    data: { status: STATUS_COBRANCA.cancelada, canceladaEm: new Date() },
  });
}

export async function encerrarCobrancasAnteriores(e: { fechamentoId: number; versaoId: number; config: AsaasConfig }): Promise<void> {
  const ativas = await prisma.cobrancaFechamento.findMany({
    where: { fechamentoId: e.fechamentoId, status: STATUS_COBRANCA.ativa, versaoId: { not: e.versaoId } },
    select: SELECT_ATIVA,
    orderBy: { id: "asc" },
  });
  for (const c of ativas) await encerrar(c, e.config);
}

export type PixGerado = {
  cobrancaId: number;
  asaasPaymentId: string;
  copiaECola: string;
  qrPng: Uint8Array;
  valor: number;
  vencimento: Date;
  identificacao: string;
};

async function saldoAtual(fechamentoId: number, totalFinal: number): Promise<{ recebido: number; saldo: number }> {
  const recebimentos = await prisma.recebimentoFechamento.findMany({
    where: { fechamentoId, status: STATUS_RECEBIMENTO.confirmado },
    select: { valor: true, status: true },
  });
  const s = situacaoRecebimento(totalFinal, recebimentos);
  return { recebido: s.recebido, saldo: s.saldo };
}

/** QR gravado, ou busca no Asaas e grava. */
async function comQr(c: CobrancaAtiva, config: AsaasConfig): Promise<PixGerado> {
  let copiaECola = c.pixCopiaECola;
  let qrPng = c.qrCodePng;
  if (!copiaECola || !qrPng || qrPng.length === 0) {
    const qr = await getPixQrCode(config, c.asaasPaymentId);
    const png = new Uint8Array(Buffer.from(qr.encodedImage, "base64"));
    copiaECola = qr.payload;
    qrPng = png;
    await prisma.cobrancaFechamento.update({ where: { id: c.id }, data: { pixCopiaECola: copiaECola, qrCodePng: png } });
  }
  return {
    cobrancaId: c.id,
    asaasPaymentId: c.asaasPaymentId,
    copiaECola,
    qrPng,
    valor: c.valor,
    vencimento: c.vencimento,
    identificacao: c.externalReference,
  };
}

export async function garantirCobrancaPix(e: {
  fechamentoId: number;
  versaoId: number;
  versao: number;
  empresaId: number;
  empresaNome: string;
  competencia: string;
  customerId: string;
  totalFinal: number;
  diaPix: number;
  config: AsaasConfig;
  /** "AAAA-MM-DD" de hoje em Manaus. */
  hoje: string;
}): Promise<{ pix: PixGerado | null; recebido: number; saldo: number }> {
  let { recebido, saldo } = await saldoAtual(e.fechamentoId, e.totalFinal);

  const daVersao = await prisma.cobrancaFechamento.findMany({
    where: { fechamentoId: e.fechamentoId, status: STATUS_COBRANCA.ativa, versaoId: e.versaoId },
    select: SELECT_ATIVA,
    orderBy: { id: "asc" },
  });
  for (const c of daVersao) {
    if (saldo > 0 && centavos(c.valor) === centavos(saldo)) return { pix: await comQr(c, e.config), recebido, saldo };
    await encerrar(c, e.config);
    ({ recebido, saldo } = await saldoAtual(e.fechamentoId, e.totalFinal));
  }
  if (saldo <= 0) return { pix: null, recebido, saldo: 0 };

  const diaPix = diaDaCompetencia(e.competencia, e.diaPix).toISOString().slice(0, 10);
  const vencimentoIso = diaPix < e.hoje ? e.hoje : diaPix;
  const vencimento = new Date(`${vencimentoIso}T00:00:00.000Z`);
  const ref = referenciaExterna(e.empresaId, e.competencia, e.versao);

  const criada = await createPixPayment(
    {
      customerId: e.customerId,
      value: saldo,
      dueDate: vencimentoIso,
      description: `Demonstrativo BFX de ${rotuloCompetencia(e.competencia)} — ${e.empresaNome} (versão ${e.versao})`,
      externalReference: ref,
    },
    e.config
  );

  let cobrancaId: number;
  try {
    const row = await prisma.cobrancaFechamento.create({
      data: {
        fechamentoId: e.fechamentoId,
        versaoId: e.versaoId,
        asaasPaymentId: criada.id,
        externalReference: ref,
        valor: saldo,
        vencimento,
        status: STATUS_COBRANCA.ativa,
      },
      select: { id: true },
    });
    cobrancaId = row.id;
  } catch (erro) {
    console.error("[cobranca-fechamento] cobrança criada no Asaas e não gravada; cancelando:", erro);
    await cancelPayment(e.config, criada.id).catch((x) =>
      console.error(`[cobranca-fechamento] cobrança ${criada.id} ficou no Asaas sem registro:`, x)
    );
    throw new Error("Outra operação está gerando o Pix deste fechamento. Recarregue.");
  }

  const pix = await comQr(
    {
      id: cobrancaId,
      versaoId: e.versaoId,
      asaasPaymentId: criada.id,
      valor: saldo,
      vencimento,
      externalReference: ref,
      pixCopiaECola: null,
      qrCodePng: null,
    },
    e.config
  );
  return { pix, recebido, saldo };
}

/**
 * Rede de segurança do webhook (que responde 200 mesmo quando falha e não é reenviado): consulta no
 * Asaas cada cobrança ativa e processa as pagas ou estornadas, pela mesma função idempotente do
 * webhook. Pendente ou vencida fica como está (nada é cancelado aqui). Erro numa cobrança não para
 * as outras. Chamada pelo cron de alertas antes do alerta "Pix não entrou".
 */
export async function sincronizarCobrancasAtivas(config: AsaasConfig): Promise<{ cobrancas: number; processadas: number; erros: number }> {
  const ativas = await prisma.cobrancaFechamento.findMany({
    where: { status: STATUS_COBRANCA.ativa },
    select: { id: true, asaasPaymentId: true },
    orderBy: { id: "asc" },
  });
  const r = { cobrancas: ativas.length, processadas: 0, erros: 0 };
  for (const c of ativas) {
    try {
      const p = await getPayment(config, c.asaasPaymentId);
      if (!ASAAS_PAGO.has(p.status) && !ASAAS_ESTORNO.has(p.status)) continue;
      await processarPagamentoFechamento(p, null);
      r.processadas += 1;
    } catch (e) {
      r.erros += 1;
      console.error(`[cobranca-fechamento] falha ao sincronizar a cobrança ${c.asaasPaymentId}:`, e);
    }
  }
  return r;
}
