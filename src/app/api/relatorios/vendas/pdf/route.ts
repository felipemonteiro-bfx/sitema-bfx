import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/utils";
import { valorTotalVenda } from "@/lib/venda-utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { resolverPeriodo, fimInclusivoParaInput } from "@/lib/periodo-data";
import { formatarDataPura } from "@/lib/data-pura";
import { getSession } from "@/lib/session";
import {
  resolverColunas,
  filtrarColunasPorPerfil,
  calcularLayoutPdf,
  truncarParaLargura,
  celulaPdf,
} from "@/lib/relatorio-vendas-colunas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const empresa = searchParams.get("empresa");

  // Mesmo contrato de /lib/periodo-data usado no CSV: inicio inclusivo em UTC,
  // fim EXCLUSIVO — corrige o bug de data um dia antes (mesma causa do commit
  // d9064ee) que sobrevivia nesta rota via `new Date(to + "T23:59:59")` em
  // horario local.
  const { inicio: start, fimExclusivo: end } = resolverPeriodo(from, to);

  const session = await getSession();
  const colunas = filtrarColunasPorPerfil(resolverColunas(searchParams.get("colunas")), session?.role === "admin");

  try {
    const vendas = await prisma.venda.findMany({
      where: {
        dataVenda: { gte: start, lt: end },
        cliente:
          empresa && empresa !== "all"
            ? {
                empresa: { equals: empresa, mode: "insensitive" },
              }
            : undefined,
      },
      include: {
        cliente: { select: { nome: true, empresa: true, matricula: true, renda: true } },
        itens: { select: { produtoNome: true, quantidade: true, subtotal: true, custoProduto: true } },
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
    // fim exibido e o INCLUSIVO (um dia antes do limite exclusivo usado na query),
    // formatado em UTC pelos dois lados para nao mostrar o dia anterior fora de Manaus.
    const fimInclusivoStr = fimInclusivoParaInput(end);
    page.drawText(`Período: ${formatarDataPura(start)} até ${formatarDataPura(fimInclusivoStr)}`, {
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

    // Table — colunas e larguras calculadas a partir da selecao (D-04); sem
    // posicao literal, porque com colunas selecionaveis nao existe posicao fixa que sirva.
    const xInicio = 40;
    const larguraUtil = width - 80;
    const layout = calcularLayoutPdf(colunas, xInicio, larguraUtil);
    const GUTTER = 4;
    const tableTop = height - 120;

    page.drawRectangle({ x: 30, y: tableTop - 5, width: width - 60, height: 20, color: rgb(0.95, 0.95, 0.95) });
    layout.forEach((faixa) => {
      const texto = truncarParaLargura(faixa.coluna.labelCurto, faixa.largura - GUTTER, (t) =>
        fontBold.widthOfTextAtSize(t, 9)
      );
      page.drawText(texto, { x: faixa.x, y: tableTop, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    });

    let y = tableTop - 25;
    let totalValor = 0;

    for (const v of vendas) {
      if (y < 50) {
        page = pdfDoc.addPage([842, 595]);
        y = height - 50;
      }

      totalValor += valorTotalVenda(v);

      layout.forEach((faixa) => {
        const texto = truncarParaLargura(celulaPdf(faixa.coluna, v), faixa.largura - GUTTER, (t) =>
          font.widthOfTextAtSize(t, 8)
        );
        page.drawText(texto, { x: faixa.x, y, size: 8, font });
      });

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
