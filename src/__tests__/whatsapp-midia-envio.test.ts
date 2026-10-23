import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const m = vi.hoisted(() => ({
  admin: vi.fn(),
  janela: vi.fn(),
  resolve: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  lock: vi.fn(),
  enviada: vi.fn(),
  falha: vi.fn(),
  gravar: vi.fn(),
  remover: vi.fn(),
  subir: vi.fn(),
  enviar: vi.fn(),
  config: vi.fn(),
  midiaUpdate: vi.fn(),
  dentroDaTx: { valor: false },
  chamadasEmTx: [] as string[],
}));
vi.mock("@/lib/guards", () => ({ requireAdmin: m.admin }));
vi.mock("@/lib/whatsapp-mensagem", () => ({ dentroDaJanela24h: m.janela, marcarEnviada: m.enviada, marcarFalha: m.falha }));
vi.mock("@/lib/whatsapp-provider", () => ({ resolveWhatsAppProviders: m.resolve }));
vi.mock("@/lib/whatsapp-midia-storage", () => ({ chaveNova: () => "midias/2026/10/00000000-0000-4000-8000-000000000000", gravar: m.gravar, remover: m.remover }));
vi.mock("@/lib/whatsapp-atendimento-gratuito", () => ({ processarAtendimentoGratuito: vi.fn() }));
vi.mock("@/lib/whatsapp-midia-meta", async (orig) => {
  const real = await orig<typeof import("@/lib/whatsapp-midia-meta")>();
  return { ...real, subirMidiaParaMeta: m.subir, enviarMidia: m.enviar };
});
vi.mock("@/lib/db", () => ({
  prisma: {
    config: { findFirst: m.config },
    whatsAppMidia: { update: m.midiaUpdate },
    $transaction: async (fn: (tx: unknown) => unknown) => {
      m.dentroDaTx.valor = true;
      try {
        return await fn({ $executeRaw: m.lock, whatsAppMensagem: { findFirst: m.find, create: m.create } });
      } finally {
        m.dentroDaTx.valor = false;
      }
    },
  },
}));

import { readFileSync } from "node:fs";
import { enviarMidiaConversa } from "@/app/(app)/crm/atendimento/midia-actions";
import { LIMITE_ENVIO_BYTES } from "@/lib/whatsapp-midia-politica";
import { MetaProvider } from "@/lib/providers/whatsapp-meta";

const TEL = "559200000000";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

function form(bytes: Uint8Array, nome: string, extra: Record<string, string> = {}, tipo = "imagem") {
  const fd = new FormData();
  fd.set("telefone", TEL);
  fd.set("tipo", tipo);
  fd.set("arquivo", new File([bytes as BlobPart], nome, { type: "image/jpeg" }));
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.resetAllMocks();
  m.admin.mockResolvedValue(true);
  m.janela.mockResolvedValue(true);
  m.resolve.mockResolvedValue({ primary: { name: "meta_cloud" } });
  m.find.mockResolvedValue(null);
  m.create.mockResolvedValue({ id: 31 });
  m.gravar.mockImplementation(async () => { if (m.dentroDaTx.valor) m.chamadasEmTx.push("gravar"); });
  m.midiaUpdate.mockResolvedValue({});
  m.chamadasEmTx.length = 0;
  m.remover.mockResolvedValue(undefined);
  m.subir.mockImplementation(async () => { if (m.dentroDaTx.valor) m.chamadasEmTx.push("subir"); return "upload-1"; });
  m.enviar.mockResolvedValue({ ok: true, messageId: "wamid.midia", provider: "meta_cloud" });
});
afterEach(() => vi.unstubAllGlobals());

