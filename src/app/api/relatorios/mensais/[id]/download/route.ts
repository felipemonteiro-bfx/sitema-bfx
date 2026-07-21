import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { gerarArtefatosRelatorioMensal } from "@/lib/relatorio-mensal-service";

/**
 * GET /api/relatorios/mensais/[id]/download?tipo=pdf|xlsx
 *
 * Baixa o PDF ou XLSX do relatorio mensal referente a um RelatorioEnvioLog.
 * Regenera o artefato na hora (sempre atualizado), sem depender do MinIO.
 * Admin-only.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") === "xlsx" ? "xlsx" : "pdf";

  const log = await prisma.relatorioEnvioLog.findUnique({ where: { id: Number(id) } });
  if (!log) {
    return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 });
  }

  const artefatos = await gerarArtefatosRelatorioMensal(log.empresaId, log.periodo);
  if (!artefatos) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const nomeBase = `relatorio-${log.periodo}-empresa-${log.empresaId}`;
  if (tipo === "xlsx") {
    return new Response(new Uint8Array(artefatos.xlsx), {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename=${nomeBase}.xls`,
      },
    });
  }
  return new Response(new Uint8Array(artefatos.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${nomeBase}.pdf`,
    },
  });
}
