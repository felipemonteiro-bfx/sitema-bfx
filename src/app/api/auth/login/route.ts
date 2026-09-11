import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionToken } from "@/lib/session";
import { verificarSenha, verificarSenhaFalsa, ehHashScrypt, hashSenha } from "@/lib/senha";
import { criarLimitador, type Limitador } from "@/lib/limite-tentativas";

// node:crypto (scrypt) nao existe no Edge Runtime — deixa explicito que esta
// rota roda no runtime Node.
export const runtime = "nodejs";

// Limite de tentativas (2026-09-11), em 15 minutos, conferido ANTES da senha
// (bloqueado, nem a senha certa entra — senao a forca bruta seguiria):
// - 5 por IP+usuario: o erro de digitacao comum.
// - 10 por usuario, de qualquer IP: ataque distribuido contra uma conta. Nome
//   inexistente conta igual, entao o 429 nao revela quem existe.
// - 20 por IP, em qualquer usuario: quem varre logins. So com o IP da
//   Cloudflare — sem ela (tailnet), todo mundo divide a mesma origem e os
//   erros de um trancariam os outros.
// A tentativa conta ANTES do primeiro await: requisicoes simultaneas enxergam
// umas as outras. No login certo, par e usuario zeram e o IP devolve so a
// propria tentativa — uma conta valida nao pode limpar uma varredura.
// Em memoria: ver @/lib/limite-tentativas.
const JANELA_MS = 15 * 60 * 1000;
const TAMANHO_MAXIMO_USUARIO = 100;
const porIpEUsuario = criarLimitador({ limite: 5, janelaMs: JANELA_MS });
const porUsuario = criarLimitador({ limite: 10, janelaMs: JANELA_MS });
const porIp = criarLimitador({ limite: 20, janelaMs: JANELA_MS });

/**
 * So o cf-connecting-ip: a Cloudflare sobrescreve o que o cliente mandar.
 * x-forwarded-for e forjavel e nao entra. Pela tailnet o Traefik e alcancado
 * direto e o cabecalho poderia ser forjado — mas quem esta la e da equipe.
 */
function ipDaCloudflare(req: Request): string | null {
  return req.headers.get("cf-connecting-ip")?.trim() || null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "Credenciais obrigatórias." }, { status: 400 });
  }

  const senhaDigitada = String(body.password).trim();
  const username = String(body.username).toLowerCase().trim();
  // O nome vira chave dos limitadores: sem teto, nomes gigantes enchem a memoria.
  if (username.length > TAMANHO_MAXIMO_USUARIO) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 400 });
  }

  const ip = ipDaCloudflare(req);
  const chavePar = `${ip ?? "sem-cloudflare"}|${username}`;
  const limites: [Limitador, string][] = [
    [porIpEUsuario, chavePar],
    [porUsuario, username],
  ];
  if (ip) limites.push([porIp, ip]);

  const agora = Date.now();
  const bloqueados = limites.map(([limitador, chave]) => limitador.situacao(chave, agora)).filter((s) => s.bloqueado);
  if (bloqueados.length > 0) {
    // A espera mais longa: avisar a menor faria o usuario tomar outro 429.
    const esperar = Math.max(...bloqueados.map((s) => s.esperarSegundos));
    const minutos = Math.ceil(esperar / 60);
    return NextResponse.json(
      { error: `Muitas tentativas. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.` },
      { status: 429, headers: { "Retry-After": String(esperar) } }
    );
  }
  for (const [limitador, chave] of limites) limitador.registrarFalha(chave, agora);

  const user = await prisma.usuario.findUnique({
    where: { username },
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

  porIpEUsuario.limpar(chavePar);
  porUsuario.limpar(username);
  if (ip) porIp.desfazerFalha(ip, agora);

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
