// Confirmação do RH por parcela (2026-09-30, Fase 3). Regra pura: sem banco.
//
// O consolidado semanal vai ao RH da empresa conveniada; a BFX registra à mão, título por
// título, se o RH confirmou ou recusou o desconto. Só parcela confirmada entra na fila da
// Prudent. `confirmacaoRh` nulo = aguardando. Parcela anterior à Fase 3 foi marcada como
// confirmada de origem "legado" pela migração 20260930130000 — a tela avisa que não houve
// confirmação de fato.

export const CONFIRMACAO = { confirmada: "confirmada", recusada: "recusada" } as const;
export const ORIGEM_CONFIRMACAO = { rh: "rh", legado: "legado" } as const;

export type EstadoConfirmacao = "aguardando" | "confirmada" | "legado" | "recusada";

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 500;

export function estadoConfirmacao(p: { confirmacaoRh: string | null; confirmacaoOrigem: string | null }): EstadoConfirmacao {
  if (p.confirmacaoRh === CONFIRMACAO.recusada) return "recusada";
  if (p.confirmacaoRh === CONFIRMACAO.confirmada) {
    return p.confirmacaoOrigem === ORIGEM_CONFIRMACAO.legado ? "legado" : "confirmada";
  }
  // Nulo ou valor desconhecido: nunca libera a parcela para a Prudent.
  return "aguardando";
}

export function rotuloConfirmacao(p: {
  confirmacaoRh: string | null;
  confirmacaoOrigem: string | null;
  confirmacaoMotivo?: string | null;
}): string {
  switch (estadoConfirmacao(p)) {
    case "confirmada":
      return "Confirmada pelo RH";
    case "legado":
      return "Legado — sem confirmação do RH";
    case "recusada":
      return p.confirmacaoMotivo ? `Recusada: ${p.confirmacaoMotivo}` : "Recusada";
    default:
      return "Aguardando RH";
  }
}

/** Aguardando ou recusada pode (re)virar confirmada; confirmada não muda por aqui. */
export function podeConfirmar(p: { confirmacaoRh: string | null }): boolean {
  return p.confirmacaoRh !== CONFIRMACAO.confirmada;
}

/** Parcela que já foi à Prudent (em lote ou antecipada) não pode ser recusada. */
export function podeRecusar(p: {
  confirmacaoRh: string | null;
  antecipada: boolean;
  antecipacaoLoteId: number | null;
}): { ok: true } | { ok: false; erro: string } {
  if (p.antecipada || p.antecipacaoLoteId !== null) {
    return { ok: false, erro: "A parcela já está na Prudent; cancele o lote antes." };
  }
  return { ok: true };
}

export function validarMotivo(motivo: unknown): { ok: true; valor: string } | { ok: false; erro: string } {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < MOTIVO_MIN) {
    return { ok: false, erro: `Informe o motivo da recusa (mínimo ${MOTIVO_MIN} caracteres).` };
  }
  return { ok: true, valor: texto.slice(0, MOTIVO_MAX) };
}
