import { prisma } from "@/lib/db";
import { valorTotalVenda } from "@/lib/venda-utils";
import { addMonths, format } from "date-fns";

export type MetricasPeriodo = {
  receita: number;
  cmv: number;
  freteReal: number;
  comissoes: number;
  custosVar: number;
  fixas: number;
  variaveis: number;
  margem: number;
  lucro: number;
  margemPct: number;
  pontoEq: number;
  totalVendas: number;
  porVendedor: Record<string, { total: number; lucroLiquido: number; vendas: number }>;
};

/**
 * Fonte única de cálculo de métricas financeiras para um período arbitrário.
 * Usada pelo Dashboard Executivo e pelo DRE/Financeiro.
 */
export async function calcularMetricasPeriodo(
  start: Date,
  end: Date,
  vendorsFilter?: string[]
): Promise<MetricasPeriodo> {
  const vendas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lt: end },
      vendedor: vendorsFilter ? { in: vendorsFilter } : undefined,
      status: { not: { in: ["cancelada", "estornada"] } },
    },
    include: { itens: { select: { subtotal: true, custoProduto: true, quantidade: true } } },
  });

  const receita = vendas.reduce((s, v) => s + valorTotalVenda(v), 0);
  const cmv = vendas.reduce((s, v) => {
    if (v.itens && v.itens.length > 0) {
      return s + v.itens.reduce((si, i) => si + (i.custoProduto || 0) * (i.quantidade || 1), 0);
    }
    return s + (v.custoProduto || 0);
  }, 0);
  const freteReal = vendas.reduce((s, v) => s + (v.custoEnvio || 0), 0);

  const porVendedor: Record<string, { total: number; lucroLiquido: number; vendas: number }> = {};
  for (const v of vendas) {
    const key = v.vendedor || "Sem Vendedor";
    porVendedor[key] ||= { total: 0, lucroLiquido: 0, vendas: 0 };
    const recVenda = valorTotalVenda(v);
    porVendedor[key].total += recVenda;
    porVendedor[key].vendas += 1;

    const cmvVenda = v.itens && v.itens.length > 0
      ? v.itens.reduce((s, i) => s + (i.custoProduto || 0) * (i.quantidade || 1), 0)
      : (v.custoProduto || 0);
    const freteVenda = v.custoEnvio || 0;
    const notaVenda = v.temNota
      ? (recVenda - (v.valorFrete ?? 0)) * ((v.taxaNota ?? 5.97) / 100)
      : 0;
    porVendedor[key].lucroLiquido += recVenda - cmvVenda - freteVenda - notaVenda;
  }

  const usuarios = await prisma.usuario.findMany();
  let comissoes = 0;
  for (const [vend, r] of Object.entries(porVendedor)) {
    const u = usuarios.find((x) => x.nomeExibicao === vend);
    comissoes += r.total * ((u?.comissaoPct || 2) / 100);
  }

  const despesas = await prisma.despesa.findMany({
    where: { dataDespesa: { gte: start, lte: end } },
  });
  const fixas = despesas.filter((d) => d.tipo === "Fixa").reduce((s, d) => s + (d.valor || 0), 0);
  const variaveis = despesas
    .filter((d) => d.tipo === "Variável")
    .reduce((s, d) => s + (d.valor || 0), 0);

  const custosVar = cmv + comissoes + variaveis + freteReal;
  const margem = receita - custosVar;
  const lucro = margem - fixas;
  const margemPct = receita > 0 ? margem / receita : 0;
  const pontoEq = margemPct > 0 ? fixas / margemPct : 0;

  return {
    receita:     Math.round(receita     * 100) / 100,
    cmv:         Math.round(cmv         * 100) / 100,
    freteReal:   Math.round(freteReal   * 100) / 100,
    comissoes:   Math.round(comissoes   * 100) / 100,
    custosVar:   Math.round(custosVar   * 100) / 100,
    fixas:       Math.round(fixas       * 100) / 100,
    variaveis:   Math.round(variaveis   * 100) / 100,
    margem:      Math.round(margem      * 100) / 100,
    lucro:       Math.round(lucro       * 100) / 100,
    margemPct,
    pontoEq:     Math.round(pontoEq     * 100) / 100,
    totalVendas: vendas.length,
    porVendedor,
  };
}

