import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFName, PDFPage, PDFRawStream } from "pdf-lib";
import type { DemonstrativoDados } from "@/lib/fechamento";
import { gerarFechamentoXlsx } from "@/lib/fechamento-xlsx";
import { gerarFechamentoPdf } from "@/lib/fechamento-pdf";
import { lerZip } from "./helpers/ler-zip";

// PNG 1×1 válido, só para provar que o QR entra no PDF.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const COPIA_E_COLA =
  "00020101021226900014br.gov.bcb.pix2568qrpix.bradesco.com.br/qr/v2/cobv/9d36b84f-c70b-478f-b95c-12729b90ca2552040000530398654071250.005802BR5905ASAAS6009JOINVILLE62070503***6304ABCD";

function dados(linhas = 3): DemonstrativoDados {
  return {
    empresa: { nome: "Conceição & Filhos <Ltda>", cnpj: "12.345.678/0001-90" },
    competencia: "2026-10",
    versao: 2,
    diaCorte: 20,
    vencimentoPix: new Date("2026-10-15T00:00:00Z"),
    responsavel: "André Brum",
    linhas: Array.from({ length: linhas }, (_, i) => ({
      identificador: `V${240 + i}-1/4`,
      colaborador: i === 0 ? "João Conceição Araújo" : `Colaborador ${i + 1}`,
      matricula: i === 0 ? "00123" : null,
      valor: 125.5,
      vencimento: new Date("2026-10-10T00:00:00Z"),
      lote: i % 2 === 0 ? 7 : null,
      situacao: i % 2 === 0 ? "Antecipada · boleto à BFX" : "Fica com a BFX",
    })),
    ajustes: [
      { valor: -20.05, justificativa: "Devolução parcial do pedido — produto com avaria na entrega 😕" },
      { valor: 10, justificativa: "Frete combinado" },
    ],
    totalBruto: Math.round(linhas * 12550) / 100,
    totalAjustes: -10.05,
    totalFinal: Math.round(linhas * 12550 - 1005) / 100,
  };
}

function abaDemonstrativo(xlsx: Uint8Array): { workbook: string; sheet: string } {
  const arquivos = lerZip(xlsx);
  return { workbook: arquivos.get("xl/workbook.xml")!, sheet: arquivos.get("xl/worksheets/sheet1.xml")! };
}

describe("gerarFechamentoXlsx", () => {
  it("é um zip (PK) com uma aba Demonstrativo", () => {
    const xlsx = gerarFechamentoXlsx(dados());
    expect(Buffer.from(xlsx.subarray(0, 2)).toString("latin1")).toBe("PK");
    const { workbook } = abaDemonstrativo(xlsx);
    expect(workbook).toContain('<sheet name="Demonstrativo"');
    expect(workbook.split("<sheet ").length - 1).toBe(1);
  });

  it("cabeçalho traz empresa (escapada), CNPJ, competência, versão e vencimento do Pix", () => {
    const { sheet } = abaDemonstrativo(gerarFechamentoXlsx(dados()));
    expect(sheet).toContain("Conceição &amp; Filhos &lt;Ltda&gt;");
    expect(sheet).toContain("12.345.678/0001-90");
    expect(sheet).toContain("outubro de 2026");
    expect(sheet).toContain("André Brum");
    // versão como número
    expect(sheet).toMatch(/<c r="B\d+" s="\d+"><v>2<\/v><\/c>/);
    // vencimento do Pix 15/10/2026 como data do Excel (serial 46310)
    expect(sheet).toContain("<v>46310</v>");
  });

  it("linhas com identificador, colaborador, matrícula como texto e valor como número", () => {
    const { sheet } = abaDemonstrativo(gerarFechamentoXlsx(dados()));
    expect(sheet).toContain("V240-1/4");
    expect(sheet).toContain("João Conceição Araújo");
    expect(sheet).toContain('t="inlineStr"><is><t>00123</t>');
    expect(sheet).toContain("Antecipada · boleto à BFX");
    expect(sheet).toContain("<v>125.5</v>");
    // vencimento da parcela 10/10/2026 como data (serial 46305)
    expect(sheet).toContain("<v>46305</v>");
    // valor nunca como texto
    expect(sheet).not.toContain("<t>125,50</t>");
    expect(sheet).not.toContain("R$");
  });

  it("totais e ajustes com justificativa, todos numéricos", () => {
    const { sheet } = abaDemonstrativo(gerarFechamentoXlsx(dados()));
    expect(sheet).toContain("Total bruto");
    expect(sheet).toContain("Valor final");
    expect(sheet).toContain("Frete combinado");
    expect(sheet).toContain("<v>376.5</v>");
    expect(sheet).toContain("<v>-20.05</v>");
    expect(sheet).toContain("<v>-10.05</v>");
    expect(sheet).toContain("<v>366.45</v>");
  });

  it("sem CNPJ e sem responsável não quebra", () => {
    const d = { ...dados(1), empresa: { nome: "X", cnpj: null }, responsavel: null, ajustes: [] };
    const { sheet } = abaDemonstrativo(gerarFechamentoXlsx(d));
    expect(sheet).toContain("V240-1/4");
  });
});

