import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Credenciais obrigatórias." }, { status: 400 });
  }

  const user = await prisma.usuario.findUnique({
    where: { username: String(body.username).toLowerCase().trim() },
  });

  if (!user || user.password !== String(body.password).trim()) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    role: user.role || "vendedor",
    nomeExibicao: user.nomeExibicao || user.username,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
