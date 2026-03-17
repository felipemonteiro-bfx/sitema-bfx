import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyReciboSig } from "@/lib/recibo-url";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, breakTextIntoLines } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      // Se a palavra sozinha for maior que o maxWidth, força quebra por caracteres
      let remaining = word;
      while (font.widthOfTextAtSize(remaining, size) > maxWidth) {
        let chunk = remaining;
        while (chunk.length > 1 && font.widthOfTextAtSize(chunk, size) > maxWidth) {
          chunk = chunk.slice(0, -1);
        }
        lines.push(chunk);
        remaining = remaining.slice(chunk.length);
      }
      line = remaining;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

type ColDef = { label: string; x: number; width: number; align?: "left" | "right" | "center" };

const CELL_PAD = 5;   // padding horizontal por lado
const ROW_LINE_H = 11; // altura de cada linha de texto dentro da célula
const ROW_V_PAD = 7;   // padding vertical total (top + bottom)
const MIN_ROW_H = 22;  // altura mínima da linha

function calcRowHeight(values: string[], cols: ColDef[], font: PDFFont): number {
  let maxLines = 1;
  for (let i = 0; i < cols.length; i++) {
    const available = cols[i].width - CELL_PAD * 2;
    const lines = wrapText(values[i] ?? "", font, 9, available);
    maxLines = Math.max(maxLines, lines.length);
  }
  return Math.max(maxLines * ROW_LINE_H + ROW_V_PAD, MIN_ROW_H);
}

function drawTableHeader(page: PDFPage, font: PDFFont, cols: ColDef[], y: number, rowH: number) {
  page.drawRectangle({
    x: cols[0].x, y: y - rowH,
    width: cols.reduce((s, c) => s + c.width, 0), height: rowH,
    color: rgb(0.18, 0.24, 0.34),
  });
  for (const col of cols) {
    const w = font.widthOfTextAtSize(col.label, 8);
    const textX = col.align === "right"
      ? col.x + col.width - w - CELL_PAD
      : col.align === "center"
      ? col.x + (col.width - w) / 2
      : col.x + CELL_PAD;
    page.drawText(col.label, { x: textX, y: y - rowH + 7, size: 8, font, color: rgb(1, 1, 1) });
  }
}

function drawTableRow(
  page: PDFPage, font: PDFFont, cols: ColDef[],
  values: string[], y: number, rowH: number, shade: boolean
) {
  const tableW = cols.reduce((s, c) => s + c.width, 0);
  if (shade) {
    page.drawRectangle({
      x: cols[0].x, y: y - rowH, width: tableW, height: rowH,
      color: rgb(0.96, 0.97, 0.98),
    });
  }
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const val = values[i] ?? "";
    const available = col.width - CELL_PAD * 2;
    const lines = wrapText(val, font, 9, available);
    // Centralizar verticalmente o bloco de texto na célula
    const blockH = lines.length * ROW_LINE_H;
    const startY = y - (rowH - blockH) / 2 - ROW_LINE_H + 3;

    for (let j = 0; j < lines.length; j++) {
      const lineText = lines[j];
      const lw = font.widthOfTextAtSize(lineText, 9);
      const textX = col.align === "right"
        ? col.x + col.width - lw - CELL_PAD
        : col.align === "center"
        ? col.x + (col.width - lw) / 2
        : col.x + CELL_PAD;
      page.drawText(lineText, {
        x: textX, y: startY - j * ROW_LINE_H,
        size: 9, font, color: rgb(0.2, 0.2, 0.22),
      });
    }
  }
  page.drawLine({
    start: { x: cols[0].x, y: y - rowH },
    end: { x: cols[0].x + tableW, y: y - rowH },
    thickness: 0.4, color: rgb(0.85, 0.87, 0.9),
  });
}

function drawTableBorder(page: PDFPage, cols: ColDef[], topY: number, totalH: number) {
  const tableW = cols.reduce((s, c) => s + c.width, 0);
  page.drawRectangle({
    x: cols[0].x, y: topY - totalH, width: tableW, height: totalH,
    borderColor: rgb(0.7, 0.73, 0.78), borderWidth: 0.6,
  });
  let colX = cols[0].x;
  for (let i = 0; i < cols.length - 1; i++) {
    colX += cols[i].width;
    page.drawLine({
      start: { x: colX, y: topY - totalH },
      end: { x: colX, y: topY },
      thickness: 0.4, color: rgb(0.82, 0.84, 0.88),
    });
  }
}

