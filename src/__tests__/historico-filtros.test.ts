import { describe, expect, it } from "vitest";
import { filtrosAtivos, urlSemFiltro, whereAssinatura, whereAssinaturaPendente } from "@/lib/historico-filtros";

describe("whereAssinaturaPendente (fonte única: Histórico, sidebar e busca)", () => {
  it("token gerado, venda válida e sem assinatura concluída (sem linha de Assinatura = pendente)", () => {
    expect(whereAssinaturaPendente()).toEqual({
      status: { notIn: ["cancelada", "estornada"] },
      assinaturaToken: { not: null },
      NOT: { assinatura: { is: { assinaturaStatus: "assinado" } } },
    });
  });
});

describe("whereAssinatura", () => {
  it("pendente: é exatamente o critério único whereAssinaturaPendente", () => {
    expect(whereAssinatura("pendente")).toEqual(whereAssinaturaPendente());
  });

  it("assinado: assinatura concluída", () => {
    expect(whereAssinatura("assinado")).toEqual({
      assinatura: { assinaturaStatus: "assinado" },
    });
  });

  it("valor inválido, vazio ou ausente é ignorado", () => {
    expect(whereAssinatura("xpto")).toBeUndefined();
    expect(whereAssinatura("")).toBeUndefined();
    expect(whereAssinatura("all")).toBeUndefined();
    expect(whereAssinatura(undefined)).toBeUndefined();
  });
});

describe("urlSemFiltro", () => {
  it("remove só a chave e o page, preservando o resto", () => {
    const url = urlSemFiltro({ vendedor: "ana", formaPagamento: "PIX", page: "3" }, "vendedor");
    expect(url).toBe("/historico?formaPagamento=PIX");
  });

  it("remove o par from/to quando a chave é periodo", () => {
    const url = urlSemFiltro({ from: "2026-10-01", to: "2026-10-10", q: "joao", page: "2" }, "periodo");
    expect(url).toBe("/historico?q=joao");
  });

  it("sem nada sobrando devolve /historico", () => {
    expect(urlSemFiltro({ q: "x" }, "q")).toBe("/historico");
  });
});

describe("filtrosAtivos", () => {
  it("lista só os filtros preenchidos, com rótulos em português", () => {
    const f = filtrosAtivos({
      vendedor: "ana",
      formaPagamento: "DESCONTO_FOLHA",
      assinatura: "pendente",
      q: "joao",
      from: "2026-10-01",
      to: "2026-10-10",
      page: "2",
    });
    expect(f).toEqual([
      { chave: "q", rotulo: "Busca", valor: "joao" },
      { chave: "periodo", rotulo: "Período", valor: "01/10/2026 a 10/10/2026" },
      { chave: "vendedor", rotulo: "Vendedor", valor: "ana" },
      { chave: "formaPagamento", rotulo: "Forma", valor: "Desconto em folha" },
      { chave: "assinatura", rotulo: "Assinatura", valor: "Pendente" },
    ]);
  });

  it("ignora 'all', vazios e assinatura inválida", () => {
    expect(filtrosAtivos({ vendedor: "all", formaPagamento: "all", assinatura: "zzz", q: "  " })).toEqual([]);
  });

  it("período com só uma ponta", () => {
    expect(filtrosAtivos({ from: "2026-10-01" })[0].valor).toBe("a partir de 01/10/2026");
    expect(filtrosAtivos({ to: "2026-10-10" })[0].valor).toBe("até 10/10/2026");
  });

  it("usa nomes resolvidos de cliente quando informados", () => {
    expect(filtrosAtivos({ cliente: "7" }, { cliente: { "7": "Maria" } })).toEqual([
      { chave: "cliente", rotulo: "Cliente", valor: "Maria" },
    ]);
  });
});
