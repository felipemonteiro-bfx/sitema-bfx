import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const primeira = { ehPrimeiraCompra: vi.fn() };
const prismaMock = {
  venda: { findMany: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  TEMPLATES: { primeiraCompra: "bfx_primeira_compra" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/primeira-compra", () => primeira);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/primeira-compra/route");

const req = () => new Request("http://x/api/cron/primeira-compra");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron primeira-compra", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: false });
    const res = await GET(req());
    expect((await res.json()).desativado).toBe(true);
  });

  it("envia só para vendas que são primeira compra", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
      { id: 11, clienteId: 2, cliente: { nome: "Bia", telefone: "5593" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockImplementation(async (_c: number, vendaId: number) => vendaId === 10);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    const json = await res.json();
    expect(json.enviados).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(1);
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: "primeira_compra", referencia: 10 }) })
    );
  });

  it("não reenvia venda já registrada (dedup)", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ referencia: 10 }]);
    primeira.ehPrimeiraCompra.mockResolvedValue(true);
    envio.enviarWhatsApp.mockResolvedValue(true);

    await GET(req());
    expect(envio.enviarWhatsApp).not.toHaveBeenCalled();
  });
});
