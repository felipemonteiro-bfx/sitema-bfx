import { prisma } from "@/lib/db";

export const TIPO_COMPROVANTE_ASSINATURA = "comprovante_assinatura";

export type DocumentoSalvo = { id: number };

/**
 * Salva um documento no banco (BYTEA).
 * Retorna o id do documento criado.
 */
export async function salvarDocumento(
  vendaId: number,
  tipo: string,
  buffer: Buffer,
  mimeType = "application/pdf"
): Promise<DocumentoSalvo> {
  const doc = await prisma.documento.create({
    data: {
      vendaId,
      tipo,
      mimeType,
      conteudo: new Uint8Array(buffer),
      tamanhoBytes: buffer.length,
    },
  });
  return { id: doc.id };
}

/**
 * Retorna o documento por id.
 */
export async function obterDocumento(id: number): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const doc = await prisma.documento.findUnique({
    where: { id },
    select: { conteudo: true, mimeType: true },
  });
  if (!doc) return null;
  return {
    buffer: Buffer.from(doc.conteudo),
    mimeType: doc.mimeType,
  };
}

/**
 * Retorna o documento de comprovante assinado de uma venda.
 */
export async function obterDocumentoPorVendaETipo(
  vendaId: number,
  tipo: string = TIPO_COMPROVANTE_ASSINATURA
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const doc = await prisma.documento.findFirst({
    where: { vendaId, tipo },
    orderBy: { criadoEm: "desc" },
    select: { conteudo: true, mimeType: true },
  });
  if (!doc) return null;
  return {
    buffer: Buffer.from(doc.conteudo),
    mimeType: doc.mimeType,
  };
}
