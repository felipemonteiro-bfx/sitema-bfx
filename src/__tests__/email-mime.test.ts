import { describe, it, expect } from "vitest";
import { buildMimeMessage, chunkBase64 } from "@/lib/email-mime";

const FIXED = { boundary: "bfx_TEST", date: "Tue, 14 Jul 2026 00:00:00 GMT" };

describe("buildMimeMessage — sem anexos", () => {
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
