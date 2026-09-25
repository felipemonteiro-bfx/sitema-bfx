import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminOrThrow: vi.fn(),
  revalidatePath: vi.fn(),
  getSession: vi.fn(),
  sendEmail: vi.fn(),
  envioFindUnique: vi.fn(),
  anexoFindFirst: vi.fn(),
}));

vi.mock("@/lib/guards", () => ({ requireAdminOrThrow: mocks.requireAdminOrThrow }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/db", () => ({
  prisma: {
    emailEnvio: { findUnique: mocks.envioFindUnique },
    emailEnvioAnexo: { findFirst: mocks.anexoFindFirst },
  },
}));

const { reenviarEmail } = await import("@/app/(app)/relatorios/emails/actions");
const { GET } = await import("@/app/api/emails/[id]/anexos/[anexoId]/route");

const pdf = Buffer.from("%PDF-termo");
const envio = {
  id: 9, tipo: "termo", empresaId: 7, vendaId: 42,
  para: "rh@empresa.test", cc: "fin@prudent.test, ops@prudent.test",
  assunto: "Termo assinado", corpoHtml: "<p>oi</p>",
  anexos: [{ nome: "termo.pdf", contentType: "application/pdf", conteudo: new Uint8Array(pdf) }],
};

function form(id: string) {
  const fd = new FormData();
  fd.set("envioId", id);
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdminOrThrow.mockResolvedValue({ id: 1, role: "admin" });
  mocks.getSession.mockResolvedValue({ id: 1, role: "admin" });
  mocks.envioFindUnique.mockResolvedValue(envio);
  mocks.sendEmail.mockResolvedValue(undefined);
});

describe("reenviarEmail", () => {
  it("reenvia o mesmo conteúdo aos mesmos destinatários, como envio manual", async () => {
    const r = await reenviarEmail(undefined, form("9"));

    expect(mocks.requireAdminOrThrow).toHaveBeenCalledOnce();
    expect(mocks.envioFindUnique).toHaveBeenCalledWith({ where: { id: 9 }, include: { anexos: true } });
    expect(mocks.sendEmail).toHaveBeenCalledWith({
      to: ["rh@empresa.test"],
      cc: ["fin@prudent.test", "ops@prudent.test"],
      subject: "Termo assinado",
      html: "<p>oi</p>",
      attachments: [{ filename: "termo.pdf", contentType: "application/pdf", content: Buffer.from(pdf) }],
      registro: { tipo: "termo", empresaId: 7, vendaId: 42, origem: "manual" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/relatorios/emails");
    expect(r).toEqual({ ok: true });
  });

  it("falha do SMTP volta como erro para a tela", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("SMTP fora"));
    await expect(reenviarEmail(undefined, form("9"))).resolves.toEqual({ ok: false, erro: "SMTP fora" });
  });

  it("não reenvia sem admin", async () => {
    mocks.requireAdminOrThrow.mockRejectedValue(new Error("Acesso negado"));
    await expect(reenviarEmail(undefined, form("9"))).rejects.toThrow("Acesso negado");
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("envio inexistente não reenvia", async () => {
    mocks.envioFindUnique.mockResolvedValue(null);
    await expect(reenviarEmail(undefined, form("9"))).resolves.toMatchObject({ ok: false });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/emails/[id]/anexos/[anexoId]", () => {
  const params = (id: string, anexoId: string) => ({ params: Promise.resolve({ id, anexoId }) });

  it("entrega o arquivo guardado, como download", async () => {
    mocks.anexoFindFirst.mockResolvedValue({ nome: "termo assinado.pdf", contentType: "application/pdf", conteudo: new Uint8Array(pdf) });
    const res = await GET(new Request("http://local/api/emails/9/anexos/3"), params("9", "3"));

    expect(mocks.anexoFindFirst).toHaveBeenCalledWith({ where: { id: 3, envioId: 9 } });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(`attachment; filename="termo-assinado.pdf"; filename*=UTF-8''termo%20assinado.pdf`);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(pdf);
  });

  it("?inline=1 abre no navegador só para PDF", async () => {
    mocks.anexoFindFirst.mockResolvedValue({ nome: "a.pdf", contentType: "application/pdf", conteudo: new Uint8Array(pdf) });
    const res = await GET(new Request("http://local/api/emails/9/anexos/3?inline=1"), params("9", "3"));
    expect(res.headers.get("Content-Disposition")).toMatch(/^inline;/);

    mocks.anexoFindFirst.mockResolvedValue({ nome: "a.html", contentType: "text/html", conteudo: new Uint8Array(Buffer.from("<script>")) });
    const html = await GET(new Request("http://local/api/emails/9/anexos/3?inline=1"), params("9", "3"));
    expect(html.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("recusa quem não é admin", async () => {
    mocks.getSession.mockResolvedValue({ id: 2, role: "vendedor" });
    const res = await GET(new Request("http://local/api/emails/9/anexos/3"), params("9", "3"));
    expect(res.status).toBe(403);
    expect(mocks.anexoFindFirst).not.toHaveBeenCalled();
  });

  it("anexo de outro envio ou inexistente dá 404", async () => {
    mocks.anexoFindFirst.mockResolvedValue(null);
    const res = await GET(new Request("http://local/api/emails/9/anexos/3"), params("9", "3"));
    expect(res.status).toBe(404);
  });
});
