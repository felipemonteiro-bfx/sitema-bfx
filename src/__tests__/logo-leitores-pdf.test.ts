import { describe, it, expect, vi, afterEach } from "vitest";

// `embedLogoNoPdf` e `carregarLogo` vivem no MESMO arquivo (src/lib/logo-loader.ts).
// Mockar `carregarLogo` via `vi.mock` nao intercepta a chamada interna que
// `embedLogoNoPdf` faz a ela (ESM self-reference nao passa pela camada mockada
// do vitest/vite-node). Por isso este teste exercita `embedLogoNoPdf` de ponta
// a ponta atraves das dependencias REAIS de `carregarLogo` — `fetch` (ramo URL)
// e `fs/promises.readFile` (ramo legado) — que sao mocks legitimos de modulo
// externo. O comportamento observado (chamadas a embedPng/embedJpg, e null em
// cada caso de falha) e identico ao que o plano descreve.

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "fs/promises";
import { embedLogoNoPdf } from "@/lib/logo-loader";

type PdfDouble = { embedPng: ReturnType<typeof vi.fn>; embedJpg: ReturnType<typeof vi.fn> };

function pdfDouble(overrides: Partial<PdfDouble> = {}): PdfDouble {
  return {
    embedPng: vi.fn().mockResolvedValue({ width: 100, height: 50 }),
    embedJpg: vi.fn().mockResolvedValue({ width: 100, height: 50 }),
    ...overrides,
  };
}

function fetchOk(): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }) as unknown as typeof fetch;
}

describe("embedLogoNoPdf", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  it("logoPath URL absoluta .png -> embedPng chamado uma vez, embedJpg nenhuma", async () => {
    global.fetch = fetchOk();
    const pdf = pdfDouble();

    const result = await embedLogoNoPdf(
      pdf as any,
      "https://bfx.softlive.dev/produtos/logo/1-x.png"
    );

    expect(pdf.embedPng).toHaveBeenCalledTimes(1);
    expect(pdf.embedJpg).not.toHaveBeenCalled();
    expect(result).toEqual({ width: 100, height: 50 });
  });

  it("logoPath URL absoluta .jpg -> embedJpg chamado uma vez", async () => {
    global.fetch = fetchOk();
    const pdf = pdfDouble();

    await embedLogoNoPdf(pdf as any, "https://bfx.softlive.dev/produtos/logo/1-x.jpg");

    expect(pdf.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdf.embedPng).not.toHaveBeenCalled();
  });

  it("logoPath legado /uploads/x.jpeg -> embedJpg chamado uma vez (D-03: mesmo helper para os dois formatos)", async () => {
    (readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from([1, 2, 3]));
    const pdf = pdfDouble();

    await embedLogoNoPdf(pdf as any, "/uploads/x.jpeg");

    expect(pdf.embedJpg).toHaveBeenCalledTimes(1);
    expect(pdf.embedPng).not.toHaveBeenCalled();
  });

  it("carregarLogo devolvendo null (fetch nao-ok) -> resultado null e nenhum embed chamado", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const pdf = pdfDouble();

    const result = await embedLogoNoPdf(pdf as any, "https://bfx.softlive.dev/produtos/logo/1-x.png");

    expect(result).toBeNull();
    expect(pdf.embedPng).not.toHaveBeenCalled();
    expect(pdf.embedJpg).not.toHaveBeenCalled();
  });

  it("extensao desconhecida -> resultado null", async () => {
    global.fetch = fetchOk();
    const pdf = pdfDouble();

    const result = await embedLogoNoPdf(pdf as any, "https://bfx.softlive.dev/produtos/logo/1-x.webp");

    expect(result).toBeNull();
    expect(pdf.embedPng).not.toHaveBeenCalled();
    expect(pdf.embedJpg).not.toHaveBeenCalled();
  });

  it("embedPng lancando -> resultado null (nao pode derrubar a geracao do PDF)", async () => {
    global.fetch = fetchOk();
    const pdf = pdfDouble({ embedPng: vi.fn().mockRejectedValue(new Error("boom")) });

    const result = await embedLogoNoPdf(pdf as any, "https://bfx.softlive.dev/produtos/logo/1-x.png");

    expect(result).toBeNull();
  });
});
