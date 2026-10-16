// Tarefa E2 do redesign Vantage: o Histórico como tela-modelo. Fixa o
// comportamento dos três componentes novos (chips removíveis, barra de
// distribuição, status de assinatura) e que a página os usa.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FiltrosAtivos, descreverPeriodo } from "@/components/filtros-ativos";
import { BarraDistribuicao, calcularProporcoes } from "@/components/barra-distribuicao";
import { StatusAssinatura, estadoAssinatura } from "@/components/status-assinatura";
import { filtrosAtivos, urlSemFiltro } from "@/lib/historico-filtros";

const raiz = join(__dirname, "..", "..");
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("FiltrosAtivos", () => {
  const sp = { from: "2026-10-01", to: "2026-10-31", vendedor: "Jakeline", formaPagamento: "folha", page: "3" };
  const html = renderToStaticMarkup(createElement(FiltrosAtivos, { filtros: filtrosAtivos(sp), searchParams: sp }));

  it("cada chip e um link para a URL sem o filtro (funciona sem JS)", () => {
    for (const f of filtrosAtivos(sp)) {
      const href = urlSemFiltro(sp, f.chave).replace(/&/g, "&amp;");
      expect(html.includes(`href="${href}"`)).toBe(true);
    }
  });

  it("cada chip tem aria-label 'Remover filtro <rotulo>: <valor>'", () => {
    for (const f of filtrosAtivos(sp)) {
      expect(html.includes(`aria-label="Remover filtro ${f.rotulo}: ${f.valor}"`)).toBe(true);
    }
  });

  it("o X tem area de 44px", () => {
    expect(html.includes("size-11")).toBe(true);
  });

  it("sem filtros nao renderiza chips", () => {
    const vazio = renderToStaticMarkup(createElement(FiltrosAtivos, { filtros: [], searchParams: {} }));
    expect(vazio.includes("Remover filtro")).toBe(false);
  });
});

describe("descreverPeriodo", () => {
  it("mes inteiro vira 'vendas de <mes> de <ano>'", () => {
    expect(descreverPeriodo("2026-10-01", "2026-10-31")).toBe("vendas de outubro de 2026");
  });
  it("intervalo livre mostra as duas datas", () => {
    expect(descreverPeriodo("2026-10-05", "2026-11-02")).toBe("vendas de 05/10/2026 a 02/11/2026");
  });
});

describe("BarraDistribuicao", () => {
  it("as proporcoes somam 100 (maior resto)", () => {
    for (const c of [
      { assinada: 5, aguardando: 3, semContrato: 2, cancelada: 0 },
      { assinada: 1, aguardando: 1, semContrato: 1, cancelada: 0 },
      { assinada: 7, aguardando: 0, semContrato: 1, cancelada: 0 },
      { assinada: 0, aguardando: 0, semContrato: 9, cancelada: 0 },
    ]) {
      const r = calcularProporcoes(c);
      expect(r.vazio).toBe(false);
      expect(r.segmentos.reduce((s, x) => s + x.pct, 0)).toBe(100);
    }
  });

  it("zero vendas: sem NaN, marcado como vazio e a barra vira trilha neutra de 100%", () => {
    const r = calcularProporcoes({ assinada: 0, aguardando: 0, semContrato: 0, cancelada: 0 });
    expect(r.vazio).toBe(true);
    expect(r.segmentos.every((s) => s.pct === 0)).toBe(true);
    const html = renderToStaticMarkup(createElement(BarraDistribuicao, { contagens: { assinada: 0, aguardando: 0, semContrato: 0, cancelada: 0 } }));
    expect(html.includes("NaN")).toBe(false);
    expect(html.includes("0 vendas")).toBe(true);
  });

  it("mostra 'N vendas' e a legenda com os tres status (sem Rascunho)", () => {
    const html = renderToStaticMarkup(createElement(BarraDistribuicao, { contagens: { assinada: 5, aguardando: 3, semContrato: 2, cancelada: 0 } }));
    expect(html.includes("10 vendas")).toBe(true);
    expect(html.includes("Assinada")).toBe(true);
    expect(html.includes("Aguardando assinatura")).toBe(true);
    expect(html.includes("Sem contrato")).toBe(true);
    expect(html.includes("Rascunho")).toBe(false);
  });

  it("cancelada tem faixa e legenda próprias: não vira 'Sem contrato' (R1-6)", () => {
    const r = calcularProporcoes({ assinada: 2, aguardando: 1, semContrato: 1, cancelada: 4 });
    expect(r.total).toBe(8);
    expect(r.segmentos.find((x) => x.chave === "cancelada")!.quantidade).toBe(4);
    expect(r.segmentos.find((x) => x.chave === "semContrato")!.quantidade).toBe(1);
    expect(r.segmentos.reduce((a, x) => a + x.pct, 0)).toBe(100);
    const html = renderToStaticMarkup(createElement(BarraDistribuicao, { contagens: { assinada: 2, aguardando: 1, semContrato: 1, cancelada: 4 } }));
    expect(html.includes("Cancelada")).toBe(true);
    expect(html.includes("8 vendas")).toBe(true);
  });

  it("a página tira as canceladas/estornadas do 'Sem contrato'", () => {
    const pagina = ler("src/app/(app)/historico/page.tsx");
    expect(pagina.includes("qtdCancelada")).toBe(true);
    expect(pagina.includes("semContrato: Math.max(0, totalVendas - qtdAssinada - qtdAguardando - qtdCancelada)")).toBe(true);
  });

  it("singular para 1 venda", () => {
    const html = renderToStaticMarkup(createElement(BarraDistribuicao, { contagens: { assinada: 1, aguardando: 0, semContrato: 0, cancelada: 0 } }));
    expect(html.includes("1 venda<")).toBe(true);
  });
});

