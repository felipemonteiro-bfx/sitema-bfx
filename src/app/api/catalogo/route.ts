import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

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

async function tryLoadImage(pdf: PDFDocument, filePath: string) {
  try {
    const bytes = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return pdf.embedPng(bytes);
    if (ext === ".jpg" || ext === ".jpeg") return pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const produtos = await prisma.produto.findMany({
    where: q ? { nome: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { nome: "asc" },
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 40;
  const marginTop = 60;
  const cardHeight = 88;
  const cardGap = 12;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const cfg = await prisma.config.findFirst();
  let logoImage = null;
  let logoDims = { width: 0, height: 0 };

  if (cfg?.logoPath) {
    const logoFullPath = path.join(process.cwd(), "public", cfg.logoPath);
    const embedded = await tryLoadImage(pdf, logoFullPath);
    if (embedded) {
      logoImage = embedded;
      const desiredHeight = 36;
      const aspect = embedded.width / embedded.height;
      logoDims.height = desiredHeight;
      logoDims.width = desiredHeight * aspect;
    }
  }

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: pageHeight - 80, width: pageWidth, height: 80, color: rgb(0.96, 0.97, 0.98) });
    const title = "CATÁLOGO DE PRODUTOS";
    const titleWidth = fontBold.widthOfTextAtSize(title, 14);
    page.drawText(title, {
      x: pageWidth / 2 - titleWidth / 2,
      y: pageHeight - 45,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.12),
    });

    if (logoImage) {
      page.drawImage(logoImage, {
        x: marginX,
        y: pageHeight - 60,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    const dateStr = new Intl.DateTimeFormat("pt-BR").format(new Date());
    page.drawText(`Atualizado em ${dateStr}`, {
      x: pageWidth - 200,
      y: pageHeight - 45,
      size: 9,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });
  };

  drawHeader();
  y = pageHeight - 110;

  for (const produto of produtos) {
    if (y - cardHeight < 60) {
      page = pdf.addPage([pageWidth, pageHeight]);
      drawHeader();
      y = pageHeight - 110;
    }

    page.drawRectangle({
      x: marginX,
      y: y - cardHeight,
      width: pageWidth - marginX * 2,
      height: cardHeight,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.9, 0.92, 0.95),
      borderWidth: 1,
    });

    const imgPath = produto.imagem ? path.join(process.cwd(), "public", produto.imagem) : null;
    let img = null;
    if (imgPath) {
      img = await tryLoadImage(pdf, imgPath);
    }

    if (img) {
      const imgHeight = 60;
      const aspect = img.width / img.height;
      const imgWidth = imgHeight * aspect;
      page.drawImage(img, {
        x: marginX + 10,
        y: y - cardHeight + 14,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      page.drawRectangle({
        x: marginX + 10,
        y: y - cardHeight + 14,
        width: 60,
        height: 60,
        color: rgb(0.92, 0.94, 0.96),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
      });
    }

    const textX = marginX + 80;
    const nameLines = wrapText(produto.nome ?? "Produto", fontBold, 12, 330);
    let textY = y - 22;
    for (const line of nameLines.slice(0, 2)) {
      page.drawText(line, { x: textX, y: textY, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
      textY -= 14;
    }

    const meta = [
      produto.marca ? `Marca: ${produto.marca}` : null,
      produto.ncm ? `NCM: ${produto.ncm}` : null,
    ].filter(Boolean) as string[];

    page.drawText(meta.join(" · ") || "Sem detalhes adicionais", {
      x: textX,
      y: y - 56,
      size: 9,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });

    const price = formatBRL(produto.valorVenda ?? 0);
    page.drawText(price, {
      x: pageWidth - marginX - 140,
      y: y - 40,
      size: 14,
      font: fontBold,
      color: rgb(0.0, 0.4, 0.1),
    });

    y -= cardHeight + cardGap;
  }

  const pdfBytes = await pdf.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"catalogo_produtos.pdf\"",
    },
  });
}
