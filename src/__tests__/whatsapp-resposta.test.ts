// Responder com citação (WhatsApp): entrada (context.id), saída (context.message_id), resolução em lote.
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  admin: vi.fn(), janela: vi.fn(), resolve: vi.fn(), send: vi.fn(), find: vi.fn(), create: vi.fn(),
  sent: vi.fn(), fail: vi.fn(), lock: vi.fn(), waId: vi.fn(), subir: vi.fn(), enviar: vi.fn(), gravar: vi.fn(), remover: vi.fn(),
  midiaUpdate: vi.fn(), config: vi.fn(),
  db: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/guards", () => ({ requireAdmin: m.admin }));
vi.mock("@/lib/whatsapp-provider", () => ({ resolveWhatsAppProviders: m.resolve }));
vi.mock("@/lib/whatsapp-atendimento-gratuito", () => ({ processarAtendimentoGratuito: vi.fn() }));
vi.mock("@/lib/whatsapp-midia-storage", () => ({ chaveNova: () => "midias/2026/10/00000000-0000-4000-8000-000000000000", gravar: m.gravar, remover: m.remover }));
vi.mock("@/lib/whatsapp-midia-meta", async (orig) => {
  const real = await orig<typeof import("@/lib/whatsapp-midia-meta")>();
  return { ...real, subirMidiaParaMeta: m.subir, enviarMidia: m.enviar };
});
vi.mock("@/lib/whatsapp-citacao", async (orig) => {
  const real = await orig<typeof import("@/lib/whatsapp-citacao")>();
  return { ...real, waIdDaCitada: m.waId };
});
vi.mock("@/lib/db", () => ({
  prisma: {
    config: { findFirst: m.config },
    whatsAppMidia: { update: m.midiaUpdate },
    whatsAppMensagem: m.db,
    $transaction: async (fn: (tx: unknown) => unknown) => fn({ $executeRaw: m.lock, whatsAppMensagem: { findFirst: m.find, create: m.create } }),
  },
}));

import { extrairMensagens } from "@/lib/meta-webhook-payload";
import { MetaProvider } from "@/lib/providers/whatsapp-meta";

const TEL = "559200000000";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

afterEach(() => vi.unstubAllGlobals());

describe("entrada: context.id da Meta", () => {
  const corpo = (msg: Record<string, unknown>) => ({ entry: [{ changes: [{ value: { contacts: [{ wa_id: TEL, profile: { name: "Ana" } }], messages: [{ from: TEL, ...msg }] } }] }] });

  it("texto com context.id vira respondeAWaId", () => {
    const [r] = extrairMensagens(corpo({ id: "wamid.B", type: "text", text: { body: "sim" }, context: { from: "5592", id: "wamid.A" } }));
    expect(r.respondeAWaId).toBe("wamid.A");
  });
  it("mídia com context.id também", () => {
    const [r] = extrairMensagens(corpo({ id: "wamid.C", type: "image", image: { id: "123", caption: "x" }, context: { id: "wamid.A" } }));
    expect(r.respondeAWaId).toBe("wamid.A");
  });
  it("sem context (ou context malformado) não define o campo", () => {
    expect(extrairMensagens(corpo({ id: "w1", type: "text", text: { body: "oi" } }))[0].respondeAWaId).toBeUndefined();
    expect(extrairMensagens(corpo({ id: "w2", type: "text", text: { body: "oi" }, context: { id: 42 } }))[0].respondeAWaId).toBeUndefined();
    expect(extrairMensagens(corpo({ id: "w3", type: "text", text: { body: "oi" }, context: "x" }))[0].respondeAWaId).toBeUndefined();
  });
});

describe("registrarEntradaDetalhada grava respondeAWaId", () => {
  it("passa o campo ao create", async () => {
    const { registrarEntradaDetalhada } = await import("@/lib/whatsapp-mensagem");
    m.db.findUnique.mockResolvedValue(null);
    m.db.create.mockResolvedValue({ id: 1, midia: null });
    await registrarEntradaDetalhada({ telefone: TEL, waMessageId: "wamid.B", corpo: "sim", respondeAWaId: "wamid.A" });
    expect(m.db.create.mock.calls[0]![0].data).toMatchObject({ respondeAWaId: "wamid.A" });
  });
});

