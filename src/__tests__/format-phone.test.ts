import { describe, it, expect } from "vitest";
import { formatPhone } from "@/lib/masks";

// Bug encontrado em 2026-08-05: abrir a edicao de um cliente com telefone fixo
// (10 digitos) e salvar sem mudar nada regravava o numero mal agrupado.
// "11 3265-4321" virava "(11) 32654-321" — 5+3 em vez de 4+4 — porque a mascara
// cortava sempre no 7o digito, como se todo numero tivesse 11.
//
// O proprio docstring da funcao ja prometia os dois formatos:
// "(XX) XXXXX-XXXX ou (XX) XXXX-XXXX". A implementacao so fazia o primeiro.
//
// Numeros ficticios: telefone de cliente nao entra no repo.

describe("formatPhone — celular (11 digitos)", () => {
  it("agrupa 5+4", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("reformatar um ja formatado nao muda nada (idempotente)", () => {
    expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321");
  });
});

describe("formatPhone — fixo (10 digitos)", () => {
  it("agrupa 4+4, nao 5+3 — este E o bug", () => {
    expect(formatPhone("1132654321")).toBe("(11) 3265-4321");
  });

  it("reformatar um ja formatado nao muda nada (idempotente)", () => {
    // Era aqui que o dado se corrompia: cada save reagrupava o numero.
    expect(formatPhone("(11) 3265-4321")).toBe("(11) 3265-4321");
  });

  it("o valor ja corrompido volta ao certo ao ser reformatado", () => {
    expect(formatPhone("(11) 32654-321")).toBe("(11) 3265-4321");
  });

  it("aceita o formato sem parenteses que existe no banco", () => {
    expect(formatPhone("11 3265-4321")).toBe("(11) 3265-4321");
  });
});

describe("formatPhone — digitacao parcial", () => {
  it("string vazia", () => {
    expect(formatPhone("")).toBe("");
  });

  it("so o DDD", () => {
    expect(formatPhone("11")).toBe("(11");
  });

  it("DDD e comeco do numero", () => {
    expect(formatPhone("11987")).toBe("(11) 987");
  });

  it("descarta digitos alem de 11", () => {
    expect(formatPhone("119876543219999")).toBe("(11) 98765-4321");
  });

  it("ignora letras e simbolos", () => {
    expect(formatPhone("(11) 98765-4321 ramal 3")).toBe("(11) 98765-4321");
  });
});
