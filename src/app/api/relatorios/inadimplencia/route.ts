import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fontePdfSegura } from "@/lib/pdf-texto";
import { linhaCsv } from "@/lib/csv";
import { FILTRO_VENDA_VALIDA } from "@/lib/venda-utils";

export async function GET(req: Request) {
  // Só admin (a tela /relatorios é só admin): nomes, empresas e valores em atraso.
  if (!(await requireAdmin())) {
    return Response.json({ error: "Somente administradores geram o relatório de inadimplência." }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = (searchParams.get("format") || "csv").toLowerCase();

  const hoje = new Date();
  // Sem `from`, sem piso: atraso de ano anterior também é inadimplência (antes cortava em
  // 1º de janeiro, e a tela ainda mandava o dia 1 do mês corrente).
  const start = from ? new Date(from + "T00:00:00") : null;
  const end = to ? new Date(to + "T23:59:59") : hoje;

  const parcelas = await prisma.parcelaVencimento.findMany({
    where: {
      paga: false,
      // Parcela antecipada já foi paga pela Prudent: não é atraso do cliente.
      antecipada: false,
      dataVencimento: { ...(start ? { gte: start } : {}), lte: end },
      venda: FILTRO_VENDA_VALIDA,
    },
    include: {
      venda: {
        include: { cliente: { select: { nome: true, empresa: true } } },
      },
    },
    orderBy: { dataVencimento: "asc" },
  });

  const rows = parcelas.map((p) => {
    const diasAtraso =
      p.dataVencimento < hoje
        ? Math.floor(
            (hoje.getTime() - p.dataVencimento.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;
    return {
      vencimento: p.dataVencimento.toISOString().slice(0, 10),
      vendaId: p.vendaId,
      cliente: p.venda.cliente?.nome || "N/D",
      empresa: p.venda.cliente?.empresa || "N/D",
      parcela: p.numeroParcela,
      valor: p.valorParcela,
      diasAtraso,
    };
  });

  if (format === "pdf") {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = fontePdfSegura(await pdfDoc.embedFont(StandardFonts.Helvetica));
    const fontBold = fontePdfSegura(await pdfDoc.embedFont(StandardFonts.HelveticaBold));

    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.07, 0.15, 0.3) });
    page.drawText("RELATÓRIO DE INADIMPLÊNCIA", {
      x: 40, y: height - 45, size: 18, font: fontBold, color: rgb(1, 1, 1),
    });
    page.drawText(start ? `Período: ${formatDateBR(start)} até ${formatDateBR(end)}` : `Vencidas até ${formatDateBR(end)}`, {
      x: 40, y: height - 65, size: 10, font, color: rgb(0.9, 0.9, 0.9),
    });

    const colX = [40, 95, 150, 270, 340, 420, 490];
    const headers = ["Venc.", "Venda", "Cliente", "Empresa", "Parcela", "Valor", "Dias"];
    const tableTop = height - 120;
    page.drawRectangle({ x: 30, y: tableTop - 5, width: width - 60, height: 20, color: rgb(0.95, 0.95, 0.95) });
    headers.forEach((h, i) => {
      page.drawText(h, { x: colX[i], y: tableTop, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    });

    let y = tableTop - 22;
    let total = 0;

    for (const r of rows) {
      if (y < 50) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
      total += r.valor;
      page.drawText(r.vencimento, { x: colX[0], y, size: 8, font });
      page.drawText(String(r.vendaId), { x: colX[1], y, size: 8, font });
      page.drawText(r.cliente.substring(0, 18), { x: colX[2], y, size: 8, font });
      page.drawText(r.empresa.substring(0, 20), { x: colX[3], y, size: 8, font });
      page.drawText(String(r.parcela), { x: colX[4], y, size: 8, font });
      page.drawText(formatBRL(r.valor), { x: colX[5], y, size: 8, font });
      page.drawText(String(r.diasAtraso), {
        x: colX[6], y, size: 8, font,
        color: r.diasAtraso > 0 ? rgb(0.8, 0, 0) : rgb(0.3, 0.3, 0.3),
      });
      y -= 16;
    }

    y -= 15;
    page.drawRectangle({ x: 30, y: y - 10, width: width - 60, height: 25, color: rgb(0.07, 0.15, 0.3) });
    page.drawText(`TOTAL: ${formatBRL(total)} | ${rows.length} parcela(s)`, { x: 40, y, size: 11, font: fontBold, color: rgb(1, 1, 1) });

    const pdfBytes = await pdfDoc.save();
    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="relatorio_inadimplencia.pdf"',
        "Cache-Control": "no-cache, no-transform",
        "Content-Length": String(pdfBytes.length),
      },
    });
  }

  // BOM para o Excel ler acento; célula escapada (nome com vírgula deslocava colunas).
  const header = "\uFEFFVencimento,VendaId,Cliente,Empresa,Parcela,Valor,DiasAtraso\n";
  const csv = header + rows.map((r) => linhaCsv([r.vencimento, r.vendaId, r.cliente, r.empresa, r.parcela, r.valor.toFixed(2), r.diasAtraso])).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio_inadimplencia.csv"',
    },
  });
}
