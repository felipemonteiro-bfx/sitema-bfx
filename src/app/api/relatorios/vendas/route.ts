import { prisma } from "@/lib/db";
import { resolverPeriodo } from "@/lib/periodo-data";
import { getSession } from "@/lib/session";
import { resolverColunasParaExport, cabecalhoCsv, linhaCsv } from "@/lib/relatorio-vendas-colunas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const empresa = searchParams.get("empresa");
  // UTC, igual a tela: "T00:00:00" sem zona e interpretado em horario local.
  const { inicio: start, fimExclusivo: end } = resolverPeriodo(from, to);

  const session = await getSession();
  const colunas = resolverColunasParaExport(searchParams.get("colunas"), session?.role === "admin");

  const vendas = await prisma.venda.findMany({
    where: {
      dataVenda: { gte: start, lt: end },
      cliente: empresa && empresa !== "all" ? {
        empresa: {
          equals: empresa,
          mode: 'insensitive'
        }
      } : undefined
    },
    include: {
      cliente: {
        select: { empresa: true, nome: true, matricula: true, renda: true }
      },
      itens: { select: { subtotal: true, produtoNome: true, quantidade: true, custoProduto: true } },
    },
    orderBy: { dataVenda: "desc" },
  });

  // BOM: sem ele o Excel do Windows abre o CSV em ANSI e quebra os acentos.
  const csv = "\uFEFF" + cabecalhoCsv(colunas) + "\n" + vendas.map((v) => linhaCsv(colunas, v)).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"relatorio_vendas.csv\"",
    },
  });
}
