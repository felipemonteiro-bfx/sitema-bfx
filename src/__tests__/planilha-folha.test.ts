// Planilha da folha (2026-09-17): a coluna "Desconto de Produto" (evento 5002
// do Domínio) de uma competência, uma linha por matrícula.
import { describe, it, expect } from "vitest";
import { montarPlanilhaFolha, normalizarCompetencia, type VendaParaFolha } from "@/lib/planilha-folha";

type Parcela = VendaParaFolha["parcelasVencimento"][number];

function p(vencimento: string, valor: number, extra: Partial<Parcela> = {}): Parcela {
  return { dataVencimento: new Date(`${vencimento}T00:00:00.000Z`), valorParcela: valor, paga: false, origemPagamento: null, ...extra };
}

let proximoId = 1;
function venda(
  cliente: Partial<NonNullable<VendaParaFolha["cliente"]>>,
  parcelas: Parcela[],
  status = "ativa",
  extra: Partial<VendaParaFolha> = {}
): VendaParaFolha {
  const id = proximoId++;
  return {
    id,
    status,
    dataVenda: new Date("2026-07-12T00:00:00.000Z"),
    parcelas: parcelas.length,
    valorVenda: null,
    quantidade: 1,
    valorFrete: 0,
    desconto: 0,
    itens: [],
    cliente: { id, nome: "LUCIANA FERREIRA DIAS", matricula: "123", empresa: "AMAZON FIVE", ...cliente },
    parcelasVencimento: parcelas,
    ...extra,
  };
}

// Competência 08/2026: o desconto de agosto vence em 10/09/2026.
const AGOSTO = "2026-08";

describe("normalizarCompetencia", () => {
  it("MM/AAAA vira YYYY-MM, com ou sem zero no mês", () => {
    expect(normalizarCompetencia("08/2026")).toBe("2026-08");
    expect(normalizarCompetencia(" 8/2026 ")).toBe("2026-08");
  });

  it("mês fora de 1–12, vazio ou outro formato: null", () => {
    expect(normalizarCompetencia("13/2026")).toBeNull();
    expect(normalizarCompetencia("0/2026")).toBeNull();
    expect(normalizarCompetencia("")).toBeNull();
    expect(normalizarCompetencia(null)).toBeNull();
    expect(normalizarCompetencia("2026-08")).toBeNull();
    expect(normalizarCompetencia("08/0000")).toBeNull();
  });
});

describe("montarPlanilhaFolha — o valor de cada matrícula", () => {
  it("só entra a parcela cujo mês de desconto é a competência", () => {
    const { linhas } = montarPlanilhaFolha([venda({}, [p("2026-08-10", 100), p("2026-09-10", 200), p("2026-10-10", 300)])], { competencia: AGOSTO });
    expect(linhas).toEqual([{ matricula: "123", nome: "LUCIANA FERREIRA DIAS", valor: 200 }]);
  });

  it("soma as compras da mesma matrícula numa linha só", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ id: 7 }, [p("2026-09-10", 305)]), venda({ id: 7 }, [p("2026-09-10", 120.5)])],
      { competencia: AGOSTO }
    );
    expect(linhas).toEqual([{ matricula: "123", nome: "LUCIANA FERREIRA DIAS", valor: 425.5 }]);
  });

  it("dois cadastros com a mesma matrícula (com espaço nas pontas) viram uma linha", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ matricula: "123" }, [p("2026-09-10", 100)]), venda({ nome: "LUCIANA F. DIAS", matricula: " 123 " }, [p("2026-09-10", 50)])],
      { competencia: AGOSTO }
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ matricula: "123", valor: 150 });
  });

  it("vencimento gravado com hora (T04:00Z) continua na competência do dia", () => {
    const parcela = { ...p("2026-09-10", 100), dataVencimento: new Date("2026-09-10T04:00:00.000Z") };
    expect(montarPlanilhaFolha([venda({}, [parcela])], { competencia: AGOSTO }).linhas).toHaveLength(1);
  });

  it("\"45\" e \"00045\" são a mesma matrícula", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ matricula: "00045" }, [p("2026-09-10", 100)]), venda({ matricula: "45" }, [p("2026-09-10", 50)])],
      { competencia: AGOSTO }
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].valor).toBe(150);
  });

  it("mesma matrícula em empresas diferentes, sem filtro de empresa: linhas separadas", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ matricula: "45", empresa: "AMAZON FIVE" }, [p("2026-09-10", 100)]), venda({ matricula: "45", empresa: "OUTRA" }, [p("2026-09-10", 50)])],
      { competencia: AGOSTO }
    );
    expect(linhas.map((l) => l.valor).sort((a, b) => a - b)).toEqual([50, 100]);
  });

  it("a matrícula guarda os zeros à esquerda", () => {
    const { linhas } = montarPlanilhaFolha([venda({ matricula: "00045" }, [p("2026-09-10", 100)])], { competencia: AGOSTO });
    expect(linhas[0].matricula).toBe("00045");
  });

  it("soma em centavos: 0,01 + 0,14 dá 0,15 (em ponto flutuante daria 0,15000000000000002)", () => {
    const { linhas, total } = montarPlanilhaFolha([venda({ id: 3 }, [p("2026-09-10", 0.01)]), venda({ id: 3 }, [p("2026-09-10", 0.14)])], {
      competencia: AGOSTO,
    });
    expect(linhas[0].valor).toBe(0.15);
    expect(total).toBe(0.15);
  });
});

