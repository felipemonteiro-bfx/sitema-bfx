/**
 * Alertas de obrigações da Prudent (2026-09-30, Fase 4; spec §6) — puros. O cron
 * `api/cron/alertas-admin` lê os boletos e cria as notificações com a mesma idempotência de 20h
 * dos outros alertas. Só boleto que a BFX paga (`direcionamento = "bfx"`) alerta.
 *
 * O e-mail ao financeiro (`Config.emailFinanceiro`) é do alerta "Pix não entrou", que precisa do
 * fechamento (Fase 6). Aqui só a validação do campo.
 */
import { DIRECIONAMENTO, STATUS_BOLETO, saldoDoBoleto } from "@/lib/boleto-prudent";
import { assertSafeEmailAddresses } from "@/lib/email-endereco";

export const PREFIXO_BOLETO = {
  vencendo: "[Alerta] Boleto Prudent vencendo",
  semDocumento: "[Alerta] Boleto Prudent sem documento",
} as const;

/** Status que o cron precisa ler: os vivos ainda não quitados. */
export const STATUS_ALERTAVEIS = [STATUS_BOLETO.aguardandoDocumento, STATUS_BOLETO.aPagar, STATUS_BOLETO.pagoParcial];

export const DIAS_AVISO_VENCENDO = 3;
export const DIAS_AVISO_SEM_DOCUMENTO = 5;

type BoletoAlerta = {
  status: string;
  direcionamento: string;
  vencimento: Date;
  vencimentoDocumento: Date | null;
  valorEsperado: number;
  valorDocumento: number | null;
  pagamentos: { valorPrincipal: number; estornadoEm: Date | null }[];
};

export type AlertaObrigacao = { prefixo: string; mensagem: string; link: string; contagem: number };

const DIA_MS = 86_400_000;
const diaUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const ddmm = (ms: number) => new Date(ms).toISOString().slice(5, 10).split("-").reverse().join("/");
const reais = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** `hoje` é a data pura do dia em Manaus (meia-noite UTC). */
export function alertasDeBoletos(boletos: BoletoAlerta[], hoje: Date): AlertaObrigacao[] {
  const inicio = diaUtc(hoje);
  const limiteVencendo = inicio + DIAS_AVISO_VENCENDO * DIA_MS;
  const limiteSemDocumento = inicio + DIAS_AVISO_SEM_DOCUMENTO * DIA_MS;
  const daBfx = boletos.filter((b) => b.direcionamento === DIRECIONAMENTO.bfx);

  const vencendo = daBfx.filter(
    (b) =>
      (b.status === STATUS_BOLETO.aPagar || b.status === STATUS_BOLETO.pagoParcial) &&
      diaUtc(b.vencimentoDocumento ?? b.vencimento) <= limiteVencendo &&
      saldoDoBoleto(b, b.pagamentos) > 0
  );
  const semDocumento = daBfx.filter(
    (b) => b.status === STATUS_BOLETO.aguardandoDocumento && diaUtc(b.vencimento) <= limiteSemDocumento
  );

  const alertas: AlertaObrigacao[] = [];
  if (vencendo.length > 0) {
    const centavos = vencendo.reduce((s, b) => s + Math.round(saldoDoBoleto(b, b.pagamentos) * 100), 0);
    alertas.push({
      prefixo: PREFIXO_BOLETO.vencendo,
      mensagem: `${PREFIXO_BOLETO.vencendo}: ${vencendo.length} boleto(s) da Prudent vencem até ${ddmm(limiteVencendo)} ou já venceram — ${reais(centavos / 100)} a pagar.`,
      link: "/obrigacoes",
      contagem: vencendo.length,
    });
  }
  if (semDocumento.length > 0) {
    alertas.push({
      prefixo: PREFIXO_BOLETO.semDocumento,
      mensagem: `${PREFIXO_BOLETO.semDocumento}: ${semDocumento.length} boleto(s) vencem até ${ddmm(limiteSemDocumento)} e ainda não têm o documento da Prudent.`,
      link: "/obrigacoes",
      contagem: semDocumento.length,
    });
  }
  return alertas;
}

/** Campo "E-mail do financeiro" da configuração: vazio apaga; senão um endereço válido. */
export function normalizarEmailFinanceiro(entrada: unknown): { ok: true; valor: string | null } | { ok: false; erro: string } {
  const valor = String(entrada ?? "").trim();
  if (!valor) return { ok: true, valor: null };
  try {
    assertSafeEmailAddresses([valor]);
  } catch {
    return { ok: false, erro: "E-mail do financeiro inválido." };
  }
  return { ok: true, valor };
}
