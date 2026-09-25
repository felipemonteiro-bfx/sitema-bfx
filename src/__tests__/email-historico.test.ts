import { beforeEach, describe, expect, it, vi } from "vitest";

const { netConnectMock, smtpWrites, dbMock, falharSmtp } = vi.hoisted(() => ({
  netConnectMock: vi.fn(),
  smtpWrites: [] as string[],
  dbMock: {
    config: { findFirst: vi.fn() },
    emailEnvio: { create: vi.fn() },
  },
  falharSmtp: { ativo: false },
}));

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/documento-service", () => ({ obterDocumentoPorVendaETipo: vi.fn() }));
vi.mock("@/lib/whatsapp", () => ({ enviarWhatsApp: vi.fn() }));
vi.mock("net", () => ({ connect: netConnectMock }));

function servidorSmtp() {
  netConnectMock.mockImplementation((_port: number, _host: string, onConnect: () => void) => {
    let onData: ((data: Buffer) => void) | undefined;
    const socket = {
      on(event: string, handler: (data: Buffer) => void) {
        if (event === "data") onData = handler;
        return socket;
      },
      write(data: string) {
        smtpWrites.push(data);
        const c = data.trim();
        const r = data.includes("\r\n.\r\n")
          ? falharSmtp.ativo ? "554 mensagem recusada" : "250 ok"
          : c === "EHLO bfx" ? "250 SMTP"
          : c === "AUTH LOGIN" ? "334 VXNlcm5hbWU6"
          : c === "dXNlcg==" ? "334 UGFzc3dvcmQ6"
          : c === "cGFzcw==" ? "235 ok"
          : c.startsWith("MAIL FROM:") || c.startsWith("RCPT TO:") ? "250 ok"
          : c === "DATA" ? "354 dados" : "221 tchau";
        queueMicrotask(() => onData?.(Buffer.from(r)));
      },
      destroy: vi.fn(),
    };
    queueMicrotask(() => onConnect());
    queueMicrotask(() => onData?.(Buffer.from("220 pronto")));
    return socket;
  });
}

const pdf = Buffer.from("%PDF-termo");

beforeEach(() => {
  vi.resetAllMocks();
  smtpWrites.length = 0;
  falharSmtp.ativo = false;
  servidorSmtp();
  dbMock.emailEnvio.create.mockResolvedValue({ id: 1 });
  process.env.SMTP_HOST = "smtp.test";
  process.env.SMTP_PORT = "25";
  process.env.SMTP_USER = "user";
  process.env.SMTP_PASS = "pass";
  process.env.SMTP_FROM = "bfx@test.com";
});

describe("sendEmail com registro — histórico de e-mails", () => {
  it("grava o envio com destinatários, corpo e o conteúdo dos anexos", async () => {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: "rh@empresa.test",
      cc: ["fin@prudent.test"],
      subject: "Termo assinado",
      html: "<p>oi</p>",
      attachments: [{ filename: "termo.pdf", contentType: "application/pdf", content: pdf }],
      registro: { tipo: "termo", empresaId: 7, vendaId: 42 },
    });

    expect(dbMock.emailEnvio.create).toHaveBeenCalledWith({
      data: {
        tipo: "termo",
        origem: "automatico",
        empresaId: 7,
        vendaId: 42,
        remetente: "bfx@test.com",
        para: "rh@empresa.test",
        cc: "fin@prudent.test",
        assunto: "Termo assinado",
        corpoHtml: "<p>oi</p>",
        status: "enviado",
        erro: null,
        anexos: {
          create: [{ nome: "termo.pdf", contentType: "application/pdf", tamanho: pdf.length, conteudo: new Uint8Array(pdf) }],
        },
      },
    });
  });

  it("grava a falha com o motivo e continua lançando o erro", async () => {
    falharSmtp.ativo = true;
    const { sendEmail } = await import("@/lib/email");

    await expect(
      sendEmail({ to: "rh@empresa.test", subject: "S", html: "<p>h</p>", registro: { tipo: "semanal", empresaId: 7, origem: "manual" } })
    ).rejects.toThrow(/554/);
    expect(dbMock.emailEnvio.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tipo: "semanal", origem: "manual", status: "falhou", erro: expect.stringContaining("554"), cc: null }),
    });
  });

  it("erro ao gravar o histórico não derruba o envio", async () => {
    dbMock.emailEnvio.create.mockRejectedValue(new Error("banco fora"));
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail({ to: "rh@empresa.test", subject: "S", html: "h", registro: { tipo: "mensal", empresaId: 7 } })).resolves.toBeUndefined();
  });

  it("sem registro não grava nada", async () => {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to: "rh@empresa.test", subject: "S", html: "h" });
    expect(dbMock.emailEnvio.create).not.toHaveBeenCalled();
  });
});
