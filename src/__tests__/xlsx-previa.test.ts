import { describe, expect, it } from "vitest";
import { lerPreviaXlsx } from "@/lib/xlsx/previa";
import { gerarPlanilhaModeloOficial } from "@/lib/relatorio-mensal-oficial-xls";
import type { LinhaProdutoRelatorio } from "@/lib/relatorio-mensal-produtos";

const linha = (i: number): LinhaProdutoRelatorio => ({
  clienteId: i, nome: `Ana & ${i}`, cpf: "1", matricula: "1", empresa: "E", dataCompra: "05/09/2026",
  produto: "Notebook <Pro>", valorAcumulado: 900.5, parcela: "1/2", dataDesconto: "10/10/2026",
});

describe("lerPreviaXlsx", () => {
  it("lê a aba e as linhas de um .xlsx gerado pelo sistema, com texto desescapado e número", () => {
    const previa = lerPreviaXlsx(gerarPlanilhaModeloOficial([linha(1), linha(2)], "2026-09"));

    expect(previa.aba).toBe("PLANILHA");
    expect(previa.totalLinhas).toBe(5);
    expect(previa.linhas[0]).toEqual(["RELAÇÃO DE VALORES PARA FOLHA DE PAGAMENTO"]);
    expect(previa.linhas[2]).toEqual(["Nome", "CPF", "Empresa", "Data da Compra", "Produto", "Valor da Parcela", "Parcela", "Data de Desconto"]);
    expect(previa.linhas[3]).toEqual(["Ana & 1", "1", "E", "05/09/2026", "Notebook <Pro>", "900.5", "1/2", "10/10/2026"]);
  });

  it("corta nas primeiras N linhas mas informa o total", () => {
    const previa = lerPreviaXlsx(gerarPlanilhaModeloOficial(Array.from({ length: 30 }, (_, i) => linha(i)), "2026-09"), 10);
    expect(previa.linhas).toHaveLength(10);
    expect(previa.totalLinhas).toBe(33);
  });

  it("arquivo que não é xlsx devolve null", () => {
    expect(lerPreviaXlsxSeguro(Buffer.from("%PDF"))).toBeNull();
  });
});

function lerPreviaXlsxSeguro(b: Buffer) {
  try { return lerPreviaXlsx(b); } catch { return null; }
}
