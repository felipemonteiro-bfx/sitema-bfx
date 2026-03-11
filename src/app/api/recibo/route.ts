import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyReciboSig } from "@/lib/recibo-url";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

function drawTableRow(
  page: any,
  font: any,
  fontBold: any,
  isHeader: boolean,
  cols: { label: string; x: number; width: number }[],
  values: string[],
  rowY: number,
  rowHeight: number,
  tableLeft: number,
  tableWidth: number,
) {
  const bgColor = isHeader ? rgb(0.18, 0.24, 0.34) : rgb(1, 1, 1);
  const textColor = isHeader ? rgb(1, 1, 1) : rgb(0.2, 0.2, 0.22);
  const textFont = isHeader ? fontBold : font;
  const fontSize = 9;

  page.drawRectangle({
    x: tableLeft,
    y: rowY - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: bgColor,
  });

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const cellText = values[i] ?? "";
    // Right-align numeric columns (Dias=0, Valor=3)
    const rightAlign = i === 0 || i === 3;
    let textX = col.x + 5;
    if (rightAlign) {
      const w = (isHeader ? fontBold : font).widthOfTextAtSize(cellText, fontSize);
      textX = col.x + col.width - w - 5;
    }
    page.drawText(cellText, {
      x: textX,
      y: rowY - rowHeight + 7,
      size: fontSize,
      font: textFont,
      color: textColor,
    });
  }

  // Row bottom border
  page.drawLine({
    start: { x: tableLeft, y: rowY - rowHeight },
    end: { x: tableLeft + tableWidth, y: rowY - rowHeight },
    thickness: 0.4,
    color: rgb(0.8, 0.82, 0.86),
  });
}

const DEFAULT_RECIBO_VENDA =
  "Declaro ter recebido o(s) produto(s) acima descrito(s) e estar ciente das condições da compra. Este documento serve como comprovante de venda de mercadoria.";

