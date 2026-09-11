/**
 * Período da fila de antecipação escolhido por meses (2026-09-11).
 *
 * Substitui os dois campos de texto "MM/AAAA": o estado continua em MM/AAAA,
 * que é o que `parsePeriodoMesAno`, a action `antecipar` e os relatórios já
 * entendem — muda só a forma de escolher. Para comparar, o mês vira YYYY-MM,
 * que ordena certo como texto (12/2026 < 01/2027). Puro e testado.
 */

export interface IntervaloMeses {
  inicio: string;
  fim: string;
  /** Primeiro clique dado, falta o mês final. */
  aguardandoFim: boolean;
}

export type EstadoMes = "inicio" | "fim" | "dentro" | "fora" | "unico";

export const INTERVALO_VAZIO: IntervaloMeses = { inicio: "", fim: "", aguardandoFim: false };

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "10/2026" → "2026-10" (o formato de `MesAntecipacao.mes`). */
export function chaveDoMes(mes: string): string {
  const [m, a] = mes.split("/");
  return `${a}-${m}`;
}

/** "2026-10" → "10/2026". */
export function mesDaChave(chave: string): string {
  const [a, m] = chave.split("-");
  return `${m}/${a}`;
}

function somarMeses(mes: string, quantidade: number): string {
  const [m, a] = mes.split("/").map(Number);
  const total = a * 12 + (m - 1) + quantidade;
  return `${String((total % 12) + 1).padStart(2, "0")}/${Math.floor(total / 12)}`;
}

/**
 * Clique num mês da grade: o primeiro marca o início (e espera o fim), o
 * segundo fecha o intervalo — invertendo as pontas se veio antes do início.
 * Com o intervalo já fechado, o clique começa outro.
 */
export function proximoIntervalo(atual: IntervaloMeses, clicado: string): IntervaloMeses {
  if (atual.aguardandoFim && atual.inicio) {
    return chaveDoMes(clicado) < chaveDoMes(atual.inicio)
      ? { inicio: clicado, fim: atual.inicio, aguardandoFim: false }
      : { inicio: atual.inicio, fim: clicado, aguardandoFim: false };
  }
  return { inicio: clicado, fim: clicado, aguardandoFim: true };
}

/** Atalho "Este mês". `hoje` é YYYY-MM-DD (dia civil de Manaus). */
export function intervaloEsteMes(hoje: string): IntervaloMeses {
  const mes = mesDaChave(hoje.slice(0, 7));
  return { inicio: mes, fim: mes, aguardandoFim: false };
}

/** Atalho "Próximos N meses", contando o mês atual. */
export function intervaloProximosMeses(hoje: string, quantidade: number): IntervaloMeses {
  const inicio = mesDaChave(hoje.slice(0, 7));
  return { inicio, fim: somarMeses(inicio, Math.max(1, quantidade) - 1), aguardandoFim: false };
}

/** "10/2026" → "out/2026". */
export function rotuloMes(mes: string): string {
  const [m, a] = mes.split("/");
  return `${MESES_CURTOS[Number(m) - 1] ?? m}/${a}`;
}

/** Rótulo do gatilho; `null` quando não há período. */
export function rotuloIntervalo(inicio: string, fim: string): string | null {
  if (!inicio && !fim) return null;
  if (!inicio || !fim || inicio === fim) return rotuloMes(inicio || fim);
  return `${rotuloMes(inicio)} – ${rotuloMes(fim)}`;
}

/** Os doze meses de um ano, em MM/AAAA. */
export function mesesDoAno(ano: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}/${ano}`);
}

/** Como cada mês se desenha na grade. */
export function estadoDoMes(mes: string, intervalo: IntervaloMeses): EstadoMes {
  if (!intervalo.inicio) return "fora";
  const c = chaveDoMes(mes);
  const i = chaveDoMes(intervalo.inicio);
  const f = chaveDoMes(intervalo.fim || intervalo.inicio);
  if (i === f) return c === i ? "unico" : "fora";
  if (c === i) return "inicio";
  if (c === f) return "fim";
  return c > i && c < f ? "dentro" : "fora";
}

/** Valor curto para caber na célula do mês: "R$ 850", "R$ 3,5 mil". Zero some. */
export function valorCompacto(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "";
  if (valor < 1000) return `R$ ${Math.round(valor)}`;
  return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
}
