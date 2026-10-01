/**
 * Pix do fechamento na agenda (Fase 6; spec 2026-09-30 §6) — puro.
 *
 * - O dia do Pix de um fechamento é o `diaPix` da regra na competência, ou o vencimento da
 *   cobrança ativa quando é depois (enviado atrasado, a cobrança vence no dia do envio).
 * - Pix atrasado: fechamento `enviado`/`pago_parcial`, com saldo, e o dia do Pix já passou →
 *   alerta aos admins e e-mail ao financeiro, com o quanto a BFX cobre em boletos Prudent daquele
 *   fechamento com capital próprio (boletos `bfx` vivos ainda não pagos das parcelas reservadas).
 * - Pix esperado: o saldo de cada fechamento enviado/pago em parte entra na projeção de caixa no
 *   dia do Pix.
 *
 * `hoje` é a data pura do dia em Manaus (meia-noite UTC).
 */
import { DIRECIONAMENTO, STATUS_BOLETO, saldoDoBoleto } from "@/lib/boleto-prudent";
import { STATUS_FECHAMENTO, rotuloCompetencia } from "@/lib/fechamento";
import { situacaoRecebimento } from "@/lib/recebimento-fechamento";
import { escaparHtml } from "@/lib/html";
import { formatBRL } from "@/lib/utils";

export type BoletoDoFechamento = {
  id: number;
  status: string;
  direcionamento: string;
  valorEsperado: number;
  valorDocumento: number | null;
  pagamentos: { valorPrincipal: number; estornadoEm: Date | null }[];
};

export type FechamentoPix = {
  id: number;
  empresa: string;
  competencia: string;
  status: string;
  /** Valor final da versão atual; null se a versão atual não existe. */
  totalFinal: number | null;
  recebimentos: { valor: number; status: string }[];
  dataPix: Date;
  /** Boletos das parcelas reservadas (pode repetir o mesmo boleto). */
  boletos: BoletoDoFechamento[];
};

export const PREFIXO_PIX_ATRASADO = "[Alerta] Pix do fechamento não entrou";

const AGUARDANDO: string[] = [STATUS_FECHAMENTO.enviado, STATUS_FECHAMENTO.pagoParcial];
const diaUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const ddmm = (d: Date) => d.toISOString().slice(5, 10).split("-").reverse().join("/");

/** Saldo do Pix, quanto a BFX cobre em boletos e se o dia do Pix passou sem o dinheiro. */
export function situacaoPixFechamento(f: FechamentoPix, hoje: Date): { saldo: number; boletosBfx: number; atrasado: boolean } {
  const saldo = f.totalFinal != null && f.totalFinal > 0 ? situacaoRecebimento(f.totalFinal, f.recebimentos).saldo : 0;
  const vistos = new Set<number>();
  let centavos = 0;
  for (const b of f.boletos) {
    if (vistos.has(b.id)) continue;
    vistos.add(b.id);
    if (b.direcionamento !== DIRECIONAMENTO.bfx) continue;
    if (b.status === STATUS_BOLETO.pago || b.status === STATUS_BOLETO.substituido || b.status === STATUS_BOLETO.cancelado) continue;
    centavos += Math.round(saldoDoBoleto(b, b.pagamentos) * 100);
  }
  const atrasado = AGUARDANDO.includes(f.status) && saldo > 0 && diaUtc(f.dataPix) < diaUtc(hoje);
  return { saldo, boletosBfx: centavos / 100, atrasado };
}

export type PixAtrasado = {
  fechamentoId: number;
  empresa: string;
  competencia: string;
  dataPix: Date;
  saldo: number;
  boletosBfx: number;
};

export function pixAtrasados(fechamentos: FechamentoPix[], hoje: Date): PixAtrasado[] {
  return fechamentos.flatMap((f) => {
    const s = situacaoPixFechamento(f, hoje);
    return s.atrasado
      ? [{ fechamentoId: f.id, empresa: f.empresa, competencia: f.competencia, dataPix: f.dataPix, saldo: s.saldo, boletosBfx: s.boletosBfx }]
      : [];
  });
}

/** Notificação: o prefixo leva o id (idempotência de 20h por fechamento). */
export function alertaPixAtrasado(p: PixAtrasado): { prefixo: string; mensagem: string; link: string } {
  const prefixo = `${PREFIXO_PIX_ATRASADO} (#${p.fechamentoId})`;
  const boletos = p.boletosBfx > 0 ? ` A BFX cobre ${formatBRL(p.boletosBfx)} em boletos Prudent com capital próprio.` : "";
  return {
    prefixo,
    mensagem: `${prefixo}: ${p.empresa} — ${rotuloCompetencia(p.competencia)}. O dia do Pix (${ddmm(p.dataPix)}) passou e faltam ${formatBRL(p.saldo)}.${boletos}`,
    link: `/fechamento/${p.fechamentoId}`,
  };
}

/** E-mail ao financeiro (`Config.emailFinanceiro`). Tudo que vem do cadastro é escapado. */
export function emailPixAtrasado(p: PixAtrasado, linkBase = ""): { subject: string; html: string } {
  const quem = `${p.empresa} — ${rotuloCompetencia(p.competencia)}`;
  const link = `${linkBase}/fechamento/${p.fechamentoId}`;
  return {
    subject: `Pix não entrou — ${quem}`,
    html: `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff">
<p style="margin:0 0 16px">O Pix do fechamento de <strong>${escaparHtml(quem)}</strong> não entrou e o dia ${escaparHtml(ddmm(p.dataPix))} passou.</p>
<p style="margin:0 0 4px;font-size:13px;color:#4b5563">Falta receber</p>
<p style="margin:0 0 16px;font-size:24px;font-weight:bold">${escaparHtml(formatBRL(p.saldo))}</p>
<p style="margin:0 0 4px;font-size:13px;color:#4b5563">Boletos Prudent dessas parcelas que a BFX cobre com capital próprio</p>
<p style="margin:0 0 16px;font-size:18px;font-weight:bold">${escaparHtml(formatBRL(p.boletosBfx))}</p>
<p style="margin:0">Fechamento: ${escaparHtml(link)}</p>
</body></html>`,
  };
}

/** Entradas esperadas da projeção de caixa: o saldo de cada fechamento aguardando o Pix. */
export function pixEsperados(fechamentos: FechamentoPix[]): { data: Date; valor: number }[] {
  return fechamentos.flatMap((f) => {
    if (!AGUARDANDO.includes(f.status)) return [];
    const { saldo } = situacaoPixFechamento(f, f.dataPix);
    return saldo > 0 ? [{ data: f.dataPix, valor: saldo }] : [];
  });
}
