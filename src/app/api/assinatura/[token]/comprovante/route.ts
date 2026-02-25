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

  const safePath = venda.comprovantePdf.replace(/^\/+/, "").replace(/\.\./g, "");
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
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }
    console.error("Erro ao ler comprovante:", err);
    return new NextResponse("Erro ao carregar", { status: 500 });
  }
}
