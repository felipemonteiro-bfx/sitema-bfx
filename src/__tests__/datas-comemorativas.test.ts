import { describe, it, expect } from "vitest";
import {
  DATAS_COMEMORATIVAS,
  dataComemorativaDeHoje,
} from "@/lib/datas-comemorativas";

describe("DATAS_COMEMORATIVAS", () => {
  it("tem as 6 datas fixas com templates bfx_", () => {
    expect(DATAS_COMEMORATIVAS).toHaveLength(6);
    const slugs = DATAS_COMEMORATIVAS.map((d) => d.slug).sort();
    expect(slugs).toEqual(
      ["ano_novo", "dia_cliente", "dia_criancas", "dia_mulheres", "dia_namorados", "natal"].sort()
    );
    for (const d of DATAS_COMEMORATIVAS) {
      expect(d.template.startsWith("bfx_")).toBe(true);
    }
  });
});

describe("dataComemorativaDeHoje", () => {
  it("acerta o Natal (25/12)", () => {
    const d = dataComemorativaDeHoje(new Date(2026, 11, 25)); // mes 11 = dezembro
    expect(d?.slug).toBe("natal");
  });

  it("acerta o Dia dos Namorados (12/06) e não confunde com 06/12", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 5, 12))?.slug).toBe("dia_namorados"); // 12/jun
    expect(dataComemorativaDeHoje(new Date(2026, 11, 6))).toBeNull(); // 06/dez não é data
  });

  it("devolve null em data comum", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 6, 21))).toBeNull(); // 21/jul
  });

  it("acerta Ano Novo, Dia do Cliente, Crianças e Mulheres", () => {
    expect(dataComemorativaDeHoje(new Date(2026, 0, 1))?.slug).toBe("ano_novo");
    expect(dataComemorativaDeHoje(new Date(2026, 8, 15))?.slug).toBe("dia_cliente");
    expect(dataComemorativaDeHoje(new Date(2026, 9, 12))?.slug).toBe("dia_criancas");
    expect(dataComemorativaDeHoje(new Date(2026, 2, 8))?.slug).toBe("dia_mulheres");
  });
});
