/**
 * Política de mídia do atendimento WhatsApp (puro, sem I/O).
 *
 * O tipo de um anexo vem SEMPRE dos bytes. O mime declarado (pelo remetente, pelo
 * navegador ou pela Meta) só desempata formatos sem número mágico (OLE, ZIP/OOXML,
 * texto) e nunca autoriza nada sozinho. Limites e formatos espelham os da Meta
 * (Cloud API, mídia); o envio tem teto próprio de 9 MB (cabe no corpo de 10 MB das
 * server actions). SVG, HTML e HEIC nunca passam.
 */
import { detectarTipoImagem } from "@/lib/upload-imagem";

export type TipoMidia = "audio" | "imagem" | "video" | "figurinha" | "documento";
export type Direcao = "entrada" | "envio";

const MB = 1024 * 1024;
export const LIMITE_ENVIO_BYTES = 9 * MB;
const LIMITE_FIGURINHA_ESTATICA = 100 * 1024;
const LIMITE_FIGURINHA_ANIMADA = 500 * 1024;
const LADO_FIGURINHA = 512;
const TAMANHO_MAXIMO_NOME = 120;

const LIMITE_ENTRADA: Record<TipoMidia, number> = {
  imagem: 5 * MB,
  figurinha: LIMITE_FIGURINHA_ANIMADA,
  video: 16 * MB,
  audio: 16 * MB,
  documento: 100 * MB,
};

/** Maior tamanho que a Meta aceita para o tipo (figurinha: o da animada). */
export function limiteMaximoEntrada(tipo: TipoMidia): number {
  return LIMITE_ENTRADA[tipo];
}

const MIME_OOXML = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MIME_OLE = ["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"];
const MIME_TEXTO = ["text/plain", "text/csv"];

const ACEITOS: Record<TipoMidia, string[]> = {
  imagem: ["image/jpeg", "image/png", "image/webp"],
  figurinha: ["image/webp"],
  video: ["video/mp4", "video/3gpp"],
  audio: ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr"],
  documento: ["application/pdf", ...MIME_OLE, ...MIME_OOXML, ...MIME_TEXTO],
};

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
};

export type MotivoRecusa = "vazio" | "heic" | "tipo" | "tamanho" | "dimensao" | "conteudo";
export type ResultadoMidia =
  | { ok: true; tipo: TipoMidia; mime: string; extensao: string; bytes: number; largura?: number; altura?: number; animada?: boolean }
  | { ok: false; motivo: MotivoRecusa; erro: string };

const recusa = (motivo: MotivoRecusa, erro: string): ResultadoMidia => ({ ok: false, motivo, erro });

function ascii(bytes: Uint8Array, inicio: number, fim: number): string {
  let s = "";
  for (let i = inicio; i < Math.min(fim, bytes.length); i++) s += String.fromCharCode(bytes[i]!);
  return s;
}
const u24 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);

type Webp = { largura: number; altura: number; animada: boolean };

/** Dimensão e animação do WebP lidas do cabeçalho; `null` se ilegível. */
function lerWebp(b: Uint8Array): Webp | null {
  if (b.length < 30) return null;
  const quadro = ascii(b, 12, 16);
  if (quadro === "VP8X") {
    return { largura: 1 + u24(b, 24), altura: 1 + u24(b, 27), animada: (b[20]! & 0x02) !== 0 };
  }
  if (quadro === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)) >>> 0;
    return { largura: (bits & 0x3fff) + 1, altura: ((bits >>> 14) & 0x3fff) + 1, animada: false };
  }
  if (quadro === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { largura: (b[26]! | (b[27]! << 8)) & 0x3fff, altura: (b[28]! | (b[29]! << 8)) & 0x3fff, animada: false };
  }
  return null;
}

const MARCAS_HEIF = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "avif", "avis"];
const MARCAS_MP4 = ["mp41", "mp42", "avc1", "M4V ", "dash", "msnv", "mmp4", "F4V "];

/**
 * Nota de voz = OGG/Opus MONO (o que o WhatsApp toca como mensagem de voz). AAC/M4A, MP3 e OGG estéreo vão como áudio comum.
 * O número de canais é o byte seguinte à versão no OpusHead.
 */
