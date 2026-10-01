// Arquivos privados do financeiro (Fase 4): PDF do boleto Prudent e comprovante de pagamento, em
// bytes no banco. O tipo vem dos bytes (nunca do `file.type`), o limite e 10 MB e a rota que serve
// o arquivo e so de admin.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const dbMock = { arquivoFinanceiro: { create: vi.fn(), findUnique: vi.fn() } };
const sessionMock = { getSession: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);

const {
  TAMANHO_MAXIMO_ARQUIVO,
  detectarTipoArquivo,
  sha256Hex,
  prepararArquivoFinanceiro,
  salvarArquivoFinanceiro,
} = await import("@/lib/arquivo-financeiro");
const { GET } = await import("@/app/api/arquivos/[id]/route");

const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script>");

const arquivo = (bytes: Uint8Array, nome = "boleto.pdf", type = "application/pdf") =>
  new File([bytes as BlobPart], nome, { type });

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.arquivoFinanceiro.create.mockImplementation(async (args: { data: { sha256: string } }) => ({
    id: 77,
    sha256: args.data.sha256,
  }));
});

describe("detectarTipoArquivo", () => {
  it("PDF pelo %PDF; PNG e JPEG pela assinatura; o resto e recusado", () => {
    expect(detectarTipoArquivo(PDF)).toEqual({ mime: "application/pdf", extensao: "pdf" });
    expect(detectarTipoArquivo(PNG)).toEqual({ mime: "image/png", extensao: "png" });
    expect(detectarTipoArquivo(JPEG)).toEqual({ mime: "image/jpeg", extensao: "jpg" });
    expect(detectarTipoArquivo(WEBP)).toBeNull();
    expect(detectarTipoArquivo(HTML)).toBeNull();
    expect(detectarTipoArquivo(new Uint8Array())).toBeNull();
  });
});

describe("sha256Hex", () => {
  it("bate com o sha256 do node", () => {
    expect(sha256Hex(PDF)).toBe(createHash("sha256").update(PDF).digest("hex"));
  });
});

describe("prepararArquivoFinanceiro", () => {
  it("tipo vem dos bytes: HTML com nome .pdf e type application/pdf e recusado", async () => {
    const r = await prepararArquivoFinanceiro(arquivo(HTML, "boleto.pdf", "application/pdf"));
    expect(r).toEqual({ ok: false, erro: "Envie um PDF, PNG ou JPG." });
  });

  it("so PDF quando o chamador restringe", async () => {
    const r = await prepararArquivoFinanceiro(arquivo(PNG, "foto.png", "image/png"), ["application/pdf"]);
    expect(r).toEqual({ ok: false, erro: "Envie um PDF." });
  });

  it("acima de 10 MB e recusado", async () => {
    const grande = new Uint8Array(TAMANHO_MAXIMO_ARQUIVO + 1);
    grande.set(PDF);
    const r = await prepararArquivoFinanceiro(arquivo(grande));
    expect(r).toEqual({ ok: false, erro: "Arquivo maior que 10 MB." });
  });

  it("arquivo vazio e recusado", async () => {
    const r = await prepararArquivoFinanceiro(arquivo(new Uint8Array()));
    expect(r).toEqual({ ok: false, erro: "Arquivo vazio." });
  });

  it("nome sem caminho e com a extensao do conteudo real", async () => {
    const r = await prepararArquivoFinanceiro(arquivo(JPEG, "../../etc/comprovante pix.pdf", "application/pdf"));
    expect(r).toMatchObject({ ok: true, contentType: "image/jpeg", nome: "comprovante-pix.jpg", tamanho: JPEG.length });
    if (r.ok) expect(r.sha256).toBe(sha256Hex(JPEG));
  });
});

describe("salvarArquivoFinanceiro", () => {
  it("grava bytes, tipo, tamanho, hash e quem enviou", async () => {
    const p = await prepararArquivoFinanceiro(arquivo(PDF));
    if (!p.ok) throw new Error(p.erro);
    const r = await salvarArquivoFinanceiro(dbMock as never, p, "André");
    expect(r).toEqual({ id: 77, sha256: sha256Hex(PDF) });
    const data = dbMock.arquivoFinanceiro.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      nome: "boleto.pdf",
      contentType: "application/pdf",
      tamanho: PDF.length,
      sha256: sha256Hex(PDF),
      criadoPor: "André",
    });
    expect(new Uint8Array(data.conteudo)).toEqual(PDF);
  });
});

describe("GET /api/arquivos/[id]", () => {
  const chamar = (id: string) => GET(new Request(`http://x/api/arquivos/${id}`), { params: Promise.resolve({ id }) });

  it("sem sessao ou sem admin → 403, sem ler o banco", async () => {
    sessionMock.getSession.mockResolvedValue(null);
    expect((await chamar("1")).status).toBe(403);
    sessionMock.getSession.mockResolvedValue({ id: 2, username: "vendedor", role: "vendedor" });
    expect((await chamar("1")).status).toBe(403);
    expect(dbMock.arquivoFinanceiro.findUnique).not.toHaveBeenCalled();
  });

  it("id invalido ou inexistente → 404", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "andre", role: "admin" });
    expect((await chamar("abc")).status).toBe(404);
    dbMock.arquivoFinanceiro.findUnique.mockResolvedValue(null);
    expect((await chamar("9")).status).toBe(404);
  });

  it("admin recebe o arquivo inline, sem cache e sem sniff", async () => {
    sessionMock.getSession.mockResolvedValue({ id: 1, username: "andre", role: "admin" });
    dbMock.arquivoFinanceiro.findUnique.mockResolvedValue({
      id: 5,
      nome: "boleto lote 3.pdf",
      contentType: "application/pdf",
      conteudo: Buffer.from(PDF),
    });
    const r = await chamar("5");
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(r.headers.get("Content-Disposition")).toMatch(/^inline; filename="boleto-lote-3.pdf"/);
    expect(r.headers.get("Cache-Control")).toContain("no-store");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    // Fase 5: o arquivo nunca roda script na origem do app, mesmo aberto inline.
    expect(r.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(PDF);
  });
});
