import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const empresa = searchParams.get("empresa");
  
  const start = from ? new Date(from + "T00:00:00") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to + "T23:59:59") : new Date();

  try {
    const vendas = await prisma.venda.findMany({
      where: { 
        dataVenda: { gte: start, lte: end },
        cliente: empresa && empresa !== "all" ? {
          empresa: { equals: empresa, mode: 'insensitive' }
        } : undefined
      },
      include: {
        cliente: { select: { nome: true, empresa: true } }
      },
      orderBy: { dataVenda: "desc" },
    });

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.07, 0.15, 0.3) });
    page.drawText("RELATÓRIO DE VENDAS", { x: 40, y: height - 45, size: 20, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`Período: ${formatDate(start)} até ${formatDate(end)}`, { x: 40, y: height - 65, size: 10, font, color: rgb(0.9, 0.9, 0.9) });
    if (empresa && empresa !== "all") {
      page.drawText(`Empresa: ${empresa}`, { x: 400, y: height - 65, size: 10, font, color: rgb(0.9, 0.9, 0.9) });
    }

    // Table Header
    const tableTop = height - 120;
    const colX = [40, 100, 220, 320, 420, 500];
    const headers = ["Data", "Cliente", "Produto", "Vendedor", "Valor", "Status"];
    
    page.drawRectangle({ x: 30, y: tableTop - 5, width: width - 60, height: 20, color: rgb(0.95, 0.95, 0.95) });
    headers.forEach((h, i) => {
      page.drawText(h, { x: colX[i], y: tableTop, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    });

    let y = tableTop - 25;
    let totalValor = 0;

    for (const v of vendas) {
      if (y < 50) {
        page = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }

      const valorTotal = (v.valorVenda || 0) + (v.valorFrete || 0);
      totalValor += valorTotal;

      page.drawText(formatDate(v.dataVenda), { x: colX[0], y, size: 9, font });
      page.drawText(v.cliente?.nome?.substring(0, 20) || "N/D", { x: colX[1], y, size: 9, font });
      page.drawText(v.produtoNome?.substring(0, 18) || "N/A", { x: colX[2], y, size: 9, font });
      page.drawText(v.vendedor || "N/D", { x: colX[3], y, size: 9, font });
      page.drawText(formatBRL(valorTotal), { x: colX[4], y, size: 9, font });
      page.drawText(v.temNota ? "C/ Nota" : "S/ Nota", { x: colX[5], y, size: 8, font, color: v.temNota ? rgb(0, 0.5, 0) : rgb(0.5, 0.5, 0.5) });

      y -= 18;
      // Linha separadora leve
      page.drawLine({ start: { x: 30, y: y + 10 }, end: { x: width - 30, y: y + 10 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }

    // Resumo Final
    y -= 20;
    page.drawRectangle({ x: 30, y: y - 10, width: width - 60, height: 30, color: rgb(0.07, 0.15, 0.3) });
    page.drawText(`TOTAL DO PERÍODO: ${formatBRL(totalValor)}`, { x: 40, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`Vendas emitidas: ${vendas.length}`, { x: 400, y, size: 10, font: fontBold, color: rgb(1, 1, 1) });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio_vendas_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF de vendas:", error);
    return new Response("Erro ao gerar relatório", { status: 500 });
  }
}
