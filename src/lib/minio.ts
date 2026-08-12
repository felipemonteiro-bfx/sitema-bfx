/**
 * Cliente MinIO (S3-compatible) para upload de arquivos.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { storageConfigurado } from "@/lib/storage-policy";

const bucket = process.env.MINIO_BUCKET ?? "produtos";
const publicUrl = process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000";

function getClient(): S3Client | null {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) return null;

  return new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
}

export async function ensureBucket(client: S3Client): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      const policy = JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] }],
      });
      await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }));
    } catch (e) {
      console.error("MinIO ensureBucket error:", e);
      throw e;
    }
  }
}

export async function uploadToMinIO(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  await ensureBucket(client);
  const key = filename;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // URL pública: MINIO_PUBLIC_URL/bucket/key
  return `${publicUrl.replace(/\/$/, "")}/${bucket}/${key}`;
}

export function isMinIOConfigured(): boolean {
  return storageConfigurado(process.env);
}

export interface ObjetoLido {
  corpo: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  etag: string | null;
  lastModified: Date | null;
}

/**
 * Le um objeto do bucket para servir por HTTP.
 *
 * NAO valida se a chave pode ser publicada — quem chama decide, com
 * `chavePublica()` de `@/lib/storage-policy`. Manter a decisao la mantem a
 * regra num modulo puro e testavel.
 *
 * Devolve null quando o storage nao esta configurado ou a chave nao existe;
 * qualquer outro erro sobe, para nao mascarar falha de credencial ou de rede
 * como "arquivo ausente".
 */
export async function lerObjeto(chave: string): Promise<ObjetoLido | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: chave }));
    if (!r.Body) return null;
    return {
      corpo: (r.Body as { transformToWebStream: () => ReadableStream<Uint8Array> }).transformToWebStream(),
      contentType: r.ContentType ?? "application/octet-stream",
      contentLength: typeof r.ContentLength === "number" ? r.ContentLength : null,
      etag: r.ETag ?? null,
      lastModified: r.LastModified ?? null,
    };
  } catch (e) {
    const nome = (e as { name?: string }).name;
    const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (nome === "NoSuchKey" || nome === "NotFound" || status === 404) return null;
    throw e;
  }
}

/**
 * Remove objetos sob um prefixo mais antigos que `maxAgeDays`.
 * Uso seguro para artefatos regeneráveis (ex.: "relatorios/mensal/") — NÃO usar
 * em prefixos de assets vivos (imagens de produto). Retorna a quantidade removida.
 */
export async function cleanupMinIOPrefix(prefix: string, maxAgeDays: number): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  let continuationToken: string | undefined = undefined;

  do {
    const list: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken })
    );
    const antigos = (list.Contents ?? []).filter(
      (o) => o.Key && o.LastModified && o.LastModified.getTime() < cutoff
    );
    if (antigos.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: antigos.map((o) => ({ Key: o.Key! })) },
        })
      );
      removed += antigos.length;
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);

  return removed;
}
