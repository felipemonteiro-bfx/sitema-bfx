import { prisma } from "@/lib/db";
import { generateReciboPdf } from "@/lib/recibo-pdf";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return new NextResponse("Token inválido", { status: 400 });

  const venda = await prisma.venda.findUnique({
    where: { assinaturaToken: token },
  });

  if (!venda) return new NextResponse("Link não encontrado ou expirado", { status: 404 });

  try {
    const pdfBytes = await generateReciboPdf(venda.id, "autorizacao");
    return new NextResponse(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="autorizacao_${venda.id}.pdf"`,
        "Cache-Control": "no-cache, no-transform",
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    return new NextResponse("Erro ao gerar documento", { status: 500 });
  }
}
