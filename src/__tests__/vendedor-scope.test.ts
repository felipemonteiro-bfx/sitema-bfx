import { describe, it, expect } from "vitest";
import { resolveVendedorScope, whereVendasDoUsuario } from "@/lib/vendedor-scope";

describe("whereVendasDoUsuario — escopo pelo vínculo real (vendedorId), com perna legada por nome", () => {
  it("admin: sem restrição", () => {
    expect(whereVendasDoUsuario({ id: 1, role: "admin", nomeExibicao: "Admin", username: "admin" })).toEqual({});
  });

  it("vendedor: vendedorId próprio OU venda sem id cujo texto é o nome de exibição", () => {
    expect(whereVendasDoUsuario({ id: 7, role: "vendedor", nomeExibicao: "Maria", username: "maria" })).toEqual({
      OR: [{ vendedorId: 7 }, { vendedorId: null, vendedor: "Maria" }],
    });
  });

  it("vendedor sem nome de exibição: perna legada usa o username", () => {
    expect(whereVendasDoUsuario({ id: 7, role: "vendedor", nomeExibicao: null, username: "maria" })).toEqual({
      OR: [{ vendedorId: 7 }, { vendedorId: null, vendedor: "maria" }],
    });
  });
});

describe("resolveVendedorScope — evita IDOR em relatorios/consultas por vendedor", () => {
  it("vendedor: ignora o parametro e trava no proprio nome", () => {
    const r = resolveVendedorScope("Colega Alheio", { role: "vendedor", nomeExibicao: "Maria", username: "maria" });
    expect(r).toBe("Maria");
  });

  it("vendedor: sem parametro, ainda assim trava no proprio nome", () => {
    const r = resolveVendedorScope(undefined, { role: "vendedor", nomeExibicao: "Maria", username: "maria" });
    expect(r).toBe("Maria");
  });

  it("vendedor sem nomeExibicao: cai para username", () => {
    const r = resolveVendedorScope("Colega Alheio", { role: "vendedor", nomeExibicao: null, username: "joao" });
    expect(r).toBe("joao");
  });

  it("admin: mantem o parametro livre", () => {
    const r = resolveVendedorScope("Qualquer Um", { role: "admin", nomeExibicao: "Admin", username: "admin" });
    expect(r).toBe("Qualquer Um");
  });

  it("admin sem parametro: retorna undefined (sem restricao)", () => {
    const r = resolveVendedorScope(undefined, { role: "admin", nomeExibicao: "Admin", username: "admin" });
    expect(r).toBeUndefined();
  });

  it("sem sessao: retorna o parametro tal como veio — quem chama decide bloquear antes", () => {
    const r = resolveVendedorScope("Qualquer Um", null);
    expect(r).toBe("Qualquer Um");
  });
});
