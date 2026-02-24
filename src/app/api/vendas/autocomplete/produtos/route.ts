import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const produtos = await prisma.produto.findMany({
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
        custoPadrao: true,
        valorVenda: true,
        marca: true
      }
    });

    return NextResponse.json(produtos);
  } catch (error) {
    console.error("Erro no autocomplete de produtos:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
