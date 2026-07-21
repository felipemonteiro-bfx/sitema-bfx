import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { getWhatsAppFlags } = await import("@/lib/whatsapp");
const { TEMPLATES } = await import("@/lib/whatsapp-templates");

beforeEach(() => vi.clearAllMocks());

describe("getWhatsAppFlags — flags novas", () => {
  it("defaults: automações novas desligadas, diasRecompra 30, mesesAtivo 6", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const f = (await getWhatsAppFlags())!;
    expect(f.autoRecompra).toBe(false);
    expect(f.autoPrimeiraCompra).toBe(false);
    expect(f.autoComemorativas).toBe(false);
    expect(f.diasRecompra).toBe(30);
    expect(f.mesesAtivoComemorativa).toBe(6);
  });

  it("respeita valores customizados", async () => {
    configMock.findFirst.mockResolvedValue({
      whatsappAutoEnabled: 1,
      whatsappAutoRecompra: 1,
      whatsappDiasRecompra: 45,
      whatsappAutoPrimeiraCompra: 1,
      whatsappAutoComemorativas: 1,
      whatsappMesesAtivoComemorativa: 3,
    });
    const f = (await getWhatsAppFlags())!;
    expect(f.autoRecompra).toBe(true);
    expect(f.diasRecompra).toBe(45);
    expect(f.autoPrimeiraCompra).toBe(true);
    expect(f.autoComemorativas).toBe(true);
    expect(f.mesesAtivoComemorativa).toBe(3);
  });
});

describe("TEMPLATES — novos", () => {
  it("inclui os 8 novos com prefixo bfx_", () => {
    expect(TEMPLATES.recompra).toBe("bfx_recompra");
    expect(TEMPLATES.primeiraCompra).toBe("bfx_primeira_compra");
    expect(TEMPLATES.natal).toBe("bfx_natal");
    expect(TEMPLATES.anoNovo).toBe("bfx_ano_novo");
    expect(TEMPLATES.diaCliente).toBe("bfx_dia_cliente");
    expect(TEMPLATES.diaCriancas).toBe("bfx_dia_criancas");
    expect(TEMPLATES.diaNamorados).toBe("bfx_dia_namorados");
    expect(TEMPLATES.diaMulheres).toBe("bfx_dia_mulheres");
  });
});
