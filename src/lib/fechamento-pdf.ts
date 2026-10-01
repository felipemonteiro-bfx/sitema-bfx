/**
 * Demonstrativo do fechamento em PDF (Fase 5), no padrão de `relatorio-mensal-pdf.ts`: pdf-lib,
 * A4, Helvetica higienizada por `fontePdfSegura`, logo opcional, tabela paginada com o cabeçalho
 * repetido. Depois da tabela: totais, ajustes com justificativa e, quando houver, o bloco
 * "Pague com Pix" (QR, copia-e-cola, vencimento e identificação — preenchido na Fase 6).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { fontePdfSegura } from "@/lib/pdf-texto";
import { embedLogoNoPdf } from "@/lib/logo-loader";
import { formatBRL } from "@/lib/utils";
import { formatarDataPura } from "@/lib/data-pura";
import { rotuloCompetencia, type DemonstrativoDados } from "@/lib/fechamento";

const AZUL = rgb(0.07, 0.13, 0.31);
const CINZA_TEXTO = rgb(0.2, 0.2, 0.22);
const CINZA_SUAVE = rgb(0.45, 0.46, 0.5);
const CINZA_LINHA = rgb(0.8, 0.82, 0.86);
const FUNDO_RESUMO = rgb(0.95, 0.96, 0.98);

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTEUDO_W = PAGE_W - 2 * MARGIN;
const ROW_H = 18;
const RODAPE = MARGIN + 20;
const QR = 120;

/**
 * `quebra`: o texto ocupa até 2 linhas (colaborador — o RH confere por ele — e situação).
 * `encolhe`: em vez de truncar, a fonte diminui até caber (matrícula).
 */
type Col = { label: string; x: number; width: number; align?: "left" | "right"; quebra?: boolean; encolhe?: boolean };

// Larguras somam 515 = PAGE_W - 2*MARGIN
const COLS: Col[] = [
  { label: "Venda", x: MARGIN, width: 58 },
  { label: "Colaborador", x: MARGIN + 58, width: 150, quebra: true },
  { label: "Matrícula", x: MARGIN + 208, width: 54, encolhe: true },
  { label: "Vencimento", x: MARGIN + 262, width: 56 },
  { label: "Lote", x: MARGIN + 318, width: 30 },
  { label: "Situação", x: MARGIN + 348, width: 102, quebra: true },
  { label: "Valor", x: MARGIN + 450, width: 65, align: "right" },
];
const TAMANHO_CELULA = 8.5;
const ENTRELINHA_CELULA = 9.5;

export type PixDemonstrativo = {
  copiaECola: string;
  qrPng?: Uint8Array;
  vencimento?: Date;
  identificacao?: string;
  /** Valor da cobrança (o saldo, quando parte já foi recebida); sem ele, o valor final. */
  valor?: number;
};

export type FechamentoPdfInput = DemonstrativoDados & {
  pix?: PixDemonstrativo | null;
  logoPath?: string | null;
};

/** Uma linha só: `drawText` quebra em \n, \r e U+2028 e sobrepõe a linha de baixo. */
function umaLinha(text: string): string {
  return text.split(/\s+/).join(" ").trim();
}

