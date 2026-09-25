import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * GET /api/emails/[id]/anexos/[anexoId]?inline=1
 *
 * Arquivo anexado a um e-mail do histórico, como foi enviado. Admin-only (o
 * termo tem CPF e assinatura). `inline=1` abre no navegador — só para PDF;
 * qualquer outro tipo sai como download, para não renderizar HTML do banco.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; anexoId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const { id, anexoId } = await params;
  const envioId = Number(id);
  const anexoNum = Number(anexoId);
  if (!Number.isInteger(envioId) || !Number.isInteger(anexoNum)) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const anexo = await prisma.emailEnvioAnexo.findFirst({ where: { id: anexoNum, envioId } });
  if (!anexo) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1" && anexo.contentType === "application/pdf";
  const ascii = anexo.nome.replace(/[^A-Za-z0-9._-]+/g, "-");
  const disposicao = `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`;

  return new Response(new Uint8Array(anexo.conteudo), {
    headers: {
      "Content-Type": anexo.contentType,
      "Content-Disposition": disposicao,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
