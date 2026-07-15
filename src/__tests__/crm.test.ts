import { describe, it, expect } from "vitest";
import {
  buildClienteSegmentWhere,
  isLead,
  estagioLabel,
  ESTAGIOS_CRM,
} from "@/lib/crm";

describe("estágios CRM", () => {
  it("isLead: true para estágios anteriores a cliente", () => {
    expect(isLead(ESTAGIOS_CRM.NOVO_LEAD)).toBe(true);
    expect(isLead(ESTAGIOS_CRM.NEGOCIANDO)).toBe(true);
    expect(isLead(ESTAGIOS_CRM.CLIENTE)).toBe(false);
    expect(isLead(ESTAGIOS_CRM.INATIVO)).toBe(false);
    expect(isLead(null)).toBe(false);
  });

  it("estagioLabel traduz para pt-BR", () => {
    expect(estagioLabel("novo_lead")).toBe("Novo lead");
    expect(estagioLabel("cliente")).toBe("Cliente");
    expect(estagioLabel(undefined)).toBe("—");
  });
});

describe("buildClienteSegmentWhere", () => {
  it("vazio: retorna where sem restrições", () => {
    expect(buildClienteSegmentWhere({})).toEqual({});
  });

  it("estágios viram filtro estagioCrm.in", () => {
    const w = buildClienteSegmentWhere({ estagios: [ESTAGIOS_CRM.NOVO_LEAD, ESTAGIOS_CRM.CONTATADO] });
    expect(w.estagioCrm).toEqual({ in: ["novo_lead", "contatado"] });
  });

  it("empresa e busca por nome", () => {
    const w = buildClienteSegmentWhere({ empresaParceiraId: 7, busca: "  João  " });
    expect(w.empresaParceiraId).toBe(7);
    expect(w.nome).toEqual({ contains: "João", mode: "insensitive" });
  });

  it("tags exigem TODAS (um some por tag no AND)", () => {
    const w = buildClienteSegmentWhere({ tagIds: [1, 2] });
    expect(w.AND).toEqual([{ tags: { some: { tagId: 1 } } }, { tags: { some: { tagId: 2 } } }]);
  });

  it("comprou=false filtra leads puros (nenhuma venda)", () => {
    const w = buildClienteSegmentWhere({ comprou: false });
    expect(w.AND).toEqual([{ vendas: { none: {} } }]);
  });

  it("comprou=true filtra quem tem venda", () => {
    const w = buildClienteSegmentWhere({ comprou: true });
    expect(w.AND).toEqual([{ vendas: { some: {} } }]);
  });

  it("inativoDias: tem histórico mas nenhuma venda após o corte", () => {
    const agora = new Date(2026, 6, 14); // 14/07/2026
    const w = buildClienteSegmentWhere({ inativoDias: 60, agora });
    // espera corte em 15/05/2026
    const corteEsperado = new Date(2026, 6, 14);
    corteEsperado.setDate(corteEsperado.getDate() - 60);
    expect(w.AND).toEqual([
      { vendas: { some: {} } },
      { vendas: { none: { dataVenda: { gte: corteEsperado } } } },
    ]);
  });

  it("pontosRange vira filtro pontos (nível de fidelidade)", () => {
    expect(buildClienteSegmentWhere({ pontosRange: { gte: 5000 } }).pontos).toEqual({ gte: 5000 });
    expect(buildClienteSegmentWhere({ pontosRange: { gte: 1000, lt: 5000 } }).pontos).toEqual({ gte: 1000, lt: 5000 });
    expect(buildClienteSegmentWhere({ pontosRange: {} }).pontos).toBeUndefined();
  });

  it("combina múltiplos critérios", () => {
    const w = buildClienteSegmentWhere({
      estagios: [ESTAGIOS_CRM.CLIENTE],
      empresaParceiraId: 3,
      tagIds: [5],
      comprou: true,
    });
    expect(w.estagioCrm).toEqual({ in: ["cliente"] });
    expect(w.empresaParceiraId).toBe(3);
    expect(w.AND).toEqual([{ tags: { some: { tagId: 5 } } }, { vendas: { some: {} } }]);
  });
});
