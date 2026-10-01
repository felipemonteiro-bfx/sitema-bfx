import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * GET /api/arquivos/[id]
 *
 * Arquivo privado do financeiro (PDF do boleto Prudent, comprovante de pagamento, demonstrativo
 * do fechamento em PDF e XLSX). Admin-only. O tipo do upload foi conferido pelos bytes (só PDF, PNG
 * e JPEG); os demonstrativos são gerados pelo sistema. Abre inline com CSP sandbox e nosniff.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const { id } = await params;
  const arquivoId = Number(id);
  if (!Number.isInteger(arquivoId) || arquivoId <= 0) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const arquivo = await prisma.arquivoFinanceiro.findUnique({
    where: { id: arquivoId },
    select: { id: true, nome: true, contentType: true, conteudo: true },
  });
  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const ascii = arquivo.nome.replace(/[^A-Za-z0-9._-]+/g, "-");
  return new Response(new Uint8Array(arquivo.conteudo), {
    headers: {
      "Content-Type": arquivo.contentType,
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
      "X-Content-Type-Options": "nosniff",
      // Aberto inline, o arquivo fica numa origem opaca, sem script: nada roda com a sessão do app.
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
