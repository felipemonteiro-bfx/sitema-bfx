import { beforeEach, describe, expect, it, vi } from "vitest";

const { netConnectMock, smtpWrites } = vi.hoisted(() => ({
  netConnectMock: vi.fn(),
  smtpWrites: [] as string[],
}));

const dbMock = {
  venda: { findUnique: vi.fn(), update: vi.fn() },
  empresaParceira: { findUnique: vi.fn(), findFirst: vi.fn() },
  config: { findFirst: vi.fn() },
};

const documentoMock = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/documento-service", () => ({ obterDocumentoPorVendaETipo: documentoMock }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsApp: vi.fn() }));
vi.mock("net", () => ({ connect: netConnectMock }));

describe("enviarTermoAssinadoAoRh", () => {
  const vendaId = 42;
  const pdf = Buffer.from("%PDF-signed");
  const venda = {
    id: vendaId,
    dataVenda: new Date("2026-09-22T12:00:00.000Z"),
    vendedor: "Vendedor",
    valorVenda: 123.45,
    quantidade: 1,
    valorFrete: 0,
    desconto: 0,
    parcelas: 3,
    cliente: {
      nome: "Cliente <Teste>",
      matricula: "MAT-42",
      empresa: "Empresa legada",
      empresaParceiraId: 7,
    },
    itens: [{ produtoNome: "Produto & teste", quantidade: 1, subtotal: 123.45 }],
  };
  const empresa = {
    id: 7,
    nome: "Empresa <Parceira>",
    emailRh: "rh@empresa.test",
    emailsExtras: "extra@empresa.test",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    dbMock.venda.findUnique.mockResolvedValue(venda);
    dbMock.venda.update.mockResolvedValue(venda);
    dbMock.empresaParceira.findUnique.mockResolvedValue(empresa);
    dbMock.empresaParceira.findFirst.mockResolvedValue(empresa);
    documentoMock.mockResolvedValue({ buffer: pdf, mimeType: "application/pdf" });
    smtpWrites.length = 0;
    netConnectMock.mockImplementation((_port: number, _host: string, onConnect: () => void) => {
      let onData: ((data: Buffer) => void) | undefined;
      const socket = {
        on(event: string, handler: (data: Buffer) => void) {
          if (event === "data") onData = handler;
          return socket;
        },
        write(data: string) {
          smtpWrites.push(data);
          const command = data.trim();
          const response = data.includes("\r\n.\r\n")
            ? "250 mensagem aceita"
            : command === "EHLO bfx"
              ? "250 SMTP"
              : command === "AUTH LOGIN"
                ? "334 VXNlcm5hbWU6"
                : command === "dXNlcg=="
                  ? "334 UGFzc3dvcmQ6"
                  : command === "cGFzcw=="
                    ? "235 autenticado"
                    : command.startsWith("MAIL FROM:")
                      ? "250 remetente"
                      : command.startsWith("RCPT TO:")
                        ? "250 destinatario"
                        : command === "DATA"
                          ? "354 dados"
                          : "221 encerrado";
          queueMicrotask(() => onData?.(Buffer.from(response)));
        },
        destroy: vi.fn(),
      };
      queueMicrotask(() => onConnect());
      queueMicrotask(() => onData?.(Buffer.from("220 pronto")));
      return socket;
    });
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "25";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_FROM = "bfx@test";
  });

  it("envia somente para emailRh e anexa o documento assinado", async () => {
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");
    const resultado = await enviarTermoAssinadoAoRh(vendaId);

    expect(resultado).toEqual({ status: "enviado" });
    expect(dbMock.empresaParceira.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(documentoMock).toHaveBeenCalledWith(vendaId);
    expect(smtpWrites.some((write) => write.includes("RCPT TO:<rh@empresa.test>"))).toBe(true);
    expect(smtpWrites.some((write) => write.includes(`termo-assinado-${vendaId}.pdf`))).toBe(true);
    expect(smtpWrites.some((write) => write.includes(pdf.toString("base64")))).toBe(true);
    expect(smtpWrites.some((write) => write.includes("extra@empresa.test"))).toBe(false);
    expect(dbMock.venda.update).toHaveBeenCalledWith({
      where: { id: vendaId },
      data: expect.objectContaining({
        termoEmailStatus: "enviado",
        termoEmailEnviadoEm: expect.any(Date),
        termoEmailErro: null,
      }),
    });
  });

  it("não usa emailsExtras nem WhatsApp", async () => {
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");
    await enviarTermoAssinadoAoRh(vendaId);

    expect(dbMock.empresaParceira.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(dbMock.empresaParceira.findUnique.mock.calls[0][0]).not.toHaveProperty("emailsExtras");
  });

  it("marca sem_email quando emailRh não existe", async () => {
    dbMock.empresaParceira.findUnique.mockResolvedValue({ ...empresa, emailRh: "   " });
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");

    await expect(enviarTermoAssinadoAoRh(vendaId)).resolves.toEqual({ status: "sem_email" });
    expect(dbMock.venda.update).toHaveBeenCalledWith({
      where: { id: vendaId },
      data: expect.objectContaining({ termoEmailStatus: "sem_email" }),
    });
  });

  it("marca falhou e preserva a assinatura quando SMTP lança erro", async () => {
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "25";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    netConnectMock.mockImplementation(() => {
      throw new Error("SMTP indisponível\nsegredo-interno");
    });
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");

    await expect(enviarTermoAssinadoAoRh(vendaId)).resolves.toEqual({
      status: "falhou",
      error: "SMTP indisponível segredo-interno",
    });
    expect(dbMock.venda.update).toHaveBeenCalledWith({
      where: { id: vendaId },
      data: expect.objectContaining({
        termoEmailStatus: "falhou",
        termoEmailErro: "SMTP indisponível segredo-interno",
      }),
    });
    expect(dbMock.venda.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty("assinaturaToken");
  });

  it("marca erro_dados quando o documento assinado não existe", async () => {
    documentoMock.mockResolvedValue(null);
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");

    await expect(enviarTermoAssinadoAoRh(vendaId)).resolves.toEqual({ status: "erro_dados" });
    expect(dbMock.venda.update).toHaveBeenCalledWith({
      where: { id: vendaId },
      data: expect.objectContaining({ termoEmailStatus: "erro_dados" }),
    });
  });

  it("usa o nome da empresa somente como fallback quando a FK não existe", async () => {
    dbMock.venda.findUnique.mockResolvedValue({ ...venda, cliente: { ...venda.cliente, empresaParceiraId: null } });
    const { enviarTermoAssinadoAoRh } = await import("@/lib/email");

    await enviarTermoAssinadoAoRh(vendaId);

    expect(dbMock.empresaParceira.findFirst).toHaveBeenCalledWith({
      where: { nome: { equals: "Empresa legada", mode: "insensitive" } },
    });
  });
});
