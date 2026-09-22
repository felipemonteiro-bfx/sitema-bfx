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
import { enviarWhatsApp } from "@/lib/whatsapp";
import { TEMPLATES, comFallback } from "@/lib/whatsapp-templates";
import { obterDocumentoPorVendaETipo } from "@/lib/documento-service";
import { assertSafeEmailAddresses, buildMimeMessage, type EmailAttachment } from "@/lib/email-mime";
import { TERMO_EMAIL_STATUS_VALUES, type TermoEmailStatus } from "@/lib/termo-email-status";

export { TERMO_EMAIL_STATUS_VALUES };
export type { TermoEmailStatus };

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
  attachments?: EmailAttachment[];
};

type TermoEmailResult = {
  status: Exclude<TermoEmailStatus, "pendente">;
  error?: string;
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

/** Escapes HTML special characters to prevent XSS in email templates. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Sends an email via raw SMTP (supports STARTTLS on port 587 or TLS on port 465).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];
  const ccList = opts.cc || [];
  assertSafeEmailAddresses(toList, "destinatário");
  assertSafeEmailAddresses(ccList, "Cc");

  const cfg = await getSmtpConfig();
  if (!cfg) {
    throw new Error("SMTP não configurado");
  }

  assertSafeEmailAddresses([cfg.from], "remetente");
  const allRecipients = [...toList, ...ccList];

  const message = buildMimeMessage(opts, cfg.from);

  await smtpSend(cfg, allRecipients, message);
}

function sanitizeEmailError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (message.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() || "Falha ao enviar e-mail").slice(0, 500);
}

async function updateTermoEmailStatus(vendaId: number, data: {
  termoEmailStatus: Exclude<TermoEmailStatus, "pendente">;
  termoEmailEnviadoEm?: Date | null;
  termoEmailErro?: string | null;
}) {
  await prisma.venda.update({ where: { id: vendaId }, data });
}

/** Envia o termo assinado exclusivamente ao e-mail de RH da empresa parceira. */
export async function enviarTermoAssinadoAoRh(vendaId: number): Promise<TermoEmailResult> {
  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { cliente: true, itens: true, assinatura: true },
  });

  if (!venda?.cliente || venda.assinatura?.assinaturaStatus !== "assinado") {
    await updateTermoEmailStatus(vendaId, {
      termoEmailStatus: "erro_dados",
      termoEmailErro: !venda?.cliente ? "Venda ou cliente não encontrado" : "Assinatura não está assinada",
    });
    return { status: "erro_dados" };
  }

  let empresa = venda.cliente.empresaParceiraId
    ? await prisma.empresaParceira.findUnique({ where: { id: venda.cliente.empresaParceiraId } })
    : null;
  if (!empresa && venda.cliente.empresa) {
    empresa = await prisma.empresaParceira.findFirst({
      where: { nome: { equals: venda.cliente.empresa, mode: "insensitive" } },
    });
  }

  if (!empresa) {
    await updateTermoEmailStatus(vendaId, { termoEmailStatus: "erro_dados", termoEmailErro: "Empresa parceira não encontrada" });
    return { status: "erro_dados" };
  }

  const emailRh = empresa.emailRh?.trim();
  if (!emailRh) {
    await updateTermoEmailStatus(vendaId, { termoEmailStatus: "sem_email", termoEmailErro: null });
    return { status: "sem_email" };
  }

  const documento = await obterDocumentoPorVendaETipo(vendaId);
  if (!documento) {
    await updateTermoEmailStatus(vendaId, { termoEmailStatus: "erro_dados", termoEmailErro: "Documento assinado não encontrado" });
    return { status: "erro_dados" };
  }

  const clienteNome = venda.cliente.nome || "Cliente";
  const produtos = produtosTexto(venda);
  const totalValor = valorTotalVenda(venda);
  const html = `
<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body>
  <h2>Termo assinado</h2>
  <p>Olá, ${escapeHtml(empresa.nome)}.</p>
  <p>Segue em anexo o termo assinado da venda para o colaborador <strong>${escapeHtml(clienteNome)}</strong>.</p>
  <p><strong>Matrícula:</strong> ${escapeHtml(venda.cliente.matricula || "N/D")}</p>
  <p><strong>Produto(s):</strong> ${escapeHtml(produtos)}</p>
  <p><strong>Vendedor:</strong> ${escapeHtml(venda.vendedor || "N/D")}</p>
  <p><strong>Data da venda:</strong> ${formatDateBR(venda.dataVenda)}</p>
  <p><strong>Parcelas:</strong> ${venda.parcelas || 1}x</p>
  <p><strong>Valor total:</strong> ${formatBRL(totalValor)}</p>
</body></html>`;

  try {
    await sendEmail({
      to: emailRh,
      subject: `Termo assinado — venda #${vendaId} — ${clienteNome}`,
      html,
      attachments: [{
        filename: `termo-assinado-${vendaId}.pdf`,
        contentType: "application/pdf",
        content: documento.buffer,
      }],
    });
    await updateTermoEmailStatus(vendaId, {
      termoEmailStatus: "enviado",
      termoEmailEnviadoEm: new Date(),
      termoEmailErro: null,
    });
    return { status: "enviado" };
  } catch (error) {
    const errorMessage = sanitizeEmailError(error);
    await updateTermoEmailStatus(vendaId, { termoEmailStatus: "falhou", termoEmailErro: errorMessage });
    return { status: "falhou", error: errorMessage };
  }
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

