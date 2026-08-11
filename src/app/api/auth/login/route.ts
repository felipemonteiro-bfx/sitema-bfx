import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/session";
import { verificarSenha, verificarSenhaFalsa, ehHashScrypt, hashSenha } from "@/lib/senha";

// node:crypto (scrypt) nao existe no Edge Runtime — deixa explicito que esta
// rota roda no runtime Node.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Credenciais obrigatórias." }, { status: 400 });
  }

  const senhaDigitada = String(body.password).trim();
  const user = await prisma.usuario.findUnique({
    where: { username: String(body.username).toLowerCase().trim() },
  });

  if (!user) {
    // Gasta o mesmo tempo de uma verificacao scrypt real, para nao dar pra
    // descobrir por tempo de resposta se um login existe (T-CYM-03).
    await verificarSenhaFalsa(senhaDigitada);
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const senhaOk = await verificarSenha(senhaDigitada, user.password);
  if (!senhaOk) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  if (!ehHashScrypt(user.password)) {
    // Migracao transparente (D-04): primeiro login de um usuario com senha
    // legada em texto puro re-hasheia antes de responder. Se a gravacao
    // falhar, o login segue normalmente — a proxima tentativa re-hasheia de
    // novo. Nunca pode trancar um usuario existente para fora.
    try {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { password: await hashSenha(senhaDigitada) },
      });
    } catch {
      // best-effort — login ja foi validado, nao derruba por causa disso.
    }
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
