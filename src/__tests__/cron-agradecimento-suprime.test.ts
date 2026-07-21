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
  TEMPLATES: { agradecimento: "bfx_agradecimento" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/primeira-compra", () => primeira);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/agradecimento-pos-venda/route");
const req = () => new Request("http://x/api/cron/agradecimento-pos-venda");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("agradecimento suprime primeira compra", () => {
  it("com primeira-compra LIGADA, exclui a venda que é primeira compra", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoAgradecimento: true, autoPrimeiraCompra: true });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } }, // primeira compra → excluir
      { id: 11, clienteId: 2, cliente: { nome: "Bia", telefone: "5593" } }, // recompra → mantém
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockImplementation(async (_c: number, vendaId: number) => vendaId === 10);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    expect((await res.json()).enviados).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(1);
  });

  it("com primeira-compra DESLIGADA, mantém a primeira compra no agradecimento", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoAgradecimento: true, autoPrimeiraCompra: false });
    prismaMock.venda.findMany.mockResolvedValue([
      { id: 10, clienteId: 1, cliente: { nome: "Ana", telefone: "5592" } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    primeira.ehPrimeiraCompra.mockResolvedValue(true);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    expect((await res.json()).enviados).toBe(1);
    expect(primeira.ehPrimeiraCompra).not.toHaveBeenCalled();
  });
});
