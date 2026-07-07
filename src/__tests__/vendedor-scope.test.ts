import { describe, it, expect } from "vitest";
import { resolveVendedorScope } from "@/lib/vendedor-scope";

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
