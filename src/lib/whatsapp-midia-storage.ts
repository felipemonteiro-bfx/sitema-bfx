/**
 * Storage PRIVADO das mídias do atendimento WhatsApp.
 *
 * Regras (decisão D5 revisada):
 *  - o bucket `whatsapp-midias` e a credencial de escopo próprio são criados pelo
 *    dono da infra; a app NUNCA cria bucket nem aplica política;
 *  - a app RECUSA operar se o bucket tiver política de leitura anônima;
 *  - a chave é sempre `midias/aaaa/mm/<uuid>`, nunca derivada de nome de arquivo;
 *  - mensagens de erro nunca carregam credencial nem a mensagem crua do SDK.
 */

import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetBucketPolicyCommand,
  GetBucketWebsiteCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { criarClienteS3 } from "@/lib/minio";

export type MidiaStorageCode =
  | "nao_configurado"
  | "bucket_publico"
  | "bucket_ausente"
  | "verificacao_falhou"
  | "chave_invalida"
  | "range_invalido"
  | "range_nao_satisfeito"
  | "falha_storage";

export class MidiaStorageError extends Error {
  constructor(public readonly code: MidiaStorageCode, mensagem: string) {
    super(mensagem);
    this.name = "MidiaStorageError";
  }
}

const BUCKET_PADRAO = "whatsapp-midias";
// Bucket público de imagens de produto: nunca pode receber mídia de cliente.
const BUCKET_PUBLICO_PRODUTOS = "produtos";

export interface ConfigWhatsApp {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

/** Lê a config própria; cada variável cai na MINIO_* geral se ausente. */
export function lerConfigWhatsApp(env: Record<string, string | undefined> = process.env): ConfigWhatsApp {
  const endpoint = env.MINIO_WHATSAPP_ENDPOINT || env.MINIO_ENDPOINT;
  const accessKey = env.MINIO_WHATSAPP_ACCESS_KEY || env.MINIO_ACCESS_KEY;
  const secretKey = env.MINIO_WHATSAPP_SECRET_KEY || env.MINIO_SECRET_KEY;
  const bucket = env.MINIO_WHATSAPP_BUCKET || BUCKET_PADRAO;

  if (!endpoint || !accessKey || !secretKey) {
    throw new MidiaStorageError("nao_configurado", "Storage de mídias do WhatsApp não configurado.");
  }
  if (bucket === BUCKET_PUBLICO_PRODUTOS) {
    throw new MidiaStorageError("bucket_publico", "O bucket de mídias não pode ser o bucket público de produtos.");
  }
  return { endpoint, accessKey, secretKey, bucket };
}

// ---------------------------------------------------------------- verificação

let bucketVerificado: string | null = null;
let verificadoEm = 0;
/** Quanto tempo o resultado "privado" vale antes de ser conferido de novo (a política pode mudar). */
const VALIDADE_VERIFICACAO_MS = 10 * 60_000;

/** Só para testes: esquece a verificação já feita neste processo. */
export function _resetarCacheParaTeste(): void {
  bucketVerificado = null;
  verificadoEm = 0;
}

function statusDe(e: unknown): number | undefined {
  return (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
}
function nomeDe(e: unknown): string | undefined {
  return (e as { name?: string }).name;
}

function comoLista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v === undefined ? [] : [v];
}

/** True se a política concede leitura (qualquer s3:Get*, s3:* ou *) a qualquer um (Principal "*" ou {AWS:"*"}). */
function politicaEhPublica(politicaJson: string): boolean {
  let doc: { Statement?: unknown };
  try {
    doc = JSON.parse(politicaJson);
  } catch {
    // Política ilegível: não dá para provar que é privada.
    return true;
  }
  for (const st of comoLista(doc.Statement) as Record<string, unknown>[]) {
    if (!st || st.Effect !== "Allow") continue;
    const p = st.Principal;
    const anonimo =
      p === "*" || (typeof p === "object" && p !== null && comoLista((p as { AWS?: unknown }).AWS).includes("*"));
    if (!anonimo) continue;
    const concedeLeitura = comoLista(st.Action).some((a) => {
      if (typeof a !== "string") return false;
      const x = a.toLowerCase();
      // Qualquer s3:Get* (GetObject, GetObjectVersion, GetObjectAcl...), s3:* ou * concede leitura.
      return x === "*" || x === "s3:*" || x.startsWith("s3:get");
    });
    if (concedeLeitura) return true;
  }
  return false;
}

function cliente(): { s3: S3Client; bucket: string } {
  const cfg = lerConfigWhatsApp();
  return { s3: criarClienteS3(cfg), bucket: cfg.bucket };
}

/**
 * Confere que o bucket existe e NÃO tem leitura anônima. Nunca cria bucket nem
 * escreve política. O resultado positivo é guardado por processo.
 */
export async function verificarBucketPrivado(): Promise<void> {
  const { s3, bucket } = cliente();
  if (bucketVerificado === bucket && Date.now() - verificadoEm < VALIDADE_VERIFICACAO_MS) return;
  // Venceu ou nunca foi feita: derruba o cache antes, para uma falha aqui não reaproveitar o resultado velho.
  bucketVerificado = null;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e) {
    if (statusDe(e) === 404 || nomeDe(e) === "NotFound" || nomeDe(e) === "NoSuchBucket") {
      throw new MidiaStorageError("bucket_ausente", `Bucket "${bucket}" não existe; peça ao dono da infra para criá-lo.`);
    }
    throw new MidiaStorageError("verificacao_falhou", `Não foi possível acessar o bucket "${bucket}".`);
  }

