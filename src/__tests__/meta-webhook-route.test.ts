import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), entrada: vi.fn(), status: vi.fn(), atendimento: vi.fn(), gratuito: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: mocks.config } } }));
vi.mock("@/lib/whatsapp-mensagem", () => ({
  registrarEntrada: mocks.entrada, avancarStatusPorWaMessageId: mocks.status,
}));
vi.mock("@/lib/whatsapp-pre-atendimento", () => ({ processarMensagemRecebida: mocks.atendimento }));
vi.mock('@/lib/whatsapp-atendimento-gratuito',()=>({processarAtendimentoGratuito:mocks.gratuito}));
import { POST } from "@/app/api/webhooks/meta-whatsapp/route";
import { metaWebhookTelemetry } from '@/lib/meta-webhook-telemetry';

const SECRET = "unit-test-only-not-a-real-key";
const TARGET = "111111111111111";
function change(phoneId: string, id: string) {
  return { value: {
    metadata: { phone_number_id: phoneId },
    messages: [{ from: "5592000000000", id, type: "text", text: { body: "teste" } }],
    statuses: [{ id, status: "delivered" }],
  } };
}
function request(body: unknown, valid = true) {
  const raw = JSON.stringify(body);
  return new Request("https://example.test/api/webhooks/meta-whatsapp", {
    method: "POST", body: raw,
    headers: { "x-hub-signature-256": valid ? "sha256=" + createHmac("sha256", SECRET).update(raw).digest("hex") : "sha256=bad" },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockResolvedValue({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 0 });
  mocks.entrada.mockResolvedValue(true);
  mocks.status.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
describe("webhook Meta restrito ao número configurado", () => {
  it('diferencia assinatura rejeitada de evento autenticado sem número aceito, sem guardar payload', async () => {
    await POST(request({ entry: [] }, false));
    expect(metaWebhookTelemetry().events.at(-1)?.outcome).toBe('signature_rejected');
    await POST(request({ entry: [{ changes: [change('222222222222222', 'foreign')] }] }));
    expect(metaWebhookTelemetry().events.at(-1)).toMatchObject({outcome:'processed',acceptedChanges:0,storedMessages:0});
    expect(JSON.stringify(metaWebhookTelemetry())).not.toContain(SECRET);
  });
  it("persiste somente mensagens e status do número configurado em lote misto", async () => {
    const res = await POST(request({ entry: [{ changes: [change("222222222222222", "foreign"), change(TARGET, "allowed")] }] }));
    expect(res.status).toBe(200);
    expect(mocks.entrada).toHaveBeenCalledTimes(1);
    expect(mocks.entrada).toHaveBeenCalledWith(expect.objectContaining({ waMessageId: "allowed" }));
    expect(mocks.status).toHaveBeenCalledTimes(1);
    expect(mocks.status.mock.calls[0][0]).toBe("allowed");
    expect(mocks.atendimento).not.toHaveBeenCalled();
  });
  it("não aceita eventos sem identificação do número", async () => {
    const event = change(TARGET, "missing");
    delete (event.value as { metadata?: unknown }).metadata;
    expect((await POST(request({ entry: [{ changes: [event] }] }))).status).toBe(200);
    expect(mocks.entrada).not.toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("bloqueia recebimento se o número não foi configurado", async () => {
    mocks.config.mockResolvedValue({ metaAppSecret: SECRET, whatsappPreAtendimento: 1 });
    vi.stubEnv("META_WHATSAPP_PHONE_NUMBER_ID", "");
    expect((await POST(request({ entry: [{ changes: [change(TARGET, "x")] }] }))).status).toBe(503);
    expect(mocks.entrada).not.toHaveBeenCalled();
  });
  it("rejeita assinatura inválida antes de persistir ou responder", async () => {
    expect((await POST(request({ entry: [{ changes: [change(TARGET, "x")] }] }, false))).status).toBe(401);
    expect(mocks.entrada).not.toHaveBeenCalled();
    expect(mocks.atendimento).not.toHaveBeenCalled();
  });
  it("não confirma entrega quando a persistência falha", async () => {
    mocks.entrada.mockRejectedValue(new Error("test persistence unavailable"));
    expect((await POST(request({ entry: [{ changes: [change(TARGET, "retry")] }] }))).status).toBe(503);
    expect(mocks.atendimento).not.toHaveBeenCalled();
  });
  it("aciona atendimento somente para mensagem nova do número permitido", async () => {
    mocks.config.mockResolvedValue({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 1 });
    const body = { entry: [{ changes: [change("222222222222222", "foreign"), change(TARGET, "allowed")] }] };
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.atendimento).toHaveBeenCalledTimes(1);
    mocks.atendimento.mockClear();
    mocks.entrada.mockResolvedValue(false);
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.atendimento).not.toHaveBeenCalled();
  });
});

it('processa modo gratuito sem IA e não responde reentrega',async()=>{
 mocks.config.mockResolvedValue({metaAppSecret:SECRET,metaWhatsappPhoneNumberId:TARGET,whatsappPreAtendimento:2});
 mocks.gratuito.mockResolvedValue(undefined);
 const body={entry:[{changes:[change(TARGET,'free')]}]};
 expect((await POST(request(body))).status).toBe(200);
 expect(mocks.gratuito).toHaveBeenCalledTimes(1);expect(mocks.atendimento).not.toHaveBeenCalled();
 mocks.entrada.mockResolvedValue(false);await POST(request(body));expect(mocks.gratuito).toHaveBeenCalledTimes(1);
});
