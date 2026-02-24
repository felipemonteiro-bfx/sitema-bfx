import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const start = from
    ? new Date(from + "T00:00:00")
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to + "T23:59:59") : new Date();

  const itens = await prisma.itemVenda.findMany({
    where: {
      venda: { dataVenda: { gte: start, lte: end } },
    },
  });

  const agg = new Map<
    string,
    { custoTotal: number; receitaTotal: number; quantidade: number }
  >();

  for (const i of itens) {
    const custo = i.custoProduto * i.quantidade;
    const receita = i.subtotal;
    const cur = agg.get(i.produtoNome) ?? {
      custoTotal: 0,
      receitaTotal: 0,
      quantidade: 0,
    };
    cur.custoTotal += custo;
    cur.receitaTotal += receita;
    cur.quantidade += i.quantidade;
    agg.set(i.produtoNome, cur);
  }

  const rows = Array.from(agg.entries()).map(([produto, d]) => {
    const margem =
      d.receitaTotal > 0
        ? ((d.receitaTotal - d.custoTotal) / d.receitaTotal) * 100
        : 0;
    const lucro = d.receitaTotal - d.custoTotal;
    return {
      produto,
      quantidade: d.quantidade,
      custoTotal: d.custoTotal.toFixed(2),
      receitaTotal: d.receitaTotal.toFixed(2),
      lucro: lucro.toFixed(2),
      margemPct: margem.toFixed(1),
    };
  });

  rows.sort((a, b) => parseFloat(b.lucro) - parseFloat(a.lucro));

  const header =
    "Produto,Quantidade,Custo Total,Receita Total,Lucro,Margem (%)\n";
  const lines = rows.map((r) =>
    [r.produto, r.quantidade, r.custoTotal, r.receitaTotal, r.lucro, r.margemPct].join(",")
  );
  const csv = header + lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio_margem_produto.csv"',
    },
  });
}
