import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EvolutionProvider } from "@/lib/providers/whatsapp-evolution";
import { MetaProvider } from "@/lib/providers/whatsapp-meta";

const okResponse = (json: unknown = {}) =>
  ({ ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) }) as Response;
const errResponse = (status: number, json: unknown = {}) =>
  ({ ok: false, status, json: async () => json, text: async () => JSON.stringify(json) }) as Response;

describe("EvolutionProvider", () => {
  const provider = new EvolutionProvider({ baseUrl: "http://evo", apiKey: "K", instance: "bfx" });

  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sendText: POST no endpoint sendText com apikey e linkPreview", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const r = await provider.sendText("5592999999999", "oi");
    expect(r.ok).toBe(true);
    expect(r.provider).toBe("evolution");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://evo/message/sendText/bfx");
    expect((init as RequestInit).headers).toMatchObject({ apikey: "K" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ number: "5592999999999", text: "oi", linkPreview: true });
  });

  it("sendText: retorna ok=false em HTTP de erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errResponse(500)));
    const r = await provider.sendText("5592999999999", "oi");
    expect(r.ok).toBe(false);
  });

  it("sendTemplate: cai para sendText usando fallbackText", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);
    const r = await provider.sendTemplate("5592999999999", {
      name: "lembrete",
      language: "pt_BR",
      bodyParams: ["João", "R$ 100"],
      fallbackText: "Olá João, sua parcela de R$ 100 vence amanhã.",
    });
    expect(r.ok).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.text).toBe("Olá João, sua parcela de R$ 100 vence amanhã.");
  });
});

describe("MetaProvider", () => {
  const provider = new MetaProvider({ token: "TKN", phoneNumberId: "123", apiVersion: "v21.0" });

  afterEach(() => vi.restoreAllMocks());

  it("sendText: POST graph.facebook.com com Bearer e type text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ messages: [{ id: "wamid.ABC" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await provider.sendText("5592999999999", "oi");
    expect(r.ok).toBe(true);
    expect(r.messageId).toBe("wamid.ABC");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer TKN" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ messaging_product: "whatsapp", to: "5592999999999", type: "text" });
  });

  it("sendText: erro da API (data.error) retorna ok=false com mensagem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse({ error: { message: "Invalid token" } })));
    const r = await provider.sendText("5592999999999", "oi");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Invalid token");
  });

  it("sendTemplate: monta components de header (documento) e body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ messages: [{ id: "x" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await provider.sendTemplate("5592999999999", {
      name: "relatorio",
      language: "pt_BR",
      bodyParams: ["junho/2026"],
      headerDocumentUrl: "http://x/rel.pdf",
      fallbackText: "fallback",
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("relatorio");
    const header = body.template.components.find((c: { type: string }) => c.type === "header");
    const bodyComp = body.template.components.find((c: { type: string }) => c.type === "body");
    expect(header.parameters[0].document.link).toBe("http://x/rel.pdf");
    expect(bodyComp.parameters[0].text).toBe("junho/2026");
  });

  it("sendDocument: exige URL pública (base64 não suportado)", async () => {
    const r = await provider.sendDocument("5592999999999", {
      base64: "abc",
      filename: "x.pdf",
      mimetype: "application/pdf",
    });
    expect(r.ok).toBe(false);
  });
});
