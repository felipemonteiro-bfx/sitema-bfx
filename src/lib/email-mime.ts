/**
 * Montagem de mensagens MIME para o cliente SMTP nativo (`email.ts`).
 *
 * Modulo puro, sem dependencias de DB/env — importavel em testes isoladamente.
 */
import { randomUUID } from "node:crypto";

export type EmailAttachment = {
  filename: string;
  contentType: string;
  content: Uint8Array | Buffer;
};

export type MimeMessageInput = {
  to: string | string[];
  cc?: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

import { assertSafeEmailAddresses } from "@/lib/email-endereco";

export { assertSafeEmailAddresses };

/** Codifica string em base64 (headers/corpo). */
export function toBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

/** Quebra uma string base64 em linhas de 76 caracteres (RFC 2045). */
export function chunkBase64(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

/** Message-ID unico no dominio do remetente — o Gmail recusa mensagem sem ele (550 5.7.1). */
function gerarMessageId(from: string): string {
  const dominio = from.split("@")[1];
  return `<${Date.now().toString(36)}.${randomUUID()}@${dominio}>`;
}

/**
 * Monta a mensagem MIME completa (headers + corpo).
 * Sem anexos: multipart/alternative (comportamento historico).
 * Com anexos: multipart/mixed com a parte HTML + cada anexo em base64.
 *
 * Funcao pura — `boundary`/`date` sao injetaveis para testes deterministicos.
 */
export function buildMimeMessage(
  opts: MimeMessageInput,
  from: string,
  overrides?: { boundary?: string; date?: string }
): string {
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  const ccList = opts.cc || [];
  assertSafeEmailAddresses(toList, "destinatário");
  assertSafeEmailAddresses(ccList, "Cc");
  assertSafeEmailAddresses([from], "remetente");
  const boundary = overrides?.boundary ?? `bfx_${Date.now()}`;
  const dateHeader = overrides?.date ?? new Date().toUTCString();
  const ccHeaderLine = ccList.length ? `Cc: ${ccList.join(", ")}` : null;

  const commonHeaders: (string | null)[] = [
    `From: ${from}`,
    `To: ${toList.join(", ")}`,
    ccHeaderLine,
    `Subject: =?UTF-8?B?${toBase64(opts.subject)}?=`,
    `Date: ${dateHeader}`,
    `Message-ID: ${gerarMessageId(from)}`,
    `MIME-Version: 1.0`,
  ];

  const attachments = opts.attachments ?? [];

  if (attachments.length === 0) {
    return [
      ...commonHeaders,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      chunkBase64(toBase64(opts.html)),
      ``,
      `--${boundary}--`,
    ]
      .filter((l) => l !== null)
      .join("\r\n");
  }

  // Envelope multipart/mixed: parte de corpo (multipart/alternative com o HTML) + anexos.
  // Aninhar o HTML em multipart/alternative melhora a renderizacao em clientes exigentes.
  const altBoundary = `${boundary}_alt`;
  const parts: (string | null)[] = [
    ...commonHeaders,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    chunkBase64(toBase64(opts.html)),
    ``,
    `--${altBoundary}--`,
  ];

  for (const att of attachments) {
    const contentB64 = Buffer.from(att.content).toString("base64");
    parts.push(
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      ``,
      chunkBase64(contentB64)
    );
  }

  parts.push(`--${boundary}--`);
  return parts.filter((l) => l !== null).join("\r\n");
}
