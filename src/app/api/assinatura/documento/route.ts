import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const vendaId = Number(req.nextUrl.searchParams.get("vendaId"));
  if (!vendaId) return new NextResponse("vendaId obrigatório", { status: 400 });

  const doc = await prisma.documento.findFirst({
    where: { vendaId, tipo: "comprovante_assinatura" },
    orderBy: { criadoEm: "desc" },
  });

  if (!doc) return new NextResponse("Documento não encontrado", { status: 404 });

  return new NextResponse(doc.conteudo, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-assinado-${vendaId}.pdf"`,
      "Content-Length": String(doc.tamanhoBytes),
    },
  });
}
