import { beforeEach, describe, expect, it, vi } from "vitest";
import { precisaLinkContrato, whereNovoLinkContrato } from "@/lib/link-contrato";

const dbMock = {
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(dbMock)),
  venda: { updateMany: vi.fn(), findUnique: vi.fn() },
  assinatura: { findUnique: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const { garantirLinksContrato } = await import("@/lib/link-contrato-db");

const folha = {
  id: 7,
  formaPagamento: "DESCONTO_FOLHA",
  descontoEmFolha: true,
  assinaturaToken: null,
  status: "ativa",
  assinatura: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.venda.updateMany.mockResolvedValue({ count: 1 });
  dbMock.assinatura.findUnique.mockResolvedValue(null);
  dbMock.assinatura.create.mockResolvedValue({});
});

describe("precisaLinkContrato", () => {
  it("folha sem token precisa do link", () => {
    expect(precisaLinkContrato(folha)).toBe(true);
  });

  it("folha antiga sem forma canônica também precisa", () => {
    expect(precisaLinkContrato({ ...folha, formaPagamento: null, descontoEmFolha: true })).toBe(true);
  });

  it("quem já tem token, já assinou, não é folha ou foi cancelada não ganha outro link", () => {
    expect(precisaLinkContrato({ ...folha, assinaturaToken: "abc" })).toBe(false);
    expect(precisaLinkContrato({ ...folha, assinatura: { assinaturaStatus: "assinado" } })).toBe(false);
    expect(precisaLinkContrato({ ...folha, formaPagamento: "PIX", descontoEmFolha: false })).toBe(false);
    expect(precisaLinkContrato({ ...folha, status: "cancelada" })).toBe(false);
    expect(precisaLinkContrato({ ...folha, status: "estornada" })).toBe(false);
  });
});

describe("garantirLinksContrato", () => {
  it("grava um token novo e a assinatura pendente só na folha sem link", async () => {
    const tokens = await garantirLinksContrato([
      folha,
      { ...folha, id: 8, formaPagamento: "PIX", descontoEmFolha: false },
      { ...folha, id: 9, assinaturaToken: "ja-existe" },
    ]);

    expect(dbMock.venda.updateMany).toHaveBeenCalledTimes(1);
    expect(dbMock.venda.updateMany).toHaveBeenCalledWith({
      where: whereNovoLinkContrato(7),
      data: { assinaturaToken: expect.stringMatching(/^[0-9a-f-]{36}$/i) },
    });
    expect(dbMock.assinatura.create).toHaveBeenCalledWith({
      data: { vendaId: 7, assinaturaStatus: "pendente" },
    });
    expect(dbMock.assinatura.create).toHaveBeenCalledWith({
      data: { vendaId: 9, assinaturaStatus: "pendente" },
    });
    expect(tokens.get(7)).toMatch(/^[0-9a-f-]{36}$/i);
    expect(tokens.get(9)).toBe("ja-existe");
    expect(tokens.has(8)).toBe(false);
  });

  it("o update recusa venda que saiu de folha, foi cancelada ou já assinada", () => {
    expect(whereNovoLinkContrato(7)).toMatchObject({
      id: 7,
      assinaturaToken: null,
      status: { notIn: ["cancelada", "estornada"] },
      NOT: { assinatura: { is: { assinaturaStatus: "assinado" } } },
    });
    expect(whereNovoLinkContrato(7).OR).toEqual([
      { formaPagamento: "DESCONTO_FOLHA" },
      { descontoEmFolha: true, OR: [{ formaPagamento: null }, { formaPagamento: "" }] },
    ]);
  });

  it("não cria outra assinatura se a pendente já existe", async () => {
    dbMock.assinatura.findUnique.mockResolvedValue({ id: 1, assinaturaStatus: "pendente" });
    await garantirLinksContrato([folha]);
    expect(dbMock.assinatura.create).not.toHaveBeenCalled();
  });

  it("se o token foi gravado por outra requisição, reaproveita e cria a pendente que faltou", async () => {
    dbMock.venda.updateMany.mockResolvedValue({ count: 0 });
    dbMock.venda.findUnique.mockResolvedValue({
      assinaturaToken: "token-da-corrida",
      status: "ativa",
      formaPagamento: "DESCONTO_FOLHA",
      descontoEmFolha: true,
      assinatura: null,
    });
    const tokens = await garantirLinksContrato([folha]);
    expect(tokens.get(7)).toBe("token-da-corrida");
    expect(dbMock.assinatura.create).toHaveBeenCalledWith({
      data: { vendaId: 7, assinaturaStatus: "pendente" },
    });
  });

  it("se a venda deixou de ser elegível, não publica token novo nem cria assinatura", async () => {
    dbMock.venda.updateMany.mockResolvedValue({ count: 0 });
    dbMock.venda.findUnique.mockResolvedValue({
      assinaturaToken: null,
      status: "cancelada",
      formaPagamento: "PIX",
      descontoEmFolha: false,
      assinatura: null,
    });
    const tokens = await garantirLinksContrato([folha]);
    expect(tokens.has(7)).toBe(false);
    expect(dbMock.assinatura.create).not.toHaveBeenCalled();
  });

  it("conflito único na assinatura não desfaz o token", async () => {
    dbMock.assinatura.create.mockRejectedValue({ code: "P2002" });
    const tokens = await garantirLinksContrato([folha]);
    expect(tokens.get(7)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("erro que não é conflito único sobe", async () => {
    dbMock.assinatura.create.mockRejectedValue(new Error("banco fora"));
    await expect(garantirLinksContrato([folha])).rejects.toThrow("banco fora");
  });
});
