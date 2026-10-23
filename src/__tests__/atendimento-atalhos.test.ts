import { describe, it, expect, vi, beforeEach } from "vitest";

const m = { admin: vi.fn() };
vi.mock("@/lib/guards", () => ({ requireAdmin: m.admin }));

const dbMock = {
  $queryRaw: vi.fn(),
  parcelaVencimento: { findMany: vi.fn() },
  cliente: { findUnique: vi.fn() },
  venda: { findMany: vi.fn() },
  produto: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: dbMock }));

const buscaMock = { buscarProdutos: vi.fn() };
vi.mock("@/lib/busca-produtos", () => buscaMock);

const { buscarEstoqueAtalho, parcelasDoContato, boletosDoContato } = await import(
  "@/app/(app)/crm/atendimento/atalhos-actions"
);
const texto = await import("@/lib/atendimento-atalhos-texto");

const TEL = "5592999990001";
const ANA = { id: 7, nome: "Ana Souza", telefone: "(92) 99999-0001" };

const meiaNoite = new Date();
meiaNoite.setHours(0, 0, 0, 0);
const dias = (n: number) => new Date(meiaNoite.getTime() + n * 86400000);
const venda = { id: 31, produtoNome: "Geladeira", parcelas: 10 };

function nenhumaConsulta() {
  expect(dbMock.$queryRaw).not.toHaveBeenCalled();
  expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
  expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  expect(dbMock.produto.findMany).not.toHaveBeenCalled();
  expect(buscaMock.buscarProdutos).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  m.admin.mockResolvedValue(true);
  dbMock.$queryRaw.mockResolvedValue([ANA]);
  dbMock.parcelaVencimento.findMany.mockResolvedValue([]);
  dbMock.venda.findMany.mockResolvedValue([]);
  buscaMock.buscarProdutos.mockResolvedValue([]);
});

describe("guarda das actions", () => {
  it("não-admin é recusado sem tocar no banco nem na busca", async () => {
    m.admin.mockResolvedValue(false);
    expect((await buscarEstoqueAtalho("lavadora")).ok).toBe(false);
    expect((await parcelasDoContato(TEL)).ok).toBe(false);
    expect((await boletosDoContato(TEL)).ok).toBe(false);
    nenhumaConsulta();
  });

  it("telefone fora de ^\\d{10,15}$ é recusado sem consulta", async () => {
    for (const ruim of ["", "abc", "123", "5592999990001@s.whatsapp.net", "55 92 99999-0001", "1".repeat(16)]) {
      expect((await parcelasDoContato(ruim)).ok).toBe(false);
      expect((await boletosDoContato(ruim)).ok).toBe(false);
    }
    nenhumaConsulta();
  });

  it("termo de estoque vazio ou grande demais é recusado sem consulta", async () => {
    expect((await buscarEstoqueAtalho("   ")).ok).toBe(false);
    expect((await buscarEstoqueAtalho("a".repeat(121))).ok).toBe(false);
    nenhumaConsulta();
  });
});

describe("estoque", () => {
  it("devolve nome, categoria, quantidade e aproximado, sem preço", async () => {
    buscaMock.buscarProdutos.mockResolvedValue([
      { nome: "Lavadora 14,5kg", marca: "Electrolux", categoria: "ELETRO", valorVenda: 2999, qtdEstoque: 3, imagem: null, via: "texto" },
      { nome: "Secadora", marca: null, categoria: null, valorVenda: 1500, qtdEstoque: null, imagem: "x", via: "significado" },
    ]);
    const r = await buscarEstoqueAtalho("lavadora");
    expect(r).toEqual({
      ok: true,
      itens: [
        { nome: "Lavadora 14,5kg", categoria: "ELETRO", quantidade: 3, aproximado: false },
        { nome: "Secadora", categoria: null, quantidade: 0, aproximado: true },
      ],
    });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/preco|valorVenda|2999|1500/);
    expect(buscaMock.buscarProdutos).toHaveBeenCalledWith("lavadora", expect.any(Number));
  });
});

