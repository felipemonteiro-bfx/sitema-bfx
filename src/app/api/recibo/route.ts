import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises"; // Added readFile
import path from "path"; // Added path

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(d);
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

function fillTemplate(template: string, data: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") || 0);
  if (!id) return new Response("ID inválido", { status: 400 });

  const venda = await prisma.venda.findUnique({ where: { id } });
  if (!venda) return new Response("Venda não encontrada", { status: 404 });
  const cliente = venda.clienteId
    ? await prisma.cliente.findUnique({ where: { id: venda.clienteId } })
    : null;
  const cfg = await prisma.config.findFirst();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const marginX = 40;
  let y = 792;
  const contentWidth = 515;

  let logoImage = null;
  let logoDims = { width: 0, height: 0 };
  const logoHeight = 50; // Desired logo height

  if (cfg?.logoPath) {
    try {
      const logoFullPath = path.join(process.cwd(), "public", cfg.logoPath);
      const logoBytes = await readFile(logoFullPath);
      const imageType = path.extname(cfg.logoPath).toLowerCase();

      if (imageType === ".png") {
        logoImage = await pdf.embedPng(logoBytes);
      } else if (imageType === ".jpg" || imageType === ".jpeg") {
        logoImage = await pdf.embedJpg(logoBytes);
      }

      if (logoImage) {
        const aspectRatio = logoImage.width / logoImage.height;
        logoDims.height = logoHeight;
        logoDims.width = logoHeight * aspectRatio;
      }
    } catch (error) {
      console.error("Failed to load or embed logo:", error);
      // Continue without logo if there's an error
    }
  }

  // Header
  page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: rgb(0.96, 0.97, 0.98) });
  
  let logoX = marginX;
  const headerTextY = 805; // Y-coordinate for "BFX Manager" and "Recibo de Venda"
  const headerTitleX = marginX + (logoImage ? logoDims.width + 10 : 0); // Shift text if logo is present

  if (logoImage) {
    // Draw logo on the left side of the header
    page.drawImage(logoImage, {
      x: marginX,
      y: 752 + (90 - logoDims.height) / 2, // Center vertically
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  page.drawText("BFX Manager", { x: headerTitleX, y: 805, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  page.drawText("Recibo de Venda", { x: headerTitleX, y: 783, size: 12, font, color: rgb(0.35, 0.38, 0.42) });
  page.drawText(`Recibo #${id}`, { x: 420, y: 805, size: 11, font: fontBold, color: rgb(0.2, 0.24, 0.3) });
  page.drawText(`Data: ${formatDate(venda.dataVenda)}`, { x: 420, y: 785, size: 10, font, color: rgb(0.35, 0.38, 0.42) });
  
  y = 730;

  // Section: Customer & Sale
  page.drawText("Detalhes da venda", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 18;
  const clienteDoc = cliente?.cpf || cliente?.cnpj || "N/D";
  const details = [
    `Cliente: ${cliente?.nome || "N/D"}`,
    `Documento: ${clienteDoc}`,
    `Vendedor: ${venda.vendedor || "N/D"}`,
    `Produto: ${venda.produtoNome || "N/D"}`,
  ];
  for (const line of details) {
    page.drawText(line, { x: marginX, y, size: 11, font, color: rgb(0.2, 0.2, 0.22) });
    y -= 16;
  }

  y -= 8;
  page.drawRectangle({ x: marginX, y, width: contentWidth, height: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 18;

  // Section: Values
  page.drawText("Valores", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 18;
  const valor = venda.valorVenda || 0;
  const frete = venda.valorFrete || 0;
  const total = valor + frete;
  const parcelas = venda.parcelas || 1;
  const parcela = venda.valorParcela || (parcelas > 0 ? total / parcelas : total);
  const rows = [
    ["Valor do produto", formatBRL(valor)],
    ["Frete", formatBRL(frete)],
    ["Total", formatBRL(total)],
    [`Parcelas (${parcelas}x)`, formatBRL(parcela)],
  ];
  for (const [label, val] of rows) {
    page.drawText(label, { x: marginX, y, size: 11, font, color: rgb(0.2, 0.2, 0.22) });
    page.drawText(val, { x: 420, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
    y -= 16;
  }

  y -= 10;
  page.drawRectangle({ x: marginX, y, width: contentWidth, height: 1, color: rgb(0.9, 0.92, 0.95) });
  y -= 18;

  // Section: Terms
  const defaultTemplate =
    "RECIBO Eu, {CLIENTE}, mat. {MATRICULA}, confirmo a compra de: {PRODUTO}. Valor: R$ {VALOR} em {PARCELAS}x Estou ciente de que esse valor será descontado parceladamente na minha remuneração do mês seguinte à data da compra. Entendo que este desconto será efetuado de acordo com as regras e políticas estabelecidas na parceria da BFXSHOP e empresa conveniada. Além disso, estou ciente de que, em caso de rescisão do meu contrato de trabalho com a minha empresa, o valor remanescente, se houver, será descontado integralmente do valor a que eu tiver direito em minha rescisão, conforme previsto na legislação vigente. Esta autorização é concedida de livre e espontânea vontade, sem qualquer forma de coação ou pressão por parte da empresa.";
  const template = cfg?.modeloContrato || defaultTemplate;
  const contrato = fillTemplate(template, {
    CLIENTE: cliente?.nome || "N/D",
    MATRICULA: cliente?.matricula || "N/D",
    PRODUTO: venda.produtoNome || "N/D",
    VALOR: formatBRL(total).replace("R$", "").trim(),
    PARCELAS: String(parcelas),
  });

  page.drawText("Termos e condições", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.12) });
  y -= 16;
  const lines = wrapText(contrato, font, 10.5, contentWidth);
  for (const line of lines) {
    page.drawText(line, { x: marginX, y, size: 10.5, font, color: rgb(0.25, 0.25, 0.28) });
    y -= 14;
  }

  // Footer
  page.drawText("Documento gerado automaticamente pelo BFX Manager.", {
    x: marginX,
    y: 36,
    size: 9,
    font,
    color: rgb(0.45, 0.48, 0.52),
  });

  const pdfBytes = await pdf.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo_${id}.pdf"`,
    },
  });
}
