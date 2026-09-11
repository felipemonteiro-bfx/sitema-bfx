// O .xlsx da planilha de controle, com as medidas da aba AGOSTO 2026 da
// planilha da equipe (2026-09-11).
import { describe, it, expect } from "vitest";
import { gerarXlsxPlanilhaControle, serialExcel } from "@/lib/xlsx/planilha-controle-xlsx";
import type { AbaPlanilha, LinhaPlanilha } from "@/lib/planilha-controle";
import { lerZip } from "./helpers/ler-zip";

function linha(dados: Partial<LinhaPlanilha>): LinhaPlanilha {
  return {
    nome: "LUCIANA FERREIRA DIAS",
    cpf: "031.193.212-65",
    cargo: "",
    dataCompra: "2026-07-12",
    produto: "FRITADEIRA ELÉTRICA 4L",
    valor: 305,
    parcela: "2/3",
    dataDesconto: "2026-08-31",
    status: "ANTECIPAÇÃO OK",
    ...dados,
  };
}

const AGOSTO: AbaPlanilha = {
  mes: "2026-08",
  nome: "AGOSTO 2026",
  blocos: [
    {
      titulo: "DESCONTOS EM FOLHA AMAZON FIVE - AF/BFX",
      linhas: [linha({ nome: "LUCIANA & FILHOS <LTDA>" }), linha({ nome: "MARIANA", valor: 450, status: "À VENCER" })],
    },
    { titulo: "DESCONTOS EM FOLHA EQUILIBRIUM - AF/BFX", linhas: [linha({ nome: "JOÃO" })] },
  ],
  antecipados: [305, 305],
};

describe("serialExcel", () => {
  it("31/08/2026 = 46265 e 12/07/2026 = 46215, como na planilha da equipe", () => {
    expect(serialExcel("2026-08-31")).toBe(46265);
    expect(serialExcel("2026-07-12")).toBe(46215);
  });
});

describe("gerarXlsxPlanilhaControle — o pacote", () => {
  const arquivos = lerZip(gerarXlsxPlanilhaControle([AGOSTO, { ...AGOSTO, mes: "2026-09", nome: "SETEMBRO 2026" }]));

  it("tem as partes de um .xlsx", () => {
    expect([...arquivos.keys()].sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
    ]);
  });

  it("uma aba por mês, com o nome da planilha da equipe", () => {
    const workbook = arquivos.get("xl/workbook.xml")!;
    expect(workbook).toContain('<sheet name="AGOSTO 2026" sheetId="1" r:id="rId1"/>');
    expect(workbook).toContain('<sheet name="SETEMBRO 2026" sheetId="2" r:id="rId2"/>');
  });

  it("estilos com as cores da planilha: verde do título, verde da coluna K, amarelo da soma e R$ contábil", () => {
    const estilos = arquivos.get("xl/styles.xml")!;
    expect(estilos).toContain('rgb="FF92D050"');
    expect(estilos).toContain('rgb="FF548235"');
    expect(estilos).toContain('rgb="FFFFFF00"');
    expect(estilos).toContain("&quot;R$&quot;");
    expect(estilos).toContain('<sz val="28"/>');
  });

  it("sem aba nenhuma, ainda abre: uma aba avisando que não há parcelas", () => {
    const vazio = lerZip(gerarXlsxPlanilhaControle([]));
    expect(vazio.get("xl/workbook.xml")).toContain('<sheet name="SEM PARCELAS" sheetId="1" r:id="rId1"/>');
  });
});

describe("gerarXlsxPlanilhaControle — a aba", () => {
  const aba = lerZip(gerarXlsxPlanilhaControle([AGOSTO])).get("xl/worksheets/sheet1.xml")!;

  it("título mesclado de A a I, altura 36", () => {
    expect(aba).toContain('<mergeCell ref="A1:I1"/>');
    expect(aba).toMatch(/<row r="1" ht="36" customHeight="1">/);
  });

  it("segundo bloco depois de uma linha em branco", () => {
    // Bloco 1: título (1), cabeçalho (2), linhas (3-4), branco (5); bloco 2 começa em 6.
    expect(aba).toContain('<mergeCell ref="A6:I6"/>');
  });

  it("larguras das colunas da planilha da equipe e zoom 80%", () => {
    expect(aba).toContain('<col min="1" max="1" width="63.71" customWidth="1"/>');
    expect(aba).toContain('<col min="5" max="5" width="138.29" customWidth="1"/>');
    expect(aba).toContain('<col min="11" max="11" width="32.86" customWidth="1"/>');
    expect(aba).toContain('zoomScale="80"');
  });

  it("datas e valores como número; parcela como texto; texto escapado", () => {
    expect(aba).toMatch(/<c r="D3" s="\d+"><v>46215<\/v><\/c>/);
    expect(aba).toMatch(/<c r="F3" s="\d+"><v>305<\/v><\/c>/);
    expect(aba).toMatch(/<c r="H3" s="\d+"><v>46265<\/v><\/c>/);
    expect(aba).toMatch(/<c r="G3" s="\d+" t="inlineStr"><is><t>2\/3<\/t><\/is><\/c>/);
    expect(aba).toContain("LUCIANA &amp; FILHOS &lt;LTDA&gt;");
  });

  it("coluna K: cabeçalho, um valor por parcela antecipada e a soma com fórmula, mesclada em 2 linhas", () => {
    expect(aba).toMatch(/<c r="K1" s="\d+" t="inlineStr"><is><t>ANTECIPAÇÃO OK<\/t><\/is><\/c>/);
    expect(aba).toMatch(/<c r="K2" s="\d+"><v>305<\/v><\/c>/);
    expect(aba).toMatch(/<c r="K3" s="\d+"><v>305<\/v><\/c>/);
    // Últimos valores em K3 → soma duas linhas abaixo, em K5, mesclada com K6.
    expect(aba).toMatch(/<c r="K5" s="\d+"><f>SUM\(K2:K3\)<\/f><v>610<\/v><\/c>/);
    expect(aba).toContain('<mergeCell ref="K5:K6"/>');
  });
});

describe("gerarXlsxPlanilhaControle — texto que quebraria o XML", () => {
  it("caracteres proibidos no XML somem (controle, U+FFFE, U+FFFF)", () => {
    const sujo = `A${String.fromCharCode(0x1, 0xfffe, 0xffff)}B`;
    const arquivo = gerarXlsxPlanilhaControle([
      { ...AGOSTO, blocos: [{ titulo: "T", linhas: [linha({ produto: sujo })] }], antecipados: [] },
    ]);
    expect(lerZip(arquivo).get("xl/worksheets/sheet1.xml")).toContain("<t>AB</t>");
  });
});
