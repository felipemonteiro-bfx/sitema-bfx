import { beforeEach, expect, it, vi } from "vitest";
const windowCheck = vi.hoisted(() => vi.fn());
vi.mock("@/lib/whatsapp-mensagem", () => ({ dentroDaJanela24h: windowCheck }));
import { MetaProvider } from "@/lib/providers/whatsapp-meta";
const provider = new MetaProvider({ token: "test", phoneNumberId: "test", apiVersion: "v23.0", freeServiceOnly: true });
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "test" }] }) })); });
it("blocks templates before any Meta request", async () => {
  expect((await provider.sendTemplate("559200000000", { name: "bfx_boleto", language: "pt_BR", bodyParams: ["Nome", "https://example.com"], fallbackText: "boleto" })).ok).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
it("allows only service text inside the customer window", async () => {
  windowCheck.mockResolvedValue(true);
  expect((await provider.sendText("559200000000", "Atendimento")).ok).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("blocks expired windows and fails closed when window check fails", async () => {
  windowCheck.mockResolvedValue(false);
  expect((await provider.sendText("559200000000", "Atendimento")).ok).toBe(false);
  windowCheck.mockRejectedValue(new Error("db unavailable"));
  expect((await provider.sendText("559200000000", "Atendimento")).ok).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
