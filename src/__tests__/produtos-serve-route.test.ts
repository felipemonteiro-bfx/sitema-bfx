import { describe, it, expect, vi, beforeEach } from "vitest";
import { chavePublica, LOGO_PREFIX } from "@/lib/storage-policy";

vi.mock("@/lib/minio", () => ({
  lerObjeto: vi.fn(),
}));

function ctx(chave: string[]) {
  return { params: Promise.resolve({ chave }) };
}

describe("chavePublica — allowlist do bucket `produtos`", () => {
  it("libera imagem de produto (chave na raiz) e logo de um nivel", () => {
    expect(chavePublica("1754000000000-cadeira.jpg")).toBe(true);
    expect(chavePublica(`${LOGO_PREFIX}1754000000000-acme.png`)).toBe(true);
  });

  it("NEGA recibo e relatorio — chave adivinhavel, nao pode virar publica", () => {
    expect(chavePublica("recibos/assinado-12-1754000000000.pdf")).toBe(false);
    expect(chavePublica("relatorios/mensal/2026-07/9.pdf")).toBe(false);
    expect(chavePublica("relatorios/mensal/2026-07/9.xls")).toBe(false);
  });

  it("nega prefixo desconhecido: allowlist, entao o padrao e negar", () => {
    expect(chavePublica("qualquer/coisa.txt")).toBe(false);
    expect(chavePublica(`${LOGO_PREFIX}sub/x.png`)).toBe(false);
  });

  it("nega traversal, chave absoluta, segmento vazio e chave vazia", () => {
    expect(chavePublica("../etc/passwd")).toBe(false);
    expect(chavePublica(`${LOGO_PREFIX}../recibos/x.pdf`)).toBe(false);
    expect(chavePublica("/etc/passwd")).toBe(false);
    expect(chavePublica("a//b.jpg")).toBe(false);
    expect(chavePublica("")).toBe(false);
    expect(chavePublica(LOGO_PREFIX)).toBe(false);
  });
});

describe("GET /produtos/[...chave]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("serve o objeto com o content-type do storage e cache imutavel", async () => {
    const { lerObjeto } = await import("@/lib/minio");
    vi.mocked(lerObjeto).mockResolvedValue({
      corpo: new ReadableStream(),
      contentType: "image/png",
      contentLength: 1234,
      etag: '"abc"',
      lastModified: new Date("2026-08-12T00:00:00Z"),
    });

    const { GET } = await import("@/app/produtos/[...chave]/route");
    const res = await GET(new Request("http://x/produtos/1754-foto.png"), ctx(["1754-foto.png"]));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Length")).toBe("1234");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(vi.mocked(lerObjeto)).toHaveBeenCalledWith("1754-foto.png");
  });

  it("junta os segmentos e decodifica percent-encoding antes de ler", async () => {
    const { lerObjeto } = await import("@/lib/minio");
    vi.mocked(lerObjeto).mockResolvedValue({
      corpo: new ReadableStream(),
      contentType: "image/png",
      contentLength: null,
      etag: null,
      lastModified: null,
    });

    const { GET } = await import("@/app/produtos/[...chave]/route");
    await GET(new Request("http://x/produtos/logo/1754-a%20b.png"), ctx(["logo", "1754-a%20b.png"]));

    expect(vi.mocked(lerObjeto)).toHaveBeenCalledWith("logo/1754-a b.png");
  });

  it("404 em chave negada, SEM tocar no storage", async () => {
    const { lerObjeto } = await import("@/lib/minio");
    const { GET } = await import("@/app/produtos/[...chave]/route");

    for (const segs of [
      ["recibos", "assinado-12-1754.pdf"],
      ["relatorios", "mensal", "2026-07", "9.pdf"],
      ["..", "etc", "passwd"],
    ]) {
      const res = await GET(new Request("http://x/produtos"), ctx(segs));
      expect(res.status).toBe(404);
    }
    // O ponto do teste: negar acontece ANTES do storage, entao nem consulta.
    expect(vi.mocked(lerObjeto)).not.toHaveBeenCalled();
  });

  it("404 quando a chave e permitida mas o objeto nao existe", async () => {
    const { lerObjeto } = await import("@/lib/minio");
    vi.mocked(lerObjeto).mockResolvedValue(null);

    const { GET } = await import("@/app/produtos/[...chave]/route");
    const res = await GET(new Request("http://x/produtos/nao-existe.png"), ctx(["nao-existe.png"]));

    expect(res.status).toBe(404);
  });
});
