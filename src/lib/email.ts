/**
 * Email sending infrastructure using Node's native net/tls modules (SMTP).
 * nodemailer is not installed — we implement a minimal SMTP client.
 *
 * Config source priority:
 * 1. Environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
 * 2. Config table in database (smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom)
 */
import * as net from "net";
import * as tls from "tls";
import { prisma } from "@/lib/db";
import { produtosTexto, valorTotalVenda } from "@/lib/venda-utils";
import { formatBRL, formatDateBR } from "@/lib/utils";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean; // true = TLS from start (port 465); false = STARTTLS or plain (587/25)
};

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
};

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  // 1. Try env vars first
  const envHost = process.env.SMTP_HOST;
  const envPort = process.env.SMTP_PORT;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envFrom = process.env.SMTP_FROM;

  if (envHost && envUser && envPass) {
    const port = Number(envPort || 587);
    return {
      host: envHost,
      port,
      user: envUser,
      pass: envPass,
      from: envFrom || envUser,
      secure: port === 465,
    };
  }

  // 2. Try database config
  try {
    const cfg = await prisma.config.findFirst();
    if (cfg && (cfg as Record<string, unknown>).smtpHost && (cfg as Record<string, unknown>).smtpUser) {
      const host = String((cfg as Record<string, unknown>).smtpHost || "");
      const port = Number((cfg as Record<string, unknown>).smtpPort || 587);
      const user = String((cfg as Record<string, unknown>).smtpUser || "");
      const pass = String((cfg as Record<string, unknown>).smtpPass || "");
      const from = String((cfg as Record<string, unknown>).smtpFrom || user);
      if (host && user && pass) {
        return { host, port, user, pass, from, secure: port === 465 };
      }
    }
  } catch {
    // DB not available
  }

  return null;
}

/**
 * Encodes a string to base64 for SMTP AUTH PLAIN / LOGIN.
 */
function toBase64(str: string): string {
  return Buffer.from(str).toString("base64");
}

/**
 * Sends an email via raw SMTP (supports STARTTLS on port 587 or TLS on port 465).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const cfg = await getSmtpConfig();
  if (!cfg) {
    console.warn("[email] SMTP not configured — skipping email send.");
    return;
  }

  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  const ccList = opts.cc || [];
  const allRecipients = [...toList, ...ccList];

  if (allRecipients.length === 0) return;

  // Build MIME message
  const boundary = `bfx_${Date.now()}`;
  const toHeader = toList.join(", ");
  const ccHeader = ccList.length ? `Cc: ${ccList.join(", ")}\r\n` : "";
  const dateHeader = new Date().toUTCString();
  const message = [
    `From: ${cfg.from}`,
    `To: ${toHeader}`,
    ccHeader.trim() ? ccHeader.trim() : null,
    `Subject: =?UTF-8?B?${toBase64(opts.subject)}?=`,
    `Date: ${dateHeader}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    toBase64(opts.html),
    ``,
    `--${boundary}--`,
  ]
    .filter((l) => l !== null)
    .join("\r\n");

  await smtpSend(cfg, allRecipients, message);
}

/**
 * Low-level SMTP send via net/tls.
 */
