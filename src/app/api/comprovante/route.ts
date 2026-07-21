import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Serve o comprovante assinado (PDF) de uma venda.
 * Busca o Documento do tipo 'comprovante_assinatura' no banco de dados.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendaId = searchParams.get("vendaId");
  if (!vendaId) return NextResponse.json({ error: "vendaId obrigatório" }, { status: 400 });

  const id = Number(vendaId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "vendaId inválido" }, { status: 400 });

  const documento = await prisma.documento.findFirst({
    where: {
      vendaId: id,
      tipo: "comprovante_assinatura",
    },
    orderBy: { criadoEm: "desc" },
  });

  if (!documento) {
    return NextResponse.json({ error: "Comprovante não encontrado" }, { status: 404 });
  }

  const buffer = Buffer.from(documento.conteudo);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": documento.mimeType || "application/pdf",
      "Content-Disposition": `inline; filename="comprovante-venda-${id}.pdf"`,
    },
  });
}