const DEFAULT_AUTORIZACAO =
  "RECIBO Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x. Data: {DATA}. Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa.";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = (searchParams.get("id") || "").trim();
    const sig = searchParams.get("sig") || "";
    let tipo = (searchParams.get("tipo") || "").toLowerCase() as string; // "venda" | "autorizacao"
    if (!idParam)
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    // Quando sig está presente (link WhatsApp), validar assinatura
    if (sig && !verifyReciboSig(idParam, sig)) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 401 });
    }

    const isNumeric = /^\d+$/.test(idParam);
    const vendaBase = isNumeric
    ? await prisma.venda.findUnique({ where: { id: Number(idParam) } })
    : await prisma.venda.findUnique({ where: { uuid: idParam } });
  if (!vendaBase)
    return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });

  // Inferir tipo pela venda quando não informado na query
  if (tipo !== "autorizacao" && tipo !== "venda") {
    tipo = vendaBase.descontoEmFolha ? "autorizacao" : "venda";
  }

  // Busca itens separado para não quebrar se a tabela não existir em produção
  let vendaItens: { produtoNome: string; quantidade: number; subtotal: number }[] = [];
  try {
    vendaItens = await prisma.itemVenda.findMany({
      where: { vendaId: vendaBase.id },
      select: { produtoNome: true, quantidade: true, subtotal: true },
    });
  } catch {
    // Tabela item_venda pode não existir em ambientes mais antigos
  }
  const venda = { ...vendaBase, itens: vendaItens };

  const subtotalProdutos =
    venda.itens && venda.itens.length > 0
      ? venda.itens.reduce((s, i) => s + i.subtotal, 0)
      : (venda.valorVenda ?? 0) * (venda.quantidade ?? 1);
  const totalVenda = subtotalProdutos + (venda.valorFrete ?? 0);
  const listaProdutos =
    venda.itens && venda.itens.length > 0
      ? venda.itens
          .map((i) => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`)
          .join(", ")
      : venda.produtoNome ?? "N/D";

  // Fetch parcelas separately with fallback to avoid crashing if table missing
  let parcelasVenc: { numeroParcela: number; dataVencimento: Date; valorParcela: number }[] = [];
  try {
    parcelasVenc = await prisma.parcelaVencimento.findMany({
      where: { vendaId: venda.id },
      orderBy: { numeroParcela: "asc" },
      select: { numeroParcela: true, dataVencimento: true, valorParcela: true },
    });
  } catch {
    // Table may not exist in older environments
  }

  const cliente = venda.clienteId
    ? await prisma.cliente.findUnique({
        where: { id: venda.clienteId },
        select: { id: true, nome: true, cpf: true, cnpj: true, matricula: true },
      })
    : null;

  let cfg: Awaited<ReturnType<typeof prisma.config.findFirst>> = null;
  try {
    cfg = await prisma.config.findFirst();
  } catch {
    // Config pode falhar se colunas novas ainda não existirem (rodar prisma migrate deploy)
  }
  const numParcelas = parcelasVenc.length;
  const rowHeight = 22;
  const tabelaParcelasHeight = numParcelas > 0 ? 40 + rowHeight + numParcelas * rowHeight : 0; // label + header + rows
  const extraHeight = Math.max(0, tabelaParcelasHeight - 100); // base template assumed ~100px for parcelas area
  const pageHeight = 842 + extraHeight;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  let y = pageHeight - 50;
  const contentWidth = 515;
  const centerX = 595 / 2;

  // ── Logo ────────────────────────────────────────────────────────────────────
  let logoImage = null;
  const logoDims = { width: 0, height: 0 };
  const logoHeight = 50;

  if (cfg?.logoPath) {
    try {
      const logoFullPath = path.join(process.cwd(), "public", cfg.logoPath);
      const logoBytes = await readFile(logoFullPath);
      const imageType = path.extname(cfg.logoPath).toLowerCase();
      if (imageType === ".png") logoImage = await pdf.embedPng(logoBytes);
      else if (imageType === ".jpg" || imageType === ".jpeg") logoImage = await pdf.embedJpg(logoBytes);
      if (logoImage) {
        const aspectRatio = logoImage.width / logoImage.height;
        logoDims.height = logoHeight;
        logoDims.width = logoHeight * aspectRatio;
      }
    } catch {
      // Continue without logo
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerTop = pageHeight - 50;
  page.drawRectangle({ x: 0, y: headerTop - 40, width: 595, height: 90, color: rgb(0.96, 0.97, 0.98) });

  if (logoImage) {
    const logoX = centerX - logoDims.width / 2;
    page.drawImage(logoImage, { x: logoX, y: headerTop - 5, width: logoDims.width, height: logoDims.height });
    const title = "BFX Manager";
    page.drawText(title, {
      x: centerX - fontBold.widthOfTextAtSize(title, 14) / 2,
      y: headerTop - 22,
      size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.12),
    });
    const subtitulo = tipo === "autorizacao" ? "Autorização de Desconto em Folha" : "Recibo de Venda";
    page.drawText(subtitulo, {
      x: centerX - font.widthOfTextAtSize(subtitulo, 10) / 2,
      y: headerTop - 34,
      size: 10, font, color: rgb(0.35, 0.38, 0.42),
    });
    page.drawText(`Recibo #${venda.id}`, { x: 470, y: headerTop + 10, size: 9, font: fontBold, color: rgb(0.2, 0.24, 0.3) });
    page.drawText(`Data: ${formatDateBR(venda.dataVenda)}`, { x: 470, y: headerTop - 2, size: 8, font, color: rgb(0.35, 0.38, 0.42) });
  } else {
    const subtituloFallback = tipo === "autorizacao" ? "Autorização de Desconto em Folha" : "Recibo de Venda";
    page.drawText("BFX Manager", { x: marginX, y: headerTop + 5, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
    page.drawText(subtituloFallback, { x: marginX, y: headerTop - 17, size: 12, font, color: rgb(0.35, 0.38, 0.42) });
    page.drawText(`Recibo #${venda.id}`, { x: 420, y: headerTop + 5, size: 11, font: fontBold, color: rgb(0.2, 0.24, 0.3) });
    page.drawText(`Data: ${formatDateBR(venda.dataVenda)}`, { x: 420, y: headerTop - 15, size: 10, font, color: rgb(0.35, 0.38, 0.42) });
  }

  y = headerTop - 60;

  // ── Detalhes ────────────────────────────────────────────────────────────────
  page.drawText("Detalhes da venda", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 18;
  const clienteDoc = cliente?.cpf || cliente?.cnpj || "N/D";
  const dataCompraFormatada = formatDateBR(venda.dataVenda);
  for (const line of [
    `Data da compra: ${dataCompraFormatada}`,
    `Cliente: ${cliente?.nome || "N/D"}`,
    `Documento: ${clienteDoc}`,
    `Vendedor: ${venda.vendedor || "N/D"}`,
    `Produto(s): ${listaProdutos}`,
  ]) {
    page.drawText(line, { x: marginX, y, size: 11, font, color: rgb(0.2, 0.2, 0.22) });
    y -= 16;
  }

  y -= 8;
  page.drawRectangle({ x: marginX, y, width: contentWidth, height: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 18;

  // ── Valores ─────────────────────────────────────────────────────────────────
  page.drawText("Valores", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 18;
  const frete = venda.valorFrete ?? 0;
  const total = totalVenda;
  const nParcelas = venda.parcelas || 1;
  const valorParc = venda.valorParcela || (nParcelas > 0 ? total / nParcelas : total);
  for (const [label, val] of [
    ["Valor dos produtos", formatBRL(subtotalProdutos)],
    ["Frete", formatBRL(frete)],
    ["Total", formatBRL(total)],
    [`Parcelas (${nParcelas}x)`, formatBRL(valorParc)],
  ] as [string, string][]) {
    page.drawText(label, { x: marginX, y, size: 11, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(val, { x: 420, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
    y -= 16;
  }

  y -= 10;
  page.drawRectangle({ x: marginX, y, width: contentWidth, height: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 18;

  // ── Tabela de Parcelas ───────────────────────────────────────────────────────
  if (numParcelas > 0) {
    page.drawText("Parcelas", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
    y -= 16;

    // Determina forma de pagamento
    const formaPag = venda.boleto
      ? `Boleto ${numParcelas}x`
      : venda.descontoEmFolha
        ? `Desconto em Folha ${numParcelas}x`
        : `À Vista`;

    // Definição de colunas: [label, largura]
    const colDefs: { label: string; width: number }[] = [
      { label: "Dias",              width: 48  },
      { label: "Data vencimento",   width: 115 },
      { label: "Forma de pagamento",width: 182 },
      { label: "Valor",             width: 90  },
      { label: "Observação",        width: 80  },
    ];
    const tableWidth = contentWidth; // 515
    const tableLeft = marginX;

    // Calcula x inicial de cada coluna
    const cols = colDefs.map((c, i) => ({
      label: c.label,
      width: c.width,
      x: tableLeft + colDefs.slice(0, i).reduce((acc, d) => acc + d.width, 0),
    }));

    // Cabeçalho
    drawTableRow(page, font, fontBold, true, cols, cols.map(c => c.label), y, rowHeight, tableLeft, tableWidth);
    y -= rowHeight;

    // Linhas de dados
    for (let i = 0; i < parcelasVenc.length; i++) {
      const pv = parcelasVenc[i];
      const dias = Math.round(
        (pv.dataVencimento.getTime() - venda.dataVenda.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Fundo alternado
      if (i % 2 !== 0) {
        page.drawRectangle({
          x: tableLeft, y: y - rowHeight,
          width: tableWidth, height: rowHeight,
          color: rgb(0.97, 0.97, 0.98),
        });
      }

      drawTableRow(
        page, font, fontBold, false, cols,
        [String(dias), formatDateBR(pv.dataVencimento), formaPag, formatBRL(pv.valorParcela), ""],
        y, rowHeight, tableLeft, tableWidth,
      );
      y -= rowHeight;
    }

    // Borda externa da tabela
    const tableBodyHeight = (numParcelas + 1) * rowHeight;
    page.drawRectangle({
      x: tableLeft,
      y: y,
      width: tableWidth,
      height: tableBodyHeight,
      borderColor: rgb(0.7, 0.73, 0.78),
      borderWidth: 0.6,
    });

    // Linhas verticais dos separadores de coluna
    let colX = tableLeft;
    for (let i = 0; i < cols.length - 1; i++) {
      colX += cols[i].width;
      page.drawLine({
        start: { x: colX, y: y },
        end: { x: colX, y: y + tableBodyHeight },
        thickness: 0.4,
        color: rgb(0.8, 0.82, 0.86),
      });
    }

    y -= 18;
    page.drawRectangle({ x: marginX, y, width: contentWidth, height: 1, color: rgb(0.9, 0.92, 0.95) });
    y -= 18;
  }

  // ── Termos e condições ───────────────────────────────────────────────────────
  const placeholderData = {
    CLIENTE: cliente?.nome || "N/D",
    MATRICULA: cliente?.matricula || "N/D",
    PRODUTO: listaProdutos,
    VALOR: formatBRL(total).replace("R$", "").trim(),
    PARCELAS: String(nParcelas),
    DATA: dataCompraFormatada,
  };
  const contrato =
    tipo === "autorizacao"
      ? fillTemplate(cfg?.modeloContrato || DEFAULT_AUTORIZACAO, placeholderData)
      : fillTemplate(cfg?.modeloReciboVenda || DEFAULT_RECIBO_VENDA, placeholderData);

  const secaoTitulo = tipo === "autorizacao" ? "Autorização" : "Termos e condições";
  page.drawText(secaoTitulo, { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 16;
  for (const line of wrapText(contrato, font, 10.5, contentWidth)) {
    page.drawText(line, { x: marginX, y, size: 10.5, font, color: rgb(0.25, 0.25, 0.28) });
    y -= 14;
  }

  // ── Rodapé ───────────────────────────────────────────────────────────────────
  page.drawText("Documento gerado automaticamente pelo BFX Manager.", {
    x: marginX, y: 110, size: 8, font, color: rgb(0.5, 0.5, 0.5),
  });

  const signatureY = 70;
  page.drawLine({
    start: { x: centerX - 100, y: signatureY },
    end: { x: centerX + 100, y: signatureY },
    thickness: 1, color: rgb(0.1, 0.1, 0.1),
  });
  const signatureText = `Assinatura: ${cliente?.nome || "________________________"}`;
  page.drawText(signatureText, {
    x: centerX - font.widthOfTextAtSize(signatureText, 10) / 2,
    y: signatureY - 15,
    size: 10, font, color: rgb(0.1, 0.1, 0.1),
  });

  const pdfBytes = await pdf.save();
  const filename = `recibo_${tipo === "autorizacao" ? "autorizacao_" : ""}${venda.id}.pdf`;

  return new Response(new Uint8Array(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-transform",
      "Content-Length": String(pdfBytes.length),
    },
  });
  } catch (err) {
    console.error("Erro ao gerar recibo PDF:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json(
      { error: `Erro ao gerar recibo: ${msg}` },
      { status: 500 }
    );
  }
}
