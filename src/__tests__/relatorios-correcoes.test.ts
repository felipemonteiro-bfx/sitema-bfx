// Relatorios: correcoes da auditoria de 2026-09-16 (lote 3).
// Ver docs/superpowers/specs/2026-09-16-relatorios-correcoes.md.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { alturaPaginaAntecipacao } from "@/lib/antecipacao-pdf-layout";
import { fontePdfSegura, textoPdf } from "@/lib/pdf-texto";
import { escaparXml } from "@/lib/xml";
import { inicioDoMesDataPura, hojeDataPura } from "@/lib/data-pura";
import { filtroPeriodoVendas, resumirRelatorioVendas } from "@/lib/resumo-vendas";
import { vendaEhAntecipavel, WHERE_VENDA_ANTECIPAVEL } from "@/lib/antecipacao";

const ler = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("PDF de antecipacao: altura cabe o TOTAL GERAL", () => {
  // Consumo real do desenho: topo 90; por empresa bloco 54 + 42 por mes + 16 por parcela + 12;
  // rodape 8 + caixa 36; margem inferior 36. A estimativa antiga (30 por mes, 18 por parcela)
  // cortava o total com 3 empresas de 12 parcelas.
  it("3 empresas com 12 meses e 12 parcelas: a caixa do total termina dentro da pagina", () => {
    const blocos = [1, 2, 3].map(() => ({ meses: 12, parcelas: 12 }));
    const altura = alturaPaginaAntecipacao(blocos);
    const consumo = 90 + blocos.reduce((s, b) => s + 54 + b.meses * 42 + b.parcelas * 16 + 12, 0) + 8 + 36;
    expect(altura - consumo).toBeGreaterThanOrEqual(36);
  });

  it("lote pequeno continua em A4", () => {
    expect(alturaPaginaAntecipacao([{ meses: 1, parcelas: 1 }])).toBe(842);
  });

  it("a rota usa o calculo compartilhado", () => {
    expect(ler("src/app/api/relatorios/antecipacao-imagem/route.ts").includes("alturaPaginaAntecipacao(")).toBe(true);
  });
});

describe("PDF: caractere fora do WinAnsi nao derruba o relatorio", () => {
  it("textoPdf troca o que a fonte padrao nao codifica e mantem acento e travessao", () => {
    expect(textoPdf("Café — “ok” 🎉 ✓")).toBe("Café — “ok” ? ?");
    expect(textoPdf("A\tBC")).toBe("A BC");
  });

  it("fontePdfSegura desenha texto com emoji sem lancar", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const font = fontePdfSegura(await doc.embedFont(StandardFonts.Helvetica));
    expect(() => page.drawText("Produto 🎉 Café", { x: 10, y: 10, size: 10, font })).not.toThrow();
    expect(font.widthOfTextAtSize("🎉", 10)).toBeGreaterThan(0);
    expect(() => font.widthOfTextAtSize("linha 1\r\nlinha 2", 10)).not.toThrow();
    await expect(doc.save()).resolves.toBeInstanceOf(Uint8Array);
  });

  it("todas as rotas e libs que embutem fonte padrao usam a fonte segura", () => {
    const arquivos = [
      "src/app/api/relatorios/margem-produto/route.ts",
      "src/app/api/relatorios/vendas/pdf/route.ts",
      "src/app/api/relatorios/antecipacao-imagem/route.ts",
      "src/app/api/relatorios/inadimplencia/route.ts",
      "src/app/api/catalogo/route.ts",
      "src/app/api/recibo/route.ts",
      "src/lib/recibo-pdf.ts",
      "src/lib/relatorio-mensal-pdf.ts",
    ];
    for (const arq of arquivos) {
      const fonte = ler(arq);
      if (!fonte.includes("embedFont(")) continue;
      const embeds = fonte.split("embedFont(").length - 1;
      const seguros = fonte.split("fontePdfSegura(await").length - 1;
      expect({ arq, seguros }).toEqual({ arq, seguros: embeds });
    }
  });
});

describe("XML das planilhas sem caractere de controle", () => {
  it("escaparXml remove controle e escapa entidades", () => {
    expect(escaparXml("AB & <C> \"D\" 'E'")).toBe("AB &amp; &lt;C&gt; &quot;D&quot; &apos;E&apos;");
  });

  it("vendas-xlsx e antecipacao-xlsx usam o escape compartilhado", () => {
    for (const arq of ["src/app/api/relatorios/vendas-xlsx/route.ts", "src/app/api/relatorios/antecipacao-xlsx/route.ts"]) {
      expect(ler(arq).includes("escaparXml(")).toBe(true);
    }
  });
});

describe("planilha de antecipacao lista todos os produtos da venda", () => {
  it("usa os itens antes do nome do cabecalho (que guarda so o 1o item)", () => {
    const rota = ler("src/app/api/relatorios/antecipacao-xlsx/route.ts");
    expect(rota.includes("let produto = venda.produtoNome || ''")).toBe(false);
    expect(rota.includes("venda.itens.length > 0")).toBe(true);
  });
});

