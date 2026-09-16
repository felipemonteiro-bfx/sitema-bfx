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

/** Resposta de `GET /api/clientes/[id]/limite` que o card da venda rápida lê. */
export type LimiteClientePayload = {
  renda: number;
  margemTotal: number;
  comprometimentoAtual: number;
  margemDisponivel: number;
  tetoParcelaMax?: number;
  tomadoConsignado?: number;
  tomadoFolhaBfx?: number;
  pctConsignado?: number | null;
  faixaConsignado?: string | null;
  margemFolhaTotal?: number;
  margemFolhaDisponivel?: number;
};

export type EstadoCardLimite = {
  tom: "ok" | "alerta" | "limite" | "renda_pendente" | "excede";
  /** `null` = não exibir (renda pendente em folha). */
  limite: number | null;
  comprometido: number;
  disponivel: number | null;
  /** Preenchimento da barra, 0–100; `null` = sem barra. */
  pctBarra: number | null;
  /** % de consignado atual; só no caminho de folha. */
  pctConsignado: number | null;
};

function pctDaBarra(comprometido: number, limite: number): number {
  return limite > 0 ? Math.min(100, (comprometido / limite) * 100) : 0;
}

/**
 * Tom e números do card "Limite e Margem". Em folha usa as chaves de consignado e a
 * mesma conta de `decidirConfirmacaoConsignado`, para o card e o diálogo de
 * confirmação nunca discordarem. Nas outras formas segue as chaves antigas.
 */
export function estadoCardLimite(input: {
  descontoEmFolha: boolean;
  limite: LimiteClientePayload;
  valorParcela: number;
}): EstadoCardLimite {
  const { limite, valorParcela } = input;

  if (!input.descontoEmFolha) {
    return {
      tom: valorParcela > limite.margemDisponivel + 1 ? "excede" : "ok",
      limite: limite.margemTotal,
      comprometido: limite.comprometimentoAtual,
      disponivel: limite.margemDisponivel,
      pctBarra: pctDaBarra(limite.comprometimentoAtual, limite.margemTotal),
      pctConsignado: null,
    };
  }

  const tomado = (limite.tomadoConsignado ?? 0) + (limite.tomadoFolhaBfx ?? 0);
  if (!(limite.renda > 0)) {
    return {
      tom: "renda_pendente",
      limite: null,
      comprometido: tomado,
      disponivel: null,
      pctBarra: null,
      pctConsignado: null,
    };
  }

  const limiteFolha = limite.margemFolhaTotal ?? limite.renda * 0.3;
  const decisao = decidirConfirmacaoConsignado({
    formaPagamento: FORMA_PAGAMENTO.DESCONTO_FOLHA,
    descontoEmFolha: true,
    renda: limite.renda,
    tomadoAtual: tomado,
    valorParcelaNova: valorParcela,
    confirmouLimiteConsignado: false,
  });
  const tom = !decisao.ok || limite.faixaConsignado === "limite"
    ? "limite"
    : limite.faixaConsignado === "alerta"
      ? "alerta"
      : "ok";

  return {
    tom,
    limite: limiteFolha,
    comprometido: tomado,
    disponivel: limite.margemFolhaDisponivel ?? limiteFolha - tomado,
    pctBarra: pctDaBarra(tomado, limiteFolha),
    pctConsignado: limite.pctConsignado ?? null,
  };
}