/**
 * Creates in-app notifications for admin and optionally the vendedor.
 */
async function criarNotificacaoVenda(
  mensagem: string,
  link: string,
  vendedorId?: number | null,
) {
  // Always notify admin (id=1)
  const creates = [{ mensagem, link, usuarioId: 1 }];

  // Also notify the vendedor if different from admin
  if (vendedorId && vendedorId !== 1) {
    creates.push({ mensagem, link, usuarioId: vendedorId });
  }

  await prisma.notificacao.createMany({ data: creates });
}

type VendaForEmail = {
  id: number;
  dataVenda: Date;
  vendedor?: string | null;
  vendedorId?: number | null;
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
    empresaParceiraId?: number | null;
  } | null;
};

/**
 * Sends a notification email to the partner company when a sale is created.
 * Uses empresaParceiraId (FK) when available, falls back to text matching.
 * Returns true if notification was sent, false if skipped (no empresa found).
 */
export async function sendVendaNotification(venda: VendaForEmail): Promise<boolean> {
  if (!venda.cliente?.empresaParceiraId && !venda.cliente?.empresa) return false;

  // Prefer FK lookup, fall back to text matching for legacy data
  const empresa = venda.cliente.empresaParceiraId
    ? await prisma.empresaParceira.findUnique({ where: { id: venda.cliente.empresaParceiraId } })
    : await prisma.empresaParceira.findFirst({
        where: { nome: { equals: venda.cliente.empresa!, mode: "insensitive" } },
      });

  const totalValor = valorTotalVenda(venda);
  const produtosStr = produtosTexto(venda);
  const dataStr = formatDateBR(venda.dataVenda);

  // Determine if email can be sent
  const smtpCfg = await getSmtpConfig();
  const hasEmail = !!(empresa?.emailRh);
  const canSendEmail = hasEmail && smtpCfg !== null;

  if (canSendEmail && empresa) {
    // Send email notification
    const toEmails: string[] = [empresa.emailRh as string];
    if (empresa.emailsExtras) {
      const extras = empresa.emailsExtras.split(",").map((e) => e.trim()).filter(Boolean);
      toEmails.push(...extras);
    }

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
  <p>Uma nova venda foi registrada para um colaborador da <strong>${escapeHtml(empresa.nome)}</strong>.</p>
  <table>
    <tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Cliente</td><td>${escapeHtml(venda.cliente?.nome || "N/D")}</td></tr>
    <tr><td>Matricula</td><td>${escapeHtml(venda.cliente?.matricula || "N/D")}</td></tr>
    <tr><td>Produto(s)</td><td>${escapeHtml(produtosStr)}</td></tr>
    <tr><td>Vendedor</td><td>${escapeHtml(venda.vendedor || "N/D")}</td></tr>
    <tr><td>Data</td><td>${dataStr}</td></tr>
    <tr><td>Parcelas</td><td>${venda.parcelas || 1}x</td></tr>
    <tr><td class="total">Valor Total</td><td class="total">${formatBRL(totalValor)}</td></tr>
  </table>
  <p style="margin-top:16px;font-size:0.85em;color:#888;">Este email foi enviado automaticamente pelo sistema BFX.</p>
</div>
</body>
</html>`;

    try {
      await sendEmail({
        to: toEmails,
        subject: `Nova venda — ${venda.cliente?.nome || "cliente"} (${empresa.nome})`,
        html,
      });
      await criarNotificacaoVenda(
        `Email enviado para ${empresa.nome}: venda #${venda.id} — ${venda.cliente?.nome || "cliente"} (${formatBRL(totalValor)})`,
        `/historico`,
        venda.vendedorId,
      );
    } catch (err) {
      console.error("[email] Falha ao enviar notificacao de venda por email:", err);
      await criarNotificacaoVenda(
        `Falha ao enviar email para ${empresa.nome}: venda #${venda.id} — ${venda.cliente?.nome || "cliente"}`,
        `/historico`,
        venda.vendedorId,
      );
    }
    return true;
  }

  // Fallback: send WhatsApp notification if empresa found
  if (!empresa) return false;

  if (!empresa.telefoneRh) {
    console.warn(`[email] Empresa ${empresa.nome} sem email configurado e sem telefone — notificacao ignorada.`);
    await criarNotificacaoVenda(
      `Empresa ${empresa.nome} sem email/telefone — notificação da venda #${venda.id} ignorada`,
      `/historico`,
      venda.vendedorId,
    );
    return false;
  }

  const mensagem = [
    "[BFX] Nova venda registrada",
    `Empresa: ${empresa.nome}`,
    `Cliente: ${venda.cliente?.nome || "N/D"} (Mat: ${venda.cliente?.matricula || "N/D"})`,
    `Produto(s): ${produtosStr}`,
    `Vendedor: ${venda.vendedor || "N/D"}`,
    `Data: ${dataStr}`,
    `Parcelas: ${venda.parcelas || 1}x`,
    `Valor Total: ${formatBRL(totalValor)}`,
  ].join("\n");

  try {
    await enviarWhatsApp({
      telefone: empresa.telefoneRh,
      origem: "relatorio",
      template: comFallback(TEMPLATES.relatorioEmpresa, [mensagem], mensagem),
    });
    await criarNotificacaoVenda(
      `WhatsApp enviado para ${empresa.nome} (sem email): venda #${venda.id} — ${venda.cliente?.nome || "cliente"} (${formatBRL(totalValor)})`,
      `/historico`,
      venda.vendedorId,
    );
  } catch (err) {
    console.error("[email] Falha ao enviar notificacao de venda via WhatsApp:", err);
    await criarNotificacaoVenda(
      `Falha ao notificar ${empresa.nome}: venda #${venda.id} — nem email nem WhatsApp funcionou`,
      `/historico`,
      venda.vendedorId,
    );
  }
  return true;
}

