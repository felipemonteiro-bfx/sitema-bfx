import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        nome: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnpj: true,
        renda: true,
        tipo: true,
        vendas: {
          orderBy: { dataVenda: "desc" },
          take: 1,
          select: {
            id: true,
            dataVenda: true,
            valorVenda: true,
            valorFrete: true,
            itens: {
              select: {
                subtotal: true,
              },
            },
          },
        },
      },
    });

    const clientesComResumo = clientes.map((cliente) => {
      const ultimaVenda = cliente.vendas[0];
      let valorUltimaVenda = 0;

      if (ultimaVenda) {
        if (ultimaVenda.itens && ultimaVenda.itens.length > 0) {
          valorUltimaVenda = ultimaVenda.itens.reduce((sum, item) => sum + item.subtotal, 0);
        } else {
          valorUltimaVenda = ultimaVenda.valorVenda || 0;
        }
        valorUltimaVenda += ultimaVenda.valorFrete || 0;
      }

      return {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        cnpj: cliente.cnpj,
        renda: cliente.renda,
        tipo: cliente.tipo,
        ultimaVenda: ultimaVenda
          ? {
              data: ultimaVenda.dataVenda.toISOString().split("T")[0],
              valor: valorUltimaVenda,
            }
          : null,
      };
    });

    return NextResponse.json(clientesComResumo);
  } catch (error) {
    console.error("Erro no autocomplete de clientes:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
