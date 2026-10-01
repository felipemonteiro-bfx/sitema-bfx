/**
 * Regras puras do recebimento do fechamento (spec 2026-09-30 §3.6, §5.2 e §5.3): a referência
 * externa da cobrança Pix, a situação do fechamento pelos recebimentos e a validação do
 * recebimento manual. Sem banco.
 *
 * Dinheiro em centavos inteiros; tolerância de 1 centavo.
 */

import { hojeDataPura } from "@/lib/data-pura";
import { parseDataIsoUtc } from "@/lib/data-input";

const PREFIXO = "FEC";
const TOLERANCIA_CENTAVOS = 1;

const centavos = (v: number) => Math.round(v * 100);

const soDigitos = (s: string) => s.length > 0 && /^\d+$/.test(s);

/** `FEC-{empresaId}-{AAAA-MM}-v{versao}`, ex.: "FEC-7-2026-10-v2". */
export function referenciaExterna(empresaId: number, competencia: string, versao: number): string {
  return `${PREFIXO}-${empresaId}-${competencia}-v${versao}`;
}

/**
 * Lê a referência gravada na cobrança Asaas. Qualquer coisa fora do formato exato (inclusive o
 * id de venda que o fluxo de boleto usa) devolve null — o webhook segue o caminho atual.
 */
export function lerReferenciaExterna(
  ref: string | null | undefined,
): { empresaId: number; competencia: string; versao: number } | null {
  if (!ref) return null;
  const partes = ref.split("-");
  if (partes.length !== 5) return null;
  const [prefixo, empresa, ano, mes, versaoTxt] = partes;
  if (prefixo !== PREFIXO) return null;
  if (!soDigitos(empresa) || !soDigitos(ano) || ano.length !== 4 || !soDigitos(mes) || mes.length !== 2) return null;
  if (!versaoTxt.startsWith("v") || !soDigitos(versaoTxt.slice(1))) return null;
  const empresaId = Number(empresa);
  const numeroMes = Number(mes);
  const versao = Number(versaoTxt.slice(1));
  if (!Number.isSafeInteger(empresaId) || empresaId < 1) return null;
  if (numeroMes < 1 || numeroMes > 12) return null;
  if (!Number.isSafeInteger(versao) || versao < 1) return null;
  return { empresaId, competencia: `${ano}-${mes}`, versao };
}

export type StatusRecebimento = "enviado" | "pago_parcial" | "pago";

/**
 * Situação do fechamento pelos recebimentos. Só `confirmado` conta (pendente e estornado não).
 * Falta de até 1 centavo conta como pago; sobra de até 1 centavo não vira excedente.
 * `totalFinal` ≤ 0 não tem o que cobrar: sai `pago`.
 */
export function situacaoRecebimento(
  totalFinal: number,
  recebimentos: { valor: number; status: string }[],
): { recebido: number; saldo: number; excedente: number; status: StatusRecebimento } {
  const totalC = centavos(totalFinal);
  const recebidoC = recebimentos
    .filter((r) => r.status === "confirmado")
    .reduce((soma, r) => soma + centavos(r.valor), 0);
  const falta = totalC - recebidoC;
  const sobra = recebidoC - totalC;
  const saldo = falta > TOLERANCIA_CENTAVOS ? falta / 100 : 0;
  const excedente = sobra > TOLERANCIA_CENTAVOS ? sobra / 100 : 0;
  const status: StatusRecebimento =
    falta <= TOLERANCIA_CENTAVOS ? "pago" : recebidoC > 0 ? "pago_parcial" : "enviado";
  return { recebido: recebidoC / 100, saldo, excedente, status };
}

// pt-BR: "1500,5", "1.500,50", "1.234.567,89" — vírgula decimal, ponto só como milhar.
const VALOR_PT_BR = /^(\d{1,3}(\.\d{3})+|\d+),\d{1,2}$/;
// Campo numérico: "1500", "1500.5", "1500.50". "1.500" (milhar ou 1,5?) é ambíguo e cai fora.
const VALOR_PONTO = /^\d+(\.\d{1,2})?$/;

/** Número ou texto num dos dois formatos acima; qualquer outra coisa é ilegível (null). */
function lerValor(valor: unknown): number | null {
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/^R\$\s*/, "");
  if (VALOR_PT_BR.test(limpo)) return Number(limpo.replace(/\./g, "").replace(",", "."));
  if (VALOR_PONTO.test(limpo)) return Number(limpo);
  return null;
}

/** Date válida ou "AAAA-MM-DD" → data pura (meia-noite UTC). */
function lerData(data: unknown): Date | undefined {
  if (data instanceof Date) {
    return Number.isNaN(data.getTime()) ? undefined : parseDataIsoUtc(data.toISOString().slice(0, 10));
  }
  return typeof data === "string" ? parseDataIsoUtc(data.trim()) : undefined;
}

/**
 * Valida o recebimento manual (passo 1 de 2: fica `pendente` até alguém confirmar). Valor > 0
 * arredondado a centavos; data pura, não no futuro (dia de Manaus).
 */
export function validarRecebimentoManual(
  input: { valor: unknown; data: unknown },
  agora: Date = new Date(),
): { ok: true; valor: number; data: Date } | { ok: false; erro: string } {
  const valor = lerValor(input.valor);
  if (valor == null && typeof input.valor === "string") {
    return { ok: false, erro: "Valor inválido. Use vírgula para os centavos (ex.: 1.500,00)." };
  }
  if (valor == null || !Number.isFinite(valor) || centavos(valor) <= 0) {
    return { ok: false, erro: "Informe um valor recebido maior que zero." };
  }
  const data = lerData(input.data);
  if (!data) return { ok: false, erro: "Informe a data do recebimento." };
  // "AAAA-MM-DD" comparado como texto já é cronológico.
  if (data.toISOString().slice(0, 10) > hojeDataPura(agora)) {
    return { ok: false, erro: "A data do recebimento não pode ser no futuro." };
  }
  return { ok: true, valor: centavos(valor) / 100, data };
}
