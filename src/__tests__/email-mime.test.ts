import { describe, it, expect } from "vitest";
import { buildMimeMessage, chunkBase64 } from "@/lib/email-mime";

const FIXED = { boundary: "bfx_TEST", date: "Tue, 14 Jul 2026 00:00:00 GMT" };

describe("buildMimeMessage — sem anexos", () => {
  it("rejeita destinatário, cópia e remetente inválidos antes de montar headers", () => {
    expect(() => buildMimeMessage({ to: "invalido", subject: "s", html: "h" }, "from@test.com")).toThrow(/e-?mail|destinatário/i);
    expect(() => buildMimeMessage({ to: "to@test.com\r\nBcc: x@test.com", subject: "s", html: "h" }, "from@test.com")).toThrow(/inválido|controle|email/i);
    expect(() => buildMimeMessage({ to: "to@test.com", cc: [""], subject: "s", html: "h" }, "from@test.com")).toThrow(/e-?mail|Cc/i);
    expect(() => buildMimeMessage({ to: "to@test.com", subject: "s", html: "h" }, "from@test.com\nBcc: x@test.com")).toThrow(/inválido|controle|email/i);
  });

  it("usa multipart/alternative e mantem comportamento historico", () => {
    const msg = buildMimeMessage(
      { to: "rh@empresa.com", subject: "Olá", html: "<p>oi</p>" },
      "bfx@bfx.com",
      FIXED
    );
    expect(msg).toContain('Content-Type: multipart/alternative; boundary="bfx_TEST"');
    expect(msg).toContain("Content-Type: text/html; charset=UTF-8");
    expect(msg).not.toContain("multipart/mixed");
    expect(msg).not.toContain("Content-Disposition: attachment");
    // corpo HTML em base64
    expect(msg).toContain(Buffer.from("<p>oi</p>").toString("base64"));
    // assunto codificado em UTF-8 base64
    expect(msg).toContain(`Subject: =?UTF-8?B?${Buffer.from("Olá").toString("base64")}?=`);
    // fecha o boundary
    expect(msg.trimEnd().endsWith("--bfx_TEST--")).toBe(true);
  });

  it("inclui Cc quando fornecido e omite quando ausente", () => {
    const comCc = buildMimeMessage(
      { to: "a@x.com", cc: ["admin@x.com"], subject: "s", html: "<p>h</p>" },
      "f@x.com",
      FIXED
    );
    expect(comCc).toContain("Cc: admin@x.com");

    const semCc = buildMimeMessage({ to: "a@x.com", subject: "s", html: "<p>h</p>" }, "f@x.com", FIXED);
    expect(semCc).not.toContain("Cc:");
  });

  it("junta multiplos destinatarios em To", () => {
    const msg = buildMimeMessage(
      { to: ["a@x.com", "b@x.com"], subject: "s", html: "<p>h</p>" },
      "f@x.com",
      FIXED
    );
    expect(msg).toContain("To: a@x.com, b@x.com");
  });
});

describe("buildMimeMessage — com anexos", () => {
  it("usa multipart/mixed e adiciona cada anexo com Content-Disposition", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const xls = Buffer.from("<xml/>", "utf-8");
    const msg = buildMimeMessage(
      {
        to: "rh@empresa.com",
        subject: "Relatório",
        html: "<p>relatorio</p>",
        attachments: [
          { filename: "relatorio.pdf", contentType: "application/pdf", content: pdf },
          { filename: "relatorio.xls", contentType: "application/vnd.ms-excel", content: xls },
        ],
      },
      "bfx@bfx.com",
      FIXED
    );

    expect(msg).toContain('Content-Type: multipart/mixed; boundary="bfx_TEST"');
    expect(msg).toContain('Content-Disposition: attachment; filename="relatorio.pdf"');
    expect(msg).toContain('Content-Disposition: attachment; filename="relatorio.xls"');
    expect(msg).toContain('Content-Type: application/pdf; name="relatorio.pdf"');
    // conteudo dos anexos em base64
    expect(msg).toContain(Buffer.from(pdf).toString("base64"));
    expect(msg).toContain(Buffer.from(xls).toString("base64"));
    // ainda inclui a parte HTML
    expect(msg).toContain("Content-Type: text/html; charset=UTF-8");
    expect(msg.trimEnd().endsWith("--bfx_TEST--")).toBe(true);
  });
});

describe("chunkBase64", () => {
  it("quebra em linhas de no maximo 76 caracteres", () => {
    const b64 = "A".repeat(200);
    const linhas = chunkBase64(b64).split("\r\n");
    expect(linhas.length).toBe(3); // 76 + 76 + 48
    expect(linhas.every((l) => l.length <= 76)).toBe(true);
    expect(linhas.join("")).toBe(b64);
  });

  it("string curta cabe em uma linha", () => {
    expect(chunkBase64("abc")).toBe("abc");
  });
});

describe("buildMimeMessage — entrega em servidores reais", () => {
  const htmlLongo = `<table>${"<tr><td>FUNCIONARIO</td><td>R$ 1.234,56</td></tr>".repeat(200)}</table>`;
  const anexo = { filename: "a.xls", contentType: "application/vnd.ms-excel", content: Buffer.alloc(5000, 1) };

  it("nenhuma linha passa de 998 caracteres, com ou sem anexo (Exim recusa acima de 2048)", () => {
    for (const attachments of [undefined, [anexo]]) {
      const msg = buildMimeMessage({ to: "rh@empresa.com", subject: "Consolidado", html: htmlLongo, attachments }, "bfx@bfx.com", FIXED);
      const maior = Math.max(...msg.split("\r\n").map((l) => l.length));
      expect(maior).toBeLessThanOrEqual(998);
    }
  });

  it("inclui Message-ID único no domínio do remetente (Gmail recusa sem ele)", () => {
    for (const attachments of [undefined, [anexo]]) {
      const a = buildMimeMessage({ to: "rh@empresa.com", subject: "s", html: "<p>h</p>", attachments }, "Vendas06@bfxshop.com.br");
      const b = buildMimeMessage({ to: "rh@empresa.com", subject: "s", html: "<p>h</p>", attachments }, "Vendas06@bfxshop.com.br");
      const idA = a.split("\r\n").find((l) => l.startsWith("Message-ID: "));
      const idB = b.split("\r\n").find((l) => l.startsWith("Message-ID: "));
      expect(idA).toMatch(/^Message-ID: <[^<>@\s]+@bfxshop\.com\.br>$/);
      expect(idA).not.toBe(idB);
    }
  });
});
