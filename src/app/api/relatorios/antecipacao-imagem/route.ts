import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guards";
import { WHERE_VENDA_ANTECIPAVEL, parsePeriodoMesAno } from "@/lib/antecipacao";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fontePdfSegura } from "@/lib/pdf-texto";
import { alturaPaginaAntecipacao } from "@/lib/antecipacao-pdf-layout";
import { formatarDataPura } from "@/lib/data-pura";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Vencimento de parcela e data pura — ver src/lib/data-pura.ts
const formatDateBR = formatarDataPura;

function getMesAnoLabel(date: Date): string {
  const months = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function getMesAnoKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  // Só admin (a fila /prudent é só admin): o PDF leva compradores e valores do lote.
  if (!(await requireAdmin())) {
    return Response.json({ error: "Somente administradores geram o PDF de antecipação." }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const idsStr = searchParams.get("ids");

  if (!idsStr) {
    return new Response("Nenhum ID fornecido", { status: 400 });
  }

  const ids = idsStr.split(",").map(Number).filter((n) => !isNaN(n));

  if (ids.length === 0) {
    return new Response("IDs invalidos", { status: 400 });
  }

  const periodo = parsePeriodoMesAno(
    searchParams.get("mesInicio"),
    searchParams.get("mesFim")
  );

  // Reemissao pelo Historico de Antecipacoes: o lote ja gravado tem as parcelas
  // marcadas como antecipadas, e sem isso o PDF sairia zerado.
  const incluirAntecipadas = searchParams.get("incluirAntecipadas") === "1";

  try {
    const vendas = await prisma.venda.findMany({
      where: { id: { in: ids }, ...WHERE_VENDA_ANTECIPAVEL },
      include: {
        cliente: {
          select: {
            nome: true,
            cpf: true,
            cnpj: true,
            empresa: true,
            telefone: true,
            email: true,
          },
        },
        // O cliente sempre mandou mesInicio/mesFim e esta rota descartava, entao o
        // PDF mostrava parcelas que nao estavam no lote.
        parcelasVencimento: {
          where: {
            ...(incluirAntecipadas ? {} : { antecipada: false, antecipacaoLoteId: null }),
            ...(periodo ? { dataVencimento: { gte: periodo.inicio, lte: periodo.fim } } : {}),
          },
          select: {
            numeroParcela: true,
            dataVencimento: true,
            valorParcela: true,
          },
          orderBy: { dataVencimento: "asc" },
        },
      },
    });

    // Agrupar por empresa
    // `vendas` saiu do agrupamento junto com `valorTotalVenda`: o subtotal por
    // empresa passou a somar as parcelas do lote, e nada mais lia a lista.
    const empresaMap: Record<string, {
      parcelas: { numeroParcela: number; dataVencimento: Date; valorParcela: number; vendaId: number }[];
    }> = {};

    // Venda sem parcela no lote nao rende nenhuma linha: mante-la geraria um bloco
    // de empresa com subtotal R$ 0,00 e nenhum item. O CSV e o XLSX ja a pulam.
    const vendasComLote = vendas.filter((v) => v.parcelasVencimento.length > 0);

    for (const venda of vendasComLote) {
      const empresaNome = venda.cliente?.empresa || "Sem empresa";
      if (!empresaMap[empresaNome]) {
        empresaMap[empresaNome] = { parcelas: [] };
      }
      for (const p of venda.parcelasVencimento) {
        empresaMap[empresaNome].parcelas.push({ ...p, vendaId: venda.id });
      }
    }

    // Buscar dados das empresas parceiras para CNPJ e contato
    const empresaNomes = Object.keys(empresaMap);
    const empresasParceiras = await prisma.empresaParceira.findMany({
      where: { nome: { in: empresaNomes } },
    });
    const empresaParceiraMap: Record<string, { cnpj: string | null; telefoneRh: string | null; emailRh: string | null }> = {};
    for (const ep of empresasParceiras) {
      empresaParceiraMap[ep.nome] = { cnpj: ep.cnpj, telefoneRh: ep.telefoneRh, emailRh: ep.emailRh };
    }

    // --- GERAR PDF ---
    const PAGE_WIDTH = 595;
    const MARGIN = 36;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

    const pdfDoc = await PDFDocument.create();
    const font = fontePdfSegura(await pdfDoc.embedFont(StandardFonts.Helvetica));
    const fontBold = fontePdfSegura(await pdfDoc.embedFont(StandardFonts.HelveticaBold));

    // Página única com altura do que será desenhado: a estimativa antiga gastava menos
    // por mês do que o desenho e cortava o TOTAL GERAL com 2 ou mais empresas.
    const PAGE_HEIGHT = alturaPaginaAntecipacao(
      Object.values(empresaMap).map((data) => ({
        meses: new Set(data.parcelas.map((p) => getMesAnoKey(p.dataVencimento))).size,
        parcelas: data.parcelas.length,
      })),
    );
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Paleta de relatório: azul petróleo para autoridade, teal para dinheiro e
    // superfícies frias para separar blocos sem poluir uma página longa.
    const colorPrimary = rgb(0.035, 0.10, 0.22);
    const colorPrimarySoft = rgb(0.72, 0.86, 0.94);
    const colorTeal = rgb(0.0, 0.48, 0.43);
    const colorLight = rgb(0.95, 0.97, 0.985);
    const colorMonth = rgb(0.86, 0.94, 0.95);
    const colorRow = rgb(0.985, 0.99, 0.995);
    const colorBorder = rgb(0.82, 0.87, 0.9);
    const colorText = rgb(0.10, 0.14, 0.2);
    const colorMuted = rgb(0.36, 0.43, 0.5);
    const colorWhite = rgb(1, 1, 1);

    let y = PAGE_HEIGHT;

    // --- HEADER ---
    const HEADER_H = 84;
    const SUMMARY_H = 62;
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_H, width: PAGE_WIDTH, height: HEADER_H, color: colorPrimary });
    page.drawText("BFX  /  PRUDENT", {
      x: MARGIN, y: PAGE_HEIGHT - 21, size: 8, font: fontBold, color: colorPrimarySoft,
    });
    page.drawText("RELATÓRIO DE ANTECIPAÇÃO", {
      x: MARGIN, y: PAGE_HEIGHT - 48, size: 18, font: fontBold, color: colorWhite,
    });
    const periodoLabel = periodo
      ? `${getMesAnoLabel(periodo.inicio)} — ${getMesAnoLabel(periodo.fim)}`
      : "Todos os vencimentos";
    page.drawText(periodoLabel.toUpperCase(), {
      x: MARGIN, y: PAGE_HEIGHT - 69, size: 8, font, color: colorPrimarySoft,
    });
    const dataGeracao = `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`;
    const dataGeracaoWidth = font.widthOfTextAtSize(dataGeracao, 9);
    page.drawText(dataGeracao, {
      x: PAGE_WIDTH - MARGIN - dataGeracaoWidth, y: PAGE_HEIGHT - 22, size: 9, font, color: colorPrimarySoft,
    });
    // Total do LOTE (parcelas nao antecipadas do periodo), nao das vendas inteiras:
    // o PDF listava as parcelas do lote mas totalizava a venda cheia.
    const totalVendas = vendasComLote.reduce(
      (sum, v) => sum + v.parcelasVencimento.reduce((s, p) => s + p.valorParcela, 0),
      0
    );
    const totalParcelas = vendasComLote.reduce((sum, v) => sum + v.parcelasVencimento.length, 0);

    // --- RESUMO ---
    const summaryY = PAGE_HEIGHT - HEADER_H - SUMMARY_H;
    page.drawRectangle({ x: 0, y: summaryY, width: PAGE_WIDTH, height: SUMMARY_H, color: colorLight });
    const metricW = CONTENT_WIDTH / 3;
    const metrics = [
      { label: "VENDAS NO LOTE", value: String(vendasComLote.length), accent: colorPrimary },
      { label: "PARCELAS", value: String(totalParcelas), accent: colorPrimary },
      { label: "TOTAL DO LOTE", value: formatBRL(totalVendas), accent: colorTeal },
    ];
    metrics.forEach((metric, index) => {
      const x = MARGIN + index * metricW;
      if (index > 0) page.drawLine({ start: { x, y: summaryY + 13 }, end: { x, y: summaryY + SUMMARY_H - 13 }, thickness: 0.6, color: colorBorder });
      page.drawText(metric.label, { x: x + 12, y: summaryY + 39, size: 7, font: fontBold, color: colorMuted });
      page.drawText(metric.value, { x: x + 12, y: summaryY + 19, size: 15, font: fontBold, color: metric.accent });
    });

    y = summaryY - 16;

    // --- BLOCOS POR EMPRESA ---
    let totalGeral = 0;

    for (const [empresaNome, data] of Object.entries(empresaMap)) {
      const parceiro = empresaParceiraMap[empresaNome];
      const totalEmpresa = data.parcelas.reduce((sum, p) => sum + p.valorParcela, 0);
      totalGeral += totalEmpresa;

      // Agrupar parcelas por mes
      const parcelasPorMes: Record<string, typeof data.parcelas> = {};
      for (const p of data.parcelas) {
        const key = getMesAnoKey(p.dataVencimento);
        if (!parcelasPorMes[key]) parcelasPorMes[key] = [];
        parcelasPorMes[key].push(p);
      }

      // Calcular bloco altura para cabecalho
      const blocoHeaderH = 54;
      const blocoX = MARGIN;
      const blocoW = CONTENT_WIDTH;

      // Fundo do header da empresa
      page.drawRectangle({ x: blocoX, y: y - blocoHeaderH, width: blocoW, height: blocoHeaderH, color: colorLight, borderColor: colorBorder, borderWidth: 0.8 });
      page.drawLine({ start: { x: blocoX, y: y - blocoHeaderH }, end: { x: blocoX + blocoW, y: y - blocoHeaderH }, thickness: 1, color: colorBorder });
      page.drawLine({ start: { x: blocoX, y }, end: { x: blocoX + blocoW, y }, thickness: 1, color: colorBorder });
      page.drawLine({ start: { x: blocoX, y: y - blocoHeaderH }, end: { x: blocoX, y }, thickness: 1, color: colorBorder });
      page.drawLine({ start: { x: blocoX + blocoW, y: y - blocoHeaderH }, end: { x: blocoX + blocoW, y }, thickness: 1, color: colorBorder });

      // Nome da empresa (grande e bold)
      page.drawText("EMPRESA CONVENIADA", {
        x: blocoX + 10, y: y - 14, size: 6.5, font: fontBold, color: colorMuted,
      });
      page.drawText(empresaNome, {
        x: blocoX + 10, y: y - 30, size: 13, font: fontBold, color: colorPrimary,
      });

      // CNPJ e contato
      const cnpjText = parceiro?.cnpj ? `CNPJ: ${parceiro.cnpj}` : "";
      const contatoText = parceiro?.telefoneRh ? `Tel: ${parceiro.telefoneRh}` : (parceiro?.emailRh ? `Email: ${parceiro.emailRh}` : "");

      if (cnpjText) {
        page.drawText(cnpjText, { x: blocoX + 10, y: y - 44, size: 8, font, color: colorMuted });
      }
      if (contatoText) {
        const cnpjWidth = cnpjText ? font.widthOfTextAtSize(cnpjText, 8) + 16 : 0;
        page.drawText(contatoText, { x: blocoX + 10 + cnpjWidth, y: y - 44, size: 8, font, color: colorMuted });
      }

      // Badge total empresa (direita)
      const totalEmpresaText = formatBRL(totalEmpresa);
      const totalEmpresaWidth = fontBold.widthOfTextAtSize(totalEmpresaText, 11);
      page.drawText(totalEmpresaText, {
        x: blocoX + blocoW - 10 - totalEmpresaWidth, y: y - 24, size: 11, font: fontBold, color: colorTeal,
      });
      page.drawText("Subtotal empresa", {
        x: blocoX + blocoW - 10 - font.widthOfTextAtSize("Subtotal empresa", 7), y: y - 37, size: 7, font, color: colorMuted,
      });

      y -= blocoHeaderH + 4;

      // Parcelas por mes
      for (const [mesKey, parcelas] of Object.entries(parcelasPorMes).sort((a, b) => a[0].localeCompare(b[0]))) {
        const mesLabel = getMesAnoLabel(new Date(mesKey + "-02"));
        const totalMes = parcelas.reduce((sum, p) => sum + p.valorParcela, 0);

        // Cabecalho do mes
        page.drawRectangle({ x: blocoX, y: y - 20, width: blocoW, height: 20, color: colorMonth });
        page.drawText(mesLabel.toUpperCase(), {
          x: blocoX + 10, y: y - 14, size: 8, font: fontBold, color: colorPrimary,
        });
        const totalMesText = formatBRL(totalMes);
        page.drawText(totalMesText, {
          x: blocoX + blocoW - 10 - fontBold.widthOfTextAtSize(totalMesText, 8), y: y - 14, size: 8, font: fontBold, color: colorPrimary,
        });
        y -= 22;

        // Cabecalho de colunas das parcelas
        const COL_NUM = blocoX + 10;
        const COL_VENC = blocoX + 60;
        const COL_VAL = blocoX + blocoW - 90;

        page.drawText("Parcela", { x: COL_NUM, y: y - 10, size: 7, font: fontBold, color: colorMuted });
        page.drawText("Vencimento", { x: COL_VENC, y: y - 10, size: 7, font: fontBold, color: colorMuted });
        page.drawText("Valor", { x: COL_VAL, y: y - 10, size: 7, font: fontBold, color: colorMuted });
        y -= 16;

        for (const [rowIndex, p] of parcelas.entries()) {
          if (rowIndex % 2 === 0) page.drawRectangle({ x: blocoX, y: y - 4, width: blocoW, height: 16, color: colorRow });
          // Linha separadora leve
          page.drawLine({ start: { x: blocoX, y: y + 12 }, end: { x: blocoX + blocoW, y: y + 12 }, thickness: 0.3, color: colorBorder });

          page.drawText(`${p.numeroParcela}`, { x: COL_NUM, y, size: 8, font, color: colorText });
          page.drawText(formatDateBR(p.dataVencimento), { x: COL_VENC, y, size: 8, font, color: colorText });
          const parcelaValText = formatBRL(p.valorParcela);
          page.drawText(parcelaValText, {
            x: COL_VAL + 50 - font.widthOfTextAtSize(parcelaValText, 8), y, size: 8, font: fontBold, color: colorText,
          });
          y -= 16;
        }
        y -= 4;
      }

      y -= 12;
    }

    // --- FOOTER: TOTAL GERAL ---
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 4 }, thickness: 1.5, color: colorPrimary });
    page.drawRectangle({ x: MARGIN, y: y - 36, width: CONTENT_WIDTH, height: 36, color: colorPrimary });
    page.drawText("TOTAL GERAL", {
      x: MARGIN + 12, y: y - 22, size: 13, font: fontBold, color: colorWhite,
    });
    const totalGeralText = formatBRL(totalGeral);
    const totalGeralWidth = fontBold.widthOfTextAtSize(totalGeralText, 13);
    page.drawText(totalGeralText, {
      x: MARGIN + CONTENT_WIDTH - 12 - totalGeralWidth, y: y - 22, size: 13, font: fontBold, color: colorWhite,
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="relatorio-antecipacao-${Date.now()}.pdf"`,
        "Cache-Control": "no-cache, no-transform",
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Erro ao gerar relatorio de antecipacao imagem:", error);
    return new Response("Erro ao gerar relatorio", { status: 500 });
  }
}
