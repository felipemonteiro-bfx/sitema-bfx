import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // O prefixo /api/assinatura é público por causa do fluxo de assinar.
  // Este PDF tem CPF e assinatura, então só sai para quem está logado.
  const session = await getSession();
  if (!session) return new NextResponse("Não autenticado.", { status: 401 });

  const vendaId = Number(req.nextUrl.searchParams.get("vendaId"));
  if (!vendaId) return new NextResponse("vendaId obrigatório", { status: 400 });

  const doc = await prisma.documento.findFirst({
    where: { vendaId, tipo: "comprovante_assinatura" },
    orderBy: { criadoEm: "desc" },
  });

  if (!doc) return new NextResponse("Documento não encontrado", { status: 404 });

  // `inline=1` abre o PDF no navegador. Sem isso o histórico continua baixando.
  const inline = req.nextUrl.searchParams.get("inline") === "1";

  return new NextResponse(doc.conteudo, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="recibo-assinado-${vendaId}.pdf"`,
      "Content-Length": String(doc.tamanhoBytes),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
