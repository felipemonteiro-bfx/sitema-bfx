// Relatorios: XSS no catalogo e rotas so de admin sem guarda (2026-09-16).
//
// 1. /api/relatorios/catalogo montava HTML com nome, marca, categoria e imagem do produto sem
//    escape. Vendedor grava esses campos em /cadastros; quando o admin abre o catalogo, um
//    `imagem = x" onerror="..."` executa com a sessao dele na mesma origem.
// 2. margem-produto (custo e lucro), inadimplencia e as tres rotas de antecipacao (CPF,
//    e-mail e valores do lote) so checavam sessao no middleware; a tela que as chama e so de
//    admin. Mesmo padrao de guarda de controle-xlsx.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { escaparHtml, urlImagemSegura } from "@/lib/html";

const produtoFindMany = vi.fn();
const dbMock = new Proxy(
  { produto: { findMany: produtoFindMany } } as Record<string, unknown>,
  {
    get(alvo, prop: string) {
      if (prop in alvo) return alvo[prop];
      // Qualquer outro acesso ao banco numa rota barrada pela guarda e erro de teste.
      throw new Error(`banco acessado antes da guarda: prisma.${prop}`);
    },
  },
);
const guardsMock = { requireAdmin: vi.fn() };

vi.mock("@/lib/db", () => ({ prisma: dbMock }));
vi.mock("@/lib/guards", () => guardsMock);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("escaparHtml / urlImagemSegura", () => {
  it("escapa os cinco caracteres que abrem tag ou atributo", () => {
    expect(escaparHtml(`<b onclick="x">'&`)).toBe("&lt;b onclick=&quot;x&quot;&gt;&#39;&amp;");
    expect(escaparHtml(null)).toBe("");
  });

  it("so aceita imagem http(s) ou caminho do proprio site", () => {
    expect(urlImagemSegura("https://cdn.exemplo.com/a.jpg")).toBe("https://cdn.exemplo.com/a.jpg");
    expect(urlImagemSegura("/uploads/produto-1.webp")).toBe("/uploads/produto-1.webp");
    expect(urlImagemSegura("javascript:alert(1)")).toBeNull();
    expect(urlImagemSegura("data:text/html,<script>")).toBeNull();
    expect(urlImagemSegura("//evil.com/x.png")).toBeNull();
    expect(urlImagemSegura("")).toBeNull();
  });
});

describe("catalogo", () => {
  it("nome, marca, categoria e imagem maliciosos saem escapados", async () => {
    produtoFindMany.mockResolvedValue([
      {
        id: 1,
        nome: '<script>alert("nome")</script>',
        valorVenda: 10,
        imagem: 'x" onerror="fetch(1)',
        marca: "<img src=x onerror=alert(2)>",
        categoria: '"><svg onload=alert(3)>',
      },
      { id: 2, nome: "BOTA", valorVenda: 20, imagem: "javascript:alert(4)", marca: null, categoria: null },
    ]);
    const { GET } = await import("@/app/api/relatorios/catalogo/route");

    const html = await (await GET()).text();

    expect(html.includes("<script>alert")).toBe(false);
    expect(html.includes('onerror="fetch(1)')).toBe(false);
    expect(html.includes("<img src=x onerror")).toBe(false);
    expect(html.includes("<svg onload")).toBe(false);
    expect(html.includes("javascript:alert(4)")).toBe(false);
    expect(html.includes("&lt;script&gt;alert(&quot;nome&quot;)&lt;/script&gt;")).toBe(true);
  });
});

describe("rotas so de admin", () => {
  const ROTAS = [
    ["margem-produto", () => import("@/app/api/relatorios/margem-produto/route")],
    ["inadimplencia", () => import("@/app/api/relatorios/inadimplencia/route")],
    ["antecipacao", () => import("@/app/api/relatorios/antecipacao/route")],
    ["antecipacao-xlsx", () => import("@/app/api/relatorios/antecipacao-xlsx/route")],
    ["antecipacao-imagem", () => import("@/app/api/relatorios/antecipacao-imagem/route")],
  ] as const;

  for (const [nome, carregar] of ROTAS) {
    it(`${nome}: vendedor recebe 403 sem tocar no banco`, async () => {
      guardsMock.requireAdmin.mockResolvedValue(false);
      const { GET } = await carregar();

      const resposta = await GET(new Request(`http://localhost/api/relatorios/${nome}?ids=1`) as never);

      expect(resposta.status).toBe(403);
      expect(guardsMock.requireAdmin).toHaveBeenCalled();
    });
  }
});
