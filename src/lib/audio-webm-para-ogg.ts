// Remux de WebM/Matroska (Opus) para Ogg/Opus mono, sem recodificar.
// TS puro (Uint8Array/DataView): roda no navegador e no Node.
// Erros lançados (message = código): webm_invalido, webm_truncado, codec_nao_suportado,
// audio_estereo, audio_vazio, lacing_invalido.

export class AudioRemuxError extends Error {
  constructor(public codigo: string) {
    super(codigo);
    this.name = "AudioRemuxError";
  }
}
const falha = (c: string): never => {
  throw new AudioRemuxError(c);
};

// IDs EBML/Matroska usados
const ID_EBML = 0x1a45dfa3;
const ID_SEGMENT = 0x18538067;
const ID_TRACKS = 0x1654ae6b;
const ID_TRACK_ENTRY = 0xae;
const ID_TRACK_NUMBER = 0xd7;
const ID_TRACK_TYPE = 0x83;
const ID_CODEC_ID = 0x86;
const ID_CODEC_PRIVATE = 0x63a2;
const ID_AUDIO = 0xe1;
const ID_CHANNELS = 0x9f;
const ID_CLUSTER = 0x1f43b675;
const ID_SIMPLE_BLOCK = 0xa3;
const ID_BLOCK_GROUP = 0xa0;
const ID_BLOCK = 0xa1;

// Mestres em que se "entra": o percurso é plano, o que torna tamanhos desconhecidos triviais.
const MESTRES = new Set([ID_SEGMENT, ID_TRACKS, ID_TRACK_ENTRY, ID_AUDIO, ID_CLUSTER, ID_BLOCK_GROUP]);

type Faixa = { numero: number; tipo: number; codec: string; privado: Uint8Array | null; canais: number };
type Bloco = { faixa: number; pacotes: Uint8Array[] };

function lerId(b: Uint8Array, p: number): { id: number; len: number } {
  if (p >= b.length) falha("webm_truncado");
  const primeiro = b[p];
  let len = 1;
  while (len <= 4 && !(primeiro & (0x80 >> (len - 1)))) len++;
  if (len > 4) falha("webm_invalido");
  if (p + len > b.length) falha("webm_truncado");
  let id = 0;
  for (let i = 0; i < len; i++) id = id * 256 + b[p + i];
  return { id, len };
}

// Tamanho vint (até 8 bytes). `desconhecido` quando todos os bits de valor são 1.
function lerTamanho(b: Uint8Array, p: number): { valor: number; len: number; desconhecido: boolean } {
  if (p >= b.length) falha("webm_truncado");
  const primeiro = b[p];
  let len = 1;
  while (len <= 8 && !(primeiro & (0x80 >> (len - 1)))) len++;
  if (len > 8) falha("webm_invalido");
  if (p + len > b.length) falha("webm_truncado");
  let valor = primeiro & (0xff >> len);
  let todosUm = valor === 0xff >> len;
  for (let i = 1; i < len; i++) {
    valor = valor * 256 + b[p + i];
    if (b[p + i] !== 0xff) todosUm = false;
  }
  return { valor, len, desconhecido: todosUm };
}

function lerUint(b: Uint8Array): number {
  let v = 0;
  for (const x of b) v = v * 256 + x;
  return v;
}

