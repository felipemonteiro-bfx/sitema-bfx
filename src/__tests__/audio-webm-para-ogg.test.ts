import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { webmParaOggOpus } from "@/lib/audio-webm-para-ogg";

// ---------- construtor de WebM sintético ----------
const enc = new TextEncoder();
function cat(...p: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of p) {
    out.set(x, o);
    o += x.length;
  }
  return out;
}
function idBytes(id: number): Uint8Array {
  const b: number[] = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) b.unshift(v % 256);
  return Uint8Array.from(b);
}
function sizeBytes(n: number): Uint8Array {
  // sempre 4 bytes: 0x10 marca + 28 bits
  return Uint8Array.from([0x10 | ((n >>> 24) & 0x0f), (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}
const DESCONHECIDO = Uint8Array.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
function el(id: number, ...conteudo: Uint8Array[]): Uint8Array {
  const c = cat(...conteudo);
  return cat(idBytes(id), sizeBytes(c.length), c);
}
function elDesc(id: number, ...conteudo: Uint8Array[]): Uint8Array {
  return cat(idBytes(id), DESCONHECIDO, ...conteudo);
}
const uint = (v: number) => Uint8Array.from([v]);

function opusHead(canais: number, preSkip = 312): Uint8Array {
  const h = new Uint8Array(19);
  h.set(enc.encode("OpusHead"), 0);
  h[8] = 1;
  h[9] = canais;
  h[10] = preSkip & 255;
  h[11] = preSkip >> 8;
  h[12] = 0x80; // 48000 = 0xBB80
  h[13] = 0xbb;
  return h;
}

// pacote de "silêncio" de 20 ms (CELT FB 20ms, código 0 => TOC 0xFC)
const pacote20ms = (): Uint8Array => Uint8Array.from([0xfc, 0xff, 0xfe]);

type OpcoesWebm = {
  codec?: string;
  canais?: number;
  privado?: Uint8Array | null;
  desconhecido?: boolean;
  blocos?: Uint8Array[];
  blockGroup?: boolean;
};
function montarWebM(o: OpcoesWebm = {}): Uint8Array {
  const canais = o.canais ?? 1;
  const privado = o.privado === undefined ? opusHead(canais) : o.privado;
  const blocos = o.blocos ?? [pacote20ms(), pacote20ms(), pacote20ms()];
  const cabecalho = el(0x1a45dfa3, el(0x4282, enc.encode("webm")));
  const entrada = el(
    0xae,
    el(0xd7, uint(1)),
    el(0x83, uint(2)),
    el(0x86, enc.encode(o.codec ?? "A_OPUS")),
    ...(privado ? [el(0x63a2, privado)] : []),
    el(0xe1, el(0x9f, uint(canais)), el(0xb5, Uint8Array.from([0x40, 0xe7, 0x70, 0, 0, 0, 0, 0]))),
  );
  const tracks = el(0x1654ae6b, entrada);
  const itens = blocos.map((b, i) => {
    const corpo = cat(Uint8Array.from([0x81, 0, i * 20, 0x80]), b);
    return o.blockGroup ? el(0xa0, el(0xa1, corpo)) : el(0xa3, corpo);
  });
  const cluster = o.desconhecido
    ? elDesc(0x1f43b675, el(0xe7, uint(0)), ...itens)
    : el(0x1f43b675, el(0xe7, uint(0)), ...itens);
  const segConteudo = [el(0xec, new Uint8Array(4)), tracks, cluster];
  const segmento = o.desconhecido ? elDesc(0x18538067, ...segConteudo) : el(0x18538067, ...segConteudo);
  return cat(cabecalho, segmento);
}

// ---------- leitor Ogg + CRC independente ----------
function crcOgg(b: Uint8Array): number {
  let crc = 0;
  for (const x of b) {
    crc ^= x << 24;
    for (let i = 0; i < 8; i++) crc = crc & 0x80000000 ? (crc << 1) ^ 0x04c11db7 : crc << 1;
  }
  return crc >>> 0;
}
type Pagina = { tipo: number; granule: bigint; serial: number; seq: number; pacotes: Uint8Array[]; crcOk: boolean };
function lerPaginas(b: Uint8Array): Pagina[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: Pagina[] = [];
  let p = 0;
  while (p < b.length) {
    expect(String.fromCharCode(...b.subarray(p, p + 4))).toBe("OggS");
    const n = b[p + 26];
    const tabela = b.subarray(p + 27, p + 27 + n);
    const dados = tabela.reduce((a, x) => a + x, 0);
    const fim = p + 27 + n + dados;
    const copia = b.slice(p, fim);
    const crcGravado = dv.getUint32(p + 22, true);
    new DataView(copia.buffer).setUint32(22, 0, true);
    const pacotes: Uint8Array[] = [];
    let ini = p + 27 + n;
    let acc = 0;
    for (const t of tabela) {
      acc += t;
      if (t < 255) {
        pacotes.push(b.slice(ini, ini + acc));
        ini += acc;
        acc = 0;
      }
    }
    out.push({
      tipo: b[p + 5],
      granule: dv.getBigInt64(p + 6, true),
      serial: dv.getUint32(p + 14, true),
      seq: dv.getUint32(p + 18, true),
      pacotes,
      crcOk: crcOgg(copia) === crcGravado,
    });
    p = fim;
  }
  return out;
}
const texto = (b: Uint8Array, n: number) => String.fromCharCode(...b.subarray(0, n));

describe("webmParaOggOpus", () => {
  it("gera OpusHead e OpusTags nas duas primeiras páginas", () => {
    const ogg = webmParaOggOpus(montarWebM(), 0x1234);
    expect(texto(ogg, 4)).toBe("OggS");
    const pg = lerPaginas(ogg);
    expect(pg[0].tipo & 0x02).toBe(0x02);
    expect(texto(pg[0].pacotes[0], 8)).toBe("OpusHead");
    expect(pg[0].pacotes[0][9]).toBe(1);
    expect(pg[0].pacotes[0][10] | (pg[0].pacotes[0][11] << 8)).toBe(312);
    expect(texto(pg[1].pacotes[0], 8)).toBe("OpusTags");
    expect(new TextDecoder().decode(pg[1].pacotes[0])).toContain("BFX");
    expect(pg[0].granule).toBe(BigInt(0));
    expect(pg[1].granule).toBe(BigInt(0));
  });

  it("CRC, serial e sequência corretos em todas as páginas; EOS só na última", () => {
    const pg = lerPaginas(webmParaOggOpus(montarWebM(), 0xabcdef));
    expect(pg.every((p) => p.crcOk)).toBe(true);
    expect(pg.every((p) => p.serial === 0xabcdef)).toBe(true);
    pg.forEach((p, i) => expect(p.seq).toBe(i));
    expect(pg[pg.length - 1].tipo & 0x04).toBe(0x04);
    expect(pg.slice(0, -1).every((p) => (p.tipo & 0x04) === 0)).toBe(true);
  });

  it("granule final = soma das durações (3 x 960) e pacotes em ordem", () => {
    const blocos = [Uint8Array.from([0xfc, 1]), Uint8Array.from([0xfc, 2]), Uint8Array.from([0xfc, 3])];
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ blocos })));
    const audio = pg.slice(2);
    expect(audio[audio.length - 1].granule).toBe(BigInt(2880));
    const pacotes = audio.flatMap((p) => p.pacotes);
    expect(pacotes.map((p) => p[1])).toEqual([1, 2, 3]);
    for (let i = 1; i < audio.length; i++) expect(audio[i].granule >= audio[i - 1].granule).toBe(true);
  });

  it("calcula a duração pelo TOC (códigos 0/1/2/3 e configs)", () => {
    // 0xF8 = CELT 20ms c0 => 960; 0xF9 = 2 frames => 1920; 0xFB c3 com 3 frames => 2880
    // 0x08 = SILK 10ms c0 (config 1) => 480... config 1 = 20ms? 0..3 => 10,20,40,60
    const blocos = [
      Uint8Array.from([0xf8, 0]),
      Uint8Array.from([0xf9, 0, 0]),
      Uint8Array.from([0xfb, 0x03, 0, 0, 0]),
      Uint8Array.from([0x08, 0]), // SILK 20 ms
      Uint8Array.from([0x00, 0]), // SILK 10 ms
    ];
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ blocos })));
    expect(pg[pg.length - 1].granule).toBe(BigInt(960 + 1920 + 2880 + 960 + 480));
  });

  it("aceita BlockGroup/Block", () => {
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ blockGroup: true })));
    expect(pg[pg.length - 1].granule).toBe(BigInt(2880));
  });

  it("aceita tamanho desconhecido no Segment e no Cluster", () => {
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ desconhecido: true })));
    expect(pg[pg.length - 1].granule).toBe(BigInt(2880));
    expect(pg.every((p) => p.crcOk)).toBe(true);
  });

  it("sem CodecPrivate monta OpusHead mono 48 kHz com pre-skip 312", () => {
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ privado: null })));
    const h = pg[0].pacotes[0];
    expect(texto(h, 8)).toBe("OpusHead");
    expect(h[9]).toBe(1);
    expect(h[10] | (h[11] << 8)).toBe(312);
    expect(h[12] | (h[13] << 8) | (h[14] << 16)).toBe(48000);
  });

  it("pacote grande usa lacing de 255 e muitos pacotes viram várias páginas", () => {
    const grande = new Uint8Array(600).fill(7);
    grande[0] = 0xfc;
    const pequenos = Array.from({ length: 120 }, () => pacote20ms());
    const pg = lerPaginas(webmParaOggOpus(montarWebM({ blocos: [grande, ...pequenos] })));
    expect(pg[2].pacotes[0].length).toBe(600);
    expect(pg.length).toBeGreaterThan(4);
    expect(pg.every((p) => p.crcOk)).toBe(true);
    expect(pg[pg.length - 1].granule).toBe(BigInt(121 * 960));
  });

  it("estéreo -> audio_estereo", () => {
    expect(() => webmParaOggOpus(montarWebM({ canais: 2 }))).toThrow("audio_estereo");
  });

  it("não-Opus -> codec_nao_suportado", () => {
    expect(() => webmParaOggOpus(montarWebM({ codec: "A_VORBIS", privado: null }))).toThrow("codec_nao_suportado");
  });

  it("entrada truncada ou lixo -> erro, sem loop", () => {
    const w = montarWebM();
    for (const n of [0, 3, 10, 40, w.length - 5]) {
      expect(() => webmParaOggOpus(w.slice(0, n))).toThrow();
    }
    expect(() => webmParaOggOpus(new Uint8Array(200))).toThrow();
    expect(() => webmParaOggOpus(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0xff]))).toThrow();
  });

  it("fixture real (ffmpeg) mono: converte e confere", () => {
    const entrada = new Uint8Array(readFileSync(join(__dirname, "fixtures/mono-1s.webm")));
    const pg = lerPaginas(webmParaOggOpus(entrada, 1));
    expect(pg.every((p) => p.crcOk)).toBe(true);
    expect(texto(pg[0].pacotes[0], 8)).toBe("OpusHead");
    expect(pg[pg.length - 1].granule).toBeGreaterThanOrEqual(BigInt(48000));
  });

  it("fixture real (ffmpeg) estéreo é recusada", () => {
    const entrada = new Uint8Array(readFileSync(join(__dirname, "fixtures/estereo-05s.webm")));
    expect(() => webmParaOggOpus(entrada)).toThrow("audio_estereo");
  });

  let temFfprobe = true;
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
  } catch {
    temFfprobe = false;
  }
  it.skipIf(!temFfprobe)("ffprobe reconhece o resultado como Opus mono", () => {
    const entrada = new Uint8Array(readFileSync(join(__dirname, "fixtures/mono-1s.webm")));
    const dir = mkdtempSync(join(tmpdir(), "ogg-"));
    const f = join(dir, "saida.ogg");
    writeFileSync(f, webmParaOggOpus(entrada));
    const r = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,channels:format=format_name,duration", "-of", "default=nw=1", f]).toString();
    expect(r).toContain("codec_name=opus");
    expect(r).toContain("channels=1");
    expect(r).toContain("format_name=ogg");
    // sem erros de decodificação
    execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", f, "-f", "null", "-"]);
  });
});
