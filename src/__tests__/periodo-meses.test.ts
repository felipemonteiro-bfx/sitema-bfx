// Seletor de intervalo de meses da fila de antecipação (2026-09-11).
//
// Antes o período era digitado em dois campos de texto (MM/AAAA). O seletor
// continua gravando MM/AAAA em periodoInicio/periodoFim, então a action, os
// relatórios e parsePeriodoMesAno não mudam — só a forma de escolher.
import { describe, it, expect } from "vitest";
import {
  proximoIntervalo,
  intervaloEsteMes,
  intervaloProximosMeses,
  rotuloIntervalo,
  chaveDoMes,
  mesDaChave,
  estadoDoMes,
  valorCompacto,
  INTERVALO_VAZIO,
} from "@/lib/periodo-meses";

describe("proximoIntervalo — clicar nos meses da grade", () => {
  it("primeiro clique marca o início e espera o fim", () => {
    expect(proximoIntervalo(INTERVALO_VAZIO, "10/2026")).toEqual({
      inicio: "10/2026",
      fim: "10/2026",
      aguardandoFim: true,
    });
  });

  it("segundo clique depois do início fecha o intervalo", () => {
    const aberto = proximoIntervalo(INTERVALO_VAZIO, "10/2026");
    expect(proximoIntervalo(aberto, "12/2026")).toEqual({ inicio: "10/2026", fim: "12/2026", aguardandoFim: false });
  });

  it("segundo clique antes do início inverte as pontas", () => {
    const aberto = proximoIntervalo(INTERVALO_VAZIO, "12/2026");
    expect(proximoIntervalo(aberto, "10/2026")).toEqual({ inicio: "10/2026", fim: "12/2026", aguardandoFim: false });
  });

  it("compara por ano antes do mês: 01/2027 vem depois de 12/2026", () => {
    const aberto = proximoIntervalo(INTERVALO_VAZIO, "12/2026");
    expect(proximoIntervalo(aberto, "01/2027")).toEqual({ inicio: "12/2026", fim: "01/2027", aguardandoFim: false });
  });

  it("clicar o mesmo mês duas vezes fecha um intervalo de um mês só", () => {
    const aberto = proximoIntervalo(INTERVALO_VAZIO, "10/2026");
    expect(proximoIntervalo(aberto, "10/2026")).toEqual({ inicio: "10/2026", fim: "10/2026", aguardandoFim: false });
  });

  it("com o intervalo fechado, o próximo clique começa outro", () => {
    const fechado = { inicio: "10/2026", fim: "12/2026", aguardandoFim: false };
    expect(proximoIntervalo(fechado, "03/2027")).toEqual({ inicio: "03/2027", fim: "03/2027", aguardandoFim: true });
  });
});

describe("atalhos", () => {
  it("Este mês usa o dia civil de hoje", () => {
    expect(intervaloEsteMes("2026-09-11")).toEqual({ inicio: "09/2026", fim: "09/2026", aguardandoFim: false });
  });

  it("Próximos 3 meses conta o mês atual", () => {
    expect(intervaloProximosMeses("2026-09-11", 3)).toEqual({ inicio: "09/2026", fim: "11/2026", aguardandoFim: false });
  });

  it("Próximos 3 meses vira o ano", () => {
    expect(intervaloProximosMeses("2026-11-30", 3)).toEqual({ inicio: "11/2026", fim: "01/2027", aguardandoFim: false });
  });
});

describe("rotuloIntervalo", () => {
  it("intervalo de vários meses", () => {
    expect(rotuloIntervalo("10/2026", "12/2026")).toBe("out/2026 – dez/2026");
  });

  it("um mês só", () => {
    expect(rotuloIntervalo("10/2026", "10/2026")).toBe("out/2026");
  });

  it("sem período devolve null — o gatilho mostra o texto de qualquer mês", () => {
    expect(rotuloIntervalo("", "")).toBeNull();
  });
});

describe("chaves de mês", () => {
  it("MM/AAAA ↔ YYYY-MM, o formato do resumo por mês", () => {
    expect(chaveDoMes("10/2026")).toBe("2026-10");
    expect(mesDaChave("2026-10")).toBe("10/2026");
  });
});

describe("estadoDoMes — o desenho de cada mês na grade", () => {
  const intervalo = { inicio: "10/2026", fim: "12/2026", aguardandoFim: false };

  it("pontas e meio do intervalo", () => {
    expect(estadoDoMes("10/2026", intervalo)).toBe("inicio");
    expect(estadoDoMes("11/2026", intervalo)).toBe("dentro");
    expect(estadoDoMes("12/2026", intervalo)).toBe("fim");
    expect(estadoDoMes("09/2026", intervalo)).toBe("fora");
  });

  it("intervalo de um mês é 'unico'", () => {
    expect(estadoDoMes("10/2026", { inicio: "10/2026", fim: "10/2026", aguardandoFim: true })).toBe("unico");
  });

  it("sem intervalo, todo mês está fora", () => {
    expect(estadoDoMes("10/2026", INTERVALO_VAZIO)).toBe("fora");
  });
});

describe("valorCompacto — o que cada mês tem a antecipar, dentro da célula", () => {
  it("abaixo de mil mostra o valor inteiro", () => {
    expect(valorCompacto(850)).toBe("R$ 850");
  });

  it("de mil para cima, uma casa decimal e 'mil'", () => {
    expect(valorCompacto(3450)).toBe("R$ 3,5 mil");
    expect(valorCompacto(18930)).toBe("R$ 18,9 mil");
  });

  it("valor redondo não mostra ',0'", () => {
    expect(valorCompacto(4000)).toBe("R$ 4 mil");
  });

  it("zero não mostra nada", () => {
    expect(valorCompacto(0)).toBe("");
  });
});
