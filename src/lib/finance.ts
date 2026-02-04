import { prisma } from "@/lib/db";
import { addMonths, format } from "date-fns";

export async function calcularDre(mesAno: string) {
  const [ano, mes] = mesAno.split("-").map(Number);
  
  // Criar datas em UTC para garantir consistência com o banco de dados
  const ini = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes, 1, 0, 0, 0));

  console.log(`Buscando vendas para ${mesAno} entre ${ini.toISOString()} e ${fim.toISOString()}`);

  const vendas = await prisma.venda.findMany({
    where: { 
      dataVenda: { 
        gte: ini, 
        lt: fim 
      } 
    },
  });

  console.log(`Vendas encontradas: ${vendas.length}`);

  const receita = vendas.reduce((s, v) => s + (v.valorVenda || 0) + (v.valorFrete || 0), 0);
  const cmv = vendas.reduce((s, v) => s + (v.custoProduto || 0), 0);
  const freteReal = vendas.reduce((s, v) => s + (v.custoEnvio || 0), 0);

  const vendasPorVendedor = new Map<string, number>();
  for (const v of vendas) {
    const key = v.vendedor || "Sem Vendedor";
    vendasPorVendedor.set(key, (vendasPorVendedor.get(key) || 0) + (v.valorVenda || 0) + (v.valorFrete || 0));
  }

  const usuarios = await prisma.usuario.findMany();
  let comissoes = 0;
  for (const [vend, total] of vendasPorVendedor.entries()) {
    const u = usuarios.find((x) => x.nomeExibicao === vend);
    const pct = u?.comissaoPct || 2;
    comissoes += total * (pct / 100);
  }

  const despesas = await prisma.despesa.findMany({
    where: { dataDespesa: { gte: ini, lt: fim } },
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
  const metaGlobal = usuarios.reduce((s, u) => s + (u.metaMensal || 0), 0) || 100000;

  return {
    receita,
    custosVar,
    margem,
    fixas,
    lucro,
    pontoEq,
    metaGlobal,
    detalhe: { cmv, comissoes, variaveis, freteReal },
  };
}

export async function calcularFluxoCaixa(mesAno?: string) {
  let referenceDate = new Date();
  if (mesAno) {
    const [ano, mes] = mesAno.split("-").map(Number);
    referenceDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  }

  const rows: { mes: string; entradas: number; saidas: number; saldo: number }[] = [];
  const vendas = await prisma.venda.findMany();
  const despesas = await prisma.despesa.findMany();

  for (let i = 0; i < 6; i++) {
    const ref = addMonths(referenceDate, i);
    const mesStr = format(ref, "yyyy-MM");
    const mesNome = format(ref, "MM/yyyy");
    let entradas = 0;

    for (const v of vendas) {
      const dv = v.dataVenda;
      // Usar a representação ISO/UTC para comparação de mês
      const dvStr = format(dv, "yyyy-MM");
      if (v.antecipada === 1) {
        if (dvStr === mesStr) {
          entradas += (v.valorParcela || 0) * (v.parcelas || 0);
        }
      } else {
        const dia = dv.getUTCDate();
        const base = new Date(Date.UTC(dv.getUTCFullYear(), dv.getUTCMonth(), 1));
        const inicio = addMonths(base, dia <= 20 ? 1 : 2);
        for (let p = 0; p < (v.parcelas || 0); p++) {
          const venc = addMonths(inicio, p);
          if (format(venc, "yyyy-MM") === mesStr) entradas += v.valorParcela || 0;
        }
      }
    }

    const saidas = despesas
      .filter((d) => format(d.dataDespesa, "yyyy-MM") === mesStr)
      .reduce((s, d) => s + (d.valor || 0), 0);

    rows.push({ mes: mesNome, entradas, saidas, saldo: entradas - saidas });
  }
  return rows;
}
