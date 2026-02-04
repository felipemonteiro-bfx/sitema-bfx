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
          mode: 'insensitive'
        }
      },
      take: 10,
      select: {
        id: true,
        nome: true,
        cpf: true,
        cnpj: true
      }
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("Erro no autocomplete de clientes:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