type VendaRelatorio = {
  id: number;
  dataVenda: Date;
  vendedor?: string | null;
  vendedorId?: number | null;
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
    empresaParceiraId?: number | null;
  } | null;
};

/**
 * Generates and sends the weekly sales report for a given company.
 */
export async function sendWeeklyReport(
  empresaNome: string,
  vendas: VendaRelatorio[],
  emailsTo: string[],
  adminEmail?: string,
  telefoneFallback?: string
): Promise<void> {
  const smtpCfg = await getSmtpConfig();

  // If SMTP not configured, fall back to WhatsApp
  if (!smtpCfg) {
    if (!telefoneFallback) {
      console.warn(`[email] SMTP nao configurado e sem telefone de fallback para ${empresaNome} — relatorio ignorado.`);
      return;
    }
    const totalGeralFallback = vendas.reduce((s, v) => s + valorTotalVenda(v), 0);
    const fimFallback = new Date();
    const inicioFallback = new Date();
    inicioFallback.setDate(inicioFallback.getDate() - 7);
    const semanaLabelFallback = `${formatDateBR(inicioFallback)} a ${formatDateBR(fimFallback)}`;
    const mensagem = [
      `[BFX] Relatorio Semanal de Vendas`,
      `Empresa: ${empresaNome}`,
      `Periodo: ${semanaLabelFallback}`,
      `Total de vendas: ${vendas.length}`,
      `Valor total: ${formatBRL(totalGeralFallback)}`,
    ].join("\n");
    try {
      await enviarWhatsApp({
        telefone: telefoneFallback,
        origem: "relatorio",
        template: comFallback(TEMPLATES.relatorioEmpresa, [mensagem], mensagem),
      });
    } catch (err) {
      console.error(`[email] Falha ao enviar relatorio semanal via WhatsApp para ${empresaNome}:`, err);
    }
    return;
  }

  // If SMTP is configured but no email recipients, try WhatsApp fallback
  if (emailsTo.length === 0) {
    if (!telefoneFallback) {
      console.warn(`[email] Empresa ${empresaNome} sem email e sem telefone — relatorio ignorado.`);
      return;
    }
    const totalGeralWa = vendas.reduce((s, v) => s + valorTotalVenda(v), 0);
    const fimWa = new Date();
    const inicioWa = new Date();
    inicioWa.setDate(inicioWa.getDate() - 7);
    const semanaLabelWa = `${formatDateBR(inicioWa)} a ${formatDateBR(fimWa)}`;
    const mensagem = [
      `[BFX] Relatorio Semanal de Vendas`,
      `Empresa: ${empresaNome}`,
      `Periodo: ${semanaLabelWa}`,
      `Total de vendas: ${vendas.length}`,
      `Valor total: ${formatBRL(totalGeralWa)}`,
    ].join("\n");
    try {
      await enviarWhatsApp({
        telefone: telefoneFallback,
        origem: "relatorio",
        template: comFallback(TEMPLATES.relatorioEmpresa, [mensagem], mensagem),
      });
    } catch (err) {
      console.error(`[email] Falha ao enviar relatorio semanal via WhatsApp para ${empresaNome}:`, err);
    }
    return;
  }

  const rows = vendas.map((v) => {
    const total = valorTotalVenda(v);
    const produtos = escapeHtml(produtosTexto(v));
    const data = formatDateBR(v.dataVenda);
    const matricula = escapeHtml(v.cliente?.matricula || "—");
    const nome = escapeHtml(v.cliente?.nome || "N/D");
    const vendedor = escapeHtml(v.vendedor || "N/D");
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
  <h2>Relatorio Semanal de Vendas — ${escapeHtml(empresaNome)}</h2>
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

  try {
    await sendEmail({
      to: emailsTo,
      subject: `Relatorio Semanal de Vendas — ${empresaNome} (${semanaLabel})`,
      html,
      cc,
    });
    await prisma.notificacao.create({
      data: {
        mensagem: `Relatório semanal enviado por email para ${empresaNome} (${vendas.length} vendas, ${formatBRL(totalGeral)})`,
        link: `/relatorios`,
        usuarioId: 1,
      },
    });
  } catch (err) {
    console.error(`[email] Falha ao enviar relatório semanal para ${empresaNome}:`, err);
    await prisma.notificacao.create({
      data: {
        mensagem: `Falha ao enviar relatório semanal por email para ${empresaNome}`,
        link: `/relatorios`,
        usuarioId: 1,
      },
    });
  }
}
