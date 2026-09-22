import { describe, expect, it } from "vitest";
import { gerarPlanilhaModeloOficial } from "@/lib/relatorio-mensal-oficial-xls";
import { gerarPlanilhaAntecipacao } from "@/lib/relatorio-mensal-xlsx";
import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";

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

function texto(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

function quantidade(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function esperarCabecalhosNaOrdem(xml: string): void {
  let posicaoAnterior = -1;
  for (const cabecalho of CABECALHOS) {
    const posicao = xml.indexOf(`>${cabecalho}</Data>`);
    expect(posicao).toBeGreaterThan(posicaoAnterior);
    posicaoAnterior = posicao;
  }
}

describe("gerarPlanilhaAntecipacao", () => {
  it("gera somente a aba da competencia com as colunas do modelo de antecipacao", () => {
    const xml = texto(gerarPlanilhaAntecipacao(LINHAS, "2026-09"));

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Worksheet ss:Name="Set-2026">');
    esperarCabecalhosNaOrdem(xml);
    expect(quantidade(xml, "<Worksheet ")).toBe(1);
    expect(quantidade(xml, "<Row>")).toBe(LINHAS.length + 1);
    expect(xml).toContain('<Data ss:Type="Number">900.50</Data>');
  });

  it("escapa os campos textuais e mantem uma linha para cada produto consolidado", () => {
    const xml = texto(gerarPlanilhaAntecipacao(LINHAS, "2026-09"));

    expect(xml).toContain("Ana &amp; Lima");
    expect(xml).toContain("Notebook &lt;Pro&gt; 15&quot;");
    expect(quantidade(xml, "Ana &amp; Lima")).toBe(1);
    expect(quantidade(xml, "Bruno Souza")).toBe(1);
  });
});

describe("gerarPlanilhaModeloOficial", () => {
  it("gera o layout oficial com as colunas aprovadas e campos de parcela como texto", () => {
    const xml = texto(gerarPlanilhaModeloOficial(LINHAS, "2026-09"));

    expect(xml).toContain('<Worksheet ss:Name="PLANILHA">');
    expect(xml).toContain("RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO");
    expect(xml).toContain("Competência: setembro/2026");
    esperarCabecalhosNaOrdem(xml);
    expect(xml).toContain('<Data ss:Type="String">1/2, 2/2</Data>');
    expect(xml).toContain('<Data ss:Type="String">10/10/2026, 10/11/2026</Data>');
  });

  it("escapa os campos textuais e mantem uma linha para cada produto consolidado", () => {
    const xml = texto(gerarPlanilhaModeloOficial(LINHAS, "2026-09"));

    expect(xml).toContain("Ana &amp; Lima");
    expect(xml).toContain("Notebook &lt;Pro&gt; 15&quot;");
    expect(quantidade(xml, "Ana &amp; Lima")).toBe(1);
    expect(quantidade(xml, "Bruno Souza")).toBe(1);
  });
});
