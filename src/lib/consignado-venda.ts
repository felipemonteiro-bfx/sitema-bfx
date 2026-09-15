import { FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import { faixaDePct, type FaixaConsignado } from "@/lib/consignado";

export type DecisaoConsignado =
  | {
      ok: true;
      excedeuLimite: 0 | 1;
      pctPosterior: number | null;
      faixaPosterior: FaixaConsignado;
    }
  | {
      ok: false;
      motivo: "precisa_confirmacao";
      pctPosterior: number;
    };

function ehFolha(input: { formaPagamento?: string | null; descontoEmFolha: boolean }): boolean {
  return input.descontoEmFolha || input.formaPagamento === FORMA_PAGAMENTO.DESCONTO_FOLHA;
}

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function decidirConfirmacaoConsignado(input: {
  formaPagamento?: string | null;
  descontoEmFolha: boolean;
  renda: number | null;
  tomadoAtual: number;
  valorParcelaNova: number;
  confirmouLimiteConsignado: boolean;
}): DecisaoConsignado {
  if (!ehFolha(input)) {
    return { ok: true, excedeuLimite: 0, pctPosterior: null, faixaPosterior: "ok" };
  }
  if (input.renda == null || input.renda <= 0) {
    return { ok: true, excedeuLimite: 0, pctPosterior: null, faixaPosterior: "renda_pendente" };
  }
  const pctPosterior = arredondar2(((input.tomadoAtual + input.valorParcelaNova) / input.renda) * 100);
  const faixaPosterior = faixaDePct(pctPosterior);
  if (pctPosterior >= 30 && !input.confirmouLimiteConsignado) {
    return { ok: false, motivo: "precisa_confirmacao", pctPosterior };
  }
  return {
    ok: true,
    excedeuLimite: pctPosterior >= 30 ? 1 : 0,
    pctPosterior,
    faixaPosterior,
  };
}
