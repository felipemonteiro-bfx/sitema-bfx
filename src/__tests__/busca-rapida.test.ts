import { describe, it, expect } from "vitest";
import { interpretarConsulta } from "@/lib/busca-rapida";

const VENDEDORES = ["Ana Paula", "João Silva", "Carlos"];

describe("interpretarConsulta — id de venda", () => {
  it("#258 vira idVenda", () => {
    expect(interpretarConsulta("#258", VENDEDORES).idVenda).toBe(258);
  });
  it("258 sozinho vira idVenda", () => {
    expect(interpretarConsulta("  258 ", VENDEDORES).idVenda).toBe(258);
  });
  it("numero no meio de uma frase nao e id", () => {
    expect(interpretarConsulta("maria 258", VENDEDORES).idVenda).toBeUndefined();
  });
});

describe("interpretarConsulta — vendedor, status e forma", () => {
  it("reconhece vendedor sem acento e sem caixa", () => {
    const r = interpretarConsulta("vendas do JOAO SILVA", VENDEDORES);
    expect(r.vendedor).toBe("João Silva");
    expect(r.termo).toBe("");
  });
  it("reconhece 'pendentes' e 'aguardando assinatura'", () => {
    expect(interpretarConsulta("pendentes", VENDEDORES).assinatura).toBe("pendente");
    expect(interpretarConsulta("aguardando assinatura", VENDEDORES).assinatura).toBe("pendente");
  });
  it("reconhece 'assinadas'", () => {
    expect(interpretarConsulta("assinadas", VENDEDORES).assinatura).toBe("assinado");
  });
  it("reconhece 'desconto em folha' e 'folha'", () => {
    expect(interpretarConsulta("desconto em folha", VENDEDORES).forma).toBe("DESCONTO_FOLHA");
    expect(interpretarConsulta("folha", VENDEDORES).forma).toBe("DESCONTO_FOLHA");
  });
  it("monta urlHistorico com os parametros do /historico", () => {
    const r = interpretarConsulta("pendentes da ana paula desconto em folha", VENDEDORES);
    const url = new URL(r.urlHistorico ?? "", "http://x");
    expect(url.pathname).toBe("/historico");
    expect(url.searchParams.get("vendedor")).toBe("Ana Paula");
    expect(url.searchParams.get("assinatura")).toBe("pendente");
    expect(url.searchParams.get("formaPagamento")).toBe("DESCONTO_FOLHA");
  });
  it("texto livre sem filtro nao gera urlHistorico", () => {
    const r = interpretarConsulta("maria souza", VENDEDORES);
    expect(r.urlHistorico).toBeUndefined();
    expect(r.termo).toBe("maria souza");
  });
});

describe("interpretarConsulta — escopo de vendedor (nao-admin)", () => {
  it("citar outro vendedor e ignorado: a sugestao fica no proprio", () => {
    const r = interpretarConsulta("pendentes do joao silva", VENDEDORES, "Carlos");
    expect(r.vendedor).toBe("Carlos");
    expect(r.urlHistorico).toContain("vendedor=Carlos");
    expect(r.urlHistorico).not.toContain("Jo");
    expect(r.termo).toBe("");
  });
  it("sem filtro reconhecido nao inventa sugestao", () => {
    const r = interpretarConsulta("maria", VENDEDORES, "Carlos");
    expect(r.vendedor).toBeUndefined();
    expect(r.urlHistorico).toBeUndefined();
  });
});
