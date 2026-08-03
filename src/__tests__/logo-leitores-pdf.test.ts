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

// ── gerarRelatorioMensalPdf ───────────────────────────────────────────────────
// `@/lib/logo-loader` e um modulo EXTERNO ao arquivo sob teste
// (src/lib/relatorio-mensal-pdf.ts), entao mockar essa chamada e legitimo —
// diferente do bloco acima, que testa o proprio logo-loader.ts.
//
// IMPORTANTE: nao usamos `vi.mock(...)` de topo de arquivo aqui porque o
// hoisting do vitest o executaria ANTES do `import { embedLogoNoPdf } from
// "@/lib/logo-loader"` da linha 17 — substituindo a implementacao REAL usada
// pelo describe("embedLogoNoPdf") acima por este mock. Usamos `vi.doMock`
// (nao hoisted) + `vi.resetModules()` + import dinamico, isolado neste bloco,
// para que os dois describes coexistam no mesmo arquivo sem um contaminar o
// outro.

describe("gerarRelatorioMensalPdf - logo", () => {
  const dadosVazios = { totalVendas: 0, valorTotal: 0, totalDescontoFolha: 0, linhas: [] };

  afterEach(() => {
    vi.doUnmock("@/lib/logo-loader");
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function carregarComMockDeLogo() {
    vi.resetModules();
    vi.doMock("@/lib/logo-loader", () => ({ embedLogoNoPdf: vi.fn().mockResolvedValue(null) }));
    const logoLoaderMod = await import("@/lib/logo-loader");
    const { gerarRelatorioMensalPdf } = await import("@/lib/relatorio-mensal-pdf");
    return { embedMock: logoLoaderMod.embedLogoNoPdf as ReturnType<typeof vi.fn>, gerarRelatorioMensalPdf };
  }

  it("logoPath em URL absoluta -> embedLogoNoPdf recebe exatamente esse valor e o PDF e gerado", async () => {
    const { embedMock, gerarRelatorioMensalPdf } = await carregarComMockDeLogo();

    const logoPath = "https://bfx.softlive.dev/produtos/logo/1-x.png";
    const bytes = await gerarRelatorioMensalPdf({
      empresaNome: "Empresa X",
      periodo: "2026-07",
      dados: dadosVazios as any,
      logoPath,
    });

    expect(embedMock).toHaveBeenCalledWith(expect.anything(), logoPath);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it("logoPath legado /uploads/x.png -> embedLogoNoPdf recebe exatamente esse valor", async () => {
    const { embedMock, gerarRelatorioMensalPdf } = await carregarComMockDeLogo();

    const logoPath = "/uploads/x.png";
    await gerarRelatorioMensalPdf({
      empresaNome: "Empresa X",
      periodo: "2026-07",
      dados: dadosVazios as any,
      logoPath,
    });

    expect(embedMock).toHaveBeenCalledWith(expect.anything(), logoPath);
  });

  it("logoPath null -> embedLogoNoPdf nao e chamado e o PDF ainda e gerado", async () => {
    const { embedMock, gerarRelatorioMensalPdf } = await carregarComMockDeLogo();

    const bytes = await gerarRelatorioMensalPdf({
      empresaNome: "Empresa X",
      periodo: "2026-07",
      dados: dadosVazios as any,
      logoPath: null,
    });

    expect(embedMock).not.toHaveBeenCalled();
    expect(bytes.length).toBeGreaterThan(0);
  });
});
