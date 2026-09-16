import { custoTotalVenda, valorTotalVenda } from "@/lib/venda-utils";

/**
 * Filtro de período por `dataVenda` para datas "YYYY-MM-DD". Cada ponta vale sozinha —
 * antes o período só era aplicado com `from` e `to` juntos, e "vendas desde 01/09"
 * devolvia o histórico inteiro. `to` inclui o dia inteiro.
 */
export function filtroPeriodoVendas(
  from: string | undefined | null,
  to: string | undefined | null,
): { gte?: Date; lte?: Date } | undefined {
  const inicio = from ? new Date(from.length === 10 ? `${from}T00:00:00.000Z` : from) : undefined;
  const fim = to ? new Date(to.length === 10 ? `${to}T23:59:59.999Z` : to) : undefined;
  const filtro: { gte?: Date; lte?: Date } = {};
  if (inicio && !Number.isNaN(inicio.getTime())) filtro.gte = inicio;
  if (fim && !Number.isNaN(fim.getTime())) filtro.lte = fim;
  return Object.keys(filtro).length > 0 ? filtro : undefined;
}

export type VendaParaResumo = Parameters<typeof valorTotalVenda>[0] &
  Parameters<typeof custoTotalVenda>[0] & {
    vendedor: string | null;
    custoEnvio: number | null;
    temNota: boolean;
    taxaNota: number | null;
    taxaFinanceiraValor: number | null;
    cliente: { empresa: string | null } | null;
  };

const trunc2 = (n: number) => Math.trunc(n * 100) / 100;

/**
 * Resumo da ferramenta `resumo_relatorio_vendas` da IA. O filtro de empresa vale para
 * todos os números (antes só afetava `porEmpresa`), e o custo inclui a taxa de
 * antecipação gravada na venda, como o DRE.
 */
export function resumirRelatorioVendas(vendas: VendaParaResumo[], filtro: { empresa?: string | null }) {
  const doFiltro = filtro.empresa
    ? vendas.filter((v) => (v.cliente?.empresa || "Sem Empresa") === filtro.empresa)
    : vendas;

  let totalVendas = 0;
  let totalCusto = 0;
  const porVendedor: Record<string, number> = {};
  const porEmpresa: Record<string, number> = {};
  for (const v of doFiltro) {
    const receita = valorTotalVenda(v);
    const nota = v.temNota ? ((receita - (v.valorFrete ?? 0)) * (v.taxaNota ?? 5.97)) / 100 : 0;
    totalVendas += receita;
    totalCusto += (custoTotalVenda(v) ?? 0) + (v.custoEnvio || 0) + nota + (v.taxaFinanceiraValor || 0);
    const vendedor = v.vendedor || "Sem Vendedor";
    porVendedor[vendedor] = (porVendedor[vendedor] ?? 0) + receita;
    const empresa = v.cliente?.empresa || "Sem Empresa";
    porEmpresa[empresa] = (porEmpresa[empresa] ?? 0) + receita;
  }

  const ranking = (mapa: Record<string, number>) =>
    Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, total]) => ({ nome, total: trunc2(total) }));

  return {
    totalVendas: trunc2(totalVendas),
    totalCusto: trunc2(totalCusto),
    lucroTotal: trunc2(totalVendas - totalCusto),
    quantidadeVendas: doFiltro.length,
    porVendedor: ranking(porVendedor),
    porEmpresa: ranking(porEmpresa),
  };
}
