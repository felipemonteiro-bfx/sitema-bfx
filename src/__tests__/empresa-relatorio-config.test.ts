import { describe, expect, it } from "vitest";
import {
  diaEfetivoRelatorioMensal,
  validarDiaRelatorioMensal,
} from "@/lib/relatorio-mensal-config";

describe("validarDiaRelatorioMensal", () => {
  it("converte um dia valido enviado pelo formulario", () => {
    expect(validarDiaRelatorioMensal("21")).toBe(21);
  });

  it("trata zero como ausencia de configuracao", () => {
    expect(validarDiaRelatorioMensal(0)).toBeNull();
  });

  it("rejeita dias acima do limite do mes", () => {
    expect(() => validarDiaRelatorioMensal("32")).toThrow("dia do relatório");
  });
});

describe("diaEfetivoRelatorioMensal", () => {
  it("usa o dia 1 quando a empresa nao tem configuracao explicita", () => {
    expect(diaEfetivoRelatorioMensal(null)).toBe(1);
    expect(diaEfetivoRelatorioMensal(undefined)).toBe(1);
  });

  it("preserva o dia configurado pela empresa", () => {
    expect(diaEfetivoRelatorioMensal(21)).toBe(21);
  });
});
