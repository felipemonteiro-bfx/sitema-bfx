import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { getSession } from "@/lib/session";
import { fetchPublicoPinado } from "@/lib/rede-publica";
import { aguardarVaga, detectarImagem, LimitadorPrevia, verificarImagem } from "@/lib/link-previa";

/**
 * GET /api/whatsapp/link-previa/imagem?u=&exp=&sig=
 *
 * Proxy da og:image. Só serve URL que a rota de prévia assinou (HMAC com `exp`): o navegador do
 * atendente nunca fala com o site alheio e a rota não é um fetch aberto. Baixa pelo mesmo
 * `fetchPublicoPinado`, até 2 MB, e só entrega JPEG/PNG/WebP reconhecidos pelos bytes (sem SVG/GIF),
 * com o tipo detectado (nunca o do servidor remoto) e cabeçalhos que impedem execução.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGEM = 2 * 1024 * 1024;
// Várias bolhas pedem imagem ao mesmo tempo: até 3 por usuário em voo, 4 no total; o resto espera.
const limitador = new LimitadorPrevia({ porMinuto: 120, global: 4, porUsuarioEmVoo: 3 });

function json(corpo: unknown, status: number) {
  return NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    const s = await getSession();
    return s ? json({ error: "Acesso restrito." }, 403) : json({ error: "Não autenticado." }, 401);
  }
  const sessao = await getSession();
  const q = new URL(req.url).searchParams;
  const alvo = verificarImagem(q.get("u"), q.get("exp"), q.get("sig"));
  if (!alvo || !sessao) return json({ error: "Link inválido ou expirado." }, 403);

  // A conversa abre com várias bolhas pedindo imagem juntas: espera um pouco a vaga em vez de recusar.
  const vaga = await aguardarVaga(limitador, sessao.id, 6_000);
  if (!vaga.ok) return json({ error: "Muitas consultas. Tente em instantes." }, 429);
  try {
    const r = await fetchPublicoPinado(alvo, {
      maxBytes: MAX_IMAGEM,
      timeoutMs: 8_000,
      // O content-type remoto não é confiável: aceita image/* e octet-stream e decide pelos bytes.
      aceitar: (ct) => ct.startsWith("image/") || ct === "application/octet-stream" || ct === "binary/octet-stream",
    });
    if (r.truncado) return json({ error: "Imagem grande demais." }, 413);
    const tipo = detectarImagem(r.corpo);
    if (!tipo) return json({ error: "Formato de imagem não suportado." }, 415);
    return new Response(new Uint8Array(r.corpo), {
      status: 200,
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(r.corpo.length),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return json({ error: "Imagem indisponível." }, 502);
  } finally {
    vaga.liberar();
  }
}