describe("parcelas e boletos: escopo", () => {
  it("sem cadastro: cliente null, motivo e lista vazia, sem consultar parcelas", async () => {
    dbMock.$queryRaw.mockResolvedValue([]);
    const p = await parcelasDoContato(TEL);
    expect(p).toMatchObject({ ok: true, cliente: null, parcelas: [], totalEmAberto: 0, totalVencido: 0 });
    expect((p as { motivo?: string }).motivo).toBe("Não localizei um cadastro com este número.");
    const b = await boletosDoContato(TEL);
    expect(b).toMatchObject({ ok: true, cliente: null, boletos: [] });
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("ambíguo: dois cadastros com o mesmo número devolvem lista vazia e motivo", async () => {
    dbMock.$queryRaw.mockResolvedValue([ANA, { ...ANA, id: 8, nome: "Outra" }]);
    const p = await parcelasDoContato(TEL);
    expect(p).toMatchObject({ ok: true, cliente: null, parcelas: [] });
    expect((p as { motivo?: string }).motivo).toBe("Preciso confirmar sua identidade antes de mostrar esses dados.");
    const b = await boletosDoContato(TEL);
    expect(b).toMatchObject({ ok: true, cliente: null, boletos: [] });
    expect(dbMock.parcelaVencimento.findMany).not.toHaveBeenCalled();
    expect(dbMock.venda.findMany).not.toHaveBeenCalled();
  });

  it("toda consulta usa só o clienteId do escopo, com filtro de venda válida", async () => {
    await parcelasDoContato(TEL);
    await boletosDoContato(TEL);
    const wp = dbMock.parcelaVencimento.findMany.mock.calls[0][0].where;
    expect(wp.venda).toEqual({ clienteId: 7, status: { notIn: ["cancelada", "estornada"] } });
    const wb = dbMock.venda.findMany.mock.calls[0][0].where;
    expect(wb.clienteId).toBe(7);
    expect(wb.status).toEqual({ notIn: ["cancelada", "estornada"] });
    // O telefone nunca vira filtro das consultas financeiras.
    expect(JSON.stringify([wp, wb])).not.toContain("999990001");
  });
});

describe("parcelas e boletos: payload", () => {
  it("parcelas em aberto com situação e id da venda", async () => {
    dbMock.parcelaVencimento.findMany.mockResolvedValue([
      { numeroParcela: 3, dataVencimento: dias(-5), valorParcela: 100, paga: false, origemPagamento: null, venda },
      { numeroParcela: 4, dataVencimento: dias(25), valorParcela: 100, paga: false, origemPagamento: null, venda },
    ]);
    const r = await parcelasDoContato(TEL);
    expect(r.ok && r.cliente).toEqual({ nome: "Ana Souza" });
    expect(r.ok && r.totalEmAberto).toBe(200);
    expect(r.ok && r.parcelas.map((p) => [p.vendaId, p.numeroParcela, p.situacao])).toEqual([
      [31, "3/10", "vencida"],
      [31, "4/10", "a_vencer"],
    ]);
    expect(dbMock.parcelaVencimento.findMany.mock.calls[0][0].where.OR).toBeDefined();
  });

  it("boletos: data da venda, valor, emitido ou não", async () => {
    dbMock.venda.findMany.mockResolvedValue([
      { id: 31, dataVenda: new Date("2026-09-10T00:00:00Z"), produtoNome: "Geladeira", parcelas: 10, valorVenda: 1000, boletoUrl: "https://b/1" },
      { id: 32, dataVenda: new Date("2026-09-11T00:00:00Z"), produtoNome: "Fogão", parcelas: 1, valorVenda: 500, boletoUrl: null },
    ]);
    const r = await boletosDoContato(TEL);
    expect(r.ok && r.boletos).toEqual([
      { vendaId: 31, dataVenda: "2026-09-10", produto: "Geladeira", parcelas: 10, valor: 1000, emitido: true, link: "https://b/1" },
      { vendaId: 32, dataVenda: "2026-09-11", produto: "Fogão", parcelas: 1, valor: 500, emitido: false, link: null },
    ]);
  });
});

describe("textos prontos", () => {
  it("estoque: tem e não tem, sem quantidade nem preço", () => {
    expect(texto.textoTemEstoque("Lavadora 14,5kg")).toBe(
      "Olá! Temos Lavadora 14,5kg disponível em estoque. A equipe confirma preço e condições antes de fechar. Posso seguir com o pedido?",
    );
    expect(texto.textoSemEstoque("Lavadora 14,5kg")).toBe(
      "Olá! No momento não temos Lavadora 14,5kg em estoque. Posso avisar quando chegar ou sugerir um modelo parecido?",
    );
    expect(texto.textoEstoque({ nome: "X", quantidade: 5 })).not.toMatch(/\b5\b|R\$/);
    expect(texto.textoEstoque({ nome: "X", quantidade: 0 })).toBe(texto.textoSemEstoque("X"));
    expect(texto.textoEstoque({ nome: "X", quantidade: 2 })).toBe(texto.textoTemEstoque("X"));
  });

  it("resumo de parcelas com a ressalva da baixa e próximo vencimento dd/mm", () => {
    const t = texto.textoResumoParcelas([
      { dataVencimento: "2026-09-30", situacao: "vencida" },
      { dataVencimento: "2026-11-05", situacao: "a_vencer" },
      { dataVencimento: "2026-12-05", situacao: "a_vencer" },
    ]);
    expect(t).toBe(
      "Resumo das suas parcelas: 1 vencida(s) e 2 a vencer; próximo vencimento em 05/11. A equipe confere a baixa antes de confirmar quitação.",
    );
  });

  it("resumo sem parcelas a vencer omite o próximo vencimento; sem nada em aberto avisa", () => {
    expect(
      texto.textoResumoParcelas([{ dataVencimento: "2026-01-02", situacao: "vencida" }]),
    ).toBe(
      "Resumo das suas parcelas: 1 vencida(s) e 0 a vencer. A equipe confere a baixa antes de confirmar quitação.",
    );
    expect(texto.textoResumoParcelas([])).toBe(
      "Não encontrei parcelas em aberto no seu cadastro. A equipe confere a baixa antes de confirmar quitação.",
    );
  });

  it("data dd/mm lê o dia gravado, sem deslocar pelo fuso de Manaus", () => {
    expect(texto.dataDiaMes("2026-09-01")).toBe("01/09");
    expect(texto.dataDiaMes("2026-01-31")).toBe("31/01");
  });

  it("2ª via só com link https", () => {
    expect(texto.textoSegundaVia("https://pagamento.exemplo/b/1")).toBe(
      "Segue a 2ª via do seu boleto: https://pagamento.exemplo/b/1. Se já pagou, pode desconsiderar.",
    );
    for (const ruim of ["http://x/b", "javascript:alert(1)", "/uploads/b.pdf", "ftp://x/b", "", null, "https://", "https://x/b y"]) {
      expect(texto.textoSegundaVia(ruim)).toBeNull();
    }
  });
});