function drawLabel(page: PDFPage, font: PDFFont, fontBold: PDFFont, label: string, value: string, x: number, y: number, size = 9) {
  page.drawText(`${label} `, { x, y, size, font, color: rgb(0.45, 0.47, 0.52) });
  const labelW = font.widthOfTextAtSize(`${label} `, size);
  page.drawText(value, { x: x + labelW, y, size, font: fontBold, color: rgb(0.12, 0.13, 0.16) });
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RECIBO_VENDA =
  "Declaro ter recebido o(s) produto(s) acima descrito(s) e estar ciente das condições da compra. Este documento serve como comprovante de venda de mercadoria.";

const DEFAULT_AUTORIZACAO =
  "Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x. Data: {DATA}. Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa.";

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = (searchParams.get("id") || "").trim();
    const sig = searchParams.get("sig") || "";
    let tipo = (searchParams.get("tipo") || "").toLowerCase();

    if (!idParam) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    if (sig && !verifyReciboSig(idParam, sig))
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 401 });

    const isNumeric = /^\d+$/.test(idParam);
    const vendaBase = isNumeric
      ? await prisma.venda.findUnique({ where: { id: Number(idParam) } })
      : await prisma.venda.findUnique({ where: { uuid: idParam } });
    if (!vendaBase) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });

    if (tipo !== "autorizacao" && tipo !== "venda")
      tipo = vendaBase.descontoEmFolha ? "autorizacao" : "venda";

    let vendaItens: { produtoNome: string; quantidade: number; subtotal: number; valorVenda: number }[] = [];
    try {
      vendaItens = await prisma.itemVenda.findMany({
        where: { vendaId: vendaBase.id },
        select: { produtoNome: true, quantidade: true, subtotal: true, valorVenda: true },
      });
    } catch { /* fallback */ }

    if (!vendaItens.length && vendaBase.produtoNome) {
      const val = vendaBase.valorVenda ?? 0;
      const qtd = vendaBase.quantidade ?? 1;
      vendaItens = [{ produtoNome: vendaBase.produtoNome, quantidade: qtd, valorVenda: val, subtotal: val * qtd }];
    }

    let parcelasVenc: { numeroParcela: number; dataVencimento: Date; valorParcela: number }[] = [];
    try {
      parcelasVenc = await prisma.parcelaVencimento.findMany({
        where: { vendaId: vendaBase.id },
        orderBy: { numeroParcela: "asc" },
        select: { numeroParcela: true, dataVencimento: true, valorParcela: true },
      });
    } catch { /* ignore */ }

    const cliente = vendaBase.clienteId
      ? await prisma.cliente.findUnique({
          where: { id: vendaBase.clienteId },
          select: { id: true, nome: true, cpf: true, cnpj: true, matricula: true, endereco: true, cep: true, empresa: true },
        })
      : null;

    let cfg: Awaited<ReturnType<typeof prisma.config.findFirst>> = null;
    try { cfg = await prisma.config.findFirst(); } catch { /* ignore */ }

    // ── Cálculos ──────────────────────────────────────────────────────────────
    const subtotalProdutos = vendaItens.reduce((s, i) => s + i.subtotal, 0);
    const frete = vendaBase.valorFrete ?? 0;
    const totalVenda = subtotalProdutos + frete;
    const nParcelas = vendaBase.parcelas || 1;
    const somaQtd = vendaItens.reduce((s, i) => s + i.quantidade, 0);
    const numParcelas = parcelasVenc.length;

    const placeholderData = {
      CLIENTE: cliente?.nome || "N/D",
      MATRICULA: cliente?.matricula || "N/D",
      PRODUTO: vendaItens.map(i => `${i.produtoNome}${i.quantidade > 1 ? ` (${i.quantidade}x)` : ""}`).join(", "),
      VALOR: formatBRL(totalVenda).replace("R$", "").trim(),
      PARCELAS: String(nParcelas),
      DATA: formatDateBR(vendaBase.dataVenda),
    };
    const contrato = tipo === "autorizacao"
      ? fillTemplate(cfg?.modeloContrato || DEFAULT_AUTORIZACAO, placeholderData)
      : fillTemplate(cfg?.modeloReciboVenda || DEFAULT_RECIBO_VENDA, placeholderData);

    // ── PDF Setup — fontes primeiro para calcular alturas reais ───────────────
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const marginX = 36;
    const contentW = 595 - marginX * 2; // 523
    const headerRowH = 22;

    // Definição de colunas dos itens
    const itemCols: ColDef[] = [
      { label: "Descrição do produto/serviço", x: marginX,       width: 232, align: "left"   },
      { label: "Un.",                           x: marginX + 232, width: 34,  align: "center" },
      { label: "Qtd.",                          x: marginX + 266, width: 42,  align: "right"  },
      { label: "Valor unitário",                x: marginX + 308, width: 92,  align: "right"  },
      { label: "Total",                         x: marginX + 400, width: 87,  align: "right"  },
    ];

    // Calcular altura real de cada linha de item com wrap
    const itemRowHeights = vendaItens.map(item =>
      calcRowHeight(
        [item.produtoNome, "UN", String(item.quantidade), formatBRL(item.valorVenda), formatBRL(item.subtotal)],
        itemCols, font
      )
    );
    const itemTableH = headerRowH + itemRowHeights.reduce((s, h) => s + h, 0);

    // Parcelas (linhas fixas — conteúdo sempre cabe)
    const parcelasTableH = numParcelas > 0 ? (numParcelas + 1) * headerRowH + 36 : 0;

    // Contrato (usa breakTextIntoLines nativo do pdf-lib)
    const contratoFontSize = 9.5;
    const contratoLineH    = Math.ceil(font.heightAtSize(contratoFontSize) * 1.45);
    const contratoLines    = breakTextIntoLines(contrato, [" "], contentW, t => font.widthOfTextAtSize(t, contratoFontSize));
    const contratoLineCount = contratoLines.length;

    const footerLines: [string, string, boolean][] = [
      ["N° de itens", String(vendaItens.length), false],
      ["Soma das Qtdes", String(somaQtd), false],
      ["Total de produtos", formatBRL(subtotalProdutos), false],
      ...(frete > 0 ? [["Frete", formatBRL(frete), false] as [string, string, boolean]] : []),
      ["Total do pedido", formatBRL(totalVenda), true],
    ];
    const footerRowH = 20;
    const footerH = footerLines.length * footerRowH + 14;

    const estimatedH =
      100 + // header
      130 + // info block cliente/vendedor
      30  + // separador + titulo itens
      itemTableH +
      footerH +
      parcelasTableH +
      50  + // separador + titulo termos
      contratoLineCount * contratoLineH +
      80;   // assinatura + rodapé

    const pageHeight = Math.max(842, estimatedH);

    const page = pdf.addPage([595, pageHeight]);
    let y = pageHeight - 28;

    // ── Logo & Header ─────────────────────────────────────────────────────────
    let logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | Awaited<ReturnType<PDFDocument["embedJpg"]>> | null = null;
    const logoDims = { width: 0, height: 0 };

    if (cfg?.logoPath) {
      try {
        const logoBytes = await readFile(path.join(process.cwd(), "public", cfg.logoPath));
        const ext = path.extname(cfg.logoPath).toLowerCase();
        if (ext === ".png") logoImage = await pdf.embedPng(logoBytes);
        else if (ext === ".jpg" || ext === ".jpeg") logoImage = await pdf.embedJpg(logoBytes);
        if (logoImage) {
          logoDims.height = 44;
          logoDims.width = logoDims.height * (logoImage.width / logoImage.height);
        }
      } catch { /* sem logo */ }
    }

    const headerH = 70;
    page.drawRectangle({ x: 0, y: pageHeight - headerH, width: 595, height: headerH, color: rgb(0.96, 0.97, 0.98) });
    page.drawLine({ start: { x: 0, y: pageHeight - headerH }, end: { x: 595, y: pageHeight - headerH }, thickness: 1, color: rgb(0.82, 0.85, 0.9) });

    if (logoImage) {
      page.drawImage(logoImage, { x: marginX, y: pageHeight - headerH + (headerH - logoDims.height) / 2, width: logoDims.width, height: logoDims.height });
    } else {
      page.drawText("BFX Manager", { x: marginX, y: pageHeight - 38, size: 18, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    }

    const docTitle = tipo === "autorizacao" ? "Autorização de Desconto em Folha" : "Pedido de Venda";
    const pedidoLabel = `Pedido ${vendaBase.id}`;
    page.drawText(docTitle, {
      x: 595 - marginX - fontBold.widthOfTextAtSize(docTitle, 11),
      y: pageHeight - 36, size: 11, font: fontBold, color: rgb(0.1, 0.15, 0.25),
    });
    page.drawText(pedidoLabel, {
      x: 595 - marginX - font.widthOfTextAtSize(pedidoLabel, 9),
      y: pageHeight - 52, size: 9, font, color: rgb(0.4, 0.43, 0.5),
    });

    y = pageHeight - headerH - 18;

    // ── Bloco 2 colunas: Cliente | Informações da venda ──────────────────────
    const infoSize = 9;
    const lineH = 17;
    const colDivX = marginX + contentW / 2 + 8; // divisor vertical
    const colLeftX = marginX + 10;
    const colRightX = colDivX + 10;
    const clienteLines = [
      { label: null,         value: cliente?.nome || "N/D",                          bold: true  },
      { label: "CPF/CNPJ",  value: cliente?.cpf || cliente?.cnpj || null,            bold: false },
      { label: "Empresa",   value: cliente?.empresa || null,                          bold: false },
      { label: "Endereço",  value: cliente?.endereco || null,                         bold: false },
      { label: "CEP",       value: cliente?.cep || null,                              bold: false },
    ].filter(l => l.value) as { label: string | null; value: string; bold: boolean }[];

    const vendaInfoLines = [
      { label: "Vendedor",  value: vendaBase.vendedor || "N/D" },
      { label: "Data",      value: formatDateBR(vendaBase.dataVenda) },
      { label: "Parcelas",  value: `${nParcelas}x` },
      ...(vendaBase.descontoEmFolha ? [{ label: "Pagamento", value: "Desconto em folha" }] : []),
      ...(vendaBase.boleto          ? [{ label: "Pagamento", value: "Boleto" }]            : []),
    ];

    const maxLines = Math.max(clienteLines.length, vendaInfoLines.length);
    const infoHeaderH = lineH + 10;
    const bodyH       = maxLines * lineH + 16;
    const blockH      = infoHeaderH + bodyH;
    const blockTopY   = y;

    // fundo do card
    page.drawRectangle({
      x: marginX - 4, y: blockTopY - blockH,
      width: contentW + 8, height: blockH,
      color: rgb(0.985, 0.987, 0.993),
      borderColor: rgb(0.82, 0.85, 0.91), borderWidth: 0.6,
    });

    // faixa de cabeçalho (altura maior)
    page.drawRectangle({
      x: marginX - 4, y: blockTopY - infoHeaderH,
      width: contentW + 8, height: infoHeaderH,
      color: rgb(0.18, 0.24, 0.34),
    });
    // barra de acento esquerda no header
    page.drawRectangle({
      x: marginX - 4, y: blockTopY - infoHeaderH,
      width: 4, height: infoHeaderH,
      color: rgb(0.38, 0.58, 0.88),
    });
    const headerTextY = blockTopY - infoHeaderH + Math.round((infoHeaderH - 9) / 2);
    page.drawText("Cliente", {
      x: colLeftX, y: headerTextY,
      size: 9, font: fontBold, color: rgb(1, 1, 1),
    });
    page.drawText("Informações da venda", {
      x: colRightX, y: headerTextY,
      size: 9, font: fontBold, color: rgb(1, 1, 1),
    });

    // divisor vertical (abaixo do header)
    const bodyTopY = blockTopY - infoHeaderH;
    page.drawLine({
      start: { x: colDivX, y: blockTopY - blockH + 6 },
      end:   { x: colDivX, y: bodyTopY },
      thickness: 0.6, color: rgb(0.78, 0.82, 0.88),
    });



    // coluna esquerda: Cliente — tudo alinhado à esquerda a partir de colLeftX
    for (let i = 0; i < clienteLines.length; i++) {
      const ly = bodyTopY - i * lineH - lineH / 2 - 1;
      const cl = clienteLines[i];
      if (cl.bold) {
        page.drawText(cl.value, {
          x: colLeftX, y: ly, size: 9.5, font: fontBold, color: rgb(0.08, 0.1, 0.15),
        });
      } else {
        const labelPart = cl.label ? cl.label + ": " : "";
        page.drawText(labelPart, {
          x: colLeftX, y: ly, size: infoSize, font, color: rgb(0.45, 0.47, 0.52),
        });
        const lw = font.widthOfTextAtSize(labelPart, infoSize);
        page.drawText(cl.value, {
          x: colLeftX + lw, y: ly, size: infoSize, font: fontBold, color: rgb(0.18, 0.2, 0.26),
        });
      }
    }

    // coluna direita: Informações da venda — tudo alinhado à esquerda a partir de colRightX
    for (let i = 0; i < vendaInfoLines.length; i++) {
      const ly = bodyTopY - i * lineH - lineH / 2 - 1;
      const { label, value } = vendaInfoLines[i];
      const labelPart = label + ": ";
      page.drawText(labelPart, {
        x: colRightX, y: ly, size: infoSize, font, color: rgb(0.45, 0.47, 0.52),
      });
      const lw = font.widthOfTextAtSize(labelPart, infoSize);
      page.drawText(value, {
        x: colRightX + lw, y: ly, size: infoSize, font: fontBold, color: rgb(0.1, 0.13, 0.2),
      });
    }

    y = blockTopY - blockH - 14;

    // ── Separador + Título Itens ──────────────────────────────────────────────
    page.drawLine({ start: { x: marginX, y }, end: { x: 595 - marginX, y }, thickness: 0.5, color: rgb(0.82, 0.85, 0.9) });
    y -= 16;
    page.drawText("Itens do pedido", { x: marginX, y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    y -= 14;

    // ── Tabela de Itens ───────────────────────────────────────────────────────
    drawTableHeader(page, fontBold, itemCols, y, headerRowH);
    y -= headerRowH;
    const itemTableTopY = y;

    for (let i = 0; i < vendaItens.length; i++) {
      const item = vendaItens[i];
      const rh = itemRowHeights[i];
      drawTableRow(page, font, itemCols, [
        item.produtoNome,
        "UN",
        String(item.quantidade),
        formatBRL(item.valorVenda),
        formatBRL(item.subtotal),
      ], y, rh, i % 2 !== 0);
      y -= rh;
    }

    const itemTableW = itemCols.reduce((s, c) => s + c.width, 0);
    const tableRight = marginX + itemTableW;

    // borda da tabela cobre apenas os itens (sem footer, sem divisores cruzando o footer)
    drawTableBorder(page, itemCols, itemTableTopY + headerRowH, itemTableH);

    // ── Footer de Totais — col-span full, mesma largura da tabela ────────────
    // fundo do footer
    page.drawRectangle({
      x: marginX, y: y - footerH,
      width: itemTableW, height: footerH,
      color: rgb(0.972, 0.975, 0.982),
    });

    // linha separadora topo do footer
    page.drawLine({
      start: { x: marginX, y },
      end: { x: tableRight, y },
      thickness: 0.7, color: rgb(0.65, 0.68, 0.74),
    });

    // borda externa do footer (conecta com a tabela)
    page.drawRectangle({
      x: marginX, y: y - footerH,
      width: itemTableW, height: footerH,
      borderColor: rgb(0.7, 0.73, 0.78), borderWidth: 0.6,
    });

    let fy = y - 10;
    for (const [label, val, bold] of footerLines) {
      const f = bold ? fontBold : font;
      const isTotal = bold;

      if (isTotal) {
        page.drawLine({
          start: { x: marginX + 4, y: fy + footerRowH - 4 },
          end:   { x: tableRight - 4, y: fy + footerRowH - 4 },
          thickness: 0.4, color: rgb(0.72, 0.75, 0.82),
        });
      }

      const valW = f.widthOfTextAtSize(val, 8.5);
      // label: left-aligned (col-span full)
      page.drawText(label, {
        x: marginX + CELL_PAD + 2,
        y: fy, size: 8.5, font: f,
        color: isTotal ? rgb(0.06, 0.10, 0.18) : rgb(0.38, 0.41, 0.48),
      });
      // value: right-aligned
      page.drawText(val, {
        x: tableRight - valW - CELL_PAD,
        y: fy, size: 8.5, font: f,
        color: isTotal ? rgb(0.06, 0.10, 0.18) : rgb(0.2, 0.22, 0.28),
      });
      fy -= footerRowH;
    }

    y -= footerH + 14;

    // ── Tabela de Parcelas ────────────────────────────────────────────────────
    if (numParcelas > 0) {
      page.drawText("Parcelas", { x: marginX, y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
      y -= 14;

      const formaPag = vendaBase.boleto
        ? `Boleto ${numParcelas}x`
        : vendaBase.descontoEmFolha
        ? `Desconto em Folha ${numParcelas}x`
        : "À Vista";

      const parcelaCols: ColDef[] = [
        { label: "Dias",               x: marginX,       width: 46,  align: "right" },
        { label: "Data vencimento",    x: marginX + 46,  width: 110, align: "left"  },
        { label: "Forma de pagamento", x: marginX + 156, width: 180, align: "left"  },
        { label: "Valor",              x: marginX + 336, width: 90,  align: "right" },
        { label: "Observação",         x: marginX + 426, width: 61,  align: "left"  },
      ];

      drawTableHeader(page, fontBold, parcelaCols, y, headerRowH);
      y -= headerRowH;
      const parcTableTopY = y;
      let parcTableBodyH = 0;

      for (let i = 0; i < parcelasVenc.length; i++) {
        const pv = parcelasVenc[i];
        const dias = Math.round((pv.dataVencimento.getTime() - vendaBase.dataVenda.getTime()) / 86400000);
        const rowValues = [String(dias), formatDateBR(pv.dataVencimento), formaPag, formatBRL(pv.valorParcela), ""];
        const rh = calcRowHeight(rowValues, parcelaCols, font);
        drawTableRow(page, font, parcelaCols, rowValues, y, rh, i % 2 !== 0);
        y -= rh;
        parcTableBodyH += rh;
      }

      drawTableBorder(page, parcelaCols, parcTableTopY + headerRowH, headerRowH + parcTableBodyH);
      y -= 18;
    }

    // ── Separador + Observações ───────────────────────────────────────────────
    page.drawLine({ start: { x: marginX, y }, end: { x: 595 - marginX, y }, thickness: 0.5, color: rgb(0.82, 0.85, 0.9) });
    y -= 16;

    const secaoTitulo = tipo === "autorizacao" ? "Observações" : "Termos e condições";
    page.drawText(secaoTitulo, { x: marginX, y, size: 10, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
    y -= 14;

    // Renderiza texto com quebra automática nativa do pdf-lib
    page.drawText(contrato, {
      x: marginX, y,
      size: contratoFontSize, font,
      color: rgb(0.25, 0.27, 0.32),
      lineHeight: contratoLineH,
      maxWidth: contentW,
      wordBreaks: [" "],
    });
    y -= contratoLineCount * contratoLineH;

    y -= 48;

    // ── Assinatura ────────────────────────────────────────────────────────────
    const sigLineW = 220;
    const sigLineX = 595 / 2 - sigLineW / 2;
    page.drawLine({
      start: { x: sigLineX, y },
      end: { x: sigLineX + sigLineW, y },
      thickness: 0.8, color: rgb(0.2, 0.22, 0.28),
    });
    const sigText = "Assinatura do Cliente";
    page.drawText(sigText, {
      x: sigLineX + (sigLineW - font.widthOfTextAtSize(sigText, 8.5)) / 2,
      y: y - 13,
      size: 8.5, font, color: rgb(0.4, 0.43, 0.5),
    });

    // ── Rodapé ────────────────────────────────────────────────────────────────
    page.drawLine({ start: { x: marginX, y: 32 }, end: { x: 595 - marginX, y: 32 }, thickness: 0.4, color: rgb(0.82, 0.85, 0.9) });
    page.drawText("Documento gerado automaticamente pelo BFX Manager.", {
      x: marginX, y: 18, size: 7.5, font, color: rgb(0.55, 0.57, 0.62),
    });

    const pdfBytes = await pdf.save();
    const filename = `pedido_${tipo === "autorizacao" ? "autorizacao_" : ""}${vendaBase.id}.pdf`;

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
    console.error("Erro ao gerar PDF:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: `Erro ao gerar PDF: ${msg}` }, { status: 500 });
  }
}

 
