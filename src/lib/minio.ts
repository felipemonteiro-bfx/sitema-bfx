/**
 * Cliente MinIO (S3-compatible) para upload de arquivos.
 */

import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";

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
  return !!(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY);
}
