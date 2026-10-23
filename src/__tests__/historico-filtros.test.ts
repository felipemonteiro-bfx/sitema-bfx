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

// R1-4: o contador de assinaturas pendentes e o destino do link são o MESMO conjunto.
describe("urlPendentesDoUsuario", () => {
  const HOJE = new Date("2026-10-16T15:00:00Z");

  it("admin: assinatura pendente, todo o período até hoje, sem vendedor", async () => {
    const { urlPendentesDoUsuario } = await import("@/lib/historico-filtros");
    const url = new URL(urlPendentesDoUsuario({ role: "admin", username: "adm" }, HOJE), "http://x");
    expect(url.pathname).toBe("/historico");
    expect(url.searchParams.get("assinatura")).toBe("pendente");
    expect(url.searchParams.get("to")).toBe("2026-10-16");
    expect(url.searchParams.get("vendedor")).toBeNull();
  });

  it("vendedor: leva o próprio nome de exibição (o mesmo texto que o Histórico filtra)", async () => {
    const { urlPendentesDoUsuario } = await import("@/lib/historico-filtros");
    const url = new URL(urlPendentesDoUsuario({ role: "vendedor", username: "ana", nomeExibicao: "Ana Souza" }, HOJE), "http://x");
    expect(url.searchParams.get("vendedor")).toBe("Ana Souza");
  });

  it("vendedor sem nome de exibição cai no username", async () => {
    const { urlPendentesDoUsuario } = await import("@/lib/historico-filtros");
    const url = new URL(urlPendentesDoUsuario({ role: "vendedor", username: "ana" }, HOJE), "http://x");
    expect(url.searchParams.get("vendedor")).toBe("ana");
  });

  it("a faixa from..to cobre todo o período contado (venda antiga e de hoje)", async () => {
    const { urlPendentesDoUsuario } = await import("@/lib/historico-filtros");
    const { resolverPeriodo } = await import("@/lib/periodo-data");
    const url = new URL(urlPendentesDoUsuario({ role: "admin", username: "adm" }, HOJE), "http://x");
    const { inicio, fimExclusivo } = resolverPeriodo(url.searchParams.get("from"), url.searchParams.get("to"), HOJE);
    expect(inicio.getTime()).toBeLessThanOrEqual(new Date("2020-01-01T00:00:00Z").getTime());
    expect(fimExclusivo.getTime()).toBeGreaterThan(HOJE.getTime());
  });
});