export async function calcularDre(mesAno: string) {
  const [ano, mes] = mesAno.split("-").map(Number);
  const ini = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes, 1, 0, 0, 0)); // início do próximo mês (exclusivo)
  const metrics = await calcularMetricasPeriodo(ini, fim);

  const usuarios = await prisma.usuario.findMany();
  const metaGlobal = usuarios.reduce((s, u) => s + (u.metaMensal || 0), 0) || 100000;

  return {
    receita: metrics.receita,
    custosVar: metrics.custosVar,
    margem: metrics.margem,
    fixas: metrics.fixas,
    lucro: metrics.lucro,
    pontoEq: metrics.pontoEq,
    metaGlobal,
    detalhe: {
      cmv: metrics.cmv,
      comissoes: metrics.comissoes,
      variaveis: metrics.variaveis,
      freteReal: metrics.freteReal,
    },
  };
}

export async function calcularFluxoCaixa(mesAno?: string) {
  let referenceDate = new Date();
  if (mesAno) {
    const [ano, mes] = mesAno.split("-").map(Number);
    referenceDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  }

  const windowStart = new Date(Date.UTC(
    referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1
  ));
  const windowEnd = new Date(Date.UTC(
    referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 7, 1
  ));

  const rows: { mes: string; entradas: number; saidas: number; saldo: number }[] = [];

  // Buscar parcelas com datas reais (V2)
  const parcelas = await prisma.parcelaVencimento.findMany({
    where: { dataVencimento: { gte: windowStart, lt: windowEnd } },
    select: { dataVencimento: true, valorParcela: true, vendaId: true },
  });

  // Buscar vendas sem ParcelaVencimento (V1/legadas) no período + margem
  const vendasComParcela = new Set(parcelas.map((p) => p.vendaId));
  const vendasLegadas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: windowStart, lt: windowEnd },
      status: { not: { in: ["cancelada", "estornada"] } },
      NOT: vendasComParcela.size > 0 ? { id: { in: Array.from(vendasComParcela) } } : undefined,
    },
    select: {
      id: true, dataVenda: true, valorParcela: true, parcelas: true,
      antecipada: true, valorVenda: true, quantidade: true, valorFrete: true,
      itens: { select: { subtotal: true } },
    },
  });

  const despesas = await prisma.despesa.findMany({
    where: { dataDespesa: { gte: windowStart, lt: windowEnd } },
  });

  for (let i = 0; i < 6; i++) {
    const ref = addMonths(referenceDate, i);
    const mesStr = format(ref, "yyyy-MM");
    const mesNome = format(ref, "MM/yyyy");
    let entradas = 0;

    // Entradas de ParcelaVencimento reais (V2)
    for (const p of parcelas) {
      const pStr = format(p.dataVencimento, "yyyy-MM");
      if (pStr === mesStr) entradas += p.valorParcela;
    }

    // Entradas de vendas legadas (V1 — sem ParcelaVencimento)
    for (const v of vendasLegadas) {
      const dv = v.dataVenda;
      const dvStr = `${dv.getUTCFullYear()}-${String(dv.getUTCMonth() + 1).padStart(2, "0")}`;
      if (v.antecipada === 1) {
        if (dvStr === mesStr) entradas += valorTotalVenda(v);
      } else {
        const dia = dv.getUTCDate();
        const base = new Date(Date.UTC(dv.getUTCFullYear(), dv.getUTCMonth(), 1));
        const inicio = addMonths(base, dia <= 20 ? 1 : 2);
        for (let p = 0; p < (v.parcelas || 0); p++) {
          const venc = addMonths(inicio, p);
          const vencStr = `${venc.getUTCFullYear()}-${String(venc.getUTCMonth() + 1).padStart(2, "0")}`;
          if (vencStr === mesStr) entradas += v.valorParcela || 0;
        }
      }
    }

    const saidas = despesas
      .filter((d) => {
        const dd = d.dataDespesa;
        const ddStr = `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, "0")}`;
        return ddStr === mesStr;
      })
      .reduce((s, d) => s + (d.valor || 0), 0);

    rows.push({ mes: mesNome, entradas: Math.round(entradas * 100) / 100, saidas: Math.round(saidas * 100) / 100, saldo: Math.round((entradas - saidas) * 100) / 100 });
  }
  return rows;
}
