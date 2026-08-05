import { describe, it, expect } from "vitest";
import {
  variantesLocaisDeTelefone,
  somenteDigitos,
  clienteIdentificavel,
} from "@/lib/telefone-busca";

// O pre-atendimento do WhatsApp recebe o numero em E.164 ("5511987654321") e
// precisa achar o cliente. A busca antiga fazia `telefone contains <digitos>`
// contra a coluna FORMATADA — e "(11) 98765-4321" nao contem "11987654321".
// Achava so 32 dos 813 clientes: exatamente os que por acaso estavam gravados
// em digitos puros. Agora a comparacao e' digito contra digito nos dois lados.
//
// Todos os numeros abaixo sao ficticios: telefone de cliente nao entra no repo.

describe("somenteDigitos", () => {
  it("tira formatacao", () => {
    expect(somenteDigitos("(11) 98765-4321")).toBe("11987654321");
    expect(somenteDigitos("11 3265-4321")).toBe("1132654321");
  });

  it("aguenta vazio e nulo", () => {
    expect(somenteDigitos("")).toBe("");
    expect(somenteDigitos(null)).toBe("");
    expect(somenteDigitos(undefined)).toBe("");
  });
});

describe("variantesLocaisDeTelefone", () => {
  it("tira o DDI 55 do numero que vem do WhatsApp", () => {
    expect(variantesLocaisDeTelefone("5511987654321")).toContain("11987654321");
  });

  it("aceita o numero ja local", () => {
    expect(variantesLocaisDeTelefone("11987654321")).toContain("11987654321");
  });

  it("gera a variante sem o nono digito", () => {
    // Cadastro antigo pode estar sem o 9: (11) 8765-4321
    expect(variantesLocaisDeTelefone("5511987654321")).toContain("1187654321");
  });

  it("gera a variante COM nono digito a partir de um numero de 10", () => {
    expect(variantesLocaisDeTelefone("1187654321")).toContain("11987654321");
  });

  it("acha o mesmo conjunto vindo formatado ou cru", () => {
    const cru = variantesLocaisDeTelefone("5511987654321");
    const formatado = variantesLocaisDeTelefone("+55 (11) 98765-4321");
    expect(new Set(formatado)).toEqual(new Set(cru));
  });

  it("nunca devolve variante com o 55 na frente — a coluna guarda o numero local", () => {
    for (const v of variantesLocaisDeTelefone("5511987654321")) {
      expect(v.startsWith("55")).toBe(false);
    }
  });

  it("nao duplica", () => {
    const v = variantesLocaisDeTelefone("5511987654321");
    expect(v.length).toBe(new Set(v).size);
  });

  it("descarta lixo curto demais para ser telefone", () => {
    expect(variantesLocaisDeTelefone("123")).toEqual([]);
    expect(variantesLocaisDeTelefone("")).toEqual([]);
  });

  it("num numero de 10 digitos, insere o nono — nunca remove um digito bom", () => {
    // "1187654321" tem 10 digitos: a operacao certa e' INSERIR o 9 depois do
    // DDD. Remover o 3o digito ("8") produziria um numero que nao existe.
    expect(variantesLocaisDeTelefone("1187654321")).not.toContain("117654321");
  });
});

// Telefone compartilhado e' real nesta base: 9 clientes em 4 numeros, um deles
// com 3 pessoas — funcionarios da mesma empresa que informaram o contato do RH.
describe("clienteIdentificavel", () => {
  it("identifica quando o telefone aponta para uma pessoa so", () => {
    expect(clienteIdentificavel([42])).toBe(42);
  });

  it("NAO identifica quando o telefone e compartilhado", () => {
    // Escolher um arbitrariamente faria a IA chamar quem escreveu pelo nome de
    // outra pessoa e listar as compras dela.
    expect(clienteIdentificavel([629, 630, 631])).toBeNull();
    expect(clienteIdentificavel([667, 805])).toBeNull();
  });

  it("nao identifica quando nao achou ninguem", () => {
    expect(clienteIdentificavel([])).toBeNull();
  });
});
