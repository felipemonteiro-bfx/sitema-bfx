import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const prismaMock = {
  venda: { groupBy: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
  cliente: { findMany: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  TEMPLATES: { recompra: "bfx_recompra" },
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/recompra/route");

function req() {
  return new Request("http://x/api/cron/recompra");
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron recompra", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: false });
    const res = await GET(req());
    expect((await res.json()).desativado).toBe(true);
    expect(prismaMock.venda.groupBy).not.toHaveBeenCalled();
  });

  it("envia para cliente na faixa 30-59 dias e loga", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: true, diasRecompra: 30, diasInativo: 60 });
    const hoje = Date.now();
    const dias = (n: number) => new Date(hoje - n * 86400000);
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: dias(45) } }, // dentro: entra
      { clienteId: 2, _max: { dataVenda: dias(20) } }, // recente demais: fora
      { clienteId: 3, _max: { dataVenda: dias(70) } }, // inativo (reativacao): fora
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([{ id: 1, nome: "Ana", telefone: "5592" }]);
    envio.enviarWhatsApp.mockResolvedValue(true);

    const res = await GET(req());
    const json = await res.json();
    expect(json.enviados).toBe(1);
    // só o cliente 1 vira alvo do findMany
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([1]);
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clienteId: 1, tipo: "recompra" }) })
    );
  });

  it("exclui quem já recebeu recompra no cooldown", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoRecompra: true, diasRecompra: 30, diasInativo: 60 });
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: new Date(Date.now() - 45 * 86400000) } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ clienteId: 1 }]);
    prismaMock.cliente.findMany.mockResolvedValue([]);
    envio.enviarWhatsApp.mockResolvedValue(true);

    await GET(req());
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([]);
  });
});
