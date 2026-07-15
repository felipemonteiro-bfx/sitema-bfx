/**
 * Fidelidade por pontos (CRM Fase 4).
 *
 * Regra: 1 ponto por real gasto; 1 ponto vale R$0,05 no resgate
 * (ex.: 1.000 pontos = R$50 de desconto). Configurável por env.
 * Funções puras e testáveis — o efeito (ledger + saldo) vive em `fidelidade-service.ts`.
 */

export const PONTOS_POR_REAL = Number(process.env.FIDELIDADE_PONTOS_POR_REAL || 1);
export const VALOR_POR_PONTO = Number(process.env.FIDELIDADE_VALOR_POR_PONTO || 0.05);

/** Pontos ganhos numa compra (piso do valor × pontos por real). Nunca negativo. */
export function pontosDaVenda(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.floor(total * PONTOS_POR_REAL);
}

/** Valor em R$ equivalente a um saldo de pontos (2 casas). */
export function valorEmReais(pontos: number): number {
  if (!Number.isFinite(pontos) || pontos <= 0) return 0;
  return Math.round(pontos * VALOR_POR_PONTO * 100) / 100;
}

/** Quantos pontos são necessários para um desconto em R$ (teto). */
export function pontosParaValor(reais: number): number {
  if (!Number.isFinite(reais) || reais <= 0 || VALOR_POR_PONTO <= 0) return 0;
  return Math.ceil(reais / VALOR_POR_PONTO);
}

/** Um resgate é válido se há saldo suficiente e a quantidade é positiva. */
export function podeResgatar(saldo: number, pontos: number): boolean {
  return Number.isInteger(pontos) && pontos > 0 && saldo >= pontos;
}

/**
 * Níveis de fidelidade por saldo de pontos (filtrável em segmentos/campanhas).
 * Limiares configuráveis por env.
 */
export const NIVEL_PRATA_MIN = Number(process.env.FIDELIDADE_NIVEL_PRATA || 1000);
export const NIVEL_OURO_MIN = Number(process.env.FIDELIDADE_NIVEL_OURO || 5000);

export type NivelFidelidade = "bronze" | "prata" | "ouro";

export function nivelFidelidade(pontos: number | null | undefined): NivelFidelidade {
  const p = pontos ?? 0;
  if (p >= NIVEL_OURO_MIN) return "ouro";
  if (p >= NIVEL_PRATA_MIN) return "prata";
  return "bronze";
}

export function nivelLabel(nivel: NivelFidelidade): string {
  switch (nivel) {
    case "ouro":
      return "Ouro";
    case "prata":
      return "Prata";
    default:
      return "Bronze";
  }
}

/** Faixa de pontos (para filtro Prisma) correspondente a um nível. */
export function nivelParaFaixaPontos(nivel: NivelFidelidade): { gte?: number; lt?: number } {
  switch (nivel) {
    case "ouro":
      return { gte: NIVEL_OURO_MIN };
    case "prata":
      return { gte: NIVEL_PRATA_MIN, lt: NIVEL_OURO_MIN };
    default:
      return { lt: NIVEL_PRATA_MIN };
  }
}

export const NIVEIS_FIDELIDADE: NivelFidelidade[] = ["bronze", "prata", "ouro"];
