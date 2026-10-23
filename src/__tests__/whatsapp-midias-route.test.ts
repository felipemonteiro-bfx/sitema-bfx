import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), sessao: vi.fn(), achar: vi.fn(), ler: vi.fn() }));
vi.mock("@/lib/guards", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/session", () => ({ getSession: mocks.sessao }));
vi.mock("@/lib/db", () => ({ prisma: { whatsAppMidia: { findUnique: mocks.achar } } }));
vi.mock("@/lib/whatsapp-midia-storage", async (orig) => {
  const real = await orig<typeof import("@/lib/whatsapp-midia-storage")>();
  return { ...real, ler: mocks.ler };
});

import { GET } from "@/app/api/whatsapp/midias/[id]/route";
import { MidiaStorageError } from "@/lib/whatsapp-midia-storage";

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const CHAVE = "midias/2026/10/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function midia(extra: Record<string, unknown> = {}) {
  return { id: ID, tipo: "imagem", mime: "image/png", nomeExibicao: "foto.png", chaveStorage: CHAVE, status: "salva", ...extra };
}
function lida(extra: Record<string, unknown> = {}) {
  return {
    corpo: new Response("abcdefghij").body!,
    contentType: "image/png",
    tamanhoTotal: 10,
    contentLength: 10,
    contentRange: null,
    status: 200,
    etag: '"e1"',
    ...extra,
  };
}
function chamar(id = ID, init: { range?: string; query?: string } = {}) {
  const req = new Request(`https://x.test/api/whatsapp/midias/${id}${init.query ?? ""}`, {
    headers: init.range ? { Range: init.range } : {},
  });
  return GET(req, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue(true);
  mocks.sessao.mockResolvedValue({ role: "admin" });
  mocks.achar.mockResolvedValue(midia());
  mocks.ler.mockResolvedValue(lida());
});

describe("GET /api/whatsapp/midias/[id]", () => {
  it("vendedor recebe 403 sem tocar no banco nem no storage", async () => {
    mocks.admin.mockResolvedValue(false);
    mocks.sessao.mockResolvedValue({ role: "vendedor" });
    expect((await chamar()).status).toBe(403);
    expect(mocks.achar).not.toHaveBeenCalled();
    expect(mocks.ler).not.toHaveBeenCalled();
  });

  it("sem sessão recebe 401", async () => {
    mocks.admin.mockResolvedValue(false);
    mocks.sessao.mockResolvedValue(null);
    expect((await chamar()).status).toBe(401);
    expect(mocks.ler).not.toHaveBeenCalled();
  });

  it("id fora do formato uuid recebe 400 sem consultar", async () => {
    expect((await chamar("1; drop")).status).toBe(400);
    expect(mocks.achar).not.toHaveBeenCalled();
  });

  it("mídia inexistente recebe 404", async () => {
    mocks.achar.mockResolvedValue(null);
    expect((await chamar()).status).toBe(404);
    expect(mocks.ler).not.toHaveBeenCalled();
  });

  it.each(["pendente", "baixando", "falhou", "indisponivel"])("status %s: 404 com {estado} e sem ler o storage", async (st) => {
    mocks.achar.mockResolvedValue(midia({ status: st }));
    const res = await chamar();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ estado: st });
    expect(mocks.ler).not.toHaveBeenCalled();
  });

  it("salva sem chave de storage: 404 com {estado}", async () => {
    mocks.achar.mockResolvedValue(midia({ chaveStorage: null }));
    const res = await chamar();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ estado: "salva" });
    expect(mocks.ler).not.toHaveBeenCalled();
  });

  it("200 sem Range: corpo, tipo, ETag e Accept-Ranges", async () => {
    const res = await chamar();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abcdefghij");
    expect(mocks.ler).toHaveBeenCalledWith(CHAVE, null);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Length")).toBe("10");
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    expect(res.headers.get("ETag")).toBe('"e1"');
  });

  it.each([
    ["bytes=0-3", "bytes 0-3/10", "4"],
    ["bytes=4-", "bytes 4-9/10", "6"],
    ["bytes=-2", "bytes 8-9/10", "2"],
  ])("Range %s responde 206 com Content-Range", async (range, cr, len) => {
    mocks.ler.mockResolvedValue(lida({ status: 206, contentRange: cr, contentLength: Number(len) }));
    const res = await chamar(ID, { range });
    expect(mocks.ler).toHaveBeenCalledWith(CHAVE, range);
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe(cr);
    expect(res.headers.get("Content-Length")).toBe(len);
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
  });

  it("range não satisfeito: 416 com Content-Range */total ausente de detalhes", async () => {
    mocks.ler.mockRejectedValue(new MidiaStorageError("range_nao_satisfeito", "x"));
    mocks.achar.mockResolvedValue(midia({ tamanho: 1234 }));
    const res = await chamar(ID, { range: "bytes=999999-" });
    expect(res.status).toBe(416);
    expect(res.headers.get("Content-Range")).toBe("bytes */1234");
  });

  it("416 sem tamanho conhecido não inventa Content-Range", async () => {
    mocks.ler.mockRejectedValue(new MidiaStorageError("range_nao_satisfeito", "x"));
    mocks.achar.mockResolvedValue(midia({ tamanho: null }));
    const res = await chamar(ID, { range: "bytes=999999-" });
    expect(res.status).toBe(416);
    expect(res.headers.get("Content-Range")).toBeNull();
  });

  it("range inválido: 400", async () => {
    mocks.ler.mockRejectedValue(new MidiaStorageError("range_invalido", "x"));
    expect((await chamar(ID, { range: "bytes=a-b" })).status).toBe(400);
  });

  it.each(["bucket_publico", "bucket_ausente", "falha_storage", "nao_configurado", "verificacao_falhou"] as const)(
    "storage com %s: 503 sem detalhes",
    async (code) => {
      mocks.ler.mockRejectedValue(new MidiaStorageError(code, "segredo-interno-bucket"));
      const res = await chamar();
      expect(res.status).toBe(503);
      expect(await res.text()).not.toContain("segredo-interno");
    },
  );

  it("objeto sumiu do storage: 404", async () => {
    mocks.ler.mockResolvedValue(null);
    expect((await chamar()).status).toBe(404);
  });

  it("cabeçalhos de segurança presentes", async () => {
    const h = (await chamar()).headers;
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Content-Security-Policy")).toBe("sandbox; default-src 'none'");
    expect(h.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(h.get("Cache-Control")).toBe("private, no-cache");
  });

  it("imagem abre inline; ?baixar=1 força attachment", async () => {
    expect((await chamar()).headers.get("Content-Disposition")).toMatch(/^inline;/);
    const res = await chamar(ID, { query: "?baixar=1" });
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("documento e PDF sempre attachment", async () => {
    mocks.achar.mockResolvedValue(midia({ tipo: "documento", mime: "application/pdf", nomeExibicao: "a.pdf" }));
    mocks.ler.mockResolvedValue(lida({ contentType: "application/pdf" }));
    const res = await chamar();
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("mime salvo fora da allowlist vira octet-stream e attachment", async () => {
    mocks.achar.mockResolvedValue(midia({ tipo: "imagem", mime: "text/html" }));
    const res = await chamar();
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("a chave do storage nunca aparece na resposta", async () => {
    const res = await chamar();
    const todos = JSON.stringify([...res.headers.entries()]) + (await res.text());
    expect(todos).not.toContain("midias/2026");
    expect(todos).not.toContain("aaaaaaaa-bbbb");
  });
});