describe("montarPlanilhaFolha — venda sem linhas de parcela", () => {
  // A venda rápida só grava parcelas quando há mais de uma: a venda em 1x (e a
  // venda antiga) não tem linhas, e o vencimento sai da regra da criação.
  it("venda em 1x até o dia 20: vence dia 10 do mês seguinte e entra com o valor da venda", () => {
    const vendaUmaVez = venda({}, [], "ativa", {
      dataVenda: new Date("2026-08-15T00:00:00.000Z"),
      parcelas: 1,
      itens: [{ subtotal: 140 }],
      valorFrete: 15,
      desconto: 5,
    });
    expect(montarPlanilhaFolha([vendaUmaVez], { competencia: AGOSTO }).linhas).toEqual([
      { matricula: "123", nome: "LUCIANA FERREIRA DIAS", valor: 150 },
    ]);
  });

  it("venda em 1x depois do dia 20: vence dois meses à frente", () => {
    const vendaTarde = venda({}, [], "ativa", { dataVenda: new Date("2026-08-25T00:00:00.000Z"), parcelas: 1, valorVenda: 150 });
    expect(montarPlanilhaFolha([vendaTarde], { competencia: AGOSTO }).linhas).toEqual([]);
    expect(montarPlanilhaFolha([vendaTarde], { competencia: "2026-09" }).linhas[0].valor).toBe(150);
  });

  it("venda antiga em 3x sem linhas: um terço por mês a partir do primeiro vencimento", () => {
    const antiga = venda({}, [], "ativa", { dataVenda: new Date("2026-07-12T00:00:00.000Z"), parcelas: 3, valorVenda: 300 });
    for (const competencia of ["2026-07", "2026-08", "2026-09"]) {
      expect(montarPlanilhaFolha([antiga], { competencia }).linhas[0].valor).toBe(100);
    }
    expect(montarPlanilhaFolha([antiga], { competencia: "2026-10" }).linhas).toEqual([]);
  });

  it("total que não divide exato: a última parcela fica com o resto e a soma é o total", () => {
    const antiga = venda({}, [], "ativa", { dataVenda: new Date("2026-07-12T00:00:00.000Z"), parcelas: 3, valorVenda: 100.01 });
    const valores = ["2026-07", "2026-08", "2026-09"].map((competencia) => montarPlanilhaFolha([antiga], { competencia }).linhas[0].valor);
    expect(valores).toEqual([33.33, 33.33, 33.35]);
  });

  it("venda sem linhas cancelada fica fora", () => {
    const cancelada = venda({}, [], "cancelada", { dataVenda: new Date("2026-08-15T00:00:00.000Z"), parcelas: 1, valorVenda: 150 });
    expect(montarPlanilhaFolha([cancelada], { competencia: AGOSTO }).linhas).toEqual([]);
  });
});

describe("montarPlanilhaFolha — o que a folha desconta", () => {
  it("parcela antecipada na Prudent entra: a folha continua descontando", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({}, [p("2026-09-10", 305, { paga: true, origemPagamento: "prudent" })])],
      { competencia: AGOSTO }
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].valor).toBe(305);
  });

  it("parcela quitada pelo cliente (Asaas ou baixa manual) fica fora", () => {
    const { linhas } = montarPlanilhaFolha(
      [
        venda({ matricula: "1" }, [p("2026-09-10", 100, { paga: true, origemPagamento: "asaas" })]),
        venda({ matricula: "2" }, [p("2026-09-10", 100, { paga: true, origemPagamento: "manual" })]),
      ],
      { competencia: AGOSTO }
    );
    expect(linhas).toEqual([]);
  });

  it("venda cancelada ou estornada fica fora", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ matricula: "1" }, [p("2026-09-10", 100)], "cancelada"), venda({ matricula: "2" }, [p("2026-09-10", 100)], "estornada")],
      { competencia: AGOSTO }
    );
    expect(linhas).toEqual([]);
  });

  it("filtro de empresa sem diferenciar maiúsculas", () => {
    const vendas = [venda({ matricula: "1", empresa: "Amazon Five" }, [p("2026-09-10", 100)]), venda({ matricula: "2", empresa: "OUTRA" }, [p("2026-09-10", 100)])];
    const { linhas } = montarPlanilhaFolha(vendas, { competencia: AGOSTO, empresa: "AMAZON FIVE" });
    expect(linhas.map((l) => l.matricula)).toEqual(["1"]);
  });
});

