/**
 * Arquivos privados do financeiro (2026-09-30, Fase 4): PDF do boleto Prudent e comprovante de
 * pagamento. Ficam em bytes no banco (`ArquivoFinanceiro`), no padrão de `Documento` — o bucket
 * MinIO só serve chaves públicas (`storage-policy.ts`). Quem serve é `/api/arquivos/[id]`, só admin.
 *
 * O tipo vem dos BYTES, nunca do `file.type`: PDF começa com `%PDF`; PNG e JPEG pela assinatura de
 * `detectarTipoImagem`. Só esses três — a rota devolve o arquivo inline, então nada que o
 * navegador execute. Limite de 10 MB, o mesmo do corpo de server action (`next.config.ts`).
 */
import { createHash } from "node:crypto";
import type { prisma } from "@/lib/db";
import { sanitizarNomeArquivo } from "@/lib/storage-policy";
import { detectarTipoImagem } from "@/lib/upload-imagem";

import { TAMANHO_MAXIMO_ARQUIVO } from "@/lib/arquivo-limite";

export { TAMANHO_MAXIMO_ARQUIVO };
const TAMANHO_MAXIMO_NOME = 80;

export type MimeArquivoFinanceiro = "application/pdf" | "image/png" | "image/jpeg";
export type TipoArquivoFinanceiro = { mime: MimeArquivoFinanceiro; extensao: "pdf" | "png" | "jpg" };

export const MIMES_FINANCEIRO: readonly MimeArquivoFinanceiro[] = ["application/pdf", "image/png", "image/jpeg"];
export const MIMES_SO_PDF: readonly MimeArquivoFinanceiro[] = ["application/pdf"];

const NOME_DO_TIPO: Record<MimeArquivoFinanceiro, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
};

const ASSINATURA_PDF = [0x25, 0x50, 0x44, 0x46]; // %PDF

export function detectarTipoArquivo(bytes: Uint8Array): TipoArquivoFinanceiro | null {
  if (bytes.length >= ASSINATURA_PDF.length && ASSINATURA_PDF.every((b, i) => bytes[i] === b)) {
    return { mime: "application/pdf", extensao: "pdf" };
  }
  const imagem = detectarTipoImagem(bytes);
  if (imagem?.mime === "image/png") return { mime: "image/png", extensao: "png" };
  if (imagem?.mime === "image/jpeg") return { mime: "image/jpeg", extensao: "jpg" };
  return null;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function erroDeTipo(permitidos: readonly MimeArquivoFinanceiro[]): string {
  const nomes = permitidos.map((m) => NOME_DO_TIPO[m]);
  const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}` : nomes[0];
  return `Envie um ${lista}.`;
}

/** Nome sem caminho, só `A-Z a-z 0-9 . _ -`, e com a extensão do conteúdo real. */
function nomeSeguro(original: string, tipo: TipoArquivoFinanceiro): string {
  const base = (original.split(/[\\/]/).pop() ?? "").replace(/\.[^.]*$/, "");
  const limpo = sanitizarNomeArquivo(base)
    .replace(/\.{2,}/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, TAMANHO_MAXIMO_NOME)
    .replace(/[.-]+$/, "");
  return `${limpo || "arquivo"}.${tipo.extensao}`;
}

export type ArquivoPreparado = {
  ok: true;
  nome: string;
  contentType: MimeArquivoFinanceiro;
  tamanho: number;
  sha256: string;
  bytes: Uint8Array;
};

/** Lê e valida o arquivo enviado, sem gravar. As actions validam antes de abrir a transação. */
export async function prepararArquivoFinanceiro(
  file: File,
  permitidos: readonly MimeArquivoFinanceiro[] = MIMES_FINANCEIRO
): Promise<ArquivoPreparado | { ok: false; erro: string }> {
  if (file.size > TAMANHO_MAXIMO_ARQUIVO) return { ok: false, erro: "Arquivo maior que 10 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0) return { ok: false, erro: "Arquivo vazio." };
  if (bytes.length > TAMANHO_MAXIMO_ARQUIVO) return { ok: false, erro: "Arquivo maior que 10 MB." };
  const tipo = detectarTipoArquivo(bytes);
  if (!tipo || !permitidos.includes(tipo.mime)) return { ok: false, erro: erroDeTipo(permitidos) };
  return {
    ok: true,
    nome: nomeSeguro(file.name, tipo),
    contentType: tipo.mime,
    tamanho: bytes.length,
    sha256: sha256Hex(bytes),
    bytes,
  };
}

type DbArquivo = Pick<typeof prisma, "arquivoFinanceiro">;

/** Grava o arquivo já validado. Recebe a transação de quem chama: o arquivo anda com o registro. */
export async function salvarArquivoFinanceiro(
  db: DbArquivo,
  arquivo: ArquivoPreparado,
  usuario: string | null
): Promise<{ id: number; sha256: string }> {
  return db.arquivoFinanceiro.create({
    data: {
      nome: arquivo.nome,
      contentType: arquivo.contentType,
      tamanho: arquivo.tamanho,
      sha256: arquivo.sha256,
      conteudo: Buffer.from(arquivo.bytes),
      criadoPor: usuario,
    },
    select: { id: true, sha256: true },
  });
}
