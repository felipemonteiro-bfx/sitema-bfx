// Data do desconto em venda 1x em folha (2026-10-01): regra pura.
// Ver docs/superpowers/specs/2026-10-01-data-desconto-venda-1x.md.
import { describe, it, expect } from "vitest";
import {
  MENSAGEM_DATA_DESCONTO_FORA,
  parcelaUnicaDaFolha,
  parcelasDaVendaRapida,
  validarDataDescontoUnica,
} from "@/lib/parcelas";
import { parcelasParaSimulacao } from "@/lib/simular-margem-venda";
import {
  avisoMudancaDataDesconto,
  dataDaRegraIso,
  dataDescontoEfetiva,
  escolhaAposSelecionar,
  formatarDataBR,
} from "@/lib/data-desconto-unica";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const venda = new Date("2026-10-01T00:00:00.000Z");

describe("parcelaUnicaDaFolha com data informada", () => {
  it("usa a data informada no lugar da regra; o valor continua sendo o total", () => {
    const [p] = parcelaUnicaDaFolha({ emFolha: true, dataVenda: venda, total: 300, dataInformada: new Date("2026-12-10T00:00:00.000Z") });
    expect(iso(p.dataVencimento)).toBe("2026-12-10");
    expect(p.valorParcela).toBe(300);
  });

  it("sem data informada, segue a regra", () => {
    const [p] = parcelaUnicaDaFolha({ emFolha: true, dataVenda: venda, total: 300 });
    expect(iso(p.dataVencimento)).toBe("2026-11-10");
  });

  it("fora da folha, nenhuma linha mesmo com data informada", () => {
    expect(parcelaUnicaDaFolha({ emFolha: false, dataVenda: venda, total: 300, dataInformada: new Date("2026-12-10T00:00:00.000Z") })).toEqual([]);
  });
});

describe("parcelasDaVendaRapida com data do desconto", () => {
  it("1x em folha usa a data do desconto", () => {
    const linhas = parcelasDaVendaRapida({ parcelas: 1, dataVenda: venda, total: 300, emFolha: true, dataDescontoUnica: new Date("2026-12-10T00:00:00.000Z") });
    expect(linhas.map((p) => iso(p.dataVencimento))).toEqual(["2026-12-10"]);
  });

  it("parcelada ignora a data do desconto", () => {
    const linhas = parcelasDaVendaRapida({ parcelas: 2, dataVenda: venda, total: 300, emFolha: true, dataDescontoUnica: new Date("2026-12-10T00:00:00.000Z") });
    expect(linhas.map((p) => iso(p.dataVencimento))).toEqual(["2026-11-10", "2026-12-10"]);
  });
});

describe("validarDataDescontoUnica", () => {
  it("aceita do dia da venda até 12 meses depois", () => {
    expect(validarDataDescontoUnica("2026-10-01", venda)).toMatchObject({ ok: true });
    expect(validarDataDescontoUnica("2027-10-01", venda)).toMatchObject({ ok: true });
    const r = validarDataDescontoUnica("2026-12-10", venda);
    expect(r.ok && iso(r.data)).toBe("2026-12-10");
  });

  it("recusa data anterior à venda, mais de 12 meses depois ou inválida", () => {
    for (const v of ["2026-09-30", "2027-10-02", "2026-02-30", "10/12/2026", ""]) {
      expect(validarDataDescontoUnica(v, venda)).toEqual({ ok: false, erro: MENSAGEM_DATA_DESCONTO_FORA });
    }
    expect(MENSAGEM_DATA_DESCONTO_FORA).toBe("Data do desconto deve ficar entre a data da venda e 12 meses depois.");
  });
});

describe("parcelasParaSimulacao com a data escolhida", () => {
  it("1x em folha simula com a data escolhida", () => {
    const linhas = parcelasParaSimulacao({ numParcelas: 1, informadas: [], emFolha: true, dataVenda: "2026-10-01", total: 300, dataDescontoUnica: "2026-12-10" });
    expect(linhas).toEqual([{ numeroParcela: 1, dataVencimento: "2026-12-10", valorParcela: 300 }]);
  });

  it("data inválida cai na regra", () => {
    const linhas = parcelasParaSimulacao({ numParcelas: 1, informadas: [], emFolha: true, dataVenda: "2026-10-01", total: 300, dataDescontoUnica: "x" });
    expect(linhas[0].dataVencimento).toBe("2026-11-10");
  });
});

describe("estado do campo (data-desconto-unica)", () => {
  it("data da regra em ISO pela regra da empresa", () => {
    expect(dataDaRegraIso("2026-10-01", { diaCorte: 5, diaVencimento: 15 })).toBe("2026-11-15");
    expect(dataDaRegraIso("2026-10-06", { diaCorte: 5, diaVencimento: 15 })).toBe("2026-12-15");
    expect(dataDaRegraIso("2026-10-01")).toBe("2026-11-10");
    expect(dataDaRegraIso("")).toBeNull();
  });

  it("sem escolha, acompanha a regra; escolher a própria data da regra volta a acompanhar", () => {
    expect(dataDescontoEfetiva(null, "2026-11-10")).toBe("2026-11-10");
    expect(dataDescontoEfetiva("2026-12-10", "2026-11-10")).toBe("2026-12-10");
    expect(escolhaAposSelecionar("2026-11-10", "2026-11-10")).toBeNull();
    expect(escolhaAposSelecionar("2026-12-10", "2026-11-10")).toBe("2026-12-10");
  });

  it("formata DD/MM/AAAA", () => {
    expect(formatarDataBR("2026-11-10")).toBe("10/11/2026");
  });

  it("aviso: mês diferente, só o dia, ano diferente e sem mudança", () => {
    expect(avisoMudancaDataDesconto("2026-12-10", "2026-11-10")).toBe(
      "Combine com o RH antes: a folha vai descontar em dezembro, não em novembro. O resumo financeiro e a taxa da Prudent já usam a data nova.",
    );
    expect(avisoMudancaDataDesconto("2026-11-15", "2026-11-10")).toBe("Combine com o RH antes: o desconto muda do dia 10 para o dia 15.");
    expect(avisoMudancaDataDesconto("2027-11-10", "2026-11-10")).toBe(
      "Combine com o RH antes: a folha vai descontar em novembro de 2027, não em novembro de 2026. O resumo financeiro e a taxa da Prudent já usam a data nova.",
    );
    expect(avisoMudancaDataDesconto("2026-11-10", "2026-11-10")).toBeNull();
  });
});
