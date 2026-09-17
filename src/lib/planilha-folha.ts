/**
 * Planilha da folha (2026-09-17): a coluna "Desconto de Produto" da RELAÇÃO DE
 * VALORES PARA FOLHA DE PAGAMENTO que o departamento pessoal importa no
 * Domínio. Uma linha por matrícula com a soma das parcelas descontadas na
 * competência. O .xlsx sai de `@/lib/xlsx/planilha-folha-xlsx`.
 * Ver docs/superpowers/specs/2026-09-17-planilha-da-folha.md.
 */
import { mesDoDesconto } from "@/lib/planilha-controle";
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { valorTotalVenda } from "@/lib/venda-utils";

/** Evento da folha da Amazon Five (planilha de 08/2026, coluna M). */
export const EVENTO_DESCONTO_PRODUTO = { codigo: 5002, nome: "Desconto de Produto" } as const;

interface ParcelaParaFolha {
  dataVencimento: Date | string;
  valorParcela: number;
  paga: boolean;
  origemPagamento: string | null;
}

/** O formato que `SELECT_VENDA_FOLHA` devolve do banco. */
export interface VendaParaFolha {
  id: number;
  status: string | null;
  dataVenda: Date | string;
  /** Campos do total da venda (`valorTotalVenda`), para a venda sem linhas de parcela. */
  parcelas: number | null;
  valorVenda: number | null;
  quantidade: number | null;
  valorFrete: number | null;
  desconto: number | null;
  itens: { subtotal: number }[];
  cliente: { id: number; nome: string | null; matricula: string | null; empresa: string | null } | null;
  parcelasVencimento: ParcelaParaFolha[];
}

export interface LinhaFolha {
  /** Em branco quando o cadastro não tem matrícula. */
  matricula: string;
  nome: string;
  valor: number;
}

export interface PlanilhaFolha {
  /** YYYY-MM. */
  competencia: string;
  linhas: LinhaFolha[];
  total: number;
  semMatricula: number;
}

export const SELECT_VENDA_FOLHA = {
  id: true,
  status: true,
  dataVenda: true,
  parcelas: true,
  valorVenda: true,
  quantidade: true,
  valorFrete: true,
  desconto: true,
  itens: { select: { subtotal: true } },
  cliente: { select: { id: true, nome: true, matricula: true, empresa: true } },
  parcelasVencimento: { select: { dataVencimento: true, valorParcela: true, paga: true, origemPagamento: true } },
};

const comparar = new Intl.Collator("pt-BR").compare;

/** "8/2026" ou "08/2026" → "2026-08"; qualquer outra coisa → null. */
export function normalizarCompetencia(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const partes = valor.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!partes) return null;
  const mes = Number(partes[1]);
  // Mesmo limite de ano de `parsePeriodoMesAno`: ano 0000 viraria data negativa no Excel.
  if (mes < 1 || mes > 12 || Number(partes[2]) < 1000) return null;
  return `${partes[2]}-${String(mes).padStart(2, "0")}`;
}

/**
 * A folha desconta a parcela que o cliente não quitou por fora: em aberto ou
 * antecipada na Prudent (a Prudent pagou a BFX, o funcionário continua pagando).
 * Mesma regra de `situacaoParaCliente`.
 */
function folhaDesconta(parcela: ParcelaParaFolha): boolean {
  return !parcela.paga || parcela.origemPagamento === "prudent";
}

function diaDoVencimento(data: Date | string): string {
  return (data instanceof Date ? data.toISOString() : String(data)).slice(0, 10);
}

/**
 * As parcelas da venda. A venda rápida só grava linhas com mais de uma parcela:
 * a venda em 1x (e a venda antiga sem linhas) ganha as parcelas pela mesma regra
 * da criação — primeiro vencimento de `calcularPrimeiroVencimento`, uma por mês
 * no dia 10, o total dividido igualmente e o resto de centavos na última.
 */
function parcelasDaVenda(venda: VendaParaFolha): ParcelaParaFolha[] {
  if (venda.parcelasVencimento.length > 0) return venda.parcelasVencimento;
  const quantidade = Math.max(1, venda.parcelas ?? 1);
  const totalCentavos = Math.round(valorTotalVenda(venda) * 100);
  if (!(totalCentavos > 0)) return [];
  const centavos = Math.floor(totalCentavos / quantidade);
  const primeiro = calcularPrimeiroVencimento(new Date(venda.dataVenda));
  if (Number.isNaN(primeiro.getTime())) return [];
  return Array.from({ length: quantidade }, (_, i) => ({
    dataVencimento: new Date(Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth() + i, 10)),
    valorParcela: (i === quantidade - 1 ? totalCentavos - centavos * (quantidade - 1) : centavos) / 100,
    paga: false,
    origemPagamento: null,
  }));
}

/** Matrícula só de dígitos é número na folha: "00045" e "45" são a mesma. */
function chaveDaMatricula(matricula: string): string {
  return /^\d+$/.test(matricula) ? matricula.replace(/^0+(?=\d)/, "") : matricula;
}

export function montarPlanilhaFolha(vendas: VendaParaFolha[], filtro: { competencia: string; empresa?: string }): PlanilhaFolha {
  const empresaFiltro = filtro.empresa?.trim().toUpperCase() || null;
  const grupos = new Map<string, { matricula: string; nome: string; centavos: number }>();

  for (const venda of vendas) {
    if (venda.status === "cancelada" || venda.status === "estornada") continue;
    if (empresaFiltro && (venda.cliente?.empresa ?? "").trim().toUpperCase() !== empresaFiltro) continue;

    const centavos = parcelasDaVenda(venda)
      .filter((p) => folhaDesconta(p) && mesDoDesconto(diaDoVencimento(p.dataVencimento)) === filtro.competencia)
      .reduce((soma, p) => soma + Math.round(p.valorParcela * 100), 0);
    if (centavos === 0) continue;

    const matricula = (venda.cliente?.matricula ?? "").trim();
    // A matrícula é numerada por empresa no Domínio: sem filtro, a empresa entra
    // na chave. Sem matrícula não há como juntar com segurança: uma linha por
    // cliente e, sem cliente, uma por venda.
    const empresa = (venda.cliente?.empresa ?? "").trim().toUpperCase();
    const chave = matricula
      ? `m:${empresa}|${chaveDaMatricula(matricula)}`
      : venda.cliente
        ? `c:${venda.cliente.id}`
        : `v:${venda.id}`;
    const grupo = grupos.get(chave) ?? { matricula, nome: (venda.cliente?.nome ?? "").trim() || "SEM NOME", centavos: 0 };
    grupo.centavos += centavos;
    grupos.set(chave, grupo);
  }

  const todas = [...grupos.values()];
  const ordenar = (lista: typeof todas) =>
    lista.sort((a, b) => comparar(a.nome, b.nome)).map((g) => ({ matricula: g.matricula, nome: g.nome, valor: g.centavos / 100 }));
  const linhas = [...ordenar(todas.filter((g) => g.matricula)), ...ordenar(todas.filter((g) => !g.matricula))];

  return {
    competencia: filtro.competencia,
    linhas,
    total: todas.reduce((soma, g) => soma + g.centavos, 0) / 100,
    semMatricula: linhas.filter((l) => !l.matricula).length,
  };
}
