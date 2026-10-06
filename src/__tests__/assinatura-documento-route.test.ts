import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// O histórico precisa abrir o termo assinado no navegador antes de reenviar ao RH.
// Sem `inline=1` o arquivo continua saindo como download.
const dbMock = { documento: { findFirst: vi.fn() } };
const sessionMock = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/session", () => sessionMock);

const { GET } = await import("@/app/api/assinatura/documento/route");

const pdf = Buffer.from("%PDF-termo");

function chamar(qs = "vendaId=42") {
  return GET(new NextRequest(`http://local/api/assinatura/documento?${qs}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  dbMock.documento.findFirst.mockResolvedValue({
    conteudo: pdf,
    tamanhoBytes: pdf.length,
  });
});

describe("GET /api/assinatura/documento", () => {
  it("sem inline continua o download do termo assinado", async () => {
    const res = await chamar();

    expect(dbMock.documento.findFirst).toHaveBeenCalledWith({
      where: { vendaId: 42, tipo: "comprovante_assinatura" },
      orderBy: { criadoEm: "desc" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="recibo-assinado-42.pdf"');
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(pdf);
  });

  it("inline=1 abre o PDF no navegador", async () => {
    const res = await chamar("vendaId=42&inline=1");
    expect(res.headers.get("Content-Disposition")).toBe('inline; filename="recibo-assinado-42.pdf"');
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(pdf);
  });

  it("sem sessão não entrega o termo, nem consulta o banco", async () => {
    sessionMock.getSession.mockResolvedValue(null);
    const res = await chamar("vendaId=42&inline=1");
    expect(res.status).toBe(401);
    expect(dbMock.documento.findFirst).not.toHaveBeenCalled();
  });

  it("inline com outro valor continua download", async () => {
    const res = await chamar("vendaId=42&inline=true");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("vendaId ausente responde 400 sem consultar o banco", async () => {
    const res = await chamar("");
    expect(res.status).toBe(400);
    expect(dbMock.documento.findFirst).not.toHaveBeenCalled();
  });

  it("documento inexistente responde 404", async () => {
    dbMock.documento.findFirst.mockResolvedValue(null);
    const res = await chamar();
    expect(res.status).toBe(404);
  });
});
