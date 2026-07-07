import { describe, it, expect } from "vitest";
import { buildComissoesWhere } from "@/lib/comissoes-utils";

describe("buildComissoesWhere — escopo por sessao (IDOR)", () => {
  it("vendedor: ignora ?vendedor= de outra pessoa e forca o proprio nome", () => {
    const params = new URLSearchParams({ vendedor: "Colega Alheio" });
    const where = buildComissoesWhere(params, { role: "vendedor", nomeExibicao: "Maria", username: "maria" });
    expect(where.vendedor).toBe("Maria");
  });

  it("vendedor: sem query param, ainda assim fica restrito ao proprio nome", () => {
    const params = new URLSearchParams();
    const where = buildComissoesWhere(params, { role: "vendedor", nomeExibicao: "Maria", username: "maria" });
    expect(where.vendedor).toBe("Maria");
  });

  it("vendedor sem nomeExibicao: cai para username", () => {
    const params = new URLSearchParams({ vendedor: "Colega Alheio" });
    const where = buildComissoesWhere(params, { role: "vendedor", nomeExibicao: null, username: "joao" });
    expect(where.vendedor).toBe("joao");
  });

  it("admin: mantem o filtro livre por vendedor via query param", () => {
    const params = new URLSearchParams({ vendedor: "Qualquer Um" });
    const where = buildComissoesWhere(params, { role: "admin", nomeExibicao: "Admin", username: "admin" });
    expect(where.vendedor).toBe("Qualquer Um");
  });

  it("admin sem filtro: nao restringe por vendedor", () => {
    const params = new URLSearchParams();
    const where = buildComissoesWhere(params, { role: "admin", nomeExibicao: "Admin", username: "admin" });
    expect(where.vendedor).toBeUndefined();
  });

  it("sem sessao (chamada direta): nao restringe automaticamente — quem chama decide bloquear", () => {
    const params = new URLSearchParams({ vendedor: "Qualquer Um" });
    const where = buildComissoesWhere(params, null);
    expect(where.vendedor).toBe("Qualquer Um");
  });

  it("mantem filtro de status e datas existente", () => {
    const params = new URLSearchParams({ dataInicio: "2026-01-01", dataFim: "2026-01-31" });
    const where = buildComissoesWhere(params, { role: "admin", nomeExibicao: "Admin", username: "admin" });
    expect(where.status).toEqual({ not: { in: ["cancelada", "estornada"] } });
    expect(where.dataVenda).toBeDefined();
  });
});
