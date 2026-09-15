import { describe, it, expect } from "vitest";
import {
  parseCsvConsignado,
  parseXlsxConsignado,
  ArquivoConsignadoInvalido,
  LIMITE_LINHAS_IMPORT_CONSIGNADO,
} from "@/lib/consignado-parse";
import {
  CABECALHOS_CONSIGNADO,
  LINHA_MARIA_BRADESCO,
  LINHA_MARIA_QI,
  LINHA_LEAD_NOVO,
  montarXlsxConsignado,
} from "./helpers/consignado-xlsx";

function csvDe(linhas: (string | number | null)[][], cabecalhos = CABECALHOS_CONSIGNADO): string {
  const serial = (v: string | number | null) => (v === null || v === undefined ? "" : String(v));
  return [cabecalhos.join(";"), ...linhas.map((l) => l.map(serial).join(";"))].join("\n");
}

describe("parseCsvConsignado", () => {
  it("le contrato, CPF so digitos, valorParcela, competencias e financeira", () => {
    const resultado = parseCsvConsignado(csvDe([LINHA_MARIA_BRADESCO, LINHA_LEAD_NOVO]));

    expect(resultado.erros).toHaveLength(0);
    expect(resultado.linhas).toHaveLength(2);
    expect(resultado.linhas[0]).toMatchObject({
      linha: 2,
      ifConcessoraCodigo: "001",
      ifConcessoraDescricao: "BRADESCO",
      contrato: "CTR-001",
      cpf: "52998224725",
      matricula: "1001",
      valorParcela: 150,
      competenciaInicioDesconto: "06/2026",
      competenciaFimDesconto: "05/2032",
      competenciaArquivo: "09/2026",
      nomeTrabalhador: "MARIA EVELINE SILVA",
      numeroInscricaoEstabelecimento: "01288370000139",
    });
    expect(resultado.linhas[1].cpf).toBe("11144477735");
    expect(resultado.linhas[1].contrato).toBe("CEF-35362333");
  });

  it("duplicata no mesmo arquivo: a ultima linha vence e a anterior vira aviso", () => {
    const duplicata = [...LINHA_MARIA_BRADESCO];
    duplicata[13] = 199.9;
    duplicata[19] = "10/2026";
    const resultado = parseCsvConsignado(
      csvDe([LINHA_MARIA_BRADESCO, LINHA_MARIA_QI, duplicata]),
    );

    expect(resultado.linhas).toHaveLength(2);
    const bradesco = resultado.linhas.find((l) => l.contrato === "CTR-001");
    expect(bradesco?.valorParcela).toBe(199.9);
    expect(bradesco?.competenciaArquivo).toBe("10/2026");
    expect(bradesco?.linha).toBe(4);
    expect(resultado.avisos.some((a) => a.motivo === "duplicata_substituida")).toBe(true);
  });

  it("linha sem CPF e sem matricula vira erro e nao impede as outras", () => {
    const ruim = [...LINHA_MARIA_BRADESCO];
    ruim[3] = "";
    ruim[4] = "";
    ruim[2] = "CTR-RUIM";
    const resultado = parseCsvConsignado(csvDe([ruim, LINHA_LEAD_NOVO]));

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].contrato).toBe("CEF-35362333");
    expect(resultado.erros).toHaveLength(1);
    expect(resultado.erros[0].motivo).toBe("sem_cpf_nem_matricula");
    expect(resultado.erros[0].linha).toBe(2);
  });

  it("arquivo sem coluna contrato recusa o lote inteiro", () => {
    const semContrato = CABECALHOS_CONSIGNADO.filter((h) => h !== "contrato");
    const linha = LINHA_MARIA_BRADESCO.filter((_, i) => CABECALHOS_CONSIGNADO[i] !== "contrato");
    expect(() => parseCsvConsignado(csvDe([linha], semContrato))).toThrow(ArquivoConsignadoInvalido);
  });

  it("acima do teto de linhas recusa o arquivo inteiro", () => {
    const extra = Array.from({ length: LIMITE_LINHAS_IMPORT_CONSIGNADO + 1 }, (_, i) => {
      const row = [...LINHA_LEAD_NOVO];
      row[2] = `CTR-${i}`;
      return row;
    });
    expect(() => parseCsvConsignado(csvDe(extra))).toThrow(ArquivoConsignadoInvalido);
  });

  it("valorParcela invalido e competencia malformada pulam a linha", () => {
    const valorRuim = [...LINHA_MARIA_BRADESCO];
    valorRuim[2] = "CTR-VAL";
    valorRuim[13] = "abc";
    const compRuim = [...LINHA_MARIA_QI];
    compRuim[2] = "CTR-COMP";
    compRuim[10] = "2026-06";
    const resultado = parseCsvConsignado(csvDe([valorRuim, compRuim, LINHA_LEAD_NOVO]));

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].contrato).toBe("CEF-35362333");
    expect(resultado.erros.map((e) => e.motivo).sort()).toEqual(
      ["competencia_invalida", "valor_parcela_invalido"].sort(),
    );
  });
});

describe("parseXlsxConsignado", () => {
  it("le o xlsx no layout Dataprev (aba eConsignadoCLT) com os mesmos campos do CSV", () => {
    const bytes = montarXlsxConsignado([LINHA_MARIA_BRADESCO, LINHA_MARIA_QI, LINHA_LEAD_NOVO]);
    const resultado = parseXlsxConsignado(bytes);

    expect(resultado.erros).toHaveLength(0);
    expect(resultado.linhas).toHaveLength(3);
    expect(resultado.linhas[0]).toMatchObject({
      ifConcessoraCodigo: "001",
      contrato: "CTR-001",
      cpf: "52998224725",
      valorParcela: 150,
      competenciaInicioDesconto: "06/2026",
      competenciaFimDesconto: "05/2032",
      competenciaArquivo: "09/2026",
    });
    expect(resultado.linhas[1].contrato).toBe("PKT-002");
    expect(resultado.linhas[1].valorParcela).toBe(80.73);
  });

  it("zip quebrado recusa o arquivo", () => {
    expect(() => parseXlsxConsignado(new Uint8Array([1, 2, 3, 4]))).toThrow(
      ArquivoConsignadoInvalido,
    );
  });
});
