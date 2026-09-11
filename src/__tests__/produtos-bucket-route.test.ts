import { describe, it, expect, vi, beforeEach } from "vitest";

// GET /produtos/<chave> — serve objeto do bucket (2026-09-11, achado da revisão
// de segurança): antes de hoje o upload gravava o Content-Type que o navegador
// mandasse, entao pode haver objeto antigo gravado como HTML ou SVG. Ele nunca
// pode sair como pagina no dominio do app.
vi.mock("@/lib/minio", () => ({ lerObjeto: vi.fn() }));

const { lerObjeto } = await import("@/lib/minio");
const { GET } = await import("@/app/produtos/[...chave]/route");

const CHAVE = "1700000000000-foto.png";

function objeto(contentType: string) {
  return { corpo: new Uint8Array([1, 2, 3]), contentType, contentLength: 3, etag: null, lastModified: null };
}

function pedir() {
  return GET(new Request(`http://local/produtos/${CHAVE}`), { params: Promise.resolve({ chave: [CHAVE] }) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /produtos/<chave> — só imagem sai como imagem", () => {
  it("PNG, JPEG e WebP saem com o próprio tipo e com CSP que bloqueia script", async () => {
    for (const tipo of ["image/png", "image/jpeg", "image/webp"]) {
      vi.mocked(lerObjeto).mockResolvedValue(objeto(tipo) as never);
      const res = await pedir();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(tipo);
      expect(res.headers.get("Content-Security-Policy")).toContain("sandbox");
      expect(res.headers.get("Content-Disposition")).toBeNull();
    }
  });

  it("objeto antigo gravado como HTML, SVG ou binário sai como download, nunca como página", async () => {
    for (const tipo of ["text/html", "image/svg+xml", "application/octet-stream", ""]) {
      vi.mocked(lerObjeto).mockResolvedValue(objeto(tipo) as never);
      const res = await pedir();
      expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
      expect(res.headers.get("Content-Disposition")).toMatch(/^attachment/);
      expect(res.headers.get("Content-Security-Policy")).toContain("sandbox");
    }
  });
});
