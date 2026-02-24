import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const hoje = new Date();
  const start = from ? new Date(from + "T00:00:00") : new Date(hoje.getFullYear(), 0, 1);
  const end = to ? new Date(to + "T23:59:59") : hoje;

  const parcelas = await prisma.parcelaVencimento.findMany({
    where: {
      paga: false,
      dataVencimento: { gte: start, lte: end },
    },
    include: {
      venda: {
        include: { cliente: { select: { nome: true, empresa: true } } },
      },
    },
    orderBy: { dataVencimento: "asc" },
  });

  const header =
    "Vencimento,VendaId,Cliente,Empresa,Parcela,Valor,DiasAtraso\n";
  const lines = parcelas.map((p) => {
    const diasAtraso =
      p.dataVencimento < hoje
        ? Math.floor(
            (hoje.getTime() - p.dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
    return [
      p.dataVencimento.toISOString().slice(0, 10),
      p.vendaId,
      p.venda.cliente?.nome || "N/D",
      p.venda.cliente?.empresa || "N/D",
      p.numeroParcela,
      p.valorParcela.toFixed(2),
      diasAtraso,
    ].join(",");
  });
  const csv = header + lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio_inadimplencia.csv"',
    },
  });
}
