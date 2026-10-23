import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { getSession } from "@/lib/session";
import { urlSegura } from "@/lib/linkificar";
import { fetchPublicoPinado } from "@/lib/rede-publica";
import { assinarImagem, CacheLru, extrairMeta, LimitadorPrevia } from "@/lib/link-previa";

/**
 * GET /api/whatsapp/link-previa?url=
 *
 * Prévia (título, descrição, site, imagem) de um link de mensagem do atendimento. Admin-only,
 * como as rotas de mídia. Só renderização na tela: nenhuma IA/MCP chama isto sozinha.
 * A busca sai por `fetchPublicoPinado` (IP público fixado, 3 saltos, 512 KB, text/html).
 * A imagem NUNCA é apontada direto: vai pelo proxy assinado (`/imagem`).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML = 512 * 1024;
const TIMEOUT_MS = 8_000;
const TTL_OK_MS = 24 * 60 * 60 * 1000;
const TTL_FALHA_MS = 60 * 60 * 1000;

type Guardado =
  | { semPrevia: true; dominio: string; seguro: boolean }
  | { semPrevia?: false; titulo: string; descricao: string; site: string; dominio: string; seguro: boolean; imagemOriginal: string | null; larga: boolean };

// Só metadados (nunca o corpo da página nem a imagem): 500 entradas.
const cache = new CacheLru<Guardado>(500);
const limitador = new LimitadorPrevia({ porMinuto: 30, global: 4 });

function json(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });
}

const dominioDe = (u: URL) => u.hostname.replace(/^www\./i, "");

function resposta(g: Guardado) {
  if (g.semPrevia) return json(g);
  const { imagemOriginal, ...resto } = g;
  return json({ ...resto, imagem: imagemOriginal ? assinarImagem(imagemOriginal) : null });
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    const s = await getSession();
    return s ? json({ error: "Acesso restrito." }, 403) : json({ error: "Não autenticado." }, 401);
  }
  const sessao = await getSession();
  const url = urlSegura(new URL(req.url).searchParams.get("url") ?? "");
  if (!url || !sessao) return json({ error: "URL inválida." }, 400);

  const guardado = cache.get(url);
  if (guardado) return resposta(guardado);

  const vaga = limitador.adquirir(sessao.id);
  if (!vaga.ok) return json({ error: "Muitas consultas. Tente em instantes." }, 429);
  try {
    const r = await fetchPublicoPinado(url, {
      maxBytes: MAX_HTML,
      timeoutMs: TIMEOUT_MS,
      aceitar: (ct) => ct === "text/html" || ct === "application/xhtml+xml",
    });
    const final = new URL(r.urlFinal);
    const origem = new URL(url);
    // Redirect para outro host (encurtador, open redirect): os metadados seriam de outro site; só o link da mensagem.
    if (dominioDe(final) !== dominioDe(origem)) {
      const g: Guardado = { semPrevia: true, dominio: dominioDe(origem), seguro: origem.protocol === "https:" };
      cache.set(url, g, TTL_OK_MS);
      return resposta(g);
    }
    const m = extrairMeta(r.corpo.toString("utf8"), r.urlFinal);
    const base = { dominio: dominioDe(final), seguro: final.protocol === "https:" };
    const g: Guardado =
      !m.titulo && !m.descricao && !m.imagem
        ? { semPrevia: true, ...base }
        : { titulo: m.titulo, descricao: m.descricao, site: m.site, imagemOriginal: m.imagem, larga: m.larga, ...base };
    cache.set(url, g, g.semPrevia ? TTL_FALHA_MS : TTL_OK_MS);
    return resposta(g);
  } catch {
    // Bloqueio (IP não público), timeout, tipo, status: sem detalhes para o cliente.
    const alvo = new URL(url);
    const g: Guardado = { semPrevia: true, dominio: dominioDe(alvo), seguro: alvo.protocol === "https:" };
    cache.set(url, g, TTL_FALHA_MS);
    return resposta(g);
  } finally {
    vaga.liberar();
  }
}