describe("Meta: context.message_id no payload", () => {
  const prov = new MetaProvider({ token: "t", phoneNumberId: "1", apiVersion: "v21.0" });
  const ok = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.X" }] }) } as Response);
  const corpoEnviado = (f: ReturnType<typeof vi.fn>) => JSON.parse((f.mock.calls[0]![1] as RequestInit).body as string);

  it("texto com citação leva context", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    await prov.sendText(TEL, "oi", { respondeAWaId: "wamid.A" });
    expect(corpoEnviado(f)).toMatchObject({ type: "text", context: { message_id: "wamid.A" } });
  });
  it("texto sem citação não leva context", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    await prov.sendText(TEL, "oi");
    expect(corpoEnviado(f)).not.toHaveProperty("context");
  });
  it("mídia com citação leva context", async () => {
    const f = ok(); vi.stubGlobal("fetch", f);
    await prov.sendMedia(TEL, { tipo: "imagem", mediaId: "9", respondeAWaId: "wamid.A" });
    expect(corpoEnviado(f)).toMatchObject({ type: "image", image: { id: "9" }, context: { message_id: "wamid.A" } });
  });
});

describe("responderConversa com respondeA", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    m.admin.mockResolvedValue(true); m.janela.mockResolvedValue(true);
    m.find.mockResolvedValue(null); m.create.mockResolvedValue({ id: 12 });
    m.resolve.mockResolvedValue({ primary: { name: "meta_cloud", sendText: m.send } });
    m.send.mockResolvedValue({ ok: true, messageId: "wamid.novo" });
  });
  // dentroDaJanela24h/marcarEnviada vêm de whatsapp-mensagem; aqui o db é falso, então simulamos por prisma.
  const preparar = () => {
    m.db.findFirst.mockResolvedValue({ id: 1 }); // janela aberta
    m.db.findUnique.mockResolvedValue(null);
  };

  it("manda context ao provider e grava respondeAWaId", async () => {
    preparar();
    m.waId.mockResolvedValue("wamid.A");
    const { responderConversa } = await import("@/app/(app)/crm/atendimento/actions");
    const r = await responderConversa(TEL, "Olá", 7);
    expect(r.ok).toBe(true);
    expect(m.waId).toHaveBeenCalledWith(TEL, 7);
    expect(m.send).toHaveBeenCalledWith(TEL, "Olá", { respondeAWaId: "wamid.A" });
    expect(m.create.mock.calls[0]![0].data).toMatchObject({ respondeAWaId: "wamid.A" });
  });
  it("citada sem waMessageId: envia sem citação e sem falhar", async () => {
    preparar();
    m.waId.mockResolvedValue(null);
    const { responderConversa } = await import("@/app/(app)/crm/atendimento/actions");
    const r = await responderConversa(TEL, "Olá", 7);
    expect(r.ok).toBe(true);
    expect(m.send).toHaveBeenCalledWith(TEL, "Olá", undefined);
    expect(m.create.mock.calls[0]![0].data).not.toHaveProperty("respondeAWaId", expect.anything());
  });
  it("sem respondeA nem consulta a citada", async () => {
    preparar();
    const { responderConversa } = await import("@/app/(app)/crm/atendimento/actions");
    await responderConversa(TEL, "Olá");
    expect(m.waId).not.toHaveBeenCalled();
    expect(m.send).toHaveBeenCalledWith(TEL, "Olá", undefined);
  });
  it("dedupe de texto ignora mensagens que falharam", async () => {
    preparar();
    const { responderConversa } = await import("@/app/(app)/crm/atendimento/actions");
    await responderConversa(TEL, "Olá");
    expect(m.find.mock.calls[0]![0].where).toMatchObject({ status: { not: "falhou" } });
  });
  it("respondeA inválido é ignorado", async () => {
    preparar();
    const { responderConversa } = await import("@/app/(app)/crm/atendimento/actions");
    await responderConversa(TEL, "Olá", -3);
    expect(m.waId).not.toHaveBeenCalled();
  });
});

