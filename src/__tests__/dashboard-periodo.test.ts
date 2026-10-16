import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ehMesEmAndamento, mesesRecentes, periodosRapidos, rotuloPeriodo } from "@/lib/dashboard-periodo";
import { PeriodoSegmentado } from "@/components/periodo-segmentado";

// Tira os marcadores `<!-- -->` que o React põe entre trechos de texto no SSR.
const limpar = (html: string) => html.split("<!-- -->").join("");

describe("rotuloPeriodo", () => {
  it("dd/mm — dd/mm/aaaa quando o período fica no mesmo ano", () => {
    expect(rotuloPeriodo("2026-10-01", "2026-10-06")).toBe("01/10 — 06/10/2026");
  });

  it("repete o ano do início quando o período atravessa a virada", () => {
    expect(rotuloPeriodo("2025-12-15", "2026-01-06")).toBe("15/12/2025 — 06/01/2026");
  });

  it("um dia só (Hoje) mostra as duas pontas", () => {
    expect(rotuloPeriodo("2026-10-16", "2026-10-16")).toBe("16/10 — 16/10/2026");
  });
});

describe("ehMesEmAndamento", () => {
  it("só do dia 1 até hoje", () => {
    expect(ehMesEmAndamento("2026-10-01", "2026-10-16", "2026-10-16")).toBe(true);
  });

  it("começo no meio do mês não é mês em andamento", () => {
    expect(ehMesEmAndamento("2026-10-10", "2026-10-16", "2026-10-16")).toBe(false);
  });

  it("fim antes de hoje não é mês em andamento", () => {
    expect(ehMesEmAndamento("2026-10-01", "2026-10-15", "2026-10-16")).toBe(false);
  });

  it("mês passado inteiro não é mês em andamento", () => {
    expect(ehMesEmAndamento("2026-09-01", "2026-09-30", "2026-10-16")).toBe(false);
  });

  it("dia 1 de um mês anterior até hoje (trimestre) não conta", () => {
    expect(ehMesEmAndamento("2026-09-01", "2026-10-16", "2026-10-16")).toBe(false);
  });
});

describe("periodosRapidos", () => {
  const hoje = "2026-10-16";
  const atual = { from: "2026-10-01", to: "2026-10-16" };

  it("monta from/to de Hoje, 7 dias, Mês e Trimestre", () => {
    const p = periodosRapidos(hoje, atual);
    expect(p.map((x) => x.label)).toEqual(["Hoje", "7 dias", "Mês", "Trimestre"]);
    expect(p.map((x) => [x.from, x.to])).toEqual([
      ["2026-10-16", "2026-10-16"],
      ["2026-10-10", "2026-10-16"],
      ["2026-10-01", "2026-10-16"],
      ["2026-08-01", "2026-10-16"],
    ]);
  });

  it("os links levam from/to na URL", () => {
    const p = periodosRapidos(hoje, atual);
    expect(p[0].href).toBe("/dashboard?from=2026-10-16&to=2026-10-16");
    expect(p[3].href).toBe("/dashboard?from=2026-08-01&to=2026-10-16");
  });

  it("preserva o filtro de vendedores no link", () => {
    const p = periodosRapidos(hoje, atual, "Ana,José");
    expect(p[2].href).toBe("/dashboard?from=2026-10-01&to=2026-10-16&vendors=Ana%2CJos%C3%A9");
  });

  it("marca ativo só o período que bate com o intervalo atual", () => {
    expect(periodosRapidos(hoje, atual).map((x) => x.ativo)).toEqual([false, false, true, false]);
    expect(periodosRapidos(hoje, { from: "2026-10-16", to: "2026-10-16" }).map((x) => x.ativo)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(periodosRapidos(hoje, { from: "2026-10-03", to: "2026-10-09" }).some((x) => x.ativo)).toBe(false);
  });

  it("7 dias atravessa a virada do mês em UTC", () => {
    const p = periodosRapidos("2026-03-03", { from: "2026-03-01", to: "2026-03-03" });
    expect(p[1].from).toBe("2026-02-25");
  });
});

describe("mesesRecentes", () => {
  it("seis meses UTC, do mais antigo ao atual, com fim exclusivo no 1º do mês seguinte", () => {
    const m = mesesRecentes(new Date(Date.UTC(2026, 9, 16, 12)));
    expect(m).toHaveLength(6);
    expect(m[0].inicio.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(m[5].inicio.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(m[5].fim.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(m[0].rotulo).toBe("mai/26");
    expect(m[5].rotuloCompleto).toBe("out/2026");
  });

  it("atravessa o ano", () => {
    const m = mesesRecentes(new Date(Date.UTC(2026, 0, 5)));
    expect(m[0].inicio.toISOString()).toBe("2025-08-01T00:00:00.000Z");
    expect(m[5].fim.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("PeriodoSegmentado", () => {
  const periodos = periodosRapidos("2026-10-16", { from: "2026-10-01", to: "2026-10-16" });
  const html = limpar(renderToString(createElement(PeriodoSegmentado, { periodos })));

  it("são links (funciona sem JS), um por período, dentro de um grupo nomeado", () => {
    expect(html.split("<a ").length - 1).toBe(4);
    expect(html).toContain('href="/dashboard?from=2026-10-16&amp;to=2026-10-16"');
    expect(html).toContain('aria-label="Período"');
    expect(html).not.toContain("<button");
  });

  it("só o ativo leva aria-current e o fundo do segmento ativo", () => {
    expect(html.split("aria-current").length - 1).toBe(1);
    expect(html).toMatch(/aria-current="true"[^>]*>Mês</);
    expect(html).toContain("bg-controle-ativo");
    expect(html).toContain("bg-controle");
  });
});