describe("StatusAssinatura", () => {
  it("deriva o estado com o criterio que a pagina usa por linha", () => {
    expect(estadoAssinatura({ status: "ativa", assinaturaStatus: "assinado", assinaturaToken: "t" })).toBe("assinada");
    expect(estadoAssinatura({ status: "ativa", assinaturaStatus: "pendente", assinaturaToken: "t" })).toBe("aguardando");
    expect(estadoAssinatura({ status: "ativa", assinaturaStatus: null, assinaturaToken: "t" })).toBe("aguardando");
    expect(estadoAssinatura({ status: "ativa", assinaturaStatus: null, assinaturaToken: null })).toBe("sem-contrato");
    expect(estadoAssinatura({ status: "cancelada", assinaturaStatus: null, assinaturaToken: "t" })).toBe("cancelada");
    expect(estadoAssinatura({ status: "estornada", assinaturaStatus: "assinado", assinaturaToken: "t" })).toBe("cancelada");
  });

  it("cobre os 4 estados com icone e texto", () => {
    const rotulos = { assinada: "Assinada", aguardando: "Aguardando assinatura", "sem-contrato": "Sem contrato", cancelada: "Cancelada" } as const;
    for (const [estado, rotulo] of Object.entries(rotulos)) {
      const html = renderToStaticMarkup(createElement(StatusAssinatura, { estado: estado as keyof typeof rotulos }));
      expect(html.includes(rotulo)).toBe(true);
      expect(html.includes("<svg")).toBe(true);
    }
  });

  it("aguardando usa o verde da marca; os demais sao neutros", () => {
    const aguardando = renderToStaticMarkup(createElement(StatusAssinatura, { estado: "aguardando" }));
    expect(aguardando.includes("text-marca-tint-texto")).toBe(true);
    for (const e of ["assinada", "sem-contrato", "cancelada"] as const) {
      expect(renderToStaticMarkup(createElement(StatusAssinatura, { estado: e })).includes("marca")).toBe(false);
    }
  });
});

describe("pagina do Historico", () => {
  const pagina = ler("src/app/(app)/historico/page.tsx");

  it("usa os tres componentes novos", () => {
    expect(pagina.includes('from "@/components/filtros-ativos"')).toBe(true);
    expect(pagina.includes('from "@/components/barra-distribuicao"')).toBe(true);
    expect(pagina.includes('from "@/components/status-assinatura"')).toBe(true);
    expect(pagina.includes("<FiltrosAtivos")).toBe(true);
    expect(pagina.includes("<BarraDistribuicao")).toBe(true);
    expect(pagina.includes("<StatusAssinatura")).toBe(true);
  });

  it("cabecalho com trilha, titulo 'Histórico' e acao 'Nova venda' para /venda-rapida", () => {
    expect(pagina.includes('title="Histórico"')).toBe(true);
    expect(pagina.includes("Vendas & Operações")).toBe(true);
    expect(pagina.includes("/venda-rapida")).toBe(true);
    expect(pagina.includes("Nova venda")).toBe(true);
  });

  it("nao traz a coluna 'Parcelas pagas' (fora de escopo)", () => {
    expect(pagina.includes("Parcelas pagas")).toBe(false);
  });

  it("numero da venda em mono", () => {
    expect(pagina.includes("font-mono")).toBe(true);
  });
});