describe("enviarMidiaConversa", () => {
  it("não-admin recusa sem tocar em storage nem Meta", async () => {
    m.admin.mockResolvedValue(false);
    expect((await enviarMidiaConversa(form(JPEG, "a.jpg"))).ok).toBe(false);
    expect(m.gravar).not.toHaveBeenCalled();
    expect(m.subir).not.toHaveBeenCalled();
  });

  it("janela fechada recusa sem storage nem upload", async () => {
    m.janela.mockResolvedValue(false);
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(m.gravar).not.toHaveBeenCalled();
    expect(m.subir).not.toHaveBeenCalled();
    expect(m.enviar).not.toHaveBeenCalled();
  });

  it("arquivo acima do limite é recusado sem ler o conteúdo", async () => {
    const fd = form(JPEG, "a.jpg");
    const grande = { size: LIMITE_ENVIO_BYTES + 1, name: "g.jpg", arrayBuffer: vi.fn() } as unknown as File;
    Object.setPrototypeOf(grande, File.prototype);
    Object.defineProperty(grande, "size", { value: LIMITE_ENVIO_BYTES + 1 });
    const ler = vi.fn();
    Object.defineProperty(grande, "arrayBuffer", { value: ler });
    fd.set("arquivo", grande as unknown as Blob);
    const r = await enviarMidiaConversa(fd);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/9 MB/);
    expect(ler).not.toHaveBeenCalled();
    expect(m.gravar).not.toHaveBeenCalled();
  });

  it("tipo falsificado (PDF com nome .jpg como imagem) é recusado pelos bytes", async () => {
    const r = await enviarMidiaConversa(form(PDF, "foto.jpg"));
    expect(r.ok).toBe(false);
    expect(m.gravar).not.toHaveBeenCalled();
    expect(m.subir).not.toHaveBeenCalled();
  });

  it("áudio OGG/Opus mono vai como nota de voz (voz: true); M4A vai como áudio comum", async () => {
    const ogg = new Uint8Array(47);
    ogg.set(new TextEncoder().encode("OggS"), 0); ogg[26] = 1; ogg[27] = 19; ogg.set(new TextEncoder().encode("OpusHead"), 28); ogg[36] = 1; ogg[37] = 1;
    await enviarMidiaConversa(form(ogg, "audio.ogg", {}, "audio"));
    expect(m.enviar).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: "audio", voz: true }));
    expect(m.create.mock.calls.at(-1)![0].data.midia.create.voz).toBe(true);
    const m4a = new Uint8Array(32); m4a.set(new TextEncoder().encode("ftypM4A "), 4);
    await enviarMidiaConversa(form(m4a, "audio.m4a", {}, "audio"));
    expect(m.enviar).toHaveBeenLastCalledWith(expect.objectContaining({ tipo: "audio", voz: false }));
  });

  it("legenda acima de 1024 caracteres é recusada", async () => {
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg", { legenda: "x".repeat(1025) }));
    expect(r.ok).toBe(false);
    expect(m.gravar).not.toHaveBeenCalled();
  });

  it("caminho feliz: registra pendente, grava, sobe, atualiza para salva, envia e marca enviada", async () => {
    const ordem: string[] = [];
    m.gravar.mockImplementation(async () => void ordem.push("gravar"));
    m.subir.mockImplementation(async () => (ordem.push("subir"), "upload-1"));
    m.create.mockImplementation(async () => (ordem.push("registrar"), { id: 31 }));
    m.midiaUpdate.mockImplementation(async () => (ordem.push("salva"), {}));
    m.enviar.mockImplementation(async () => (ordem.push("enviar"), { ok: true, messageId: "wamid.midia", provider: "meta_cloud" }));
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg", { legenda: " oi " }));
    expect(r.ok).toBe(true);
    expect(ordem).toEqual(["registrar", "gravar", "subir", "salva", "enviar"]);
    expect(m.lock).toHaveBeenCalled();
    const data = m.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ telefone: TEL, direcao: "out", origem: "manual", tipo: "imagem", status: "pendente", corpo: "[Foto] oi" });
    expect(data.midia.create).toMatchObject({
      tipo: "imagem", mime: "image/jpeg", sha256: sha(JPEG), status: "pendente",
      chaveStorage: "midias/2026/10/00000000-0000-4000-8000-000000000000",
    });
    const upd = m.midiaUpdate.mock.calls[0]![0];
    expect(upd.where).toEqual({ mensagemId: 31 });
    expect(upd.data).toMatchObject({ status: "salva", uploadMediaId: "upload-1", metaMediaId: "upload-1" });
    expect(upd.data.uploadEm).toBeInstanceOf(Date);
    expect(m.enviar).toHaveBeenCalledWith(expect.objectContaining({ para: TEL, tipo: "imagem", mediaId: "upload-1", legenda: "oi" }));
    expect(m.enviada).toHaveBeenCalledWith(31, "wamid.midia");
  });

  it("dedupe por sha256 do conteúdo no mesmo telefone em 90 s", async () => {
    m.find.mockResolvedValue({ id: 9 });
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    const where = m.find.mock.calls[0]![0].where;
    expect(where).toMatchObject({ telefone: TEL, direcao: "out", midia: { is: { sha256: sha(JPEG) } } });
    expect(where.criadoEm.gte.getTime()).toBeGreaterThan(Date.now() - 91_000);
    expect(m.gravar).not.toHaveBeenCalled();
    expect(m.enviar).not.toHaveBeenCalled();
  });

  it("falha da Meta no envio marca a mensagem como falhou", async () => {
    m.enviar.mockResolvedValue({ ok: false, error: "midia_nao_suportada", codigo: 131053, provider: "meta_cloud" });
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(m.falha).toHaveBeenCalledWith(31, expect.any(String), 131053);
    expect(m.enviada).not.toHaveBeenCalled();
    expect(m.remover).not.toHaveBeenCalled();
  });

  it("resultado incerto fica pendente, sem reenvio e sem expor o erro", async () => {
    m.enviar.mockRejectedValue(new Error("token-secreto"));
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain("token-secreto");
    expect(m.enviar).toHaveBeenCalledTimes(1);
    expect(m.enviada).not.toHaveBeenCalled();
    expect(m.falha).not.toHaveBeenCalled();
    expect(m.remover).not.toHaveBeenCalled();
  });

  it("upload e storage rodam FORA da transação que segura o lock do telefone", async () => {
    await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(m.gravar).toHaveBeenCalled();
    expect(m.subir).toHaveBeenCalled();
    expect(m.chamadasEmTx).toEqual([]);
  });

  it("falha do upload à Meta marca a mídia e a mensagem como falhou e remove o objeto", async () => {
    m.subir.mockRejectedValue(new Error("rede"));
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(m.remover).toHaveBeenCalledWith("midias/2026/10/00000000-0000-4000-8000-000000000000");
    expect(m.midiaUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { mensagemId: 31 }, data: expect.objectContaining({ status: "falhou", chaveStorage: null }) }));
    expect(m.falha).toHaveBeenCalledWith(31, expect.any(String));
    expect(m.enviar).not.toHaveBeenCalled();
  });

  it("falha ao registrar a mensagem (transação curta) não grava nada no storage", async () => {
    m.create.mockRejectedValue(new Error("db"));
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(m.gravar).not.toHaveBeenCalled();
    expect(m.enviar).not.toHaveBeenCalled();
  });

  it("falha do próprio storage marca falhou e não chama a Meta", async () => {
    m.gravar.mockRejectedValue(new Error("s3"));
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(false);
    expect(m.subir).not.toHaveBeenCalled();
    expect(m.falha).toHaveBeenCalledWith(31, expect.any(String));
  });
});

