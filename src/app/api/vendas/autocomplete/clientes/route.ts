import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unaccentFindClienteIds } from "@/lib/db-search";
import { valorTotalVenda } from "@/lib/venda-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    // f_unaccent: `contains` + `mode: insensitive` ignora maiuscula mas NAO
    // ignora acento, entao digitar "JOSE" nao sugeria "JOSÉ LOPES DOLZANE" e o
    // vendedor acabava cadastrando o cliente de novo, sem acento (duplicata).
    const ids = await unaccentFindClienteIds(query, 10);
    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: ids } },
      orderBy: { nome: "asc" },
      take: 10,
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnpj: true,
        renda: true,
        tipo: true,
        endereco: true,
        cep: true,
        telefone: true,
        vendas: {
          orderBy: { dataVenda: "desc" },
          take: 1,
          select: {
            id: true,
            dataVenda: true,
            valorVenda: true,
            quantidade: true,
            valorFrete: true, desconto: true,
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
        valorUltimaVenda = valorTotalVenda(ultimaVenda);
      }

      return {
        id: cliente.id,
        nome: cliente.nome,
        cpf: cliente.cpf,
        cnpj: cliente.cnpj,
        renda: cliente.renda,
        tipo: cliente.tipo,
        endereco: cliente.endereco,
        cep: cliente.cep,
        telefone: cliente.telefone,
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
    return NextResponse.json({ error: "Erro ao buscar clientes." }, { status: 500 });
  }
}
