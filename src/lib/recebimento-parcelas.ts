import { formatarDataPura } from "@/lib/data-pura";

/** Parcela como a ficha da venda mostra no "Recebimento das parcelas" (datas "YYYY-MM-DD"). */
export type ParcelaRecebimento = {
  id: number;
  numeroParcela: number;
  totalParcelas: number;
  dataVencimento: string;
  valorParcela: number;
  paga: boolean;
  dataPagamento: string | null;
  origemPagamento: string | null;
  baixaPor: string | null;
};

export type LinhaRecebimento = {
  situacao: "paga" | "vencida" | "em_aberto";
  diasAtraso: number;
  origemTitulo: string | null;
  origemDetalhe: string | null;
  /** Baixa automática (Asaas ou Prudent) só é desfeita com confirmação. */
  desfazerPedeConfirmacao: boolean;
  /** A tela oferece "Desfazer"? Parcela paga no Pix do fechamento só é desfeita pelo fechamento. */
  podeDesfazer: boolean;
};

const DIA_MS = 86_400_000;

function diasEntre(inicio: string, fim: string): number {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / DIA_MS);
}

/**
 * Visão da BFX (a do admin na ficha da venda): antecipada na Prudent conta como paga. Para o
 * cliente a regra é outra — ver `situacaoParaCliente` em `src/lib/baixa-parcelas.ts`.
 */
export function linhaRecebimento(p: ParcelaRecebimento, hoje: string): LinhaRecebimento {
  if (p.paga) {
    const data = p.dataPagamento ? formatarDataPura(p.dataPagamento) : null;
    const [titulo, detalhe] =
      p.origemPagamento === "prudent"
        ? ["Prudent", data ? `Antecipada em ${data}` : "Antecipada"]
        : p.origemPagamento === "pix_fechamento"
          ? ["Pago no fechamento", data ? `Pix da empresa em ${data}` : "Pix da empresa"]
          : p.origemPagamento === "asaas"
            ? ["Asaas", data ? `Boleto pago em ${data}` : "Boleto pago"]
            : p.origemPagamento === "manual"
              ? ["Manual", [data, p.baixaPor ? `por ${p.baixaPor}` : null].filter(Boolean).join(" · ") || null]
              : ["Baixa", data];
    return {
      situacao: "paga",
      diasAtraso: 0,
      origemTitulo: titulo,
      origemDetalhe: detalhe,
      desfazerPedeConfirmacao: p.origemPagamento === "asaas" || p.origemPagamento === "prudent",
      // O recebimento é do fechamento: desfazer é estornar o recebimento lá.
      podeDesfazer: p.origemPagamento !== "pix_fechamento",
    };
  }
  const atraso = diasEntre(p.dataVencimento, hoje);
  return {
    situacao: atraso > 0 ? "vencida" : "em_aberto",
    diasAtraso: Math.max(0, atraso),
    origemTitulo: null,
    origemDetalhe: null,
    desfazerPedeConfirmacao: false,
    podeDesfazer: false,
  };
}

/**
 * "n/total" da ficha. O cabeçalho da venda pode discordar das linhas (ex.: vendas 51–53, com
 * parcelas duplicadas): o total nunca fica abaixo do maior número de parcela, para não mostrar "2/1".
 */
export function totalParcelasExibido(parcelasDaVenda: number | null, numeros: number[]): number {
  return Math.max(parcelasDaVenda || 0, ...numeros, 1);
}

/** Mesmo número de parcela em duas linhas: o "Recebido de" soma as duas, e a tela avisa. */
export function temParcelaRepetida(parcelas: Pick<ParcelaRecebimento, "numeroParcela">[]): boolean {
  return new Set(parcelas.map((p) => p.numeroParcela)).size !== parcelas.length;
}

export function resumoRecebimento(parcelas: ParcelaRecebimento[]): { recebido: number; total: number } {
  const centavos = (n: number) => Math.round(n * 100);
  const total = parcelas.reduce((s, p) => s + centavos(p.valorParcela), 0);
  const recebido = parcelas.filter((p) => p.paga).reduce((s, p) => s + centavos(p.valorParcela), 0);
  return { recebido: recebido / 100, total: total / 100 };
}