describe("enviarMidiaConversa com respondeA", () => {
  it("grava respondeAWaId e passa ao envio", async () => {
    vi.resetAllMocks();
    m.admin.mockResolvedValue(true);
    m.db.findFirst.mockResolvedValue({ id: 1 });
    m.find.mockResolvedValue(null); m.create.mockResolvedValue({ id: 31 });
    m.resolve.mockResolvedValue({ primary: { name: "meta_cloud" } });
    m.subir.mockResolvedValue("up-1"); m.midiaUpdate.mockResolvedValue({});
    m.enviar.mockResolvedValue({ ok: true, messageId: "wamid.m", provider: "meta_cloud" });
    m.waId.mockResolvedValue("wamid.A");
    const fd = new FormData();
    fd.set("telefone", TEL); fd.set("tipo", "imagem"); fd.set("respondeA", "7");
    fd.set("arquivo", new File([JPEG as BlobPart], "a.jpg", { type: "image/jpeg" }));
    const { enviarMidiaConversa } = await import("@/app/(app)/crm/atendimento/midia-actions");
    const r = await enviarMidiaConversa(fd);
    expect(r.ok).toBe(true);
    expect(m.waId).toHaveBeenCalledWith(TEL, 7);
    expect(m.create.mock.calls[0]![0].data).toMatchObject({ respondeAWaId: "wamid.A" });
    expect(m.enviar.mock.calls[0]![0]).toMatchObject({ respondeAWaId: "wamid.A" });
  });
});

describe("resolução em lote da citação", () => {
  beforeEach(() => { m.db.findMany.mockReset(); m.db.findFirst.mockReset(); });

  it("uma única consulta, mesmo telefone, ids únicos; devolve resumo por tipo", async () => {
    const { resolverCitacoes } = await import("@/lib/whatsapp-citacao");
    m.db.findMany.mockResolvedValue([
      { id: 5, waMessageId: "wamid.A", direcao: "in", tipo: "audio", corpo: "[Áudio]", midia: { id: "u1", tipo: "audio", status: "salva", voz: true, nomeExibicao: null, legenda: null } },
      { id: 6, waMessageId: "wamid.B", direcao: "out", tipo: "texto", corpo: "Olá", midia: null },
    ]);
    const mapa = await resolverCitacoes(TEL, [{ respondeAWaId: "wamid.A" }, { respondeAWaId: "wamid.A" }, { respondeAWaId: "wamid.B" }, { respondeAWaId: null }, {}]);
    expect(m.db.findMany).toHaveBeenCalledTimes(1);
    const args = m.db.findMany.mock.calls[0]![0];
    expect(args.where).toMatchObject({ telefone: TEL, waMessageId: { in: ["wamid.A", "wamid.B"] } });
    expect(mapa.get("wamid.A")).toMatchObject({ id: 5, direcao: "in", tipo: "audio", corpoResumo: "Mensagem de voz", midiaId: "u1" });
    expect(mapa.get("wamid.B")).toMatchObject({ id: 6, direcao: "out", tipo: "texto", corpoResumo: "Olá" });
  });
  it("citada fora do banco vira 'Mensagem indisponível'", async () => {
    const { resolverCitacoes } = await import("@/lib/whatsapp-citacao");
    m.db.findMany.mockResolvedValue([]);
    const mapa = await resolverCitacoes(TEL, [{ respondeAWaId: "wamid.Z" }]);
    expect(mapa.get("wamid.Z")).toMatchObject({ indisponivel: true, corpoResumo: "Mensagem indisponível" });
  });
  it("sem nenhuma citação não consulta o banco", async () => {
    const { resolverCitacoes } = await import("@/lib/whatsapp-citacao");
    const mapa = await resolverCitacoes(TEL, [{}, { respondeAWaId: null }]);
    expect(m.db.findMany).not.toHaveBeenCalled();
    expect(mapa.size).toBe(0);
  });
  it("waIdDaCitada filtra pelo telefone (não cita mensagem de outra conversa)", async () => {
    const { waIdDaCitada } = await vi.importActual<typeof import("@/lib/whatsapp-citacao")>("@/lib/whatsapp-citacao");
    m.db.findFirst.mockResolvedValue({ waMessageId: "wamid.A" });
    expect(await waIdDaCitada(TEL, 5)).toBe("wamid.A");
    expect(m.db.findFirst.mock.calls[0]![0].where).toMatchObject({ id: 5, telefone: TEL });
    m.db.findFirst.mockResolvedValue(null);
    expect(await waIdDaCitada(TEL, 9)).toBeNull();
  });
});
