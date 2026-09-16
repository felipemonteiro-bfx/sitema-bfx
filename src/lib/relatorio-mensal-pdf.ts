/**
 * Gera o PDF do relatorio mensal de vendas por empresa parceira (pdf-lib).
 * Segue o estilo visual de `src/lib/recibo-pdf.ts` (Helvetica, A4, cabecalho azul).
 *
 * Layout: cabecalho com logo opcional + titulo, bloco-resumo (nº vendas, valor total,
 * total a descontar em folha) e tabela paginada (Colaborador | Matricula | Data |
 * Produtos | Valor | Parcelas). Quebra de pagina automatica.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { fontePdfSegura } from "@/lib/pdf-texto";
import { formatBRL } from "@/lib/utils";
import { periodoLabel, type RelatorioMensalData } from "@/lib/relatorio-mensal";
import { embedLogoNoPdf } from "@/lib/logo-loader";

const AZUL = rgb(0.07, 0.13, 0.31);
const CINZA_TEXTO = rgb(0.2, 0.2, 0.22);
const CINZA_LINHA = rgb(0.8, 0.82, 0.86);

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const ROW_H = 20;

type Col = { label: string; x: number; width: number; align?: "left" | "right" };

// Colunas da tabela (larguras somam ~515 = PAGE_W - 2*MARGIN)
const COLS: Col[] = [
  { label: "Colaborador", x: MARGIN, width: 120 },
  { label: "Matricula", x: MARGIN + 120, width: 60 },
  { label: "Data", x: MARGIN + 180, width: 60 },
  { label: "Produtos", x: MARGIN + 240, width: 150 },
  { label: "Valor", x: MARGIN + 390, width: 60, align: "right" },
  { label: "Parcelas", x: MARGIN + 450, width: 65, align: "right" },
];

function truncar(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function drawRow(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  values: string[],
  rowY: number,
  isHeader: boolean
): void {
  const size = 8.5;
  if (isHeader) {
    page.drawRectangle({ x: MARGIN, y: rowY - ROW_H, width: PAGE_W - 2 * MARGIN, height: ROW_H, color: AZUL });
  }
  const textColor = isHeader ? rgb(1, 1, 1) : CINZA_TEXTO;
  const textFont = isHeader ? fontBold : font;

  for (let i = 0; i < COLS.length; i++) {
    const col = COLS[i]!;
    const cell = truncar(values[i] ?? "", textFont, size, col.width - 8);
    let x = col.x + 4;
    if (col.align === "right") {
      x = col.x + col.width - textFont.widthOfTextAtSize(cell, size) - 4;
    }
    page.drawText(cell, { x, y: rowY - ROW_H + 6, size, font: textFont, color: textColor });
  }

  if (!isHeader) {
    page.drawLine({
      start: { x: MARGIN, y: rowY - ROW_H },
      end: { x: PAGE_W - MARGIN, y: rowY - ROW_H },
      thickness: 0.4,
      color: CINZA_LINHA,
    });
  }
}

export type RelatorioMensalPdfInput = {
  empresaNome: string;
  periodo: string; // "2026-06"
  dados: RelatorioMensalData;
  logoPath?: string | null;
};

/** Gera o PDF do relatorio mensal como Buffer. */
export async function gerarRelatorioMensalPdf(input: RelatorioMensalPdfInput): Promise<Buffer> {
  const { empresaNome, periodo, dados, logoPath } = input;
  const pdf = await PDFDocument.create();
  const font = fontePdfSegura(await pdf.embedFont(StandardFonts.Helvetica));
  const fontBold = fontePdfSegura(await pdf.embedFont(StandardFonts.HelveticaBold));

  let logoImage: PDFImage | null = null;
  const logoDims = { width: 0, height: 0 };
  if (logoPath) {
    logoImage = await embedLogoNoPdf(pdf, logoPath);
    if (logoImage) {
      const ratio = logoImage.width / logoImage.height;
      logoDims.height = 40;
      logoDims.width = 40 * ratio;
    }
  }

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Cabecalho
  if (logoImage) {
    page.drawImage(logoImage, { x: MARGIN, y: y - logoDims.height, width: logoDims.width, height: logoDims.height });
  }
  page.drawText("Relatorio Mensal de Vendas", { x: MARGIN, y: y - 14, size: 16, font: fontBold, color: AZUL });
  page.drawText(`${empresaNome} — ${periodoLabel(periodo)}`, {
    x: MARGIN,
    y: y - 32,
    size: 11,
    font,
    color: CINZA_TEXTO,
  });
  y -= 60;

  // Bloco resumo
  const resumo = [
    `Total de vendas: ${dados.totalVendas}`,
    `Valor total: ${formatBRL(dados.valorTotal)}`,
    `A descontar em folha: ${formatBRL(dados.totalDescontoFolha)}`,
  ];
  page.drawRectangle({ x: MARGIN, y: y - 26, width: PAGE_W - 2 * MARGIN, height: 26, color: rgb(0.95, 0.96, 0.98) });
  page.drawText(resumo.join("     |     "), { x: MARGIN + 8, y: y - 17, size: 9.5, font: fontBold, color: AZUL });
  y -= 44;

  // Tabela — cabecalho
  const header = COLS.map((c) => c.label);
  drawRow(page, font, fontBold, header, y, true);
  y -= ROW_H;

  for (const l of dados.linhas) {
    if (y - ROW_H < MARGIN + 30) {
      // nova pagina
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawRow(page, font, fontBold, header, y, true);
      y -= ROW_H;
    }
    drawRow(
      page,
      font,
      fontBold,
      [l.colaborador, l.matricula, l.data, l.produtos, formatBRL(l.valor), l.parcelasTexto.split(" — ")[0]!],
      y,
      false
    );
    y -= ROW_H;
  }

  // Rodape (ultima pagina)
  page.drawText(`Gerado pelo Sistema BFX`, {
    x: MARGIN,
    y: MARGIN - 10,
    size: 7.5,
    font,
    color: rgb(0.6, 0.6, 0.62),
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
