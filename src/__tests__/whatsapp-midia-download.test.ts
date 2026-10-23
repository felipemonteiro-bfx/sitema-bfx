import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

type Linha = {
  id: string; tipo: string; metaMediaId: string; mime: string; sha256: string;
  status: string; tentativas: number; erro: string | null; chaveStorage: string | null;
  tamanho: number | null; paginas?: number; atualizadoEm: Date; telefone?: string; direcao?: string;
};
const h = vi.hoisted(() => ({
  linhas: new Map<string, any>(),
  info: vi.fn(), baixar: vi.fn(), gravar: vi.fn(), remover: vi.fn(), chave: vi.fn(),
  falhaUpdateFinal: false,
  aoAtualizar: undefined as undefined | ((where: any, data: any) => void),
}));

vi.mock("@/lib/db", () => {
  // Avaliador mínimo do `where` do Prisma: AND/OR/NOT, igualdade, in/notIn, startsWith, lt/gte.
  const cond = (v: any, c: any): boolean => {
    if (c === null) return v === null;
    if (c instanceof Date || typeof c !== "object") return v === c;
    if (c.in && !c.in.includes(v)) return false;
    if (c.notIn && (v === null || c.notIn.includes(v))) return false;
    if (c.startsWith !== undefined && !(typeof v === "string" && v.startsWith(c.startsWith))) return false;
    if (c.lt !== undefined && !(v < c.lt)) return false;
    if (c.gte !== undefined && !(v >= c.gte)) return false;
    return true;
  };
  const casa = (l: any, w: any): boolean => {
    for (const [k, c] of Object.entries<any>(w)) {
      if (k === "OR") { if (!c.some((o: any) => casa(l, o))) return false; }
      else if (k === "AND") { if (!c.every((o: any) => casa(l, o))) return false; }
      else if (k === "NOT") { if (casa(l, c)) return false; }
      else if (k === "mensagem") {
        if (c.telefone !== undefined && l.telefone !== c.telefone) return false;
        if (c.direcao !== undefined && (l.direcao ?? "in") !== c.direcao) return false;
      } else if (!cond(l[k], c)) return false;
    }
    return true;
  };
  return { prisma: { whatsAppMidia: {
    updateMany: async ({ where, data }: any) => {
      if (h.falhaUpdateFinal && data.status === "salva") throw new Error("db fora");
      h.aoAtualizar?.(where, data);
      const alvo = [...h.linhas.values()].filter((l) => casa(l, where));
      for (const l of alvo) {
        if (data.tentativas?.increment) l.tentativas += data.tentativas.increment;
        const { tentativas: _t, ...resto } = data;
        Object.assign(l, resto, { atualizadoEm: new Date() });
      }
      return { count: alvo.length };
    },
    findUnique: async ({ where }: any) => h.linhas.get(where.id) ?? null,
    findMany: async ({ where }: any) => [...h.linhas.values()].filter((l) => casa(l, where)).map((l) => ({ id: l.id })),
  } } };
});
vi.mock("@/lib/whatsapp-midia-meta", async (orig) => ({
  ...(await orig<typeof import("@/lib/whatsapp-midia-meta")>()),
  obterInfoMidia: h.info, baixarConteudo: h.baixar,
}));
vi.mock("@/lib/whatsapp-midia-storage", async (orig) => ({
  ...(await orig<typeof import("@/lib/whatsapp-midia-storage")>()),
  chaveNova: h.chave, gravar: h.gravar, remover: h.remover,
}));

import { PDFDocument } from "pdf-lib";
import { processarMidia, processarPendentesDaConversa } from "@/lib/whatsapp-midia-download";
import { ErroMidiaMeta } from "@/lib/whatsapp-midia-meta";
import { MidiaStorageError } from "@/lib/whatsapp-midia-storage";

// JPEG mínimo válido para a política (assinatura FFD8FF).
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const ZEROS = "0".repeat(64);
const URL_SECRETA = "https://lookaside.fbsbx.com/x?hash=SEGREDO";

const HA_MIN = (n: number) => new Date(Date.now() - n * 60_000);

function semear(extra: Partial<Linha> = {}) {
  const l: Linha = {
    id: "m1", tipo: "imagem", metaMediaId: "777", mime: "image/jpeg", sha256: sha(JPEG),
    status: "pendente", tentativas: 0, erro: null, chaveStorage: null, tamanho: null,
    atualizadoEm: new Date(), telefone: "5592000000000", ...extra,
  };
  h.linhas.set(l.id, l);
  return l;
}

beforeEach(() => {
  vi.resetAllMocks();
  h.linhas.clear();
  h.falhaUpdateFinal = false;
  h.aoAtualizar = undefined;
  h.info.mockResolvedValue({ mediaId: "777", url: URL_SECRETA });
  h.baixar.mockResolvedValue({ bytes: JPEG, sha256: sha(JPEG), mime: "image/jpeg" });
  h.chave.mockReturnValue("midias/2026/10/abc");
  h.gravar.mockResolvedValue(undefined);
  h.remover.mockResolvedValue(undefined);
});

