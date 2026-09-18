// O .xlsx da planilha da folha (2026-09-17), no layout do modelo "02- Planilha"
// do Domínio que a Amazon Five manda ao departamento pessoal.
import { describe, it, expect } from "vitest";
import { gerarXlsxPlanilhaFolha } from "@/lib/xlsx/planilha-folha-xlsx";
import type { PlanilhaFolha } from "@/lib/planilha-folha";
import { lerZip } from "./helpers/ler-zip";

const AGOSTO: PlanilhaFolha = {
  competencia: "2026-08",
  linhas: [
    { matricula: "00045", nome: "LUCIANA & FILHOS <LTDA>", valor: 305 },
    { matricula: "", nome: "MARIANA SOUZA", valor: 120.5 },
    { matricula: "A-12", nome: "JOÃO PRADO", valor: 10 },
    { matricula: "12345678901234", nome: "CATORZE DIGITOS", valor: 1 },
    { matricula: "446516778151323", nome: "QUINZE DIGITOS", valor: 1 },
  ],
  total: 437.5,
  semMatricula: 1,
  matriculasRepetidas: [],
};

const CABECALHO = { razaoSocial: "AMAZON FIVE", cnpj: "01.288.370/0001-39" };

/** O XML de uma célula (`<c r="B11" .../>` ou `<c r="B11" ...>...</c>`), ou undefined. */
function celula(planilha: string, ref: string): string | undefined {
  const resto = planilha.split(`<c r="${ref}"`)[1];
  if (resto === undefined) return undefined;
  const fimVazia = resto.indexOf("/>");
  const fimCheia = resto.indexOf("</c>");
  const fecha = fimCheia >= 0 && (fimVazia < 0 || fimCheia < fimVazia) ? fimCheia + 4 : fimVazia + 2;
  return `<c r="${ref}"${resto.slice(0, fecha)}`;
}

const texto = (planilha: string, ref: string) => celula(planilha, ref)?.split("<t>")[1]?.split("</t>")[0];
const valor = (planilha: string, ref: string) => celula(planilha, ref)?.split("<v>")[1]?.split("</v>")[0];
const estilo = (planilha: string, ref: string) => celula(planilha, ref)?.split(' s="')[1]?.split('"')[0];