  if (process.env.MINIO_WHATSAPP_STORAGE_DRIVER === "garage") {
    // Garage não implementa ACL/políticas S3. A exposição anônima ocorre pelo
    // website do bucket, que precisa permanecer desativado.
    try {
      const website = await s3.send(new GetBucketWebsiteCommand({ Bucket: bucket }));
      // Garage 2.3 devolve configuração vazia quando o website está desligado.
      if (website.IndexDocument || website.ErrorDocument || website.RedirectAllRequestsTo || website.RoutingRules?.length) {
        throw new MidiaStorageError("bucket_publico", "Bucket de mídia está exposto como website.");
      }
    } catch (e) {
      if (e instanceof MidiaStorageError) throw e;
      if (nomeDe(e) !== "NoSuchWebsiteConfiguration") {
        throw new MidiaStorageError("verificacao_falhou", "Não foi possível verificar a privacidade no Garage.");
      }
    }
    bucketVerificado = bucket;
    verificadoEm = Date.now();
    return;
  }
  try {
    const r = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    if (r.Policy && politicaEhPublica(r.Policy)) {
      throw new MidiaStorageError("bucket_publico", `Bucket "${bucket}" tem leitura anônima; recusando operar.`);
    }
  } catch (e) {
    if (e instanceof MidiaStorageError) throw e;
    // Sem política (ou backend que não implementa política) = sem leitura anônima por política.
    if (nomeDe(e) === "NoSuchBucketPolicy" || nomeDe(e) === "NotImplemented" || statusDe(e) === 501) {
      // segue
    } else if (statusDe(e) === 404) {
      // segue: 404 de política inexistente
    } else {
      throw new MidiaStorageError("verificacao_falhou", `Não foi possível verificar a política do bucket "${bucket}".`);
    }
  }
  bucketVerificado = bucket;
  verificadoEm = Date.now();
}

// --------------------------------------------------------------------- chaves