describe("rede: só graph.facebook.com", () => {
  it("upload e envio reais (fetch simulado) falam apenas com graph.facebook.com", async () => {
    const real = await vi.importActual<typeof import("@/lib/whatsapp-midia-meta")>("@/lib/whatsapp-midia-meta");
    m.subir.mockImplementation(real.subirMidiaParaMeta);
    m.enviar.mockImplementation(real.enviarMidia);
    m.config.mockResolvedValue({ metaWhatsappToken: "tok", metaWhatsappPhoneNumberId: "123", metaWhatsappApiVersion: "v21.0" });
    const fetchMock = vi.fn(async (url: string) =>
      String(url).endsWith("/media")
        ? new Response(JSON.stringify({ id: "up-9" }), { status: 200 })
        : new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const r = await enviarMidiaConversa(form(JPEG, "a.jpg"));
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const c of fetchMock.mock.calls) expect(new URL(String(c[0])).hostname).toBe("graph.facebook.com");
  });
});

describe("post() do MetaProvider: erro sem vazamento", () => {
  const prov = new MetaProvider({ token: "TOKEN-SECRETO", phoneNumberId: "123", apiVersion: "v21.0" });
  it("loga só status e code da Meta e grava mensagem curta mapeada", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: 131053, message: "Media upload error TOKEN-SECRETO https://lookaside.fbsbx.com/x?hash=SEGREDO" } }), { status: 400 })));
    const r = await prov.sendText(TEL, "oi");
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ codigo: 131053 });
    expect(r.error).not.toMatch(/TOKEN|lookaside|SEGREDO/);
    expect(r.error!.length).toBeLessThan(120);
    const log = JSON.stringify(espiao.mock.calls);
    expect(log).toContain("131053");
    expect(log).toContain("400");
    expect(log).not.toMatch(/TOKEN|Bearer|graph\.facebook|lookaside|SEGREDO/);
    espiao.mockRestore();
  });
  it("exceção de rede não loga nem grava o texto cru do erro", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED https://graph.facebook.com/v21.0/123/messages Bearer TOKEN-SECRETO"); }));
    const r = await prov.sendText(TEL, "oi");
    expect(r.ok).toBe(false);
    expect(r.error).not.toMatch(/TOKEN|graph|Bearer/);
    expect(JSON.stringify(espiao.mock.calls)).not.toMatch(/TOKEN|Bearer|graph\.facebook/);
    espiao.mockRestore();
  });
});

describe("páginas do PDF enviado (teste de fonte)", () => {
  it("a ação conta as páginas de application/pdf e grava no update final", () => {
    const fonte = readFileSync("src/app/(app)/crm/atendimento/midia-actions.ts", "utf8");
    expect(fonte).toContain("contarPaginasPdf");
    expect(fonte).toMatch(/classe\.mime === 'application\/pdf'/);
    expect(fonte).toMatch(/paginas/);
  });
});
