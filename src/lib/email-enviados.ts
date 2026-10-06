/**
 * Copia da mensagem enviada na pasta Enviados da conta SMTP (IMAP APPEND).
 * O webmail só mostra o que está nessa pasta. O SMTP sozinho não grava lá.
 */
import * as tls from "tls";

export type CopiaEnviados = {
  host: string;
  port: number;
  user: string;
  pass: string;
  mailbox: string;
  message: string;
};

/** Aspas IMAP: barra e aspas da senha não quebram o LOGIN. */
export function imapQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Grava `message` (o mesmo MIME do SMTP) em `mailbox`, marcada como lida.
 * Falha de login ou de APPEND rejeita. Quem envia decide se isso derruba o e-mail.
 */
export function gravarCopiaEnviados(opts: CopiaEnviados): Promise<void> {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host: opts.host, port: opts.port, servername: opts.host });
    let buf = "";
    let etapa: "greeting" | "login" | "append-go" | "append-ok" | "logout" = "greeting";
    let settled = false;

    const finish = (erro?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sock.destroy();
      if (erro) reject(erro);
      else resolve();
    };

    const timer = setTimeout(() => finish(new Error("IMAP timeout ao gravar Enviados")), 20000);

    const enviar = (linha: string) => {
      sock.write(linha + "\r\n");
    };

    const processar = (linha: string) => {
      if (etapa === "greeting") {
        if (linha.startsWith("* OK") || linha.startsWith("* PREAUTH")) {
          etapa = "login";
          enviar(`a001 LOGIN ${imapQuote(opts.user)} ${imapQuote(opts.pass)}`);
        } else if (!linha.startsWith("*")) {
          finish(new Error("IMAP greeting failed"));
        }
        return;
      }
      if (linha.startsWith("*")) return;

      if (etapa === "login") {
        if (linha.startsWith("a001 OK")) {
          etapa = "append-go";
          const bytes = Buffer.byteLength(opts.message, "utf8");
          enviar(`a002 APPEND ${imapQuote(opts.mailbox)} (\\Seen) {${bytes}}`);
        } else if (linha.startsWith("a001 ")) {
          finish(new Error("IMAP login failed"));
        }
        return;
      }

      if (etapa === "append-go") {
        if (linha.startsWith("+")) {
          etapa = "append-ok";
          sock.write(opts.message + "\r\n");
        } else if (linha.startsWith("a002 ")) {
          finish(new Error("IMAP append recusado"));
        }
        return;
      }

      if (etapa === "append-ok") {
        if (linha.startsWith("a002 OK")) {
          etapa = "logout";
          enviar("a003 LOGOUT");
        } else if (linha.startsWith("a002 ")) {
          finish(new Error(`IMAP append failed: ${linha.slice(0, 180)}`));
        }
        return;
      }

      if (etapa === "logout" && linha.startsWith("a003 OK")) {
        finish();
      }
    };

    sock.on("error", (error) => finish(error instanceof Error ? error : new Error("IMAP error")));
    sock.on("data", (chunk: Buffer) => {
      buf += chunk.toString("utf8");
      let corte = buf.indexOf("\r\n");
      while (corte >= 0) {
        const linha = buf.slice(0, corte);
        buf = buf.slice(corte + 2);
        processar(linha);
        corte = buf.indexOf("\r\n");
      }
    });
  });
}