export function ehNotaDeVoz(mime: string, bytes: Uint8Array): boolean {
  if (mime !== "audio/ogg") return false;
  const cab = ascii(bytes, 0, Math.min(bytes.length, 120));
  const i = cab.indexOf("OpusHead");
  return i >= 0 && i + 9 < bytes.length && bytes[i + 9] === 1;
}

/** Tipo pelo número mágico; formatos sem assinatura única voltam como `"heic"`/`null`. */
function detectarPorAssinatura(b: Uint8Array): string | "heic" | null {
  const img = detectarTipoImagem(b);
  if (img) return img.mime;
  if (ascii(b, 0, 4) === "%PDF") return "application/pdf";
  if (ascii(b, 0, 5) === "#!AMR") return "audio/amr";
  if (ascii(b, 4, 8) === "ftyp") {
    const marca = ascii(b, 8, 12);
    if (MARCAS_HEIF.includes(marca)) return "heic";
    if (marca.startsWith("3gp") || marca.startsWith("3g2")) return "video/3gpp";
    if (marca === "M4A " || marca === "M4B " || marca === "M4P ") return "audio/mp4";
    if (marca.startsWith("iso") || MARCAS_MP4.includes(marca)) return "video/mp4";
    return null;
  }
  if (ascii(b, 0, 4) === "OggS") {
    // Só Opus; Vorbis e Theora não entram. O OpusHead abre o primeiro pacote.
    return ascii(b, 0, 80).includes("OpusHead") ? "audio/ogg" : null;
  }
  if (ascii(b, 0, 3) === "ID3") return "audio/mpeg";
  if (b.length >= 2 && b[0] === 0xff && (b[1]! & 0xe0) === 0xe0) {
    const camada = (b[1]! >> 1) & 3;
    const versao = (b[1]! >> 3) & 3;
    if (camada === 0 && (b[1]! & 0xf6) === 0xf0) return "audio/aac";
    if (camada !== 0 && versao !== 1) return "audio/mpeg";
  }
  return null;
}

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const MARCACAO = ["<html", "<svg", "<script", "<?xml", "<!doctype", "<head", "<body", "<iframe"];

/** Texto puro: sem NUL e sem começar com marcação executável pelo navegador. */
function textoSeguro(b: Uint8Array): boolean {
  const amostra = b.subarray(0, 8192);
  if (amostra.includes(0)) return false;
  const inicio = new TextDecoder("utf-8").decode(amostra.subarray(0, 512)).replace(/^﻿/, "").trimStart().toLowerCase();
  return !MARCACAO.some((m) => inicio.startsWith(m));
}

/** Mime real do conteúdo, ou `"heic"`, ou `null`. O declarado só desempata OLE/ZIP/texto. */
function detectarMimeReal(b: Uint8Array, declarado?: string): string | null {
  const porAssinatura = detectarPorAssinatura(b);
  if (porAssinatura) return porAssinatura;
  const decl = (declarado ?? "").split(";")[0]!.trim().toLowerCase();
  if (OLE.every((x, i) => b[i] === x)) return MIME_OLE.includes(decl) ? decl : null;
  if (b[0] === 0x50 && b[1] === 0x4b) return MIME_OOXML.includes(decl) ? decl : null;
  if (MIME_TEXTO.includes(decl)) return textoSeguro(b) ? decl : null;
  return null;
}

const NOME_TIPO: Record<TipoMidia, string> = {
  imagem: "uma foto JPEG ou PNG",
  figurinha: "uma figurinha WebP 512x512",
  video: "um vídeo MP4 ou 3GPP",
  audio: "um áudio OGG/Opus, AAC, MP4, MP3 ou AMR",
  documento: "um PDF, Word, Excel, PowerPoint ou texto",
};

/**
 * Valida o anexo pelos bytes e devolve o mime real. Na `entrada` vale o limite da Meta;
 * no `envio` vale o menor entre ele e 9 MB. WebP nunca é foto (só figurinha).
 */
