import { describe, expect, it } from "vitest";
import { gerarPlanilhaModeloOficial } from "@/lib/relatorio-mensal-oficial-xls";
import { gerarPlanilhaAntecipacao } from "@/lib/relatorio-mensal-xlsx";
import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";
import { lerZip } from "./helpers/ler-zip";

const CABECALHOS = [
  "Nome",
  "CPF",
  "Empresa",
  "Data da Compra",
  "Produto",
  "Valor da Parcela",
  "Parcela",
  "Data de Desconto",
];

const LINHAS: LinhaProdutoRelatorio[] = [
  {
    clienteId: 10,
    nome: "Ana & Lima",
    cpf: "123.456.789-00",
    matricula: "0010",
    empresa: "Amazon Five",
    dataCompra: "05/09/2026, 12/09/2026",
    produto: 'Notebook <Pro> 15"',
    valorAcumulado: 900.5,
    parcela: "1/2, 2/2",
    dataDesconto: "10/10/2026, 10/11/2026",
  },
  {
    clienteId: 20,
    nome: "Bruno Souza",
    cpf: "987.654.321-00",
    matricula: "0020",
    empresa: "Amazon Five",
    dataCompra: "07/09/2026",
    produto: "Mouse",
    valorAcumulado: 125,
    parcela: "1/1",
    dataDesconto: "10/10/2026",
  },
];

type Planilha = { workbook: string; aba: string };

/** Abre o .xlsx de verdade (zip) — o Gmail e o Planilhas Google não leem o XML Spreadsheet 2003. */
function abrir(bytes: Uint8Array): Planilha {
  expect(Buffer.from(bytes).subarray(0, 2).toString("latin1")).toBe("PK");
  const arquivos = lerZip(bytes);
  expect(arquivos.has("[Content_Types].xml")).toBe(true);
  return { workbook: arquivos.get("xl/workbook.xml")!, aba: arquivos.get("xl/worksheets/sheet1.xml")! };
}

function quantidade(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function esperarCabecalhosNaOrdem(xml: string): void {
  let posicaoAnterior = -1;
  for (const cabecalho of CABECALHOS) {
    const posicao = xml.indexOf(`<t>${cabecalho}</t>`);
    expect(posicao).toBeGreaterThan(posicaoAnterior);
    posicaoAnterior = posicao;
  }
}

describe("gerarPlanilhaAntecipacao", () => {
  it("gera um .xlsx com somente a aba da competencia e as colunas do modelo de antecipacao", () => {
    const { workbook, aba } = abrir(gerarPlanilhaAntecipacao(LINHAS, "2026-09"));

    expect(quantidade(workbook, "<sheet ")).toBe(1);
    expect(workbook).toContain('name="Set-2026"');
    esperarCabecalhosNaOrdem(aba);
    expect(quantidade(aba, "<row ")).toBe(LINHAS.length + 1);
    expect(aba).toContain("<v>900.5</v>");
  });

  it("escapa os campos textuais e mantem uma linha para cada produto consolidado", () => {
    const { aba } = abrir(gerarPlanilhaAntecipacao(LINHAS, "2026-09"));

    expect(aba).toContain("Ana &amp; Lima");
    expect(aba).toContain("Notebook &lt;Pro&gt; 15&quot;");
    expect(quantidade(aba, "Ana &amp; Lima")).toBe(1);
    expect(quantidade(aba, "Bruno Souza")).toBe(1);
  });
});

describe("gerarPlanilhaModeloOficial", () => {
  it("gera o .xlsx no layout oficial com as colunas aprovadas e campos de parcela como texto", () => {
    const { workbook, aba } = abrir(gerarPlanilhaModeloOficial(LINHAS, "2026-09"));

    expect(workbook).toContain('name="PLANILHA"');
    expect(aba).toContain("RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO");
    expect(aba).toContain("Competência: setembro/2026");
    expect(aba).toContain('<mergeCell ref="A1:H1"/>');
    esperarCabecalhosNaOrdem(aba);
    expect(aba).toContain("<t>1/2, 2/2</t>");
    expect(aba).toContain("<t>10/10/2026, 10/11/2026</t>");
  });

  it("mantem cabecalho congelado e as larguras do layout antigo (150 pt → 27,86 caracteres)", () => {
    const { aba } = abrir(gerarPlanilhaModeloOficial(LINHAS, "2026-09"));

    expect(aba).toContain('<pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>');
    expect(aba).toContain('<col min="1" max="1" width="27.86" customWidth="1"/>');
    expect(aba).toContain('<col min="5" max="5" width="39.29" customWidth="1"/>');
  });

  it("escapa os campos textuais e mantem uma linha para cada produto consolidado", () => {
    const { aba } = abrir(gerarPlanilhaModeloOficial(LINHAS, "2026-09"));

    expect(aba).toContain("Ana &amp; Lima");
    expect(aba).toContain("Notebook &lt;Pro&gt; 15&quot;");
    expect(quantidade(aba, "Ana &amp; Lima")).toBe(1);
    expect(quantidade(aba, "Bruno Souza")).toBe(1);
  });
});