describe("processarMidia", () => {
  it("baixa, grava e marca salva com chave, mime real e tamanho", async () => {
    const l = semear();
    await processarMidia("m1");
    expect(h.gravar).toHaveBeenCalledWith("midias/2026/10/abc", JPEG, "image/jpeg");
    expect(l).toMatchObject({ status: "salva", chaveStorage: "midias/2026/10/abc", mime: "image/jpeg", tamanho: JPEG.length, tentativas: 1 });
  });

  it("documento PDF salva a contagem de páginas; imagem fica sem", async () => {
    const doc = await PDFDocument.create();
    doc.addPage(); doc.addPage();
    const pdf = await doc.save();
    const l = semear({ tipo: "documento", mime: "application/pdf", sha256: sha(pdf) });
    h.baixar.mockResolvedValue({ bytes: pdf, sha256: sha(pdf), mime: "application/pdf" });
    await processarMidia("m1");
    expect(l).toMatchObject({ status: "salva", paginas: 2 });
    const img = semear({ id: "m2" });
    await processarMidia("m2");
    expect(img.paginas).toBeUndefined();
  });

  it("segunda chamada em salva não faz fetch nem grava de novo", async () => {
    semear();
    await processarMidia("m1");
    h.info.mockClear(); h.baixar.mockClear(); h.gravar.mockClear();
    await processarMidia("m1");
    expect(h.info).not.toHaveBeenCalled();
    expect(h.baixar).not.toHaveBeenCalled();
    expect(h.gravar).not.toHaveBeenCalled();
  });

  it("claim com count 0 (baixando recente) não processa", async () => {
    semear({ status: "baixando", atualizadoEm: new Date() });
    await processarMidia("m1");
    expect(h.info).not.toHaveBeenCalled();
  });

  it("baixando parado há mais de 5 min é retomado", async () => {
    semear({ status: "baixando", atualizadoEm: new Date(Date.now() - 6 * 60_000) });
    // updateMany do fake reescreve atualizadoEm; o claim compara antes.
    await processarMidia("m1");
    expect(h.linhas.get("m1").status).toBe("salva");
  });

  it("url expirada pede nova info uma vez", async () => {
    semear();
    h.baixar.mockRejectedValueOnce(new ErroMidiaMeta("url_expirada"));
    await processarMidia("m1");
    expect(h.info).toHaveBeenCalledTimes(2);
    expect(h.linhas.get("m1").status).toBe("salva");
  });

  it("url expirada duas vezes vira falhou com o código", async () => {
    semear();
    h.baixar.mockRejectedValue(new ErroMidiaMeta("url_expirada"));
    await processarMidia("m1");
    expect(h.info).toHaveBeenCalledTimes(2);
    expect(h.linhas.get("m1")).toMatchObject({ status: "falhou", erro: "url_expirada" });
  });

  it("tipo real divergente vira indisponivel sem gravar", async () => {
    semear({ tipo: "audio", mime: "audio/ogg" });
    await processarMidia("m1"); // bytes são JPEG, não áudio
    expect(h.gravar).not.toHaveBeenCalled();
    expect(h.linhas.get("m1").status).toBe("indisponivel");
  });

  it("sha256 divergente vira falhou", async () => {
    semear({ sha256: "a".repeat(64) });
    await processarMidia("m1");
    expect(h.gravar).not.toHaveBeenCalled();
    expect(h.linhas.get("m1")).toMatchObject({ status: "falhou", erro: "sha_divergente" });
  });

  it("referência de zeros ignora a conferência de sha256", async () => {
    semear({ sha256: ZEROS });
    await processarMidia("m1");
    expect(h.linhas.get("m1").status).toBe("salva");
  });

  it("midia_indisponivel vira indisponivel", async () => {
    semear();
    h.info.mockRejectedValue(new ErroMidiaMeta("midia_indisponivel"));
    await processarMidia("m1");
    expect(h.linhas.get("m1").status).toBe("indisponivel");
  });

  it("erro transitório repetido (rede, storage) nunca vira indisponivel", async () => {
    semear();
    h.info.mockRejectedValue(new ErroMidiaMeta("rede"));
    for (let i = 0; i < 6; i++) {
      h.linhas.get("m1").atualizadoEm = HA_MIN(60);
      await processarMidia("m1");
    }
    expect(h.linhas.get("m1")).toMatchObject({ status: "falhou", erro: "rede", tentativas: 6 });
    h.info.mockResolvedValue({ mediaId: "777", url: URL_SECRETA });
    h.gravar.mockRejectedValue(new MidiaStorageError("falha_storage", "x"));
    for (let i = 0; i < 4; i++) {
      h.linhas.get("m1").atualizadoEm = HA_MIN(60);
      await processarMidia("m1");
    }
    expect(h.linhas.get("m1")).toMatchObject({ status: "falhou", erro: "storage_falha_storage" });
  });

  it("backoff automático: falhou há menos de 2 min não é reprocessada; manual ignora", async () => {
    semear({ status: "falhou", tentativas: 1, erro: "rede", atualizadoEm: HA_MIN(1) });
    await processarMidia("m1");
    expect(h.info).not.toHaveBeenCalled();
    await processarMidia("m1", { manual: true });
    expect(h.linhas.get("m1").status).toBe("salva");
  });

  it("depois de 3 tentativas o intervalo automático sobe para 10 min (máx. 6 por hora)", async () => {
    semear({ status: "falhou", tentativas: 3, erro: "rede", atualizadoEm: HA_MIN(5) });
    await processarMidia("m1");
    expect(h.info).not.toHaveBeenCalled();
    h.linhas.get("m1").atualizadoEm = HA_MIN(11);
    await processarMidia("m1");
    expect(h.info).toHaveBeenCalledTimes(1);
  });

  it("botão (manual) revive indisponivel de erro transitório, mas não a de erro definitivo", async () => {
    semear({ status: "indisponivel", tentativas: 3, erro: "rede" });
    await processarMidia("m1", { manual: true });
    expect(h.linhas.get("m1").status).toBe("salva");
    semear({ id: "m2", status: "indisponivel", erro: "recusada_tipo_divergente" });
    semear({ id: "m3", status: "indisponivel", erro: "midia_indisponivel" });
    h.info.mockClear();
    await processarMidia("m2", { manual: true });
    await processarMidia("m3", { manual: true });
    expect(h.info).not.toHaveBeenCalled();
  });

  it("automático nunca revive indisponivel", async () => {
    semear({ status: "indisponivel", erro: "rede" });
    await processarMidia("m1");
    expect(h.info).not.toHaveBeenCalled();
  });

  it("mídia de saída (direcao out) nunca é baixada da Meta", async () => {
    semear({ direcao: "out" });
    await processarMidia("m1");
    await processarPendentesDaConversa("5592000000000");
    expect(h.info).not.toHaveBeenCalled();
  });

  it("corrida: outro worker retomou a linha; este não sobrescreve o estado e apaga só a sua chave", async () => {
    semear();
    h.chave.mockReturnValue("midias/2026/10/minha");
    // Entre o claim e o update final, outro worker retoma (tentativas sobe).
    h.aoAtualizar = (where, data) => {
      if (where.status === "baixando" && data.status === "salva") {
        h.linhas.get("m1").tentativas += 1;
        h.linhas.get("m1").chaveStorage = "midias/2026/10/do-outro";
      }
    };
    await processarMidia("m1");
    expect(h.remover).toHaveBeenCalledWith("midias/2026/10/minha");
    expect(h.remover).not.toHaveBeenCalledWith("midias/2026/10/do-outro");
    expect(h.linhas.get("m1")).toMatchObject({ status: "baixando", chaveStorage: "midias/2026/10/do-outro" });
  });

  it("o erro gravado é só o código: sem URL, token ou mensagem crua", async () => {
    semear();
    h.baixar.mockRejectedValue(new Error(`falha em ${URL_SECRETA} token EAAG-SECRETO`));
    await processarMidia("m1");
    const erro = h.linhas.get("m1").erro as string;
    expect(erro).toBe("erro_interno");
    expect(erro).not.toContain("SEGREDO");
    expect(erro).not.toContain("EAAG");
  });

  it("objeto gravado mas update falhou: remove o objeto (sem órfão) e marca falhou", async () => {
    semear();
    h.falhaUpdateFinal = true;
    await processarMidia("m1");
    expect(h.remover).toHaveBeenCalledWith("midias/2026/10/abc");
    expect(h.linhas.get("m1").status).toBe("falhou");
  });
});

describe("processarPendentesDaConversa", () => {
  it("processa em série só as pendentes/falhas do telefone", async () => {
    semear({ id: "a" });
    semear({ id: "b", status: "falhou", atualizadoEm: HA_MIN(10) });
    semear({ id: "c", status: "salva" });
    semear({ id: "d", telefone: "5599999999999" });
    const ordem: string[] = [];
    h.info.mockImplementation(async (id: string) => { ordem.push(id); return { mediaId: id, url: URL_SECRETA }; });
    await processarPendentesDaConversa("5592000000000");
    expect(h.linhas.get("a").status).toBe("salva");
    expect(h.linhas.get("b").status).toBe("salva");
    expect(h.linhas.get("d").status).toBe("pendente");
    expect(ordem).toHaveLength(2);
  });
});
