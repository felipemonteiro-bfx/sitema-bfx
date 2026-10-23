import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { deflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
const inflados: number[] = [];
vi.mock("node:zlib", async (orig) => {
  const real = await orig<typeof import("node:zlib")>();
  return { ...real, inflateSync: (...a: Parameters<typeof real.inflateSync>) => { const r = real.inflateSync(...a); inflados.push(r.length); return r; } };
});
import { contarPaginasPdf, LIMITE_CONTAGEM_BYTES } from "@/lib/whatsapp-midia-pdf";

async function pdfDe(paginas: number, useObjectStreams = true) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage();
  return await doc.save({ useObjectStreams });
}

describe("contarPaginasPdf", () => {
  it("conta as páginas de um PDF válido", async () => {
    expect(await contarPaginasPdf(await pdfDe(2))).toBe(2);
  });
  it("bytes inválidos viram null, sem lançar", async () => {
    expect(await contarPaginasPdf(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
  it("acima de 10 MB não tenta contar", async () => {
    expect(LIMITE_CONTAGEM_BYTES).toBe(10 * 1024 * 1024);
    expect(await contarPaginasPdf(new Uint8Array(LIMITE_CONTAGEM_BYTES + 1))).toBeNull();
  });
  it("conta 1, 2 e várias páginas (PDF gerado, árvore de páginas plana)", async () => {
    expect(await contarPaginasPdf(await pdfDe(1))).toBe(1);
    expect(await contarPaginasPdf(await pdfDe(7))).toBe(7);
  });
  it("lê também a árvore de páginas guardada em object stream comprimido e sem object stream", async () => {
    expect(await contarPaginasPdf(await pdfDe(2, true))).toBe(2);
    expect(await contarPaginasPdf(await pdfDe(2, false))).toBe(2);
  });
  it("lixo que parece PDF, mas sem /Pages, vira null", async () => {
    expect(await contarPaginasPdf(new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"))).toBeNull();
    expect(await contarPaginasPdf(new Uint8Array(2048).fill(0x41))).toBeNull();
  });
  it("com árvore aninhada, vale o maior /Count (a raiz)", async () => {
    const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 5 /Kids [2 0 R 3 0 R] >>\nendobj\n2 0 obj\n<< /Type /Pages /Parent 1 0 R /Count 3 /Kids [] >>\nendobj\n3 0 obj\n<< /Type /Pages /Parent 1 0 R /Count 2 /Kids [] >>\nendobj\n";
    expect(await contarPaginasPdf(new TextEncoder().encode(pdf))).toBe(5);
  });
  it("não faz o parse completo do pdf-lib em arquivo de terceiro", () => {
    const fonte = readFileSync("src/lib/whatsapp-midia-pdf.ts", "utf8");
    expect(fonte).not.toContain("pdf-lib");
    expect(fonte).not.toContain("PDFDocument");
  });

  it("muitos object streams grandes: respeita o orçamento (32 streams / 8 MB somados) e devolve null", async () => {
    inflados.length = 0;
    const gran = deflateSync(Buffer.alloc(7 * 1024 * 1024, 0x20));
    let pdf = "%PDF-1.5\n";
    for (let i = 0; i < 60; i++) {
      pdf += `${i + 1} 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${gran.length} >>\nstream\n`;
      pdf = pdf + gran.toString("latin1") + "\nendstream\nendobj\n";
    }
    expect(await contarPaginasPdf(Buffer.from(pdf, "latin1"))).toBeNull();
    expect(inflados.length).toBeLessThanOrEqual(32);
    expect(inflados.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(8 * 1024 * 1024);
  });
  it("/Count só vale em dicionário de páginas real: texto de conteúdo com /Type /Pages /Count 99999 é ignorado", async () => {
    const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>\nendobj\n5 0 obj\n<< /Length 40 >>\nstream\n/Type /Pages /Count 99999\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n";
    expect(await contarPaginasPdf(new TextEncoder().encode(pdf))).toBe(2);
  });
  it("prefere o nó raiz referenciado por /Root, mesmo havendo outro nó /Pages com Count maior", async () => {
    const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 3 /Kids [] >>\nendobj\n9 0 obj\n<< /Type /Pages /Count 500 /Kids [] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n";
    expect(await contarPaginasPdf(new TextEncoder().encode(pdf))).toBe(3);
  });
  it("/Count de dicionário aninhado (fora do nível do /Type /Pages) não vale", async () => {
    const pdf = "%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [] /Extra << /Count 777 >> >>\nendobj\n";
    expect(await contarPaginasPdf(new TextEncoder().encode(pdf))).toBeNull();
  });
});
