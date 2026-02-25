import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Serve o comprovante assinado (PDF) de uma venda.
 * Requer autenticação. Usa o path armazenado no banco para ler o arquivo.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendaId = searchParams.get("vendaId");
  if (!vendaId) return NextResponse.json({ error: "vendaId obrigatório" }, { status: 400 });

  const id = Number(vendaId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "vendaId inválido" }, { status: 400 });

  const venda = await prisma.venda.findUnique({
    where: { id },
    select: { comprovantePdf: true },
  });

  if (!venda?.comprovantePdf) {
    return NextResponse.json({ error: "Comprovante não encontrado" }, { status: 404 });
  }

  // Evita path traversal: comprovantePdf deve começar com /uploads/
  const safePath = venda.comprovantePdf.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!safePath.startsWith("uploads/")) {
    return NextResponse.json({ error: "Path inválido" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", safePath);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(safePath).toLowerCase().slice(1) || "pdf";
    const contentType = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="comprovante-venda-${id}.${ext}"`,
      },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
    }
    console.error("Erro ao ler comprovante:", err);
    return NextResponse.json({ error: "Erro ao carregar comprovante" }, { status: 500 });
  }
}
