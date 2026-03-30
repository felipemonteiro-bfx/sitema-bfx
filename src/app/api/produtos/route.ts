import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nome = String(body.nome || "").trim().toUpperCase();
    if (!nome) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    const produto = await prisma.produto.create({
      data: {
        nome,
        custoPadrao: Number(body.custoPadrao || 0),
        valorVenda: Number(body.valorVenda || 0),
        qtdEstoque: Number(body.qtdEstoque || 0),
        marca: null,
        categoria: null,
        ncm: null,
        imagem: "",
        fornecedorId: null,
        dataCompra: null,
      },
      select: {
        id: true,
        nome: true,
        valorVenda: true,
        custoPadrao: true,
        qtdEstoque: true,
      },
    });
    return NextResponse.json(produto);
  } catch {
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}
