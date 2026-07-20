import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  whatsAppMensagem: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  dentroDaJanela24h,
  registrarSaida,
  registrarEntrada,
  avancarStatusPorWaMessageId,
  contarContatosUnicos24h,
} = await import("@/lib/whatsapp-mensagem");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dentroDaJanela24h", () => {
  it("true quando há inbound nas últimas 24h", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 1 });
    expect(await dentroDaJanela24h("5592999999999")).toBe(true);
  });

  it("false quando não há inbound recente", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    expect(await dentroDaJanela24h("5592999999999")).toBe(false);
  });

  it("consulta apenas direcao=in e telefone normalizado", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    await dentroDaJanela24h("5592999999999");
    const where = prismaMock.whatsAppMensagem.findFirst.mock.calls[0]![0].where;
    expect(where.direcao).toBe("in");
    expect(where.telefone).toBe("5592999999999");
    expect(where.criadoEm.gte).toBeInstanceOf(Date);
  });
});

describe("registrarSaida", () => {
  it("cria a mensagem como pendente e devolve o id", async () => {
    prismaMock.whatsAppMensagem.create.mockResolvedValue({ id: 42 });
    const id = await registrarSaida({
      telefone: "5592999999999",
      clienteId: 7,
      origem: "cron",
      templateNome: "bfx_aniversario",
      corpo: "Parabéns, João!",
    });
    expect(id).toBe(42);
    const data = prismaMock.whatsAppMensagem.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      direcao: "out",
      status: "pendente",
      origem: "cron",
      templateNome: "bfx_aniversario",
    });
  });
});

describe("registrarEntrada", () => {
  it("grava o inbound novo e devolve true", async () => {
    prismaMock.whatsAppMensagem.findUnique.mockResolvedValue(null);
    prismaMock.whatsAppMensagem.create.mockResolvedValue({ id: 1 });
    const nova = await registrarEntrada({
      telefone: "5592999999999",
      waMessageId: "wamid.IN",
      corpo: "oi",
    });
    expect(nova).toBe(true);
    const data = prismaMock.whatsAppMensagem.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ direcao: "in", waMessageId: "wamid.IN" });
  });

  it("reentrega da Meta não duplica: devolve false e não cria", async () => {
    prismaMock.whatsAppMensagem.findUnique.mockResolvedValue({ id: 1 });
    const nova = await registrarEntrada({
      telefone: "5592999999999",
      waMessageId: "wamid.IN",
      corpo: "oi",
    });
    expect(nova).toBe(false);
    expect(prismaMock.whatsAppMensagem.create).not.toHaveBeenCalled();
  });
});

describe("avancarStatusPorWaMessageId", () => {
  it("avança de enviado para entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "enviado" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ status: "entregue" }) })
    );
  });

  it("não retrocede: lido não volta para entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "lido" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });

  it("falhou é terminal: não vira entregue", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "falhou" });
    await avancarStatusPorWaMessageId("wamid.A", "entregue");
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });

  it("falhou sempre pode ser aplicado sobre enviado", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue({ id: 5, status: "enviado" });
    await avancarStatusPorWaMessageId("wamid.A", "falhou", { codigo: 131047, msg: "fora da janela" });
    const data = prismaMock.whatsAppMensagem.update.mock.calls[0]![0].data;
    expect(data).toMatchObject({ status: "falhou", erroCodigo: 131047, erroMsg: "fora da janela" });
  });

  it("mensagem inexistente é ignorada sem erro", async () => {
    prismaMock.whatsAppMensagem.findFirst.mockResolvedValue(null);
    await expect(avancarStatusPorWaMessageId("wamid.X", "entregue")).resolves.toBeUndefined();
    expect(prismaMock.whatsAppMensagem.update).not.toHaveBeenCalled();
  });
});

describe("contarContatosUnicos24h", () => {
  it("conta telefones distintos com saída nas últimas 24h", async () => {
    prismaMock.whatsAppMensagem.findMany.mockResolvedValue([
      { telefone: "5592111111111" },
      { telefone: "5592111111111" },
      { telefone: "5592222222222" },
    ]);
    expect(await contarContatosUnicos24h()).toBe(2);
  });
});