// Divide o payload de um (Simple)Block em pacotes conforme o lacing.
function separarBloco(dados: Uint8Array): Bloco {
  const t = lerTamanho(dados, 0); // número da faixa (vint)
  if (dados.length < t.len + 3) falha("webm_truncado");
  const flags = dados[t.len + 2];
  const lacing = (flags >> 1) & 3;
  const corpo = dados.subarray(t.len + 3);
  if (lacing === 0) return { faixa: t.valor, pacotes: [corpo] };
  if (corpo.length < 1) falha("webm_truncado");
  const n = corpo[0] + 1;
  let p = 1;
  const tam: number[] = [];
  if (lacing === 2) {
    // tamanho fixo
    const total = corpo.length - 1;
    if (total % n !== 0) falha("lacing_invalido");
    for (let i = 0; i < n; i++) tam.push(total / n);
  } else if (lacing === 1) {
    // Xiph
    for (let i = 0; i < n - 1; i++) {
      let s = 0;
      for (;;) {
        if (p >= corpo.length) falha("webm_truncado");
        const x = corpo[p++];
        s += x;
        if (x < 255) break;
      }
      tam.push(s);
    }
    tam.push(corpo.length - p - tam.reduce((a, x) => a + x, 0));
  } else {
    // EBML: primeiro tamanho absoluto, demais como diferença com sinal
    const prim = lerTamanho(corpo, p);
    p += prim.len;
    tam.push(prim.valor);
    for (let i = 1; i < n - 1; i++) {
      const d = lerTamanho(corpo, p);
      p += d.len;
      const bias = Math.pow(2, 7 * d.len - 1) - 1;
      tam.push(tam[i - 1] + (d.valor - bias));
    }
    tam.push(corpo.length - p - tam.reduce((a, x) => a + x, 0));
  }
  if (tam.some((x) => x < 0)) falha("lacing_invalido");
  const pacotes: Uint8Array[] = [];
  for (const s of tam) {
    if (p + s > corpo.length) falha("webm_truncado");
    pacotes.push(corpo.subarray(p, p + s));
    p += s;
  }
  return { faixa: t.valor, pacotes };
}

// Duração do pacote Opus em amostras a 48 kHz, pelo TOC (RFC 6716, seção 3.1).
function duracaoOpus(pacote: Uint8Array): number {
  if (pacote.length < 1) return falha("webm_invalido");
  const toc = pacote[0];
  const config = toc >> 3;
  let frame: number; // amostras a 48 kHz
  if (config < 12) frame = [480, 960, 1920, 2880][config % 4];
  else if (config < 16) frame = config % 2 === 0 ? 480 : 960;
  else frame = [120, 240, 480, 960][config % 4];
  const c = toc & 3;
  let frames: number;
  if (c === 0) frames = 1;
  else if (c === 3) {
    if (pacote.length < 2) return falha("webm_invalido");
    frames = pacote[1] & 0x3f;
    if (frames === 0) return falha("webm_invalido");
  } else frames = 2;
  return frame * frames;
}

// CRC32 do Ogg: polinômio 0x04C11DB7, sem reflexão, valor inicial 0.
let tabelaCrc: Uint32Array | null = null;
function crcOgg(b: Uint8Array): number {
  if (!tabelaCrc) {
    tabelaCrc = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let r = i << 24;
      for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
      tabelaCrc[i] = r >>> 0;
    }
  }
  let crc = 0;
  for (let i = 0; i < b.length; i++) crc = ((crc << 8) ^ tabelaCrc[((crc >>> 24) ^ b[i]) & 0xff]) >>> 0;
  return crc >>> 0;
}

function montarPagina(tipo: number, granule: number, serial: number, seq: number, pacotes: Uint8Array[]): Uint8Array {
  const tabela: number[] = [];
  let dados = 0;
  for (const p of pacotes) {
    let r = p.length;
    while (r >= 255) {
      tabela.push(255);
      r -= 255;
    }
    tabela.push(r);
    dados += p.length;
  }
  if (tabela.length > 255) falha("webm_invalido");
  const out = new Uint8Array(27 + tabela.length + dados);
  const dv = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53], 0); // "OggS"
  out[5] = tipo;
  dv.setUint32(6, granule % 4294967296, true);
  dv.setUint32(10, Math.floor(granule / 4294967296), true);
  dv.setUint32(14, serial >>> 0, true);
  dv.setUint32(18, seq, true);
  out[26] = tabela.length;
  out.set(tabela, 27);
  let o = 27 + tabela.length;
  for (const p of pacotes) {
    out.set(p, o);
    o += p.length;
  }
  dv.setUint32(22, crcOgg(out), true);
  return out;
}

function segmentosDe(n: number): number {
  return Math.floor(n / 255) + 1;
}

