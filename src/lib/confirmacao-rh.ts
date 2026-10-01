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

export interface LinhaAguardandoRh {
  id: number;
  vendaId: number;
  numeroParcela: number;
  /** Quantas parcelas a venda tem; nulo cai no número da parcela. */
  totalParcelas: number | null;
  dataVencimento: Date;
  valorParcela: number;
  enviadaRhEm: Date | null;
  colaborador: string | null;
  matricula: string | null;
  empresa: string;
}

export interface TituloAguardandoRh {
  id: number;
  /** `V{vendaId}-{n}/{total}`, o identificador legível do título. */
  titulo: string;
  colaborador: string | null;
  matricula: string | null;
  /** Data pura YYYY-MM-DD. */
  vencimento: string;
  valor: number;
}

export interface GrupoAguardandoRh {
  chave: string;
  empresa: string;
  /** Dia (Manaus, YYYY-MM-DD) do primeiro envio ao RH; nulo = ainda não enviado. */
  enviadaEm: string | null;
  titulos: TituloAguardandoRh[];
  total: number;
}

/** Dia civil de Manaus de um instante (o envio sai às sextas, à noite em UTC). */
function diaEmManaus(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus" }).format(d);
}

/**
 * A aba "Aguardando RH": títulos agrupados por empresa e dia de envio do consolidado. Ordem dos
 * grupos: enviados do mais recente ao mais antigo, depois os ainda não enviados; empresa em ordem
 * alfabética no empate. Dentro do grupo, a ordem de entrada. Totais em centavos inteiros.
 */
export function agruparAguardandoRh(linhas: LinhaAguardandoRh[]): GrupoAguardandoRh[] {
  const grupos = new Map<string, GrupoAguardandoRh & { centavos: number }>();
  for (const l of linhas) {
    const enviadaEm = l.enviadaRhEm ? diaEmManaus(l.enviadaRhEm) : null;
    const chave = `${l.empresa}|${enviadaEm ?? "-"}`;
    let g = grupos.get(chave);
    if (!g) {
      g = { chave, empresa: l.empresa, enviadaEm, titulos: [], total: 0, centavos: 0 };
      grupos.set(chave, g);
    }
    const centavos = Math.round(l.valorParcela * 100);
    g.centavos += centavos;
    g.titulos.push({
      id: l.id,
      titulo: `V${l.vendaId}-${l.numeroParcela}/${l.totalParcelas ?? l.numeroParcela}`,
      colaborador: l.colaborador,
      matricula: l.matricula,
      vencimento: l.dataVencimento.toISOString().slice(0, 10),
      valor: centavos / 100,
    });
  }
  return [...grupos.values()]
    .map(({ centavos, ...g }) => ({ ...g, total: centavos / 100 }))
    .sort((a, b) => {
      if (a.enviadaEm !== b.enviadaEm) {
        if (a.enviadaEm === null) return 1;
        if (b.enviadaEm === null) return -1;
        return a.enviadaEm < b.enviadaEm ? 1 : -1;
      }
      return a.empresa.localeCompare(b.empresa, "pt-BR");
    });
}
