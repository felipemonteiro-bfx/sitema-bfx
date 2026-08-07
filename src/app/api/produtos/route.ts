import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidarProduto } from "@/lib/revalidacao";

export async function POST(request: NextRequest) {
  let nome = "";
  let fornecedorId: number | null = null;

  try {
    const body = await request.json();
    nome = String(body.nome || "").trim().toUpperCase();
    if (!nome) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    }
    const marca = String(body.marca || "").trim().toUpperCase() || null;
    const categoria = String(body.categoria || "").trim().toUpperCase() || null;
    const ncm = String(body.ncm || "").trim().toUpperCase() || null;
    fornecedorId = body.fornecedorId ? Number(body.fornecedorId) : null;
    const dataCompra = body.dataCompra ? new Date(body.dataCompra) : null;

    const selectFields = { id: true, nome: true, valorVenda: true, custoPadrao: true, qtdEstoque: true };

    // Verificar se já existe produto com mesmo nome + fornecedor
    const existente = await prisma.produto.findFirst({
      where: { nome, fornecedorId },
      select: selectFields,
    });
    if (existente) {
      return NextResponse.json(existente);
    }

    const produto = await prisma.produto.create({
      data: {
        nome,
        custoPadrao: Number(body.custoPadrao || 0),
        valorVenda: Number(body.valorVenda || 0),
        qtdEstoque: Number(body.qtdEstoque || 0),
        marca,
        categoria,
        ncm,
        imagem: "",
        fornecedorId,
        dataCompra,
      },
      select: selectFields,
    });
    // Invalida o cache de servidor destas rotas. Diferente de server action,
    // route handler nao devolve nada que invalide o Router Cache do cliente:
    // quem atualiza a tela de quem chamou e o router.refresh() no componente.
    revalidarProduto();
    return NextResponse.json(produto);
  } catch (err) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === "P2002" && nome) {
      // Unique constraint — produto já existe, retornar ele
      const existente = await prisma.produto.findFirst({
        where: { nome, fornecedorId },
        select: { id: true, nome: true, valorVenda: true, custoPadrao: true, qtdEstoque: true },
      });
      if (existente) return NextResponse.json(existente);
    }
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}
