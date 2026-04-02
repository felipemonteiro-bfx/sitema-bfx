import { prisma } from "@/lib/db";
import { valorTotalVenda, produtosTexto } from "@/lib/venda-utils";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const empresa = searchParams.get("empresa");

  const start = from
    ? new Date(from + "T00:00:00")
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(to + "T23:59:59") : new Date();

  try {
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: { gte: start, lte: end },
        cliente:
          empresa && empresa !== "all"
            ? {
                empresa: { equals: empresa, mode: "insensitive" },
              }
            : undefined,
      },
      include: {
        cliente: { select: { nome: true, empresa: true, matricula: true } },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true } },
      },
      orderBy: { dataVenda: "desc" },
    });

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([842, 595]); // Landscape A4
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.07, 0.15, 0.3) });
    page.drawText("RELATÓRIO DE VENDAS", {
      x: 40,
      y: height - 45,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Período: ${formatDateBR(start)} até ${formatDateBR(end)}`, {
      x: 40,
      y: height - 65,
      size: 10,
      font,
      color: rgb(0.9, 0.9, 0.9),
    });
    if (empresa && empresa !== "all") {
      page.drawText(`Empresa: ${empresa}`, {
        x: 560,
        y: height - 65,
        size: 10,
        font,
        color: rgb(0.9, 0.9, 0.9),
      });
    }

    // Table Header — 7 columns: Mat. | Nome | Produtos | Vendedor | Data | Valor | Parc.
    const tableTop = height - 120;
    const colX = [40, 100, 210, 380, 490, 580, 680];
    const headers = ["Mat.", "Nome", "Produtos", "Vendedor", "Data", "Valor", "Parc."];

    page.drawRectangle({ x: 30, y: tableTop - 5, width: width - 60, height: 20, color: rgb(0.95, 0.95, 0.95) });
    headers.forEach((h, i) => {
      page.drawText(h, { x: colX[i], y: tableTop, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    });

    let y = tableTop - 25;
    let totalValor = 0;

    for (const v of vendas) {
      if (y < 50) {
        page = pdfDoc.addPage([842, 595]);
        y = height - 50;
      }

      const valorTotal = valorTotalVenda(v);
      totalValor += valorTotal;

      const matricula = v.cliente?.matricula?.substring(0, 10) || "—";
      const nomeCliente = v.cliente?.nome?.substring(0, 20) || "N/D";
      const produtos = produtosTexto(v).substring(0, 30) || "N/A";
      const vendedor = (v.vendedor || "N/D").substring(0, 16);
      const dataStr = formatDateBR(v.dataVenda);
      const parcelas = String(v.parcelas || 1) + "x";

      page.drawText(matricula, { x: colX[0], y, size: 8, font });
      page.drawText(nomeCliente, { x: colX[1], y, size: 8, font });
      page.drawText(produtos, { x: colX[2], y, size: 8, font });
      page.drawText(vendedor, { x: colX[3], y, size: 8, font });
      page.drawText(dataStr, { x: colX[4], y, size: 8, font });
      page.drawText(formatBRL(valorTotal), { x: colX[5], y, size: 8, font });
      page.drawText(parcelas, { x: colX[6], y, size: 8, font });

      y -= 18;
      page.drawLine({
        start: { x: 30, y: y + 10 },
        end: { x: width - 30, y: y + 10 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.9),
      });
    }

    // Resumo Final
    y -= 20;
    page.drawRectangle({ x: 30, y: y - 10, width: width - 60, height: 30, color: rgb(0.07, 0.15, 0.3) });
    page.drawText(`TOTAL DO PERÍODO: ${formatBRL(totalValor)}`, { x: 40, y, size: 12, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText(`Vendas: ${vendas.length}`, { x: 650, y, size: 10, font: fontBold, color: rgb(1, 1, 1) });

    const pdfBytes = await pdfDoc.save();

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio_vendas_${Date.now()}.pdf"`,
        "Cache-Control": "no-cache, no-transform",
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF de vendas:", error);
    return new Response("Erro ao gerar relatório", { status: 500 });
  }
}
