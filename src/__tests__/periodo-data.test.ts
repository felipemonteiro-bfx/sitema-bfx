import { describe, it, expect } from "vitest";
import {
  inicioDoDiaUtc,
  fimExclusivoUtc,
  fimInclusivoParaInput,
  resolverPeriodo,
} from "@/lib/periodo-data";

/**
 * Uma venda gravada como `new Date("2026-08-01")` — a spec do JS trata string
 * date-only como UTC, entao e meia-noite UTC. E contra isto que o filtro compara.
 */
const VENDA_PRIMEIRO_DIA = new Date("2026-08-01");
const VENDA_ULTIMO_DIA = new Date("2026-08-10");
const VENDA_DIA_SEGUINTE = new Date("2026-08-11");

function dentro(venda: Date, from: string, to: string): boolean {
  const { inicio, fimExclusivo } = resolverPeriodo(from, to);
  return venda >= inicio && venda < fimExclusivo;
}

describe("limites do periodo em UTC", () => {
  it("inicio e meia-noite UTC do dia escolhido", () => {
    expect(inicioDoDiaUtc("2026-08-01")?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("fim e o inicio do dia SEGUINTE, exclusivo", () => {
    expect(fimExclusivoUtc("2026-08-10")?.toISOString()).toBe("2026-08-11T00:00:00.000Z");
  });

  it("vira o mes corretamente", () => {
    expect(fimExclusivoUtc("2026-08-31")?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("vira o ano corretamente", () => {
    expect(fimExclusivoUtc("2026-12-31")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it.each(["", "2026-08", "10/08/2026", "2026-13-01", "2026-08-00", "abc"])(
    "formato invalido (%s) devolve null",
    (valor) => {
      expect(inicioDoDiaUtc(valor)).toBeNull();
      expect(fimExclusivoUtc(valor)).toBeNull();
    }
  );
});

describe("o periodo inclui os dois extremos — o bug relatado", () => {
  it("o PRIMEIRO dia do periodo entra", () => {
    // Em horario local (UTC-4) este era exatamente o dia que sumia da listagem.
    expect(dentro(VENDA_PRIMEIRO_DIA, "2026-08-01", "2026-08-10")).toBe(true);
  });

  it("o ULTIMO dia do periodo entra", () => {
    expect(dentro(VENDA_ULTIMO_DIA, "2026-08-01", "2026-08-10")).toBe(true);
  });

  it("o dia seguinte ao final NAO entra", () => {
    // Em horario local este aparecia indevidamente.
    expect(dentro(VENDA_DIA_SEGUINTE, "2026-08-01", "2026-08-10")).toBe(false);
  });

  it("periodo de um unico dia pega a venda daquele dia", () => {
    expect(dentro(VENDA_ULTIMO_DIA, "2026-08-10", "2026-08-10")).toBe(true);
    expect(dentro(VENDA_DIA_SEGUINTE, "2026-08-10", "2026-08-10")).toBe(false);
  });
});

describe("o campo Data final nao anda sozinho", () => {
  it("reexibe exatamente o dia escolhido, nao o seguinte", () => {
    // A tela reexibia `fimExclusivo.toISOString()`, que e o dia+1: cada clique em
    // Filtrar empurrava o periodo um dia para a frente.
    const { fimExclusivo } = resolverPeriodo("2026-08-01", "2026-08-10");
    expect(fimInclusivoParaInput(fimExclusivo)).toBe("2026-08-10");
  });

  it("filtrar repetidamente e idempotente", () => {
    let to = "2026-08-10";
    for (let i = 0; i < 5; i++) {
      const { fimExclusivo } = resolverPeriodo("2026-08-01", to);
      to = fimInclusivoParaInput(fimExclusivo);
    }
    expect(to).toBe("2026-08-10");
  });
});

describe("defaults quando a URL nao traz datas", () => {
  it("cai no primeiro dia do mes corrente, em UTC", () => {
    const agora = new Date("2026-08-10T12:00:00.000Z");
    const { inicio } = resolverPeriodo(null, null, agora);
    expect(inicio.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("o default do fim inclui o dia de hoje inteiro", () => {
    const agora = new Date("2026-08-10T12:00:00.000Z");
    const { fimExclusivo } = resolverPeriodo(null, null, agora);
    expect(fimExclusivo.toISOString()).toBe("2026-08-11T00:00:00.000Z");
    expect(new Date("2026-08-10") < fimExclusivo).toBe(true);
  });

  it("data invalida na URL cai no default em vez de quebrar a tela", () => {
    const agora = new Date("2026-08-10T12:00:00.000Z");
    const { inicio } = resolverPeriodo("nao-e-data", null, agora);
    expect(inicio.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});
