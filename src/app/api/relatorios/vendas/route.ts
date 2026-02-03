import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to) : new Date();

  const vendas = await prisma.venda.findMany({
    where: { dataVenda: { gte: start, lte: end } },
    orderBy: { dataVenda: "desc" },
  });

  const header = "Data,Vendedor,Produto,Valor,Frete,Parcelas\n";
  const lines = vendas.map((v) =>
    [
      v.dataVenda.toISOString().slice(0, 10),
      v.vendedor || "",
      v.produtoNome || "",
      v.valorVenda || 0,
      v.valorFrete || 0,
      v.parcelas || 0,
    ].join(",")
  );
  const csv = header + lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"relatorio_vendas.csv\"",
    },
  });
}
