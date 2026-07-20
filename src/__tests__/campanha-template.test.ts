import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/crm", () => ({ buildClienteSegmentWhere: vi.fn(() => ({})) }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsAppDetalhado: vi.fn() }));
vi.mock("@/lib/whatsapp-templates", () => ({ comFallback: vi.fn(), TEMPLATES: {} }));
vi.mock("@/lib/whatsapp-mensagem", () => ({ contarContatosUnicos24h: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logCron: vi.fn() }));

const { renderVariaveis, renderMensagem } = await import("@/lib/campanha-service");

describe("renderVariaveis", () => {
  it("substitui {nome} e {primeiroNome} em cada variável", () => {
    const json = JSON.stringify(["{primeiroNome}", "20% de desconto"]);
    expect(renderVariaveis(json, "João da Silva")).toEqual(["João", "20% de desconto"]);
  });

  it("devolve array vazio para json nulo", () => {
    expect(renderVariaveis(null, "João")).toEqual([]);
  });

  it("devolve array vazio para json inválido", () => {
    expect(renderVariaveis("{nao é json", "João")).toEqual([]);
  });

  it("devolve array vazio quando o json não é array", () => {
    expect(renderVariaveis(JSON.stringify({ a: 1 }), "João")).toEqual([]);
  });

  it("converte itens não-string em string", () => {
    expect(renderVariaveis(JSON.stringify([1, true]), "João")).toEqual(["1", "true"]);
  });
});

describe("renderMensagem", () => {
  it("continua substituindo {nome} e {primeiroNome}", () => {
    expect(renderMensagem("Oi {primeiroNome}, tudo bem {nome}?", "João da Silva")).toBe(
      "Oi João, tudo bem João da Silva?"
    );
  });
});
