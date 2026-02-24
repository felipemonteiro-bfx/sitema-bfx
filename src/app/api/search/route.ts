import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_LIMIT = 50;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").toLowerCase();
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 20) || 20, MAX_LIMIT);

  if (!type) {
    return NextResponse.json({ error: "Missing type." }, { status: 400 });
  }
  if (!q) {
    return NextResponse.json({ options: [] });
  }

  if (type === "clientes") {
    const clientes = await prisma.cliente.findMany({
      where: { nome: { contains: q, mode: "insensitive" } },
      orderBy: { nome: "asc" },
      take: limit,
    });
    return NextResponse.json({
      options: clientes.map((c) => ({ value: String(c.id), label: c.nome })),
    });
  }

  if (type === "produtos") {
    const produtos = await prisma.produto.findMany({
      where: { nome: { contains: q, mode: "insensitive" } },
      orderBy: { nome: "asc" },
      take: limit,
    });
    return NextResponse.json({
      options: produtos.map((p) => ({ value: p.nome, label: p.nome })),
    });
  }

  if (type === "usuarios") {
    const usuarios = await prisma.usuario.findMany({
      where: {
        OR: [
          { nomeExibicao: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { nomeExibicao: "asc" },
      take: limit,
    });
    return NextResponse.json({
      options: usuarios.map((u) => ({
        value: String(u.nomeExibicao || u.username),
        label: String(u.nomeExibicao || u.username),
      })),
    });
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