// PNG com alfa vira duas imagens (a imagem e a SMask): conta-se "alguma" x "nenhuma".
function imagensDoPdf(doc: PDFDocument): number {
  return doc.context
    .enumerateIndirectObjects()
    .filter(([, obj]) => obj instanceof PDFRawStream && obj.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"))
    .length;
}

describe("gerarFechamentoPdf", () => {
  it("gera PDF válido sem bloco Pix, com acentos e emoji sem quebrar", async () => {
    const pdf = await gerarFechamentoPdf({ ...dados(), pix: null });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    expect(imagensDoPdf(doc)).toBe(0);
  });

  it("120 linhas quebram em mais de uma página", async () => {
    const doc = await PDFDocument.load(await gerarFechamentoPdf(dados(120)));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("com Pix e QR: desenha a imagem do QR", async () => {
    const pdf = await gerarFechamentoPdf({
      ...dados(),
      pix: {
        copiaECola: COPIA_E_COLA,
        qrPng: new Uint8Array(PNG_1X1),
        vencimento: new Date("2026-10-15T00:00:00Z"),
        identificacao: "FEC-7-2026-10-v2",
      },
    });
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(imagensDoPdf(doc)).toBeGreaterThan(0);
  });

  it("com Pix só copia-e-cola (sem QR) também gera", async () => {
    const doc = await PDFDocument.load(await gerarFechamentoPdf({ ...dados(), pix: { copiaECola: COPIA_E_COLA } }));
    expect(doc.getPageCount()).toBeGreaterThan(0);
    expect(imagensDoPdf(doc)).toBe(0);
  });

  it("PNG de QR inválido não derruba o PDF", async () => {
    const doc = await PDFDocument.load(
      await gerarFechamentoPdf({ ...dados(), pix: { copiaECola: COPIA_E_COLA, qrPng: new Uint8Array([1, 2, 3]) } })
    );
    expect(doc.getPageCount()).toBeGreaterThan(0);
  });

  it("120 linhas + Pix com QR: pagina e inclui o QR", async () => {
    const doc = await PDFDocument.load(
      await gerarFechamentoPdf({ ...dados(120), pix: { copiaECola: COPIA_E_COLA.repeat(4), qrPng: new Uint8Array(PNG_1X1) } })
    );
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(imagensDoPdf(doc)).toBeGreaterThan(0);
  });

  it("sem linhas nem ajustes ainda gera", async () => {
    const d = { ...dados(0), ajustes: [], totalBruto: 0, totalAjustes: 0, totalFinal: 0, responsavel: null, empresa: { nome: "Y", cnpj: null } };
    const doc = await PDFDocument.load(await gerarFechamentoPdf(d));
    expect(doc.getPageCount()).toBe(1);
  });
});

describe("gerarFechamentoPdf — o que é desenhado", () => {
  afterEach(() => vi.restoreAllMocks());

  type Texto = { texto: string; y: number; pagina: PDFPage };
  function espionar() {
    const textos: Texto[] = [];
    const imagens: { width?: number; height?: number }[] = [];
    vi.spyOn(PDFPage.prototype, "drawText").mockImplementation(function (this: PDFPage, texto, opcoes) {
      textos.push({ texto, y: opcoes?.y ?? 0, pagina: this });
    });
    vi.spyOn(PDFPage.prototype, "drawImage").mockImplementation(function (_img, opcoes) {
      imagens.push({ width: opcoes?.width, height: opcoes?.height });
    });
    return { textos, imagens };
  }

  it("com Pix: desenha o título, o QR em 120pt, o copia-e-cola inteiro, vencimento e identificação", async () => {
    const { textos, imagens } = espionar();
    await gerarFechamentoPdf({
      ...dados(),
      pix: { copiaECola: COPIA_E_COLA, qrPng: new Uint8Array(PNG_1X1), identificacao: "FEC-7-2026-10-v2" },
    });
    const todos = textos.map((t) => t.texto);
    expect(todos).toContain("Pague com Pix");
    expect(imagens).toEqual([{ width: 120, height: 120 }]);
    const inicio = todos.findIndex((t) => t === "Pix copia e cola:");
    const codigo = todos.slice(inicio + 1).filter((t) => !t.startsWith("Vencimento") && !t.startsWith("Identifica"));
    expect(codigo.join("").startsWith(COPIA_E_COLA)).toBe(true);
    expect(todos).toContain("Vencimento: 15/10/2026");
    expect(todos).toContain("Identificação: FEC-7-2026-10-v2");
  });

  it("sem Pix: nada de bloco nem imagem", async () => {
    const { textos, imagens } = espionar();
    await gerarFechamentoPdf({ ...dados(), pix: null });
    expect(textos.map((t) => t.texto)).not.toContain("Pague com Pix");
    expect(imagens).toEqual([]);
  });

  it("120 linhas: o cabeçalho da tabela se repete em cada página", async () => {
    const { textos } = espionar();
    const doc = await PDFDocument.load(await gerarFechamentoPdf(dados(120)));
    const paginasComCabecalho = new Set(textos.filter((t) => t.texto === "Colaborador").map((t) => t.pagina));
    expect(paginasComCabecalho.size).toBe(doc.getPageCount());
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("nome completo do colaborador e matrícula longa não são truncados", async () => {
    const { textos } = espionar();
    const d = dados(1);
    d.linhas[0] = { ...d.linhas[0]!, colaborador: "MARIA DAS GRAÇAS DOS SANTOS OLIVEIRA", matricula: "1234567890" };
    await gerarFechamentoPdf(d);
    const todos = textos.map((t) => t.texto);
    expect(todos.join(" ")).toContain("MARIA DAS GRAÇAS DOS SANTOS OLIVEIRA");
    expect(todos).toContain("1234567890");
    expect(todos.some((t) => t.includes("MARIA") && t.endsWith("…"))).toBe(false);
  });

  it("quebra de linha no texto não chega ao drawText", async () => {
    const { textos } = espionar();
    const d = dados(1);
    d.empresa = { nome: "Linha1\nLinha2", cnpj: null };
    d.linhas[0] = { ...d.linhas[0]!, colaborador: "Ana\r\nMaria", situacao: "a\u2028b" };
    d.ajustes = [{ valor: 1, justificativa: "uma\nduas linhas" }];
    await gerarFechamentoPdf(d);
    expect(textos.filter((t) => /[\n\r\u2028]/.test(t.texto))).toEqual([]);
  });

  it("justificativa enorme pagina linha a linha: nenhum texto fora da página", async () => {
    const { textos } = espionar();
    const d = dados(30);
    d.ajustes = [{ valor: 1, justificativa: "palavra ".repeat(4000) }];
    await gerarFechamentoPdf(d);
    expect(Math.min(...textos.map((t) => t.y))).toBeGreaterThanOrEqual(20);
  });
});