function truncar(bruto: string, font: PDFFont, size: number, maxWidth: number): string {
  const text = umaLinha(bruto);
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/** Quebra por caractere — para o copia-e-cola, que não tem espaços. */
function quebrarCaracteres(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const c of Array.from(text)) {
    if (atual && font.widthOfTextAtSize(atual + c, size) > maxWidth) {
      linhas.push(atual);
      atual = c;
    } else {
      atual += c;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Quebra por palavra; palavra maior que a largura cai na quebra por caractere. */
function quebrarPalavras(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of umaLinha(text).split(" ").filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) {
      atual = tentativa;
      continue;
    }
    if (atual) linhas.push(atual);
    if (font.widthOfTextAtSize(palavra, size) <= maxWidth) {
      atual = palavra;
    } else {
      const pedacos = quebrarCaracteres(palavra, font, size, maxWidth);
      atual = pedacos.pop() ?? "";
      linhas.push(...pedacos);
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export async function gerarFechamentoPdf(input: FechamentoPdfInput): Promise<Buffer> {
  const { pix, logoPath, ...dados } = input;
  const pdf = await PDFDocument.create();
  const font = fontePdfSegura(await pdf.embedFont(StandardFonts.Helvetica));
  const fontBold = fontePdfSegura(await pdf.embedFont(StandardFonts.HelveticaBold));
  const fontMono = fontePdfSegura(await pdf.embedFont(StandardFonts.Courier));

  let logo: PDFImage | null = null;
  if (logoPath) logo = await embedLogoNoPdf(pdf, logoPath);

  let qr: PDFImage | null = null;
  if (pix?.qrPng && pix.qrPng.length > 0) {
    try {
      qr = await pdf.embedPng(pix.qrPng);
    } catch {
      qr = null; // QR ilegível: o copia-e-cola continua servindo.
    }
  }

  const competencia = rotuloCompetencia(dados.competencia);
  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const texto = (t: string, x: number, yy: number, size: number, f: PDFFont = font, color = CINZA_TEXTO) =>
    page.drawText(t, { x, y: yy, size, font: f, color });

  const novaPagina = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    texto(truncar(`${dados.empresa.nome} — ${competencia} — versão ${dados.versao} (continuação)`, font, 8.5, CONTEUDO_W), MARGIN, y - 10, 8.5, font, CINZA_SUAVE);
    y -= 22;
  };

  /** Garante `altura` livre acima do rodapé; senão abre página nova. */
  const garantir = (altura: number) => {
    if (y - altura < RODAPE) novaPagina();
  };

  /** Linhas de texto de cada célula: até 2 nas colunas com `quebra`, a 2ª truncada se preciso. */
  const celulas = (valores: string[], f: PDFFont): string[][] =>
    COLS.map((col, i) => {
      const valor = valores[i] ?? "";
      const largura = col.width - 8;
      if (!col.quebra) return [col.encolhe ? umaLinha(valor) : truncar(valor, f, TAMANHO_CELULA, largura)];
      const linhas = quebrarPalavras(valor, f, TAMANHO_CELULA, largura);
      if (linhas.length <= 2) return linhas;
      return [linhas[0]!, truncar(linhas.slice(1).join(" "), f, TAMANHO_CELULA, largura)];
    });

  const alturaLinha = (linhas: string[][]) => ROW_H + (Math.max(...linhas.map((l) => l.length)) - 1) * ENTRELINHA_CELULA;

  const linhaTabela = (valores: string[], cabecalho: boolean) => {
    const f = cabecalho ? fontBold : font;
    const cor = cabecalho ? rgb(1, 1, 1) : CINZA_TEXTO;
    const linhas = celulas(valores, f);
    const h = alturaLinha(linhas);
    if (cabecalho) {
      page.drawRectangle({ x: MARGIN, y: y - h, width: CONTEUDO_W, height: h, color: AZUL });
    }
    COLS.forEach((col, i) => {
      linhas[i]!.forEach((cell, j) => {
        let size = TAMANHO_CELULA;
        // Matrícula nunca é truncada: a fonte encolhe até caber (mínimo 5pt).
        if (col.encolhe) while (size > 5 && f.widthOfTextAtSize(cell, size) > col.width - 8) size -= 0.5;
        const x = col.align === "right" ? col.x + col.width - f.widthOfTextAtSize(cell, size) - 4 : col.x + 4;
        page.drawText(cell, { x, y: y - 12.5 - j * ENTRELINHA_CELULA, size, font: f, color: cor });
      });
    });
    if (!cabecalho) {
      page.drawLine({ start: { x: MARGIN, y: y - h }, end: { x: PAGE_W - MARGIN, y: y - h }, thickness: 0.4, color: CINZA_LINHA });
    }
    y -= h;
  };

  // Cabeçalho
  let tituloX = MARGIN;
  if (logo) {
    const h = 40;
    const w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: MARGIN, y: y - h, width: w, height: h });
    tituloX = MARGIN + w + 12;
  }
  texto("Demonstrativo mensal", tituloX, y - 14, 16, fontBold, AZUL);
  texto(truncar(dados.empresa.nome, font, 11, PAGE_W - MARGIN - tituloX), tituloX, y - 32, 11);
  y -= 56;

  const meta: [string, string][] = [
    ["CNPJ", dados.empresa.cnpj ?? "—"],
    ["Competência", competencia],
    ["Versão", String(dados.versao)],
    ["Dia de corte", `dia ${dados.diaCorte}`],
    ["Vencimento do Pix", formatarDataPura(dados.vencimentoPix)],
    ["Responsável", dados.responsavel ?? "—"],
  ];
  const metaH = 3 * 14 + 12;
  page.drawRectangle({ x: MARGIN, y: y - metaH, width: CONTEUDO_W, height: metaH, color: FUNDO_RESUMO });
  meta.forEach(([rotulo, valor], i) => {
    const coluna = i % 2;
    const linha = Math.floor(i / 2);
    const x = MARGIN + 8 + coluna * (CONTEUDO_W / 2);
    const yy = y - 16 - linha * 14;
    texto(`${rotulo}:`, x, yy, 9, fontBold, AZUL);
    texto(truncar(valor, font, 9, CONTEUDO_W / 2 - 100), x + 92, yy, 9);
  });
  y -= metaH + 16;

  // Tabela
  const cabecalho = COLS.map((c) => c.label);
  linhaTabela(cabecalho, true);
  if (dados.linhas.length === 0) {
    texto("Nenhuma parcela neste demonstrativo.", MARGIN + 4, y - ROW_H + 5.5, 8.5, font, CINZA_SUAVE);
    y -= ROW_H;
  }
  for (const l of dados.linhas) {
    const valores = [
      l.identificador,
      l.colaborador,
      l.matricula ?? "—",
      formatarDataPura(l.vencimento),
      l.lote === null ? "—" : String(l.lote),
      l.situacao,
      formatBRL(l.valor),
    ];
    if (y - alturaLinha(celulas(valores, font)) < RODAPE) {
      novaPagina();
      linhaTabela(cabecalho, true);
    }
    linhaTabela(valores, false);
  }
  y -= 14;

  // Totais e ajustes
  const xValor = PAGE_W - MARGIN;
  const linhaTotal = (rotulo: string, valor: number, size = 9.5, f: PDFFont = fontBold) => {
    garantir(size + 8);
    const v = formatBRL(valor);
    texto(rotulo, MARGIN + 270, y - size, size, f, AZUL);
    texto(v, xValor - f.widthOfTextAtSize(v, size), y - size, size, f, AZUL);
    y -= size + 8;
  };

  linhaTotal("Total bruto", dados.totalBruto);
  if (dados.ajustes.length > 0) {
    const primeiro = quebrarPalavras(dados.ajustes[0]!.justificativa, font, 8.5, 380).length;
    // O título não fica sozinho no fim da página: vai junto com o 1º ajuste (até 3 linhas dele).
    garantir(18 + Math.min(primeiro, 3) * 11 + 4);
    texto("Ajustes", MARGIN, y - 10, 10, fontBold, AZUL);
    y -= 18;
    for (const a of dados.ajustes) {
      const linhas = quebrarPalavras(a.justificativa, font, 8.5, 380);
      // Ajuste de até 3 linhas não se parte entre páginas; um maior pagina linha a linha.
      garantir(Math.min(linhas.length, 3) * 11 + 4);
      const v = formatBRL(a.valor);
      texto(v, xValor - font.widthOfTextAtSize(v, 8.5), y - 9, 8.5);
      for (const t of linhas) {
        garantir(11);
        texto(t, MARGIN + 8, y - 9, 8.5);
        y -= 11;
      }
      y -= 4;
    }
    linhaTotal("Total de ajustes", dados.totalAjustes);
  }
  garantir(30);
  page.drawLine({ start: { x: MARGIN + 270, y: y - 2 }, end: { x: xValor, y: y - 2 }, thickness: 0.8, color: AZUL });
  y -= 6;
  linhaTotal("Valor final", dados.totalFinal, 13);

  // Pague com Pix
  if (pix) {
    const textoX = qr ? MARGIN + QR + 16 : MARGIN;
    const textoW = PAGE_W - MARGIN - textoX;
    // Espaço interno do payload é significativo (nome do recebedor): só some o que quebraria a linha.
    const payload = Array.from(pix.copiaECola.trim()).filter((c) => !"\r\n\u2028\u2029".includes(c)).join("");
    const codigo = quebrarCaracteres(payload, fontMono, 8, textoW);
    const vencimento = pix.vencimento ?? dados.vencimentoPix;
    const extras: string[] = [`Vencimento: ${formatarDataPura(vencimento)}`];
    if (pix.identificacao) extras.push(`Identificação: ${pix.identificacao}`);
    const textoH = 16 + 12 + codigo.length * 10 + 8 + extras.length * 12;
    const blocoH = Math.max(qr ? QR : 0, textoH) + 30;

    y -= 12;
    garantir(blocoH);
    texto("Pague com Pix", MARGIN, y - 13, 13, fontBold, AZUL);
    y -= 24;
    const topo = y;
    if (qr) page.drawImage(qr, { x: MARGIN, y: topo - QR, width: QR, height: QR });
    let ty = topo - 10;
    texto("Valor", textoX, ty, 9, fontBold, AZUL);
    texto(formatBRL(pix.valor ?? dados.totalFinal), textoX + 40, ty, 9, fontBold, CINZA_TEXTO);
    ty -= 16;
    texto("Pix copia e cola:", textoX, ty, 9, fontBold, AZUL);
    ty -= 12;
    for (const t of codigo) {
      texto(t, textoX, ty, 8, fontMono);
      ty -= 10;
    }
    ty -= 8;
    for (const t of extras) {
      texto(truncar(t, font, 9, textoW), textoX, ty, 9);
      ty -= 12;
    }
    y = Math.min(ty, qr ? topo - QR : ty) - 6;
  }

  // Rodapé com paginação
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText("Gerado pelo Sistema BFX", { x: MARGIN, y: MARGIN - 10, size: 7.5, font, color: rgb(0.6, 0.6, 0.62) });
    const num = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(num, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(num, 7.5), y: MARGIN - 10, size: 7.5, font, color: rgb(0.6, 0.6, 0.62) });
  });

  return Buffer.from(await pdf.save());
}