function smtpSend(cfg: SmtpConfig, recipients: string[], rawMessage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];

    const send = (sock: net.Socket | tls.TLSSocket, data: string) => {
      sock.write(data + "\r\n");
    };

    let sock: net.Socket | tls.TLSSocket;
    let tlsUpgraded = false;
    let step = 0;

    const handleData = (data: Buffer, activeSock: net.Socket | tls.TLSSocket) => {
      const response = data.toString();
      lines.push(response.trim());
      const code = parseInt(response.slice(0, 3), 10);

      if (step === 0) {
        // Received server greeting
        if (code === 220) {
          step = 1;
          send(activeSock, `EHLO bfx`);
        } else {
          reject(new Error(`SMTP greeting failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 1) {
        // EHLO response
        if (code === 250) {
          if (!cfg.secure && !tlsUpgraded && response.includes("STARTTLS")) {
            step = 2;
            send(activeSock, "STARTTLS");
          } else {
            step = 3;
            send(activeSock, `AUTH LOGIN`);
          }
        } else {
          reject(new Error(`SMTP EHLO failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 2) {
        // STARTTLS response
        if (code === 220) {
          tlsUpgraded = true;
          const tlsSock = tls.connect({ socket: activeSock as net.Socket, servername: cfg.host }, () => {
            step = 1;
            send(tlsSock, `EHLO bfx`);
          });
          tlsSock.on("data", (d: Buffer) => handleData(d, tlsSock));
          tlsSock.on("error", reject);
          sock = tlsSock;
        } else {
          // STARTTLS not available, proceed without
          step = 3;
          send(activeSock, `AUTH LOGIN`);
        }
      } else if (step === 3) {
        // AUTH LOGIN prompt
        if (code === 334) {
          step = 4;
          send(activeSock, toBase64(cfg.user));
        } else if (code === 235) {
          // Already authenticated (AUTH PLAIN)
          step = 5;
          send(activeSock, `MAIL FROM:<${cfg.from}>`);
        } else {
          reject(new Error(`SMTP AUTH failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 4) {
        // Username sent, await password prompt
        if (code === 334) {
          step = 5;
          send(activeSock, toBase64(cfg.pass));
        } else {
          reject(new Error(`SMTP AUTH username failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 5) {
        // Password sent, await auth ok or MAIL FROM
        if (code === 235 || code === 334) {
          // If 334, password was accepted but may need MAIL FROM
          if (code === 235) {
            step = 6;
            send(activeSock, `MAIL FROM:<${cfg.from}>`);
          } else {
            // Got 334 again — send pass
            send(activeSock, toBase64(cfg.pass));
          }
        } else {
          reject(new Error(`SMTP AUTH pass failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 6) {
        // MAIL FROM response
        if (code === 250) {
          step = 7;
          // Send first RCPT TO
          send(activeSock, `RCPT TO:<${recipients[0]}>`);
        } else {
          reject(new Error(`SMTP MAIL FROM failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 7) {
        // RCPT TO responses
        if (code === 250 || code === 251) {
          const nextRecipientIndex = lines.filter((l) => l.startsWith("250") || l.startsWith("251")).length;
          if (nextRecipientIndex < recipients.length) {
            send(activeSock, `RCPT TO:<${recipients[nextRecipientIndex]}>`);
          } else {
            step = 8;
            send(activeSock, "DATA");
          }
        } else {
          // Non-fatal: skip bad recipient, continue
          step = 8;
          send(activeSock, "DATA");
        }
      } else if (step === 8) {
        // DATA response
        if (code === 354) {
          step = 9;
          activeSock.write(rawMessage + "\r\n.\r\n");
        } else {
          reject(new Error(`SMTP DATA failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 9) {
        // Message sent
        if (code === 250) {
          step = 10;
          send(activeSock, "QUIT");
        } else {
          reject(new Error(`SMTP message send failed: ${response}`));
          activeSock.destroy();
        }
      } else if (step === 10) {
        // QUIT response
        activeSock.destroy();
        resolve();
      }
    };

    if (cfg.secure) {
      // TLS from start (port 465)
      const tlsSock = tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host }, () => {
        // wait for greeting
      });
      tlsSock.on("data", (d: Buffer) => handleData(d, tlsSock));
      tlsSock.on("error", reject);
      sock = tlsSock;
    } else {
      // Plain TCP, STARTTLS upgrade later
      const plainSock = net.connect(cfg.port, cfg.host, () => {
        // wait for greeting
      });
      plainSock.on("data", (d: Buffer) => handleData(d, plainSock));
      plainSock.on("error", reject);
      sock = plainSock;
    }

    // Timeout safety
    setTimeout(() => {
      reject(new Error("SMTP timeout after 30s"));
      sock.destroy();
    }, 30000);
  });
}

type VendaForEmail = {
  id: number;
  dataVenda: Date;
  vendedor?: string | null;
  parcelas?: number | null;
  itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
  cliente?: {
    nome?: string | null;
    matricula?: string | null;
    empresa?: string | null;
  } | null;
};

/**
 * Sends a notification email to the partner company when a sale is created.
 */
export async function sendVendaNotification(venda: VendaForEmail): Promise<void> {
  if (!venda.cliente?.empresa) return;

  // Find the partner company (case-insensitive)
  const empresa = await prisma.empresaParceira.findFirst({
    where: {
      nome: { equals: venda.cliente.empresa, mode: "insensitive" },
    },
  });

  if (!empresa?.emailRh) return;

  const toEmails: string[] = [empresa.emailRh];
  if (empresa.emailsExtras) {
    const extras = empresa.emailsExtras.split(",").map((e) => e.trim()).filter(Boolean);
    toEmails.push(...extras);
  }

  const totalValor = valorTotalVenda(venda);
  const produtosStr = produtosTexto(venda);
  const dataStr = formatDateBR(venda.dataVenda);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #222; background: #f7f8fa; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 24px; max-width: 560px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
  h2 { color: #122050; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #122050; color: #fff; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .total { font-weight: bold; font-size: 1.1em; color: #122050; }
</style></head>
<body>
<div class="card">
  <h2>Nova Venda Registrada</h2>
  <p>Uma nova venda foi registrada para um colaborador da <strong>${empresa.nome}</strong>.</p>
  <table>
    <tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Cliente</td><td>${venda.cliente?.nome || "N/D"}</td></tr>
    <tr><td>Matricula</td><td>${venda.cliente?.matricula || "N/D"}</td></tr>
    <tr><td>Produto(s)</td><td>${produtosStr}</td></tr>
    <tr><td>Vendedor</td><td>${venda.vendedor || "N/D"}</td></tr>
    <tr><td>Data</td><td>${dataStr}</td></tr>
    <tr><td>Parcelas</td><td>${venda.parcelas || 1}x</td></tr>
    <tr><td class="total">Valor Total</td><td class="total">${formatBRL(totalValor)}</td></tr>
  </table>
  <p style="margin-top:16px;font-size:0.85em;color:#888;">Este email foi enviado automaticamente pelo sistema BFX.</p>
</div>
</body>
</html>`;

  await sendEmail({
    to: toEmails,
    subject: `Nova venda — ${venda.cliente?.nome || "cliente"} (${empresa.nome})`,
    html,
  });
}

type VendaRelatorio = {
  id: number;
  dataVenda: Date;
  vendedor?: string | null;
  parcelas?: number | null;
  itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
  valorVenda?: number | null;
  quantidade?: number | null;
  valorFrete?: number | null;
  desconto?: number | null;
  cliente?: {
    nome?: string | null;
    matricula?: string | null;
    empresa?: string | null;
  } | null;
};

/**
 * Generates and sends the weekly sales report for a given company.
 */
export async function sendWeeklyReport(
  empresaNome: string,
  vendas: VendaRelatorio[],
  emailsTo: string[],
  adminEmail?: string
): Promise<void> {
  if (emailsTo.length === 0) return;

  const rows = vendas.map((v) => {
    const total = valorTotalVenda(v);
    const produtos = produtosTexto(v);
    const data = formatDateBR(v.dataVenda);
    const matricula = v.cliente?.matricula || "—";
    const nome = v.cliente?.nome || "N/D";
    const vendedor = v.vendedor || "N/D";
    const parcelas = v.parcelas || 1;
    return `
    <tr>
      <td>${matricula}</td>
      <td>${nome}</td>
      <td>${produtos}</td>
      <td>${vendedor}</td>
      <td>${data}</td>
      <td>${formatBRL(total)}</td>
      <td>${parcelas}x</td>
    </tr>`;
  }).join("\n");

  const totalGeral = vendas.reduce((s, v) => s + valorTotalVenda(v), 0);
  const semanaLabel = (() => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    return `${formatDateBR(inicio)} a ${formatDateBR(fim)}`;
  })();

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; color: #222; background: #f7f8fa; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 24px; max-width: 800px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
  h2 { color: #122050; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #122050; color: #fff; padding: 8px 10px; text-align: left; font-size: 0.9em; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 0.9em; }
  tr:nth-child(even) td { background: #f5f7fa; }
  .total-row td { font-weight: bold; color: #122050; border-top: 2px solid #122050; }
</style></head>
<body>
<div class="card">
  <h2>Relatorio Semanal de Vendas — ${empresaNome}</h2>
  <p>Periodo: <strong>${semanaLabel}</strong> &nbsp;|&nbsp; Total de vendas: <strong>${vendas.length}</strong></p>
  <table>
    <thead>
      <tr>
        <th>Matricula</th>
        <th>Nome</th>
        <th>Produtos</th>
        <th>Vendedor</th>
        <th>Data</th>
        <th>Valor</th>
        <th>Parcelas</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7" style="text-align:center;color:#888;">Nenhuma venda no periodo.</td></tr>'}
      <tr class="total-row">
        <td colspan="5">TOTAL DO PERIODO</td>
        <td>${formatBRL(totalGeral)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <p style="margin-top:16px;font-size:0.85em;color:#888;">Este email foi enviado automaticamente pelo sistema BFX.</p>
</div>
</body>
</html>`;

  const cc = adminEmail ? [adminEmail] : [];

  await sendEmail({
    to: emailsTo,
    subject: `Relatorio Semanal de Vendas — ${empresaNome} (${semanaLabel})`,
    html,
    cc,
  });
}
