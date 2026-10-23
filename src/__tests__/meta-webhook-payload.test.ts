import { describe, it, expect } from "vitest";
import { extrairMensagens, extrairStatuses } from "@/lib/meta-webhook-payload";

const payloadMensagem = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "5592999999999", profile: { name: "João" } }],
            messages: [
              { from: "5592999999999", id: "wamid.A", type: "text", text: { body: "oi" } },
            ],
          },
        },
      ],
    },
  ],
};

const payloadStatus = {
  entry: [
    {
      changes: [
        {
          value: {
            statuses: [
              { id: "wamid.A", status: "delivered", timestamp: "1700000000" },
              {
                id: "wamid.B",
                status: "failed",
                errors: [{ code: 131047, title: "Re-engagement message" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("extrairMensagens", () => {
  it("extrai telefone, texto, nome e waMessageId", () => {
    expect(extrairMensagens(payloadMensagem)).toEqual([
      { telefone: "5592999999999", texto: "oi", nome: "João", waMessageId: "wamid.A", tipo: "texto" },
    ]);
  });

  it("ignora tipos desconhecidos (location, reaction, contacts, unsupported)", () => {
    const p = {
      entry: [
        { changes: [{ value: { messages: [
          { from: "559299", id: "a", type: "location" },
          { from: "559299", id: "b", type: "reaction" },
          { from: "559299", id: "c", type: "contacts" },
          { from: "559299", id: "d", type: "unsupported" },
        ] } }] },
      ],
    };
    expect(extrairMensagens(p)).toEqual([]);
  });

  describe("mídias", () => {
    const HEX = "a".repeat(64);
    const um = (msg: Record<string, unknown>) =>
      extrairMensagens({ entry: [{ changes: [{ value: { messages: [{ from: "559299", id: "wamid.M", ...msg }] } }] }] });

    it("áudio de voz: tipo audio, voz true, rótulo fixo", () => {
      const [m] = um({ type: "audio", audio: { id: "123456", mime_type: "audio/ogg; codecs=opus", sha256: HEX, voice: true } });
      expect(m).toMatchObject({ tipo: "audio", texto: "[Áudio]", waMessageId: "wamid.M" });
      expect(m!.midia).toMatchObject({ mediaId: "123456", mime: "audio/ogg; codecs=opus", sha256: HEX, voz: true });
    });

    it("foto com legenda: '[Foto] legenda'; sem legenda: '[Foto]'", () => {
      const [a] = um({ type: "image", image: { id: "1", mime_type: "image/jpeg", sha256: HEX, caption: "  minha foto  " } });
      expect(a).toMatchObject({ tipo: "imagem", texto: "[Foto] minha foto" });
      expect(a!.midia?.legenda).toBe("minha foto");
      const [b] = um({ type: "image", image: { id: "1", mime_type: "image/jpeg", sha256: HEX } });
      expect(b).toMatchObject({ tipo: "imagem", texto: "[Foto]" });
    });

    it("vídeo com legenda", () => {
      const [m] = um({ type: "video", video: { id: "9", mime_type: "video/mp4", sha256: HEX, caption: "olha" } });
      expect(m).toMatchObject({ tipo: "video", texto: "[Vídeo] olha" });
    });

    it("figurinha animada", () => {
      const [m] = um({ type: "sticker", sticker: { id: "7", mime_type: "image/webp", sha256: HEX, animated: true } });
      expect(m).toMatchObject({ tipo: "figurinha", texto: "[Figurinha]" });
      expect(m!.midia?.animada).toBe(true);
    });

    it("documento: rótulo com o nome do arquivo e legenda guardada", () => {
      const [m] = um({ type: "document", document: { id: "5", mime_type: "application/pdf", sha256: HEX, filename: "contrato.pdf", caption: "assinar" } });
      expect(m).toMatchObject({ tipo: "documento", texto: "[Documento] contrato.pdf" });
      expect(m!.midia).toMatchObject({ nomeArquivo: "contrato.pdf", legenda: "assinar" });
    });

    it("documento: nome de arquivo recebido passa por nomeSeguro (sem bidi, caminho nem ..)", () => {
      const [m] = um({ type: "document", document: { id: "5", mime_type: "application/pdf", sha256: HEX, filename: "../etc/\u202Efdp.exe" } });
      expect(m!.midia?.nomeArquivo).toBe("fdp.exe");
      expect(m!.texto).toBe("[Documento] fdp.exe");
    });

    it("context.id: só alfabeto de wamid e até 256 caracteres; senão ignora a citação", () => {
      const com = (id: unknown) => um({ type: "text", text: { body: "oi" }, context: { id } })[0]!.respondeAWaId;
      expect(com("wamid.HBgM=ab_c-d:1")).toBe("wamid.HBgM=ab_c-d:1");
      expect(com("wamid.HBgNNTU5+abc/def=")).toBe("wamid.HBgNNTU5+abc/def=");
      expect(com("a".repeat(256))).toBe("a".repeat(256));
      expect(com("a".repeat(257))).toBeUndefined();
      expect(com("wamid <script>")).toBeUndefined();
      expect(com("x'; drop")).toBeUndefined();
    });

    it("descarta mídia cujo id não é só dígitos ou está ausente", () => {
      expect(um({ type: "image", image: { id: "../x", sha256: HEX } })).toEqual([]);
      expect(um({ type: "image", image: { id: "12a", sha256: HEX } })).toEqual([]);
      expect(um({ type: "audio", audio: { sha256: HEX } })).toEqual([]);
      expect(um({ type: "audio" })).toEqual([]);
    });

    it("normaliza sha256 para hex minúsculo de 64; base64 vira hex; inválido some", () => {
      const [a] = um({ type: "image", image: { id: "1", sha256: "A".repeat(64) } });
      expect(a!.midia?.sha256).toBe(HEX);
      const b64 = Buffer.from(HEX, "hex").toString("base64");
      const [b] = um({ type: "image", image: { id: "1", sha256: b64 } });
      expect(b!.midia?.sha256).toBe(HEX);
      const [c] = um({ type: "image", image: { id: "1", sha256: "xyz" } });
      expect(c!.midia?.sha256).toBeUndefined();
    });

    it("limita a legenda a 4096 caracteres e nunca guarda a url do payload", () => {
      const [m] = um({ type: "image", image: { id: "1", url: "https://lookaside.fbsbx.com/x?hash=1", caption: "x".repeat(5000) } });
      expect(m!.midia?.legenda).toHaveLength(4096);
      expect(JSON.stringify(m)).not.toContain("lookaside");
    });
  });

  it("tolera payload malformado", () => {
    expect(extrairMensagens(null)).toEqual([]);
    expect(extrairMensagens({})).toEqual([]);
    expect(extrairMensagens({ entry: "nao-array" })).toEqual([]);
  });
});

describe("extrairStatuses", () => {
  it("mapeia os status da Meta para os internos", () => {
    const out = extrairStatuses(payloadStatus);
    expect(out[0]).toEqual({ waMessageId: "wamid.A", status: "entregue" });
    expect(out[1]).toMatchObject({
      waMessageId: "wamid.B",
      status: "falhou",
      erroCodigo: 131047,
    });
  });

  it("mapeia sent e read", () => {
    const p = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "1", status: "sent" }, { id: "2", status: "read" }] } },
          ],
        },
      ],
    };
    const out = extrairStatuses(p);
    expect(out[0]!.status).toBe("enviado");
    expect(out[1]!.status).toBe("lido");
  });

  it("131052 (arquivo acima do limite) vira falha com mensagem legível", () => {
    const p = { entry: [{ changes: [{ value: { statuses: [{ id: "w", status: "failed", errors: [{ code: 131052, title: "Media download error" }] }] } }] }] };
    const [s] = extrairStatuses(p);
    expect(s).toMatchObject({ waMessageId: "w", status: "falhou", erroCodigo: 131052 });
    expect(s!.erroMsg).toMatch(/limite/i);
  });

  it("ignora status desconhecido", () => {
    const p = { entry: [{ changes: [{ value: { statuses: [{ id: "1", status: "xpto" }] } }] }] };
    expect(extrairStatuses(p)).toEqual([]);
  });

  it("tolera payload malformado", () => {
    expect(extrairStatuses(null)).toEqual([]);
    expect(extrairStatuses({ entry: [{}] })).toEqual([]);
  });
});

it('interpreta botão oficial sem perder a identidade da mensagem',()=>{const r=extrairMensagens({entry:[{changes:[{value:{messages:[{type:'interactive',from:'5592000000000',id:'wamid.button',interactive:{button_reply:{id:'bfx_orcamento',title:'Ver produtos'}}}]}}]}]});expect(r[0]?.texto).toBe('Orçamento');expect(r[0]?.waMessageId).toBe('wamid.button');});