describe("montarPlanilhaFolha — ordem, sem matrícula e resumo", () => {
  const vendas = [
    venda({ nome: "MARIANA SOUZA", matricula: "200" }, [p("2026-09-10", 150)]),
    venda({ nome: "ZULEIDE PRADO", matricula: null }, [p("2026-09-10", 80)]),
    venda({ nome: "ANA LIMA", matricula: "  " }, [p("2026-09-10", 90)]),
    venda({ nome: "ÁLVARO COSTA", matricula: "300" }, [p("2026-09-10", 100)]),
  ];
  const planilha = montarPlanilhaFolha(vendas, { competencia: AGOSTO });

  it("ordena por nome; quem não tem matrícula vem depois, com a matrícula em branco", () => {
    expect(planilha.linhas).toEqual([
      { matricula: "300", nome: "ÁLVARO COSTA", valor: 100 },
      { matricula: "200", nome: "MARIANA SOUZA", valor: 150 },
      { matricula: "", nome: "ANA LIMA", valor: 90 },
      { matricula: "", nome: "ZULEIDE PRADO", valor: 80 },
    ]);
  });

  it("sem matrícula: uma linha por cliente, nunca somados entre si", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ nome: "ANA LIMA", matricula: null }, [p("2026-09-10", 90)]), venda({ nome: "BIA ROCHA", matricula: null }, [p("2026-09-10", 90)])],
      { competencia: AGOSTO }
    );
    expect(linhas).toHaveLength(2);
  });

  it("mesmo cliente sem matrícula com duas vendas: uma linha com a soma", () => {
    const { linhas } = montarPlanilhaFolha(
      [venda({ id: 900, nome: "ANA LIMA", matricula: null }, [p("2026-09-10", 90)]), venda({ id: 900, nome: "ANA LIMA", matricula: null }, [p("2026-09-10", 10)])],
      { competencia: AGOSTO }
    );
    expect(linhas).toEqual([{ matricula: "", nome: "ANA LIMA", valor: 100 }]);
  });

  it("vendas sem cliente: uma linha por venda, nunca somadas", () => {
    const semCliente = (valor: number) => ({ ...venda({}, [p("2026-09-10", valor)]), cliente: null });
    const { linhas } = montarPlanilhaFolha([semCliente(90), semCliente(10)], { competencia: AGOSTO });
    expect(linhas.map((l) => l.valor).sort((a, b) => a - b)).toEqual([10, 90]);
    expect(linhas.every((l) => l.nome === "SEM NOME" && l.matricula === "")).toBe(true);
  });

  it("mesma matrícula em cadastros diferentes: uma linha só, e o resumo avisa quais são", () => {
    // Erro de digitação ou cadastro duplicado junta duas pessoas na mesma linha da folha: o
    // desconto de uma cairia na outra. A planilha não tem como separar, então precisa avisar.
    const { linhas, matriculasRepetidas } = montarPlanilhaFolha(
      [
        venda({ id: 10, nome: "JOSÉ DA SILVA", matricula: "45" }, [p("2026-09-10", 100)]),
        venda({ id: 11, nome: "JOSE SILVA", matricula: "00045" }, [p("2026-09-10", 50)]),
        venda({ id: 12, nome: "ANA LIMA", matricula: "77" }, [p("2026-09-10", 10)]),
      ],
      { competencia: AGOSTO }
    );
    expect(linhas).toHaveLength(2);
    // Ordem do comparador pt-BR, que ignora acento: "JOSE DA SILVA" antes de "JOSE SILVA".
    expect(matriculasRepetidas).toEqual([{ matricula: "45", nomes: ["JOSÉ DA SILVA", "JOSE SILVA"] }]);
  });

  it("mesmo cadastro com duas compras não é matrícula repetida", () => {
    const { matriculasRepetidas } = montarPlanilhaFolha(
      [venda({ id: 20, matricula: "45" }, [p("2026-09-10", 100)]), venda({ id: 20, matricula: "45" }, [p("2026-09-10", 50)])],
      { competencia: AGOSTO }
    );
    expect(matriculasRepetidas).toEqual([]);
  });

  it("resumo: total, quantidade de linhas e quantos estão sem matrícula", () => {
    expect(planilha.total).toBe(420);
    expect(planilha.linhas).toHaveLength(4);
    expect(planilha.semMatricula).toBe(2);
    expect(planilha.competencia).toBe(AGOSTO);
  });

  it("nenhuma parcela na competência: planilha vazia, total zero", () => {
    expect(montarPlanilhaFolha(vendas, { competencia: "2027-01" })).toEqual({
      competencia: "2027-01",
      linhas: [],
      total: 0,
      semMatricula: 0,
      matriculasRepetidas: [],
    });
  });
});
