import { describe, it, expect } from "vitest";
import {
  LIMITE_ENVIO_BYTES,
  classificarMidia,
  contentDisposition,
  corpoPlaceholder,
  iconePrevia,
  limiteMaximoEntrada,
  nomeSeguro,
  rotuloPrevia,
  type TipoMidia,
} from "@/lib/whatsapp-midia-politica";

const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
const bytesDe = (...partes: (number[] | string)[]) =>
  Uint8Array.from(partes.flatMap((p) => (typeof p === "string" ? ascii(p) : p)));
const preenchido = (cabecalho: Uint8Array, total: number) => {
  const r = new Uint8Array(Math.max(total, cabecalho.length));
  r.set(cabecalho);
  return r;
};
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

const jpeg = () => bytesDe([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF", [0, 1, 1]);
const png = () => bytesDe([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], [0, 0, 0, 13], "IHDR", [0, 0, 2, 0, 0, 0, 2, 0]);
const pdf = () => bytesDe("%PDF-1.7\n1 0 obj\n");

/** WebP estático lossless (VP8L) com a dimensão pedida. */
function webpVP8L(w: number, h: number): Uint8Array {
  const bits = (w - 1) | ((h - 1) << 14);
  return bytesDe("RIFF", le32(30), "WEBP", "VP8L", le32(10), [0x2f], le32(bits), [0, 0, 0, 0, 0]);
}
/** WebP estendido (VP8X), animado ou não. */
function webpVP8X(w: number, h: number, animado = false): Uint8Array {
  const c = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
  return bytesDe("RIFF", le32(30), "WEBP", "VP8X", le32(10), [animado ? 0x02 : 0, 0, 0, 0], c(w - 1), c(h - 1));
}
/** WebP com perda (VP8). */
function webpVP8(w: number, h: number): Uint8Array {
  return bytesDe("RIFF", le32(30), "WEBP", "VP8 ", le32(10), [0, 0, 0, 0x9d, 0x01, 0x2a], [w & 255, w >> 8, h & 255, h >> 8]);
}
const ftyp = (marca: string) => bytesDe([0, 0, 0, 24], "ftyp", marca, [0, 0, 0, 0], "isom");

describe("classificarMidia: tipo real pelos bytes", () => {
  it("aceita JPEG e PNG como imagem", () => {
    expect(classificarMidia("imagem", jpeg())).toMatchObject({ ok: true, mime: "image/jpeg", extensao: "jpg" });
    expect(classificarMidia("imagem", png())).toMatchObject({ ok: true, mime: "image/png", extensao: "png" });
  });

  it("recusa PDF com nome .jpg declarado como foto", () => {
    const r = classificarMidia("imagem", pdf(), "image/jpeg");
    expect(r.ok).toBe(false);
  });

  it("o mime declarado nunca vale: PNG declarado como pdf continua sendo PNG", () => {
    const r = classificarMidia("imagem", png(), "application/pdf");
    expect(r).toMatchObject({ ok: true, mime: "image/png" });
  });

  it("SVG e HTML nunca passam, em nenhum tipo e com qualquer mime declarado", () => {
    const svg = bytesDe('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const html = bytesDe("<!doctype html><html><script>alert(1)</script>");
    const tipos: TipoMidia[] = ["imagem", "figurinha", "video", "audio", "documento"];
    for (const tipo of tipos) {
      for (const declarado of ["image/svg+xml", "text/html", "text/plain", "text/csv", "image/png", undefined]) {
        expect(classificarMidia(tipo, svg, declarado).ok).toBe(false);
        expect(classificarMidia(tipo, html, declarado).ok).toBe(false);
      }
    }
  });

  it("text/plain e text/csv recusam conteúdo que começa (após BOM e espaços) com marcação", () => {
    for (const inicio of ["<html>", "  \n<svg", "\uFEFF<script>", "\t<?xml version", "<HTML>", "<SCRIPT>"]) {
      const b = new TextEncoder().encode(inicio + " conteudo");
      expect(classificarMidia("documento", b, "text/plain").ok).toBe(false);
      expect(classificarMidia("documento", b, "text/csv").ok).toBe(false);
    }
  });

  it("text/plain e text/csv legítimos passam; binário disfarçado de texto não", () => {
    expect(classificarMidia("documento", bytesDe("a;b;c\n1;2;3\n"), "text/csv")).toMatchObject({ ok: true, mime: "text/csv" });
    expect(classificarMidia("documento", bytesDe("olá mundo"), "text/plain")).toMatchObject({ ok: true, mime: "text/plain" });
    expect(classificarMidia("documento", bytesDe("abc", [0, 1, 2]), "text/plain").ok).toBe(false);
  });

  it("texto sem declarar mime não é aceito (sem número mágico não há como saber)", () => {
    expect(classificarMidia("documento", bytesDe("olá mundo")).ok).toBe(false);
  });

  it("HEIC/HEIF recusado com a mensagem 'use JPEG'", () => {
    for (const marca of ["heic", "heix", "mif1", "msf1", "hevc"]) {
      const r = classificarMidia("imagem", ftyp(marca), "image/heic");
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.motivo).toBe("heic");
        expect(r.erro).toMatch(/use JPEG/i);
      }
    }
  });

  it("vídeo: mp4 e 3gpp pelo ftyp", () => {
    expect(classificarMidia("video", ftyp("isom"))).toMatchObject({ ok: true, mime: "video/mp4" });
    expect(classificarMidia("video", ftyp("mp42"))).toMatchObject({ ok: true, mime: "video/mp4" });
    expect(classificarMidia("video", ftyp("3gp4"))).toMatchObject({ ok: true, mime: "video/3gpp" });
    expect(classificarMidia("video", jpeg()).ok).toBe(false);
  });

  it("áudio: ogg/opus, mp3 (ID3 e frame), aac ADTS, amr e mp4", () => {
    const opus = bytesDe("OggS", [0, 2], new Array(20).fill(0), [1, 19], "OpusHead", [1, 1]);
    const vorbis = bytesDe("OggS", [0, 2], new Array(20).fill(0), [1, 30], [1], "vorbis");
    expect(classificarMidia("audio", opus)).toMatchObject({ ok: true, mime: "audio/ogg", extensao: "ogg" });
    expect(classificarMidia("audio", vorbis).ok).toBe(false);
    expect(classificarMidia("audio", bytesDe("ID3", [4, 0, 0, 0, 0, 0, 0]))).toMatchObject({ ok: true, mime: "audio/mpeg" });
    expect(classificarMidia("audio", bytesDe([0xff, 0xfb, 0x90, 0x00]))).toMatchObject({ ok: true, mime: "audio/mpeg" });
    expect(classificarMidia("audio", bytesDe([0xff, 0xf1, 0x50, 0x80]))).toMatchObject({ ok: true, mime: "audio/aac" });
    expect(classificarMidia("audio", bytesDe("#!AMR\n", [1, 2]))).toMatchObject({ ok: true, mime: "audio/amr" });
    expect(classificarMidia("audio", ftyp("M4A "))).toMatchObject({ ok: true, mime: "audio/mp4" });
    expect(classificarMidia("audio", ftyp("isom"))).toMatchObject({ ok: true, mime: "audio/mp4" });
    expect(classificarMidia("audio", pdf()).ok).toBe(false);
  });

  it("documento: PDF, OLE só com mime legado declarado, ZIP só com OOXML declarado", () => {
    const ole = bytesDe([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], new Array(20).fill(0));
    const zip = bytesDe("PK", [3, 4, 0, 0], new Array(20).fill(0));
    const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect(classificarMidia("documento", pdf())).toMatchObject({ ok: true, mime: "application/pdf" });
    expect(classificarMidia("documento", ole, "application/msword")).toMatchObject({ ok: true, mime: "application/msword" });
    expect(classificarMidia("documento", ole, "image/png").ok).toBe(false);
    expect(classificarMidia("documento", ole).ok).toBe(false);
    expect(classificarMidia("documento", zip, docx)).toMatchObject({ ok: true, mime: docx, extensao: "docx" });
    expect(classificarMidia("documento", zip, "application/zip").ok).toBe(false);
    expect(classificarMidia("documento", zip).ok).toBe(false);
    expect(classificarMidia("imagem", zip, docx).ok).toBe(false);
  });

  it("vazio é recusado", () => {
    expect(classificarMidia("documento", new Uint8Array(0), "text/plain").ok).toBe(false);
  });
});

describe("classificarMidia: figurinha", () => {
  it("aceita webp 512x512 nos três formatos", () => {
    expect(classificarMidia("figurinha", webpVP8L(512, 512))).toMatchObject({ ok: true, mime: "image/webp", largura: 512, altura: 512 });
    expect(classificarMidia("figurinha", webpVP8X(512, 512))).toMatchObject({ ok: true, largura: 512, altura: 512 });
    expect(classificarMidia("figurinha", webpVP8(512, 512))).toMatchObject({ ok: true, largura: 512, altura: 512 });
  });

  it("recusa fora de 512x512 ou webp ilegível", () => {
    for (const b of [webpVP8L(256, 256), webpVP8X(512, 500), webpVP8(513, 512)]) {
      const r = classificarMidia("figurinha", b);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe("dimensao");
    }
    expect(classificarMidia("figurinha", bytesDe("RIFF", le32(4), "WEBP")).ok).toBe(false);
  });

  it("na ENTRADA, foto WebP é recusada (WebP só como figurinha); JPEG/PNG passam", () => {
    const r = classificarMidia("imagem", webpVP8L(512, 512));
    expect(r.ok).toBe(false);
    expect(classificarMidia("imagem", webpVP8L(512, 512), "image/webp", { direcao: "entrada" }).ok).toBe(false);
    expect(classificarMidia("figurinha", webpVP8L(512, 512)).ok).toBe(true);
    expect(classificarMidia("imagem", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9])).ok).toBe(true);
  });

  it("figurinha só aceita webp", () => {
    expect(classificarMidia("figurinha", png()).ok).toBe(false);
  });

  it("limite de 100 KB estática e 500 KB animada", () => {
    expect(classificarMidia("figurinha", preenchido(webpVP8X(512, 512), 100 * 1024)).ok).toBe(true);
    expect(classificarMidia("figurinha", preenchido(webpVP8X(512, 512), 100 * 1024 + 1)).ok).toBe(false);
    expect(classificarMidia("figurinha", preenchido(webpVP8X(512, 512, true), 500 * 1024)).ok).toBe(true);
    expect(classificarMidia("figurinha", preenchido(webpVP8X(512, 512, true), 500 * 1024 + 1)).ok).toBe(false);
  });
});