export function classificarMidia(
  tipo: TipoMidia,
  bytes: Uint8Array,
  mimeDeclarado?: string,
  opcoes: { direcao?: Direcao } = {},
): ResultadoMidia {
  const direcao = opcoes.direcao ?? "entrada";
  if (bytes.length === 0) return recusa("vazio", "Arquivo vazio.");
  const real = detectarMimeReal(bytes, mimeDeclarado);
  if (real === "heic") return recusa("heic", "Formato HEIC não é suportado: use JPEG.");
  let mime = real;
  // Contêiner MP4 sem marca de áudio também serve como áudio (gravação do Safari).
  if (tipo === "audio" && mime === "video/mp4") mime = "audio/mp4";
  // Foto é só JPEG/PNG, na entrada e no envio: WebP só entra como figurinha (com os tetos de 100/500 KB).
  const aceitos = tipo === "imagem" ? ["image/jpeg", "image/png"] : ACEITOS[tipo];
  if (!mime || !aceitos.includes(mime)) return recusa("tipo", `Envie ${NOME_TIPO[tipo]}.`);

  let limite = LIMITE_ENTRADA[tipo];
  let extra: { largura?: number; altura?: number; animada?: boolean } = {};
  if (tipo === "figurinha") {
    const w = lerWebp(bytes);
    if (!w || w.largura !== LADO_FIGURINHA || w.altura !== LADO_FIGURINHA) {
      return recusa("dimensao", "A figurinha precisa ser WebP de 512x512.");
    }
    limite = w.animada ? LIMITE_FIGURINHA_ANIMADA : LIMITE_FIGURINHA_ESTATICA;
    extra = { largura: w.largura, altura: w.altura, animada: w.animada };
  }
  if (direcao === "envio") limite = Math.min(limite, LIMITE_ENVIO_BYTES);
  if (bytes.length > limite) return recusa("tamanho", "Arquivo maior que o limite permitido.");

  return { ok: true, tipo, mime, extensao: EXTENSAO[mime] ?? "bin", bytes: bytes.length, ...extra };
}

/** Nome só para exibição: sem caminho, sem controle, sem `..`, até 120 caracteres. */
export function nomeSeguro(nome: string): string {
  const base = (nome.split(/[\\/]/).pop() ?? "")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^[\s.]+/, "")
    .trim();
  if (!base) return "arquivo";
  if (base.length <= TAMANHO_MAXIMO_NOME) return base;
  const ponto = base.lastIndexOf(".");
  const ext = ponto > 0 && base.length - ponto <= 10 ? base.slice(ponto) : "";
  return base.slice(0, TAMANHO_MAXIMO_NOME - ext.length) + ext;
}

function rfc5987(s: string): string {
  return encodeURIComponent(s).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Documento e PDF sempre `attachment`; mídia `inline`. O nome vai em `filename*` (RFC 5987). */
export function contentDisposition(
  tipo: TipoMidia,
  nome: string,
  opcoes: { mime?: string; baixar?: boolean } = {},
): string {
  const seguro = nomeSeguro(nome);
  const forcado = tipo === "documento" || opcoes.mime === "application/pdf" || opcoes.baixar === true;
  const fallback = seguro.replace(/[^A-Za-z0-9._ -]/g, "_");
  return `${forcado ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${rfc5987(seguro)}`;
}

const ROTULO: Record<TipoMidia, string> = {
  imagem: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  figurinha: "Figurinha",
  documento: "Documento",
};
const ICONE: Record<TipoMidia, string> = {
  imagem: "Camera",
  video: "Video",
  audio: "Mic",
  figurinha: "Sticker",
  documento: "FileText",
};

export const rotuloPrevia = (tipo: TipoMidia): string => ROTULO[tipo];
/** Nome do ícone lucide-react (sem emoji). */
export const iconePrevia = (tipo: TipoMidia): string => ICONE[tipo];

/** Corpo sintético da mensagem, igual ao do parser do webhook: `[Foto] legenda`. */
export function corpoPlaceholder(tipo: TipoMidia, legenda?: string, nome?: string): string {
  const rotulo = `[${ROTULO[tipo]}]`;
  const detalhe =
    tipo === "documento" ? (nome ?? "").trim() || (legenda ?? "").trim() : tipo === "audio" || tipo === "figurinha" ? "" : (legenda ?? "").trim();
  return detalhe ? `${rotulo} ${detalhe.slice(0, 4096)}` : rotulo;
}

/** True se o mime está na allowlist do tipo (usado ao servir, para nunca ecoar um mime fora dela). */
export function mimeNaAllowlist(tipo: string, mime: string): boolean {
  return (ACEITOS as Record<string, string[] | undefined>)[tipo]?.includes(mime) ?? false;
}