describe("gerarXlsxPlanilhaFolha — o pacote", () => {
  const arquivos = lerZip(gerarXlsxPlanilhaFolha(AGOSTO, CABECALHO));

  it("tem as partes de um .xlsx, com uma aba PLANILHA como o modelo", () => {
    expect([...arquivos.keys()].sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(arquivos.get("xl/workbook.xml")).toContain('<sheet name="PLANILHA" sheetId="1" r:id="rId1"/>');
  });
});

describe("gerarXlsxPlanilhaFolha — o layout do Domínio", () => {
  const planilha = lerZip(gerarXlsxPlanilhaFolha(AGOSTO, CABECALHO)).get("xl/worksheets/sheet1.xml")!;

  it("cabeçalho da empresa nas linhas 1 a 6; competência como data do 1º dia do mês", () => {
    expect(texto(planilha, "A1")).toBe("RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO");
    expect(texto(planilha, "A3")).toBe("Codigo Empresa:");
    expect(texto(planilha, "A4")).toBe("Razão Social:");
    expect(texto(planilha, "C4")).toBe("AMAZON FIVE");
    expect(texto(planilha, "A5")).toBe("Inscrição Cnpj:");
    expect(texto(planilha, "C5")).toBe("01.288.370/0001-39");
    expect(texto(planilha, "A6")).toBe("Competencia:");
    // 46235 = 01/08/2026, o mesmo número da planilha de 08/2026.
    expect(valor(planilha, "C6")).toBe("46235");
  });

  it("colunas nas linhas 9 e 10, com o código do evento 5002 em D10", () => {
    expect([texto(planilha, "A9"), texto(planilha, "B9"), texto(planilha, "C9"), texto(planilha, "D9")]).toEqual([
      "Tipo de",
      "Código",
      "Nome dos",
      "Desconto de Produto",
    ]);
    expect([texto(planilha, "A10"), texto(planilha, "B10"), texto(planilha, "C10")]).toEqual(["Calculo", "Folha", "Colaboradores"]);
    expect(valor(planilha, "D10")).toBe("5002");
  });

  it("linha 11: tipo 11 (folha mensal), matrícula como número no formato 00000 do modelo, nome escapado e valor", () => {
    expect(valor(planilha, "A11")).toBe("11");
    expect(celula(planilha, "B11")).not.toContain('t="inlineStr"');
    expect(valor(planilha, "B11")).toBe("45");
    const estilos = lerZip(gerarXlsxPlanilhaFolha(AGOSTO, CABECALHO)).get("xl/styles.xml")!;
    const numFmt = estilos.split('formatCode="00000"')[0].split('numFmtId="').pop()!.split('"')[0];
    const xfs = estilos.split("<cellXfs")[1].split("</cellXfs>")[0].split("<xf ").slice(1);
    expect(xfs[Number(estilo(planilha, "B11"))]).toContain(`numFmtId="${numFmt}"`);
    expect(texto(planilha, "C11")).toBe("LUCIANA &amp; FILHOS &lt;LTDA&gt;");
    expect(valor(planilha, "D11")).toBe("305");
  });

  it("matrícula com letra fica como texto", () => {
    expect(celula(planilha, "B13")).toContain('t="inlineStr"');
    expect(texto(planilha, "B13")).toBe("A-12");
  });

  it("matrícula de até 14 dígitos sai número exato; com 15, texto (o número perderia precisão)", () => {
    expect(valor(planilha, "B14")).toBe("12345678901234");
    expect(celula(planilha, "B15")).toContain('t="inlineStr"');
    expect(texto(planilha, "B15")).toBe("446516778151323");
  });

  it("sem matrícula: célula B vazia e destacada", () => {
    expect(celula(planilha, "B12")).toMatch(/^<c r="B12" s="\d+"\/>$/);
    expect(estilo(planilha, "B12")).not.toBe(estilo(planilha, "B11"));
    expect(valor(planilha, "D12")).toBe("120.5");
  });

  it("TOTAL logo depois da última linha: quantidade de colaboradores e a soma", () => {
    expect(texto(planilha, "A16")).toBe("TOTAL");
    expect(valor(planilha, "B16")).toBe("5");
    expect(texto(planilha, "C16")).toBe("Colaboradores");
    expect(celula(planilha, "D16")).toContain("<f>SUM(D11:D15)</f>");
    expect(valor(planilha, "D16")).toBe("437.5");
  });

  it("CNPJ e razão social vazios não quebram o arquivo", () => {
    const vazia = lerZip(gerarXlsxPlanilhaFolha(AGOSTO, { razaoSocial: "", cnpj: "" })).get("xl/worksheets/sheet1.xml")!;
    expect(texto(vazia, "A4")).toBe("Razão Social:");
    expect(texto(vazia, "C4")).toBeUndefined();
  });
});

describe("gerarXlsxPlanilhaFolha — competência sem desconto", () => {
  it("só o cabeçalho e o TOTAL zerado na linha 11", () => {
    const planilha = lerZip(gerarXlsxPlanilhaFolha({ competencia: "2027-01", linhas: [], total: 0, semMatricula: 0, matriculasRepetidas: [] }, CABECALHO)).get(
      "xl/worksheets/sheet1.xml"
    )!;
    expect(texto(planilha, "A11")).toBe("TOTAL");
    expect(valor(planilha, "B11")).toBe("0");
    expect(celula(planilha, "D11")).not.toContain("<f>");
    expect(valor(planilha, "D11")).toBe("0");
  });
});
