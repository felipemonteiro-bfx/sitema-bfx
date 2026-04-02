import { prisma } from "@/lib/db";
import { valorTotalVenda, produtosTexto } from "@/lib/venda-utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const empresa = searchParams.get("empresa");
  const start = from ? new Date(from + "T00:00:00") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to + "T23:59:59") : new Date();

  const vendas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lte: end },
      cliente: empresa && empresa !== "all" ? {
        empresa: {
          equals: empresa,
          mode: 'insensitive'
        }
      } : undefined
    },
    include: {
      cliente: {
        select: { empresa: true, nome: true, matricula: true }
      },
      itens: { select: { subtotal: true, produtoNome: true, quantidade: true } },
    },
    orderBy: { dataVenda: "desc" },
  });

  const header = "Matricula,Nome,Produtos,Vendedor,Data,Valor,Parcelas\n";
  const lines = vendas.map((v) => {
    const total = valorTotalVenda(v);
    const matricula = v.cliente?.matricula || "";
    const nome = v.cliente?.nome || "N/D";
    const produtos = `"${produtosTexto(v).replace(/"/g, '""')}"`;
    const vendedor = v.vendedor || "";
    const data = v.dataVenda.toISOString().slice(0, 10);
    const parcelas = v.parcelas || 1;
    return [matricula, nome, produtos, vendedor, data, total, parcelas].join(",");
  });
  const csv = header + lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"relatorio_vendas.csv\"",
    },
  });
}