const CHAVE_RE = /^midias\/\d{4}\/(0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Gera `midias/aaaa/mm/<uuid>` (UTC). Nunca usa nome de arquivo. */
export function chaveNova(agora: Date = new Date()): string {
  const aaaa = String(agora.getUTCFullYear()).padStart(4, "0");
  const mm = String(agora.getUTCMonth() + 1).padStart(2, "0");
  return `midias/${aaaa}/${mm}/${randomUUID()}`;
}

/** Devolve a chave se estiver no formato exigido; senão lança chave_invalida. */
export function validarChave(chave: string): string {
  if (typeof chave !== "string" || !CHAVE_RE.test(chave)) {
    throw new MidiaStorageError("chave_invalida", "Chave de mídia fora do formato midias/aaaa/mm/<uuid>.");
  }
  return chave;
}

// ------------------------------------------------------------------ operações

export async function gravar(chave: string, bytes: Buffer | Uint8Array, mime: string): Promise<void> {
  validarChave(chave);
  await verificarBucketPrivado();
  const { s3, bucket } = cliente();
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: chave, Body: bytes, ContentType: mime }));
  } catch {
    throw new MidiaStorageError("falha_storage", "Falha ao gravar a mídia no storage.");
  }
}

export interface MidiaLida {
  corpo: ReadableStream<Uint8Array>;
  contentType: string;
  /** Tamanho do objeto inteiro (não do trecho). */
  tamanhoTotal: number | null;
  /** Bytes realmente devolvidos nesta resposta. */
  contentLength: number | null;
  /** Valor para o cabeçalho Content-Range quando houve Range; senão null. */
  contentRange: string | null;
  /** 206 quando houve Range, senão 200. */
  status: 200 | 206;
  etag: string | null;
}

/** Aceita `bytes=a-b`, `bytes=a-` e `bytes=-n` (um único intervalo). */
function rangeValido(range: string): boolean {
  if (!range.startsWith("bytes=")) return false;
  const partes = range.slice(6).split("-");
  if (partes.length !== 2) return false;
  const [ini, fim] = partes;
  const so_digitos = (s: string) => s.length > 0 && s.length <= 15 && s.split("").every((c) => c >= "0" && c <= "9");
  if (ini === "") return so_digitos(fim) && Number(fim) > 0;
  if (!so_digitos(ini)) return false;
  if (fim === "") return true;
  return so_digitos(fim) && Number(fim) >= Number(ini);
}

/** Lê o objeto, repassando o Range ao GetObject. Devolve null se a chave não existe. */
export async function ler(chave: string, range?: string | null): Promise<MidiaLida | null> {
  validarChave(chave);
  if (range && !rangeValido(range)) {
    throw new MidiaStorageError("range_invalido", "Cabeçalho Range inválido.");
  }
  await verificarBucketPrivado();
  const { s3, bucket } = cliente();
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: chave, ...(range ? { Range: range } : {}) }));
    if (!r.Body) return null;
    const contentLength = typeof r.ContentLength === "number" ? r.ContentLength : null;
    let total = contentLength;
    if (r.ContentRange) {
      const t = Number(r.ContentRange.split("/")[1]);
      total = Number.isFinite(t) ? t : null;
    }
    // 206 só se o storage realmente devolveu o trecho (ContentRange); senão o corpo é inteiro e a resposta é 200.
    const parcial = !!range && !!r.ContentRange;
    return {
      corpo: (r.Body as { transformToWebStream: () => ReadableStream<Uint8Array> }).transformToWebStream(),
      contentType: r.ContentType ?? "application/octet-stream",
      tamanhoTotal: total,
      contentLength,
      contentRange: parcial ? (r.ContentRange ?? null) : null,
      status: parcial ? 206 : 200,
      etag: r.ETag ?? null,
    };
  } catch (e) {
    const n = nomeDe(e);
    const s = statusDe(e);
    if (n === "NoSuchKey" || n === "NotFound" || s === 404) return null;
    if (n === "InvalidRange" || s === 416) {
      throw new MidiaStorageError("range_nao_satisfeito", "Intervalo solicitado fora do tamanho da mídia.");
    }
    throw new MidiaStorageError("falha_storage", "Falha ao ler a mídia do storage.");
  }
}

export async function remover(chave: string): Promise<void> {
  validarChave(chave);
  await verificarBucketPrivado();
  const { s3, bucket } = cliente();
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave }));
  } catch {
    throw new MidiaStorageError("falha_storage", "Falha ao remover a mídia do storage.");
  }
}
