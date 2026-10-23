import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";

const mocks = vi.hoisted(() => ({
  config: vi.fn(), entrada: vi.fn(), status: vi.fn(), atendimento: vi.fn(), gratuito: vi.fn(),
  depois: [] as (() => Promise<void>)[], midiaId: 'uuid-1' as string | null, processarMidia: vi.fn(),
}));
// `after()` só funciona dentro de um request do Next: aqui ele só guarda o callback para o teste rodar.
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => Promise<void>) => { mocks.depois.push(fn); } }));
vi.mock("@/lib/db", () => ({ prisma: { config: { findFirst: mocks.config } } }));
vi.mock("@/lib/whatsapp-midia-download", () => ({ processarMidia: mocks.processarMidia }));
vi.mock("@/lib/whatsapp-mensagem", () => ({
  // O teste programa `mocks.entrada` com booleano (nova ou reentrega); o id da mídia vem de `mocks.midiaId`.
  registrarEntradaDetalhada: async (...a: unknown[]) => {
    const r = await mocks.entrada(...a);
    return typeof r === 'boolean' ? { nova: r, midiaId: r ? mocks.midiaId : null } : r;
  },
  avancarStatusPorWaMessageId: mocks.status,
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
  mocks.depois.length = 0;
  mocks.midiaId = 'uuid-1';
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
  it("valor 1 (gateway antigo) não chama o pré-atendimento: responde pelo caminho único, uma vez só", async () => {
    mocks.config.mockResolvedValue({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 1 });
    mocks.gratuito.mockResolvedValue(undefined);
    const body = { entry: [{ changes: [change("222222222222222", "foreign"), change(TARGET, "allowed")] }] };
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.atendimento).not.toHaveBeenCalled();
    expect(mocks.gratuito).toHaveBeenCalledTimes(1);
    mocks.entrada.mockResolvedValue(false);
    expect((await POST(request(body))).status).toBe(200);
    expect(mocks.atendimento).not.toHaveBeenCalled();
    expect(mocks.gratuito).toHaveBeenCalledTimes(1);
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

describe('webhook com a IA disponível (modelo + segredo)', () => {
  beforeEach(() => { vi.stubEnv('MCP_AGENTE_SECRET', 'x'.repeat(32)); });
  const body = () => ({ entry: [{ changes: [{ value: {
    metadata: { phone_number_id: TARGET },
    contacts: [{ wa_id: '5592000000000', profile: { name: 'Maria' } }],
    messages: [{ from: '5592000000000', id: 'ia1', type: 'text', text: { body: 'tem iphone?' } }],
  } }] }] });
  // `comModelo`: com URL e chave do LiteLLM a IA está disponível; sem eles o atendimento é por regras.
  const cfgIa = (comModelo: boolean) => ({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 2, ...(comModelo ? { litellmUrl: 'https://llm.exemplo.test', litellmKey: 'sk-fake' } : {}) });
  it('responde 200 sem esperar a IA: o atendimento roda em after() com o nome do perfil', async () => {
    mocks.config.mockResolvedValue(cfgIa(true));
    let liberar!: () => void;
    mocks.gratuito.mockImplementation(() => new Promise<void>(r => { liberar = r; }));
    const res = await POST(request(body()));
    expect(res.status).toBe(200);
    expect(mocks.gratuito).not.toHaveBeenCalled();
    expect(mocks.depois).toHaveLength(1);
    const rodando = mocks.depois[0]();
    await vi.waitFor(() => expect(mocks.gratuito).toHaveBeenCalledWith('5592000000000', 'tem iphone?', 'Maria'));
    liberar();
    await rodando;
  });
  it('com a IA disponível, saudação e ATENDENTE seguem no próprio request; pergunta de parcelas agenda o after()', async () => {
    mocks.config.mockResolvedValue(cfgIa(true));
    mocks.gratuito.mockResolvedValue(undefined);
    const msg = (id: string, texto: string) => ({ entry: [{ changes: [{ value: {
      metadata: { phone_number_id: TARGET },
      messages: [{ from: '5592000000000', id, type: 'text', text: { body: texto } }],
    } }] }] });
    await POST(request(msg('s1', 'oi')));
    await POST(request(msg('s2', 'ATENDENTE')));
    expect(mocks.gratuito).toHaveBeenCalledTimes(2);
    expect(mocks.depois).toHaveLength(0);
    mocks.gratuito.mockClear();
    await POST(request(msg('s3', 'quando vence minha parcela?')));
    expect(mocks.gratuito).not.toHaveBeenCalled();
    expect(mocks.depois).toHaveLength(1);
  });
  it('reentrega (nova=false) não agenda nada', async () => {
    mocks.config.mockResolvedValue(cfgIa(true));
    mocks.entrada.mockResolvedValue(false);
    await POST(request(body()));
    expect(mocks.depois).toHaveLength(0);
  });
  it('erro do atendimento em after() não propaga', async () => {
    mocks.config.mockResolvedValue(cfgIa(true));
    mocks.gratuito.mockRejectedValue(new Error('boom'));
    await POST(request(body()));
    await expect(mocks.depois[0]()).resolves.toBeUndefined();
  });
  it('sem modelo: aguarda o atendimento no próprio request, como hoje', async () => {
    mocks.config.mockResolvedValue(cfgIa(false));
    mocks.gratuito.mockResolvedValue(undefined);
    await POST(request(body()));
    expect(mocks.gratuito).toHaveBeenCalledTimes(1);
    expect(mocks.depois).toHaveLength(0);
  });
});

describe('mídia recebida não aciona automático', () => {
  const HEX = 'b'.repeat(64);
  const body = () => ({ entry: [{ changes: [{ value: {
    metadata: { phone_number_id: TARGET },
    contacts: [{ wa_id: '5592000000000', profile: { name: 'Maria' } }],
    messages: [{ from: '5592000000000', id: 'm1', type: 'image', image: { id: '777', mime_type: 'image/jpeg', sha256: HEX, caption: 'tem iphone?' } }],
  } }] }] });

  it('grava mensagem + mídia (tipo e midia repassados) e NÃO chama gratuito nem pré-atendimento (modos 1 e 2)', async () => {
    for (const modo of [1, 2]) {
      mocks.config.mockResolvedValue({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: modo });
      expect((await POST(request(body()))).status).toBe(200);
    }
    expect(mocks.entrada).toHaveBeenCalledWith(expect.objectContaining({
      waMessageId: 'm1', tipo: 'imagem', corpo: '[Foto] tem iphone?',
      midia: expect.objectContaining({ mediaId: '777' }),
    }));
    expect(mocks.gratuito).not.toHaveBeenCalled();
    expect(mocks.atendimento).not.toHaveBeenCalled();
  });

  it('com a IA de verdade ligada, texto agenda after() mas mídia não agenda nada', async () => {
    vi.stubEnv('MCP_AGENTE_SECRET', 'x'.repeat(32));
    const cfgComIa = { metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 2, litellmUrl: 'https://llm.exemplo.test', litellmKey: 'sk-fake' };
    mocks.config.mockResolvedValue(cfgComIa);
    mocks.midiaId = null; // isola o agendamento da IA: o download da mídia é outro after()
    // prova que o cenário liga a IA: um texto agenda o atendimento
    await POST(request({ entry: [{ changes: [{ value: {
      metadata: { phone_number_id: TARGET },
      messages: [{ from: '5592000000000', id: 't1', type: 'text', text: { body: 'tem iphone?' } }],
    } }] }] }));
    expect(mocks.depois).toHaveLength(1);
    mocks.depois.length = 0;
    await POST(request(body()));
    expect(mocks.depois).toHaveLength(0);
    expect(mocks.gratuito).not.toHaveBeenCalled();
  });

  it('a mídia nova conta como mensagem armazenada (abre a janela de 24 h)', async () => {
    await POST(request(body()));
    expect(metaWebhookTelemetry().events.at(-1)).toMatchObject({ outcome: 'processed', storedMessages: 1 });
  });

  describe('download da mídia agendado em after()', () => {
    beforeEach(() => {
      mocks.processarMidia.mockResolvedValue(undefined);
    });

    it('áudio grava, agenda processarMidia após o 200 e não aciona atendimento', async () => {
      mocks.config.mockResolvedValue({ metaAppSecret: SECRET, metaWhatsappPhoneNumberId: TARGET, whatsappPreAtendimento: 2 });
      const res = await POST(request({ entry: [{ changes: [{ value: {
        metadata: { phone_number_id: TARGET },
        messages: [{ from: '5592000000000', id: 'a1', type: 'audio', audio: { id: '888', mime_type: 'audio/ogg', sha256: HEX, voice: true } }],
      } }] }] }));
      expect(res.status).toBe(200);
      expect(mocks.processarMidia).not.toHaveBeenCalled(); // o 200 sai antes do download
      expect(mocks.depois).toHaveLength(1);
      await mocks.depois[0]();
      expect(mocks.processarMidia).toHaveBeenCalledWith('uuid-1');
      expect(mocks.gratuito).not.toHaveBeenCalled();
      expect(mocks.atendimento).not.toHaveBeenCalled();
    });

    it('reentrega (nova=false) não agenda nada', async () => {
      mocks.entrada.mockResolvedValue(false);
      await POST(request(body()));
      expect(mocks.depois).toHaveLength(0);
      expect(mocks.processarMidia).not.toHaveBeenCalled();
    });

    it('agenda pelo id devolvido por registrarEntrada, sem reconsultar o banco (nem sem waMessageId)', async () => {
      // O prisma deste teste nem tem `whatsAppMidia`: qualquer findFirst por waMessageId derrubaria a rota.
      mocks.midiaId = 'uuid-do-registro';
      await POST(request(body()));
      await mocks.depois[0]();
      expect(mocks.processarMidia).toHaveBeenCalledWith('uuid-do-registro');
    });

    it('nova sem id de mídia (linha de mídia não criada) não agenda nada', async () => {
      mocks.midiaId = null;
      await POST(request(body()));
      expect(mocks.depois).toHaveLength(0);
    });

    it('erro no download não propaga e não vaza detalhes no log', async () => {
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mocks.processarMidia.mockRejectedValue(new Error('https://lookaside.fbsbx.com/?hash=SEGREDO'));
      await POST(request(body()));
      await expect(mocks.depois[0]()).resolves.toBeUndefined();
      expect(JSON.stringify(aviso.mock.calls)).not.toContain('SEGREDO');
      aviso.mockRestore();
    });
  });
});