function serialAleatorio(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** Converte WebM/Opus mono em Ogg/Opus mono sem recodificar. `serial` fixo só para testes. */
export function webmParaOggOpus(bytes: Uint8Array, serial?: number): Uint8Array {
  if (bytes.length < 8) falha("webm_truncado");
  if (lerId(bytes, 0).id !== ID_EBML) falha("webm_invalido");

  const faixas: Faixa[] = [];
  const blocos: Bloco[] = [];
  let p = 0;
  while (p < bytes.length) {
    const { id, len } = lerId(bytes, p);
    const tam = lerTamanho(bytes, p + len);
    const ini = p + len + tam.len;
    if (MESTRES.has(id)) {
      p = ini; // entra no mestre (tamanho conhecido ou não)
      if (id === ID_TRACK_ENTRY) faixas.push({ numero: 0, tipo: 0, codec: "", privado: null, canais: 1 });
      continue;
    }
    if (tam.desconhecido) falha("webm_invalido");
    const fim = ini + tam.valor;
    if (fim > bytes.length) falha("webm_truncado");
    const dados = bytes.subarray(ini, fim);
    const f = faixas[faixas.length - 1];
    if (id === ID_SIMPLE_BLOCK || id === ID_BLOCK) {
      blocos.push(separarBloco(dados));
    } else if (f) {
      if (id === ID_TRACK_NUMBER) f.numero = lerUint(dados);
      else if (id === ID_TRACK_TYPE) f.tipo = lerUint(dados);
      else if (id === ID_CODEC_ID) f.codec = String.fromCharCode(...dados);
      else if (id === ID_CODEC_PRIVATE) f.privado = dados;
      else if (id === ID_CHANNELS) f.canais = lerUint(dados);
    }
    p = fim;
  }

  const faixa = faixas.find((f) => f.codec === "A_OPUS");
  if (!faixa) return falha("codec_nao_suportado");

  let head: Uint8Array;
  const priv = faixa.privado;
  const privOk = priv !== null && priv.length >= 19 && String.fromCharCode(...priv.subarray(0, 8)) === "OpusHead";
  if (privOk && priv) {
    if (priv[9] > 1 || faixa.canais > 1) return falha("audio_estereo");
    head = priv.slice();
  } else {
    if (faixa.canais > 1) return falha("audio_estereo");
    head = new Uint8Array(19);
    head.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0);
    head[8] = 1;
    head[9] = 1;
    head[10] = 312 & 255;
    head[11] = 312 >> 8;
    head[12] = 48000 & 255;
    head[13] = (48000 >> 8) & 255;
    head[14] = 48000 >> 16;
  }

  const pacotes = blocos.filter((b) => b.faixa === faixa.numero).flatMap((b) => b.pacotes);
  if (pacotes.length === 0) return falha("audio_vazio");
  const duracoes = pacotes.map(duracaoOpus);

  const ser = serial ?? serialAleatorio();
  const vendor = new TextEncoder().encode("BFX");
  const tags = new Uint8Array(8 + 4 + vendor.length + 4);
  tags.set(new TextEncoder().encode("OpusTags"), 0);
  new DataView(tags.buffer).setUint32(8, vendor.length, true);
  tags.set(vendor, 12);
  // últimos 4 bytes: zero comentários de usuário

  const paginas: Uint8Array[] = [
    montarPagina(0x02, 0, ser, 0, [head]),
    montarPagina(0, 0, ser, 1, [tags]),
  ];
  let seq = 2;
  let i = 0;
  let granule = 0;
  const MAX_PACOTES = 50; // ~1 s por página
  while (i < pacotes.length) {
    const grupo: Uint8Array[] = [];
    let segs = 0;
    while (i < pacotes.length && grupo.length < MAX_PACOTES) {
      const s = segmentosDe(pacotes[i].length);
      if (s > 255) falha("webm_invalido");
      if (segs + s > 255) break;
      segs += s;
      granule += duracoes[i];
      grupo.push(pacotes[i]);
      i++;
    }
    const ultimo = i >= pacotes.length;
    paginas.push(montarPagina(ultimo ? 0x04 : 0, granule, ser, seq++, grupo));
  }

  const total = paginas.reduce((n, x) => n + x.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const pg of paginas) {
    out.set(pg, o);
    o += pg.length;
  }
  return out;
}
