import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

type BackfillEntry = {
  produtoNome: string;
  totalSold: number;
};

async function getVendidos(): Promise<BackfillEntry[]> {
  const rows = await prisma.itemVenda.groupBy({
    by: ["produtoNome"],
    _sum: { quantidade: true },
    where: {
      venda: {
        NOT: { status: { in: ["cancelada", "estornada"] } },
      },
    },
  });
  return rows.map((r) => ({
    produtoNome: r.produtoNome,
    totalSold: r._sum.quantidade ?? 0,
  }));
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado. Requer perfil admin." }, { status: 401 });
  }
  try {
    const vendidos = await getVendidos();

    const preview = await Promise.all(
      vendidos.map(async ({ produtoNome, totalSold }) => {
        const produto = await prisma.produto.findFirst({
          where: { nome: produtoNome },
          select: { qtdEstoque: true },
        });
        const currentStock = produto?.qtdEstoque ?? null;
        const newStock = currentStock !== null ? currentStock - totalSold : null;
        return { produtoNome, currentStock, totalSold, newStock };
      })
    );

    return NextResponse.json({ preview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado. Requer perfil admin." }, { status: 401 });
  }
  try {
    const vendidos = await getVendidos();

    const updates = await Promise.all(
      vendidos.map(async ({ produtoNome, totalSold }) => {
        await prisma.produto.updateMany({
          where: { nome: produtoNome },
          data: { qtdEstoque: { decrement: totalSold } },
        });
        const produto = await prisma.produto.findFirst({
          where: { nome: produtoNome },
          select: { qtdEstoque: true },
        });
        return {
          produtoNome,
          decremented: totalSold,
          newStock: produto?.qtdEstoque ?? null,
        };
      })
    );

    return NextResponse.json({ applied: true, updates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