describe("CSV: escape, formula e BOM", () => {
  it("inadimplencia e antecipacao usam o escape compartilhado", () => {
    expect(ler("src/app/api/relatorios/inadimplencia/route.ts").includes("linhaCsv(")).toBe(true);
    const antecipacao = ler("src/app/api/relatorios/antecipacao/route.ts");
    expect(antecipacao.includes("celulaCsv(")).toBe(true);
    expect(antecipacao.includes('`"${v.cliente?.nome')).toBe(false);
  });

  it("relatorio de vendas: celula protegida contra formula e arquivo com BOM", () => {
    const colunas = ler("src/lib/relatorio-vendas-colunas.ts");
    expect(colunas.includes("celulaCsv(")).toBe(true);
    expect(ler("src/app/api/relatorios/vendas/route.ts").includes("\\uFEFF")).toBe(true);
    expect(ler("src/app/api/relatorios/inadimplencia/route.ts").includes("\\uFEFF")).toBe(true);
  });
});

describe("tela de relatorios: datas no fuso de Manaus e inadimplencia sem corte no dia 1", () => {
  it("inicioDoMesDataPura", () => {
    // 31/08 21h em Manaus = 01/09 01h UTC: o mes ainda e agosto.
    const hoje = hojeDataPura(new Date("2026-09-01T01:00:00Z"));
    expect(hoje).toBe("2026-08-31");
    expect(inicioDoMesDataPura(hoje)).toBe("2026-08-01");
  });

  it("a pagina usa o dia de Manaus e os links de inadimplencia nao mandam from", () => {
    const pagina = ler("src/app/(app)/relatorios/page.tsx");
    expect(pagina.includes("hojeDataPura()")).toBe(true);
    expect(pagina.includes('format(now, "yyyy-MM-dd")')).toBe(false);
    expect(pagina.includes("/api/relatorios/inadimplencia?from=")).toBe(false);
  });

  it("a rota de inadimplencia nao corta em 1o de janeiro quando nao vem from", () => {
    const rota = ler("src/app/api/relatorios/inadimplencia/route.ts");
    expect(rota.includes("new Date(hoje.getFullYear(), 0, 1)")).toBe(false);
  });
});

describe("resumo de vendas da IA", () => {
  const venda = (over: Record<string, unknown>) => ({
    vendedor: "Maria",
    valorVenda: 100,
    quantidade: 1,
    valorFrete: 0,
    desconto: 0,
    custoProduto: 40,
    custoEnvio: 0,
    temNota: false,
    taxaNota: 5.97,
    taxaFinanceiraValor: 0,
    cliente: { empresa: "AMAZON FIVE" },
    itens: [],
    ...over,
  });

  it("periodo com so from ou so to filtra do mesmo jeito (antes exigia os dois)", () => {
    expect(filtroPeriodoVendas("2026-09-01", undefined)).toEqual({ gte: new Date("2026-09-01T00:00:00.000Z") });
    expect(filtroPeriodoVendas(undefined, "2026-09-30")).toEqual({ lte: new Date("2026-09-30T23:59:59.999Z") });
    expect(filtroPeriodoVendas(undefined, undefined)).toBeUndefined();
  });

  it("filtro de empresa vale para todos os totais, nao so para porEmpresa", () => {
    const r = resumirRelatorioVendas(
      [venda({}), venda({ vendedor: "Joao", valorVenda: 500, cliente: { empresa: "OUTRA" } })],
      { empresa: "AMAZON FIVE" },
    );
    expect(r.totalVendas).toBe(100);
    expect(r.quantidadeVendas).toBe(1);
    expect(r.porVendedor).toEqual([{ nome: "Maria", total: 100 }]);
  });

  it("lucro desconta a taxa de antecipacao, como o DRE", () => {
    const r = resumirRelatorioVendas([venda({ taxaFinanceiraValor: 25 })], {});
    expect(r.totalCusto).toBe(65);
    expect(r.lucroTotal).toBe(35);
  });

  it("a IA usa as funcoes e a tool de margem anuncia periodo", () => {
    const ia = ler("src/lib/ai-actions.ts");
    expect(ia.includes("resumirRelatorioVendas(")).toBe(true);
    expect(ia.includes("filtroPeriodoVendas(")).toBe(true);
    const inicio = ia.indexOf('name: "resumo_margem_produto"');
    const def = ia.slice(inicio, inicio + 900);
    expect(def.includes("from:")).toBe(true);
    expect(def.includes("to:")).toBe(true);
  });
});

describe("venda cancelada/estornada fora da antecipacao e da inadimplencia", () => {
  it("espelho e filtro Prisma excluem venda desfeita", () => {
    expect(vendaEhAntecipavel({ formaPagamento: "DESCONTO_FOLHA", descontoEmFolha: true, status: "cancelada" })).toBe(false);
    expect(vendaEhAntecipavel({ formaPagamento: "DESCONTO_FOLHA", descontoEmFolha: true, status: "ativa" })).toBe(true);
    expect(JSON.stringify(WHERE_VENDA_ANTECIPAVEL).includes("cancelada")).toBe(true);
  });

  it("inadimplencia filtra o status da venda e ignora parcela ja antecipada (a Prudent pagou)", () => {
    const rota = ler("src/app/api/relatorios/inadimplencia/route.ts");
    expect(rota.includes("FILTRO_VENDA_VALIDA")).toBe(true);
    expect(rota.includes("antecipada: false")).toBe(true);
  });
});
