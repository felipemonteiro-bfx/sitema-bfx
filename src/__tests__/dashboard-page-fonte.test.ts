import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Lê a fonte da página: ela é um server component com Prisma, então o contrato do Início
// (o que saiu, o que ficou) é fixado pelo texto, como os outros testes de tela.
const fonte = readFileSync(join(process.cwd(), "src/app/(app)/dashboard/page.tsx"), "utf8");

describe("Início (/dashboard): decisão 3 do redesign", () => {
  it.each(["Hall da Fama", "Resumo Rápido", "Atalhos Rápidos", "Top vendedor", "Ticket médio"])(
    "não tem mais %s",
    (texto) => {
      expect(fonte).not.toContain(texto);
    }
  );

  it("não usa mais os formatos antigos do KpiCard e do DashboardCharts", () => {
    expect(fonte).not.toContain("DashboardCharts");
    expect(fonte).not.toContain("tendencia=");
    expect(fonte).not.toContain("contexto=");
  });
});

describe("Início (/dashboard): o que continua", () => {
  it("guarda de admin", () => {
    expect(fonte).toContain("requireAdmin");
  });

  it("filtro de vendedores e de datas dentro do popover Filtros", () => {
    expect(fonte).toContain("VendorMultiSelect");
    expect(fonte).toContain("DateInput");
    expect(fonte).toContain("PopoverContent");
    expect(fonte).toContain("Filtros");
  });

  it("Mural de Avisos", () => {
    expect(fonte).toContain("Mural de Avisos");
    expect(fonte).toContain("prisma.aviso.findMany");
  });

  it("cabeçalho: trilha do período, título, selo e segmentado", () => {
    expect(fonte).toContain("Dashboard Executivo");
    expect(fonte).toContain("rotuloPeriodo");
    expect(fonte).toContain("ehMesEmAndamento");
    expect(fonte).toContain("Mês em andamento");
    expect(fonte).toContain('variant="marca"');
    expect(fonte).toContain("PeriodoSegmentado");
    expect(fonte).toContain("selo=");
  });

  it("Raio-X da equipe com as colunas Vendedor, Vendas, Faturamento e Margem", () => {
    expect(fonte).toContain("Raio-X da equipe");
    for (const col of ["Vendedor", "Vendas", "Faturamento", "Margem"]) {
      expect(fonte).toContain(`>${col}</TableHead>`);
    }
    expect(fonte).not.toContain(">Lucro</TableHead>");
    expect(fonte).not.toContain(">Ticket</TableHead>");
  });

  it("os quatro KPIs no contrato novo", () => {
    expect(fonte.split("<KpiCard").length - 1).toBe(4);
    for (const r of ['rotulo="Faturamento"', 'rotulo="Lucro líquido"', 'rotulo="Margem"', 'rotulo="Clientes"']) {
      expect(fonte).toContain(r);
    }
    expect(fonte).toContain("após despesas do mês");
    expect(fonte).toContain("rodape=");
    expect(fonte).toContain("serie=");
  });

  it("Evolução mensal, Top produtos e Clientes mês a mês", () => {
    expect(fonte).toContain("<EvolucaoMensal");
    expect(fonte).toContain("<TopProdutos");
    expect(fonte).toContain("<ClientesMesAMes");
  });

  it("entrada escalonada e modo discreto nos valores novos", () => {
    expect(fonte).toContain("anim-entrada");
    expect(fonte).toContain('"--i"');
    expect(fonte).toContain("valor-sensivel");
    expect(fonte).toContain("bloco-sensivel");
  });
});

describe("Início (/dashboard): série mensal respeita o filtro de vendedores", () => {
  it("cada mês é calculado com o vendorsFilter, e o gráfico usa custosVar e margem de contribuição", () => {
    expect(fonte).toMatch(/calcularMetricasPeriodo\(\s*mes\.inicio,\s*mes\.fim,\s*vendorsFilter\s*\)/);
    expect(fonte).toContain("custosVar");
    expect(fonte).toContain("m.margem");
  });
});