describe("classificarMidia: limites de tamanho", () => {
  it("imagem: 5 MB", () => {
    expect(classificarMidia("imagem", preenchido(jpeg(), 5 * 1024 * 1024)).ok).toBe(true);
    const r = classificarMidia("imagem", preenchido(jpeg(), 5 * 1024 * 1024 + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe("tamanho");
  });

  it("webp como imagem não entra nem sai (a Meta só aceita jpeg/png como foto)", () => {
    expect(classificarMidia("imagem", webpVP8X(100, 100)).ok).toBe(false);
    expect(classificarMidia("imagem", webpVP8X(100, 100), undefined, { direcao: "envio" }).ok).toBe(false);
  });

  it("vídeo: 16 MB na entrada, 9 MB no envio", () => {
    expect(classificarMidia("video", preenchido(ftyp("isom"), 10 * 1024 * 1024)).ok).toBe(true);
    expect(classificarMidia("video", preenchido(ftyp("isom"), 16 * 1024 * 1024 + 1)).ok).toBe(false);
    expect(classificarMidia("video", preenchido(ftyp("isom"), 10 * 1024 * 1024), undefined, { direcao: "envio" }).ok).toBe(false);
    expect(classificarMidia("video", preenchido(ftyp("isom"), LIMITE_ENVIO_BYTES), undefined, { direcao: "envio" }).ok).toBe(true);
  });

  it("documento: 100 MB na entrada, 9 MB no envio", () => {
    expect(LIMITE_ENVIO_BYTES).toBe(9 * 1024 * 1024);
    expect(classificarMidia("documento", preenchido(pdf(), 9 * 1024 * 1024 + 1), undefined, { direcao: "envio" }).ok).toBe(false);
    expect(classificarMidia("documento", preenchido(pdf(), 9 * 1024 * 1024 + 1)).ok).toBe(true);
  });

  it("limiteMaximoEntrada por tipo", () => {
    expect(limiteMaximoEntrada("imagem")).toBe(5 * 1024 * 1024);
    expect(limiteMaximoEntrada("figurinha")).toBe(500 * 1024);
    expect(limiteMaximoEntrada("video")).toBe(16 * 1024 * 1024);
    expect(limiteMaximoEntrada("audio")).toBe(16 * 1024 * 1024);
    expect(limiteMaximoEntrada("documento")).toBe(100 * 1024 * 1024);
  });
});

describe("nomeSeguro", () => {
  it("remove caminho, controle e limita a 120", () => {
    expect(nomeSeguro("../../etc/passwd")).toBe("passwd");
    expect(nomeSeguro("C:\\temp\\relatório.pdf")).toBe("relatório.pdf");
    expect(nomeSeguro("a\u0000b\u001f\r\n.pdf")).toBe("ab.pdf");
    expect(nomeSeguro("..")).toBe("arquivo");
    expect(nomeSeguro("   ")).toBe("arquivo");
    const longo = nomeSeguro("x".repeat(300) + ".pdf");
    expect(longo.length).toBeLessThanOrEqual(120);
    expect(longo.endsWith(".pdf")).toBe(true);
  });

  it("nunca devolve barra, barra invertida ou '..'", () => {
    for (const n of ["a/b", "a\\b", "a..b", "..\\..\\x", "/abs/x.pdf"]) {
      const s = nomeSeguro(n);
      expect(s).not.toMatch(/[\\/]/);
      expect(s).not.toContain("..");
    }
  });
});

describe("contentDisposition", () => {
  it("documento é sempre attachment com filename* RFC 5987", () => {
    const h = contentDisposition("documento", "Relatório final.pdf");
    expect(h.startsWith("attachment;")).toBe(true);
    expect(h).toContain("filename*=UTF-8''Relat%C3%B3rio%20final.pdf");
  });

  it("PDF é attachment mesmo se o tipo for outro", () => {
    expect(contentDisposition("imagem", "x.pdf", { mime: "application/pdf" }).startsWith("attachment;")).toBe(true);
  });

  it("mídia é inline e baixar=1 força attachment", () => {
    for (const t of ["imagem", "video", "audio", "figurinha"] as TipoMidia[]) {
      expect(contentDisposition(t, "a.jpg").startsWith("inline;")).toBe(true);
    }
    expect(contentDisposition("imagem", "a.jpg", { baixar: true }).startsWith("attachment;")).toBe(true);
  });

  it("o nome cru malicioso não vaza no cabeçalho", () => {
    const h = contentDisposition("documento", 'a"; filename=evil.html\r\nX: y');
    expect(h).not.toMatch(/[\r\n]/);
    expect(h).not.toContain('evil.html"');
    expect(h.split("filename=").length).toBe(2);
  });
});

describe("prévia e placeholder", () => {
  const tipos: TipoMidia[] = ["audio", "imagem", "video", "figurinha", "documento"];

  it("rótulo e ícone sem emoji", () => {
    for (const t of tipos) {
      expect(rotuloPrevia(t)).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(iconePrevia(t)).toMatch(/^[A-Z][A-Za-z]+$/);
    }
    expect(rotuloPrevia("imagem")).toBe("Foto");
    expect(iconePrevia("imagem")).toBe("Camera");
    expect(iconePrevia("video")).toBe("Video");
    expect(iconePrevia("audio")).toBe("Mic");
    expect(iconePrevia("documento")).toBe("FileText");
    expect(iconePrevia("figurinha")).toBe("Sticker");
  });

  it("corpoPlaceholder segue o parser", () => {
    expect(corpoPlaceholder("imagem")).toBe("[Foto]");
    expect(corpoPlaceholder("imagem", "  olha só ")).toBe("[Foto] olha só");
    expect(corpoPlaceholder("video", "clipe")).toBe("[Vídeo] clipe");
    expect(corpoPlaceholder("audio", "ignorada")).toBe("[Áudio]");
    expect(corpoPlaceholder("figurinha")).toBe("[Figurinha]");
    expect(corpoPlaceholder("documento", undefined, "nome.pdf")).toBe("[Documento] nome.pdf");
    expect(corpoPlaceholder("documento")).toBe("[Documento]");
  });
});
