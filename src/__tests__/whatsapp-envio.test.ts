import { describe, it, expect, vi, beforeEach } from "vitest";

const mensagemMock = {
  dentroDaJanela24h: vi.fn(),
  registrarSaida: vi.fn(),
  marcarEnviada: vi.fn(),
  marcarFalha: vi.fn(),
};
const providerMock = { resolveWhatsAppProviders: vi.fn() };

vi.mock("@/lib/whatsapp-mensagem", () => mensagemMock);
vi.mock("@/lib/whatsapp-provider", () => providerMock);
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: vi.fn().mockResolvedValue(null) } } }));

const { enviarWhatsApp } = await import("@/lib/whatsapp");

const template = {
  name: "bfx_aniversario",
  language: "pt_BR",
  bodyParams: ["João"],
  fallbackText: "Parabéns, João!",
};

let sendText: ReturnType<typeof vi.fn>;
let sendTemplate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  sendText = vi.fn().mockResolvedValue({ ok: true, messageId: "wamid.T", provider: "meta_cloud" });
  sendTemplate = vi.fn().mockResolvedValue({ ok: true, messageId: "wamid.P", provider: "meta_cloud" });
  providerMock.resolveWhatsAppProviders.mockResolvedValue({
    primary: { name: "meta_cloud", sendText, sendTemplate, sendDocument: vi.fn() },
    fallback: null,
    providerName: "meta_cloud",
  });
  mensagemMock.registrarSaida.mockResolvedValue(99);
});

describe("enviarWhatsApp", () => {
  it("dentro da janela de 24h envia texto livre", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(true);
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(true);
    expect(sendText).toHaveBeenCalledWith("5592999999999", "Parabéns, João!");
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it("fora da janela envia o template aprovado", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(true);
    expect(sendTemplate).toHaveBeenCalledWith("5592999999999", template);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("registra a saída e marca como enviada com o waMessageId", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    await enviarWhatsApp({ telefone: "92999999999", clienteId: 7, origem: "cron", template });
    expect(mensagemMock.registrarSaida).toHaveBeenCalledWith(
      expect.objectContaining({
        telefone: "5592999999999",
        clienteId: 7,
        origem: "cron",
        templateNome: "bfx_aniversario",
        corpo: "Parabéns, João!",
      })
    );
    expect(mensagemMock.marcarEnviada).toHaveBeenCalledWith(99, "wamid.P");
  });

  it("texto livre registra templateNome null", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(true);
    await enviarWhatsApp({ telefone: "92999999999", origem: "pre_atendimento", template });
    expect(mensagemMock.registrarSaida).toHaveBeenCalledWith(
      expect.objectContaining({ templateNome: null })
    );
  });

  it("fora da janela e sem template aplicável falha com janela_expirada", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    const ok = await enviarWhatsApp({
      telefone: "92999999999",
      origem: "pre_atendimento",
      template: { ...template, name: "" },
    });
    expect(ok).toBe(false);
    expect(sendTemplate).not.toHaveBeenCalled();
    expect(sendText).not.toHaveBeenCalled();
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "janela_expirada");
  });

  it("falha do provider marca falha na mensagem", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    sendTemplate.mockResolvedValue({ ok: false, error: "Invalid token", provider: "meta_cloud" });
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "Invalid token");
  });

  it("telefone inválido não registra nada", async () => {
    const ok = await enviarWhatsApp({ telefone: "123", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.registrarSaida).not.toHaveBeenCalled();
  });

  it("sem provider configurado marca falha", async () => {
    mensagemMock.dentroDaJanela24h.mockResolvedValue(false);
    providerMock.resolveWhatsAppProviders.mockResolvedValue({
      primary: null,
      fallback: null,
      providerName: "meta_cloud",
    });
    const ok = await enviarWhatsApp({ telefone: "92999999999", origem: "cron", template });
    expect(ok).toBe(false);
    expect(mensagemMock.marcarFalha).toHaveBeenCalledWith(99, "provider_nao_configurado");
  });
});
