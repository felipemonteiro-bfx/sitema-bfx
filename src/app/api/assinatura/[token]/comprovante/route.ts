import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Serve o comprovante assinado para um token de assinatura (página pública).
 * Usado quando o cliente acessa o link e o documento já foi assinado.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return new NextResponse("Token inválido", { status: 400 });

  const venda = await prisma.venda.findUnique({
    where: { assinaturaToken: token },
    select: { comprovantePdf: true, assinaturaStatus: true },
  });

  if (!venda) return new NextResponse("Link não encontrado", { status: 404 });
  if (venda.assinaturaStatus !== "assinado" || !venda.comprovantePdf) {
    return new NextResponse("Documento ainda não assinado", { status: 404 });
  }

  // Se for URL externa (ex: MinIO/S3), redirecionar
  const pdfPath = venda.comprovantePdf.trim();
  if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
    return NextResponse.redirect(pdfPath);
  }

  const safePath = pdfPath.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!safePath.startsWith("uploads/")) {
    return new NextResponse("Path inválido", { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", safePath);

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprovante-assinado.pdf"`,
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      const html = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Comprovante indisponível</title></head>
        <body style="font-family:system-ui;max-width:480px;margin:2rem auto;padding:1.5rem;text-align:center">
          <h1 style="font-size:1.25rem;color:#374151">Comprovante não disponível</h1>
          <p style="color:#6b7280;line-height:1.6">
            O documento assinado não está disponível no momento. Isso pode ocorrer após reinício ou atualização do servidor.
            A assinatura foi registrada com sucesso. Entre em contato com o suporte para obter uma cópia.
          </p>
        </body></html>`;
      return new NextResponse(html, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    console.error("Erro ao ler comprovante:", err);
    return new NextResponse("Erro ao carregar o documento.", { status: 500 });
  }
}
