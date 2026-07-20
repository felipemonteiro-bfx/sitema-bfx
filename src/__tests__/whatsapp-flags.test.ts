import { describe, it, expect, vi, beforeEach } from "vitest";

const configMock = { findFirst: vi.fn() };
vi.mock("@/lib/db", () => ({ prisma: { config: configMock } }));

const { getWhatsAppFlags } = await import("@/lib/whatsapp");

beforeEach(() => vi.clearAllMocks());

describe("getWhatsAppFlags", () => {
  it("não depende de configuração da Evolution", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const flags = await getWhatsAppFlags();
    expect(flags).not.toBeNull();
    expect(flags!.enabled).toBe(true);
  });

  it("devolve null quando o master switch está desligado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 0 });
    expect(await getWhatsAppFlags()).toBeNull();
  });

  it("aplica os padrões: recibo/boleto/lembrete ligados, resto desligado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1 });
    const flags = (await getWhatsAppFlags())!;
    expect(flags.autoRecibo).toBe(true);
    expect(flags.autoBoleto).toBe(true);
    expect(flags.autoLembrete).toBe(true);
    expect(flags.autoAniversario).toBe(false);
    expect(flags.autoNPS).toBe(false);
    expect(flags.diasInativo).toBe(60);
  });

  it("respeita diasInativo customizado", async () => {
    configMock.findFirst.mockResolvedValue({ whatsappAutoEnabled: 1, whatsappDiasInativo: 90 });
    expect((await getWhatsAppFlags())!.diasInativo).toBe(90);
  });
});
