import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { getSession } from "@/lib/session";
import { ler, MidiaStorageError, type MidiaLida } from "@/lib/whatsapp-midia-storage";
import { contentDisposition, mimeNaAllowlist, type TipoMidia } from "@/lib/whatsapp-midia-politica";

/**
 * GET /api/whatsapp/midias/[id]
 *
 * Serve a mídia salva de uma mensagem do atendimento WhatsApp. Admin-only (o middleware só confere
 * o JWT; vendedor passaria). Não baixa nada da Meta: só lê o bucket privado, em streaming, com Range.
 * Documento e PDF saem sempre como attachment. A chave do storage nunca aparece na resposta.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CABECALHOS_SEGURANCA = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "sandbox; default-src 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  // `no-store` faz o Safari recusar áudio e vídeo; `no-cache` revalida a cada uso.
  "Cache-Control": "private, no-cache",
};

function json(corpo: unknown, status: number) {
  return NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Guarda própria: 401 sem sessão, 403 para perfil sem permissão.
  if (!(await requireAdmin())) {
    const session = await getSession();
    return session ? json({ error: "Acesso restrito." }, 403) : json({ error: "Não autenticado." }, 401);
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "Identificador inválido." }, 400);

  const midia = await prisma.whatsAppMidia.findUnique({
    where: { id },
    select: { tipo: true, mime: true, nomeExibicao: true, chaveStorage: true, status: true, tamanho: true },
  });
  if (!midia) return json({ error: "Mídia não encontrada." }, 404);
  if (midia.status !== "salva" || !midia.chaveStorage) return json({ estado: midia.status }, 404);

  const range = req.headers.get("range");
  let lida: MidiaLida | null;
  try {
    lida = await ler(midia.chaveStorage, range);
  } catch (e) {
    if (e instanceof MidiaStorageError) {
      if (e.code === "range_invalido") return json({ error: "Range inválido." }, 400);
      if (e.code === "range_nao_satisfeito") {
        return new Response(null, {
          status: 416,
          headers: {
            ...CABECALHOS_SEGURANCA,
            "Accept-Ranges": "bytes",
            // RFC 9110: o 416 informa o tamanho total quando ele é conhecido.
            ...(midia.tamanho != null ? { "Content-Range": `bytes */${midia.tamanho}` } : {}),
          },
        });
      }
    }
    // Storage indisponível, bucket público etc.: sem detalhes para o cliente.
    return json({ error: "Mídia temporariamente indisponível." }, 503);
  }
  if (!lida) return json({ error: "Mídia não encontrada." }, 404);

  // Só ecoa o mime salvo se estiver na allowlist; fora dela, vira binário baixado.
  const mimeOk = mimeNaAllowlist(midia.tipo, midia.mime);
  const headers = new Headers(CABECALHOS_SEGURANCA);
  headers.set("Content-Type", mimeOk ? midia.mime : "application/octet-stream");
  headers.set(
    "Content-Disposition",
    contentDisposition(midia.tipo as TipoMidia, midia.nomeExibicao ?? "arquivo", {
      mime: midia.mime,
      baixar: !mimeOk || new URL(req.url).searchParams.get("baixar") === "1",
    }),
  );
  headers.set("Accept-Ranges", "bytes");
  if (lida.contentLength !== null) headers.set("Content-Length", String(lida.contentLength));
  if (lida.status === 206 && lida.contentRange) headers.set("Content-Range", lida.contentRange);
  if (lida.etag) headers.set("ETag", lida.etag);

  return new Response(lida.corpo, { status: lida.status, headers });
}
