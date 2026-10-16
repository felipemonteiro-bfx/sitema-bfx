// Escala e geometria do gráfico "Evolução mensal" do Início (redesign Vantage).
// Funções puras: o componente é de servidor e só desenha o que sai daqui.

/** Número de divisões do eixo Y (6 marcas: 0 … topo). */
const DIVISOES = 5;

/**
 * Passo "bonito" do eixo: o menor degrau 1 / 2 / 2,5 / 5 × 10ⁿ que cobre `max`
 * em no máximo 5 divisões. Sem máximo positivo devolve 1, para o eixo não quebrar.
 */
export function passoRedondo(max: number, divisoes: number = DIVISOES): number {
  if (!Number.isFinite(max) || !(max > 0)) return 1;
  const bruto = max / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / potencia;
  // Tolerância: 46411/5 = 9282 não pode virar 10000 por erro de ponto flutuante em 1,0000001.
  const degrau = f <= 1.000001 ? 1 : f <= 2.000001 ? 2 : f <= 2.500001 ? 2.5 : f <= 5.000001 ? 5 : 10;
  return degrau * potencia;
}

function decimal(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Rótulo curto do eixo: "0", "800", "2,5 mil", "50 mil", "1,2 mi". */
export function rotuloMil(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  const sinal = n < 0 ? "-" : "";
  // 999.950 arredondaria para "1.000 mil": já é milhão.
  if (abs >= 999_950) return `${sinal}${decimal(abs / 1_000_000)} mi`;
  if (abs >= 1000) return `${sinal}${decimal(abs / 1000)} mil`;
  return `${sinal}${decimal(abs)}`;
}

export type MesEvolucao = {
  /** Rótulo curto do eixo X (ex.: "mai"). */
  rotulo: string;
  faturamento: number;
  /** Custo variável do mês (o que a venda custou). */
  custoVariavel: number;
  /** Margem de contribuição = faturamento − custo variável (pode ser negativa). */
  margem: number;
};

export type ColunaEvolucao = {
  indice: number;
  rotulo: string;
  /** Altura do trecho hachurado (custo variável), na escala de `altura`. */
  custoPct: number;
  /** Altura do topo verde (margem); 0 quando a margem é zero ou negativa. */
  margemPct: number;
  /** Altura total da barra (custo + margem). Com margem negativa é só o custo. */
  totalPct: number;
  vazio: boolean;
  negativa: boolean;
};

export type EscalaEvolucao = {
  topo: number;
  passo: number;
  /** Marcas do eixo Y, do 0 ao topo. */
  ticks: number[];
  colunas: ColunaEvolucao[];
};

/**
 * Monta eixo e colunas. `altura` é a escala de saída: 100 devolve porcentagens
 * (o uso do componente); outro valor devolve a mesma proporção nessa unidade.
 */
export function montarColunas(meses: MesEvolucao[], altura: number = 100): EscalaEvolucao {
  // O teto é o maior entre faturamento e custo: com margem negativa o custo passa do faturamento.
  const maior = meses.reduce((m, x) => Math.max(m, x.faturamento, x.custoVariavel), 0);
  const passo = passoRedondo(maior);
  const topo = Math.ceil(maior / passo) * passo || passo;
  const ticks = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
  const esc = (v: number) => (v / topo) * altura;

  const colunas = meses.map<ColunaEvolucao>((m, indice) => {
    const vazio = !(m.faturamento > 0) && !(m.custoVariavel > 0);
    const negativa = m.margem < 0;
    const custoPct = esc(Math.max(m.custoVariavel, 0));
    const margemPct = negativa ? 0 : esc(Math.max(m.margem, 0));
    return { indice, rotulo: m.rotulo, custoPct, margemPct, totalPct: custoPct + margemPct, vazio, negativa };
  });

  return { topo, passo, ticks, colunas };
}
