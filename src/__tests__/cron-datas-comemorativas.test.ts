import { describe, it, expect, vi, beforeEach } from "vitest";

const flags = { getWhatsAppFlags: vi.fn() };
const envio = { enviarWhatsApp: vi.fn() };
const datas = { dataComemorativaDeHoje: vi.fn() };
const cota = { verificarCota: vi.fn() };
const prismaMock = {
  venda: { groupBy: vi.fn() },
  whatsAppEnvioLog: { findMany: vi.fn(), create: vi.fn() },
  cliente: { findMany: vi.fn() },
};

vi.mock("@/lib/whatsapp", () => ({ ...flags, ...envio }));
vi.mock("@/lib/whatsapp-templates", () => ({
  comFallback: (name: string, params: string[], fb: string) => ({ name, bodyParams: params, fallbackText: fb, language: "pt_BR" }),
}));
vi.mock("@/lib/datas-comemorativas", () => datas);
vi.mock("@/lib/campanha-service", () => cota);
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { GET } = await import("@/app/api/cron/datas-comemorativas/route");
const req = () => new Request("http://x/api/cron/datas-comemorativas");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("cron datas-comemorativas", () => {
  it("sai cedo quando a flag está desligada", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: false });
    expect((await GET(req()).then((r) => r.json())).desativado).toBe(true);
  });

  it("não faz nada quando hoje não é data comemorativa", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue(null);
    const json = await GET(req()).then((r) => r.json());
    expect(json.semData).toBe(true);
    expect(prismaMock.venda.groupBy).not.toHaveBeenCalled();
  });

  it("envia para clientes ativos e loga com o slug", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([
      { clienteId: 1, _max: { dataVenda: new Date() } },
    ]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([{ id: 1, nome: "Ana", telefone: "5592" }]);
    cota.verificarCota.mockResolvedValue({ cabe: true, disponivel: 800, usados: 0 });
    envio.enviarWhatsApp.mockResolvedValue(true);

    const json = await GET(req()).then((r) => r.json());
    expect(json.enviados).toBe(1);
    expect(json.slug).toBe("natal");
    expect(prismaMock.whatsAppEnvioLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ clienteId: 1, tipo: "comemorativa_natal" }) })
    );
  });

  it("respeita a cota: envia só o disponível e reporta excedente", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([1, 2, 3].map((id) => ({ clienteId: id, _max: { dataVenda: new Date() } })));
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([]);
    prismaMock.cliente.findMany.mockResolvedValue([
      { id: 1, nome: "A", telefone: "1" },
      { id: 2, nome: "B", telefone: "2" },
      { id: 3, nome: "C", telefone: "3" },
    ]);
    cota.verificarCota.mockResolvedValue({ cabe: false, disponivel: 2, usados: 998 });
    envio.enviarWhatsApp.mockResolvedValue(true);

    const json = await GET(req()).then((r) => r.json());
    expect(json.enviados).toBe(2);
    expect(json.excedente).toBe(1);
    expect(envio.enviarWhatsApp).toHaveBeenCalledTimes(2);
  });

  it("exclui quem já recebeu a comemorativa hoje (dedup)", async () => {
    flags.getWhatsAppFlags.mockResolvedValue({ autoComemorativas: true, mesesAtivoComemorativa: 6 });
    datas.dataComemorativaDeHoje.mockReturnValue({ slug: "natal", ocasiao: "Feliz Natal", template: "bfx_natal", dia: 25, mes: 12 });
    prismaMock.venda.groupBy.mockResolvedValue([{ clienteId: 1, _max: { dataVenda: new Date() } }]);
    prismaMock.whatsAppEnvioLog.findMany.mockResolvedValue([{ clienteId: 1 }]);
    prismaMock.cliente.findMany.mockResolvedValue([]);
    cota.verificarCota.mockResolvedValue({ cabe: true, disponivel: 800, usados: 0 });

    await GET(req());
    const idsFinais = prismaMock.cliente.findMany.mock.calls[0]![0].where.id.in;
    expect(idsFinais).toEqual([]);
  });
});
