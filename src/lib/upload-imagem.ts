/**
 * Upload de imagem (produto e logo) — 2026-09-11, achados HIGH do hook de
 * revisão de segurança.
 *
 * O tipo do arquivo vem dos BYTES, nunca do `file.type`, que o navegador — ou
 * quem forja a requisição — escolhe. Só PNG, JPEG e WebP: SVG executa script
 * quando aberto direto no navegador, e o bucket serve o arquivo com o
 * Content-Type que a gente gravar. O nome gravado nunca carrega caminho e a
 * extensão é sempre a do conteúdo real.
 */
import { sanitizarNomeArquivo } from "@/lib/storage-policy";

export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
export const ERRO_IMAGEM_GRANDE = "Imagem maior que 5 MB.";
const TAMANHO_MAXIMO_NOME = 80;
/** Folga para os cabeçalhos do multipart em volta do arquivo. */
const FOLGA_MULTIPART = 64 * 1024;

export type TipoImagem =
  | { mime: "image/png"; extensao: "png" }
  | { mime: "image/jpeg"; extensao: "jpg" }
  | { mime: "image/webp"; extensao: "webp" };
export type MimeImagem = TipoImagem["mime"];

export const MIMES_PADRAO: readonly MimeImagem[] = ["image/png", "image/jpeg", "image/webp"];
/** O logo vai para recibo, catálogo e relatório em PDF, que só embutem PNG e JPEG (`logo-loader.ts`). */
export const MIMES_LOGO: readonly MimeImagem[] = ["image/png", "image/jpeg"];

const NOME_DO_TIPO: Record<MimeImagem, string> = { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WebP" };

export type ValidacaoImagem = { ok: true; tipo: TipoImagem } | { ok: false; status: 413 | 415; erro: string };

const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ASSINATURA_JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function temNaPosicao(bytes: Uint8Array, assinatura: number[], posicao = 0): boolean {
  if (bytes.length < posicao + assinatura.length) return false;
  return assinatura.every((b, i) => bytes[posicao + i] === b);
}

/** PNG, JPEG ou WebP pela assinatura dos primeiros bytes; qualquer outra coisa, `null`. */
export function detectarTipoImagem(bytes: Uint8Array): TipoImagem | null {
  if (temNaPosicao(bytes, ASSINATURA_PNG)) return { mime: "image/png", extensao: "png" };
  if (temNaPosicao(bytes, ASSINATURA_JPEG)) return { mime: "image/jpeg", extensao: "jpg" };
  // WebP é um contêiner RIFF com "WEBP" no byte 8 — RIFF sozinho também é WAV e AVI.
  if (temNaPosicao(bytes, RIFF) && temNaPosicao(bytes, WEBP, 8)) return { mime: "image/webp", extensao: "webp" };
  return null;
}

function erroDeTipo(permitidos: readonly MimeImagem[]): string {
  const nomes = permitidos.map((m) => NOME_DO_TIPO[m]);
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}` : nomes[0];
  return `Envie uma imagem ${lista}.`;
}

export function validarImagem(bytes: Uint8Array, permitidos: readonly MimeImagem[] = MIMES_PADRAO): ValidacaoImagem {
  if (bytes.length > TAMANHO_MAXIMO_IMAGEM) return { ok: false, status: 413, erro: ERRO_IMAGEM_GRANDE };
  const tipo = detectarTipoImagem(bytes);
  if (!tipo || !permitidos.includes(tipo.mime)) return { ok: false, status: 415, erro: erroDeTipo(permitidos) };
  return { ok: true, tipo };
}

/**
 * `req.formData()` lê o corpo inteiro para a memória antes de qualquer
 * checagem; o Content-Length, quando vem, deixa recusar antes. Sem ele, a
 * checagem de `file.size` depois do parse continua valendo.
 */
export function corpoGrandeDemais(req: Request): boolean {
  const tamanho = Number(req.headers.get("content-length"));
  return Number.isFinite(tamanho) && tamanho > TAMANHO_MAXIMO_IMAGEM + FOLGA_MULTIPART;
}

/**
 * Nome para o disco e para o bucket: só `A-Z a-z 0-9 . _ -`, sem `..`, sem
 * ponto ou hífen nas pontas, até 80 caracteres, e a extensão do tipo real
 * (um JPEG chamado `foto.html` vira `foto.jpg`).
 */
export function nomeComExtensaoReal(nomeOriginal: string, tipo: TipoImagem): string {
  const semExtensao = nomeOriginal.replace(/\.[^./\\]*$/, "");
  const base = sanitizarNomeArquivo(semExtensao)
    .replace(/\.{2,}/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, TAMANHO_MAXIMO_NOME)
    .replace(/[.-]+$/, "");
  return `${base || "imagem"}.${tipo.extensao}`;
}
