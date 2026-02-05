import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const produtoId = Number(searchParams.get("produtoId"));
  
  if (!produtoId) return NextResponse.json([]);

  try {
    const produtoReferencia = await prisma.produto.findUnique({
      where: { id: produtoId },
      select: { categoria: true, valorVenda: true, marca: true }
    });

    if (!produtoReferencia) return NextResponse.json([]);

    const { categoria, valorVenda, marca } = produtoReferencia;
    const precoRef = valorVenda || 0;

    // Buscar Upsell: Mesma categoria, preço maior (até 50% mais caro)
    const upsell = await prisma.produto.findMany({
      where: {
        categoria: categoria,
        valorVenda: { gt: precoRef, lte: precoRef * 1.5 },
        id: { not: produtoId }
      },
      take: 2,
      orderBy: { valorVenda: 'asc' }
    });

    // Buscar Cross-sell: Mesma marca ou categoria, preço menor (itens que agregam)
    const crossSell = await prisma.produto.findMany({
      where: {
        OR: [
          { categoria: categoria, valorVenda: { lt: precoRef * 0.4 } },
          { marca: marca, valorVenda: { lt: precoRef * 0.6 } }
        ],
        id: { not: produtoId },
        NOT: { id: { in: upsell.map(u => u.id) } }
      },
      take: 2,
      orderBy: { valorVenda: 'desc' }
    });

    return NextResponse.json({
      upsell: upsell.map(p => ({ ...p, tipo: 'UPSELL', label: 'Modelo Superior' })),
      crossSell: crossSell.map(p => ({ ...p, tipo: 'CROSS', label: 'Agrega a Venda' }))
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar sugestões" }, { status: 500 });
  }
}
