import { beforeEach, describe, expect, it, vi } from "vitest";

const { tlsConnectMock, escritas } = vi.hoisted(() => ({
  tlsConnectMock: vi.fn(),
  escritas: [] as string[],
}));

vi.mock("tls", () => ({ connect: tlsConnectMock }));

function servidorImap(opcoes?: { recusarAppend?: boolean }) {
  tlsConnectMock.mockImplementation(() => {
    let onData: ((data: Buffer) => void) | undefined;
    const socket = {
      on(event: string, handler: (data: Buffer) => void) {
        if (event === "data") onData = handler;
        return socket;
      },
      write(data: string | Buffer) {
        const texto = typeof data === "string" ? data : data.toString("utf8");
        escritas.push(texto);
        const linha = texto.trim();
        let resposta = "";
        if (linha.startsWith("a001 LOGIN")) resposta = "a001 OK logado\r\n";
        else if (linha.startsWith("a002 APPEND")) resposta = "+ continue\r\n";
        else if (linha.startsWith("a003 LOGOUT")) resposta = "a003 OK tchau\r\n";
        else if (opcoes?.recusarAppend) resposta = "a002 NO recusado\r\n";
        else resposta = "a002 OK gravado\r\n";
        queueMicrotask(() => onData?.(Buffer.from(resposta)));
      },
      destroy: vi.fn(),
    };
    queueMicrotask(() => onData?.(Buffer.from("* OK IMAP\r\n")));
    return socket;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  escritas.length = 0;
  servidorImap();
});

describe("copia IMAP em Enviados", () => {
  it("coloca aspas no login quando a senha tem aspas ou barra", async () => {
    const { imapQuote } = await import("@/lib/email-enviados");
    expect(imapQuote('a"b\\c')).toBe('"a\\"b\\\\c"');
  });

  it("grava a mesma mensagem em INBOX.Sent, marcada como lida", async () => {
    const { gravarCopiaEnviados } = await import("@/lib/email-enviados");
    const mensagem = "From: vendas06@bfxshop.com.br\r\nTo: rh@empresa.test\r\n\r\nOi";

    await gravarCopiaEnviados({
      host: "mail.bfxshop.com.br",
      port: 993,
      user: "vendas06@bfxshop.com.br",
      pass: 'y"senha',
      mailbox: "INBOX.Sent",
      message: mensagem,
    });

    expect(tlsConnectMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: "mail.bfxshop.com.br", port: 993, servername: "mail.bfxshop.com.br" }),
    );
    const dialogo = escritas.join("");
    expect(dialogo).toContain('a001 LOGIN "vendas06@bfxshop.com.br" "y\\"senha"\r\n');
    expect(dialogo).toContain(`a002 APPEND "INBOX.Sent" (\\Seen) {${Buffer.byteLength(mensagem)}}\r\n`);
    expect(dialogo).toContain(mensagem + "\r\n");
    expect(dialogo).toContain("a003 LOGOUT\r\n");
  });

  it("rejeita quando o servidor recusa a cópia", async () => {
    servidorImap({ recusarAppend: true });
    const { gravarCopiaEnviados } = await import("@/lib/email-enviados");

    await expect(
      gravarCopiaEnviados({
        host: "mail.test",
        port: 993,
        user: "u",
        pass: "p",
        mailbox: "INBOX.Sent",
        message: "From: a@b\r\n\r\n",
      }),
    ).rejects.toThrow(/recusado|append/i);
  });
});
