import { describe, it, expect } from "vitest";
import {
  resolverGruposEconomicos,
  montarDadosRelatorio,
  periodoLabel,
  periodoBoundaries,
  periodoMesAnterior,
  type EmpresaLite,
  type VinculoLite,
  type VendaRelatorioMensal,
} from "@/lib/relatorio-mensal";

function empresa(id: number, over: Partial<EmpresaLite> = {}): EmpresaLite {
  return {
    id,
    nome: `Empresa ${id}`,
    emailRh: null,
    emailsExtras: null,
    telefoneRh: null,
    ...over,
  };
}

describe("resolverGruposEconomicos", () => {
  it("empresas sem vinculo formam grupos individuais", () => {
    const grupos = resolverGruposEconomicos([empresa(1), empresa(2)], []);
    expect(grupos.length).toBe(2);
    expect(grupos.map((g) => g.canonica.id)).toEqual([1, 2]);
  });

  it("vinculo direto une duas empresas em um grupo", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(1), empresa(2)],
      [{ empresaId: 1, vinculadaId: 2 }]
    );
    expect(grupos.length).toBe(1);
    expect(grupos[0]!.empresaIds.sort()).toEqual([1, 2]);
  });

  it("vinculos transitivos (1-2, 2-3) unem os tres numa cadeia", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(1), empresa(2), empresa(3)],
      [
        { empresaId: 1, vinculadaId: 2 },
        { empresaId: 2, vinculadaId: 3 },
      ]
    );
    expect(grupos.length).toBe(1);
    expect(grupos[0]!.empresaIds.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("vinculo circular (1-2, 2-3, 3-1) nao entra em loop e forma um grupo", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(1), empresa(2), empresa(3)],
      [
        { empresaId: 1, vinculadaId: 2 },
        { empresaId: 2, vinculadaId: 3 },
        { empresaId: 3, vinculadaId: 1 },
      ]
    );
    expect(grupos.length).toBe(1);
    expect(grupos[0]!.empresaIds.length).toBe(3);
  });

  it("empresa canonica e a primeira com emailRh (nao necessariamente menor id)", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(1), empresa(2, { emailRh: "rh2@x.com" })],
      [{ empresaId: 1, vinculadaId: 2 }]
    );
    expect(grupos[0]!.canonica.id).toBe(2);
  });

  it("sem nenhum emailRh, canonica e a de menor id", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(5), empresa(3)],
      [{ empresaId: 5, vinculadaId: 3 }]
    );
    expect(grupos[0]!.canonica.id).toBe(3);
  });

  it("consolida e deduplica emails (emailRh + emailsExtras) de todo o grupo", () => {
    const grupos = resolverGruposEconomicos(
      [
        empresa(1, { emailRh: "rh@x.com", emailsExtras: "extra@x.com, rh@x.com" }),
        empresa(2, { emailRh: "rh2@x.com" }),
      ],
      [{ empresaId: 1, vinculadaId: 2 }]
    );
    expect(grupos[0]!.emails.sort()).toEqual(["extra@x.com", "rh2@x.com", "rh@x.com"]);
  });

  it("ignora vinculo orfao apontando para empresa inexistente", () => {
    const grupos = resolverGruposEconomicos(
      [empresa(1)],
      [{ empresaId: 1, vinculadaId: 999 }]
    );
    expect(grupos.length).toBe(1);
    expect(grupos[0]!.empresaIds).toEqual([1]);
  });
});

describe("montarDadosRelatorio", () => {
  const base: VendaRelatorioMensal = {
    id: 1,
    dataVenda: new Date(2026, 5, 10),
    cliente: { nome: "João", matricula: "123" },
    itens: [{ produtoNome: "Fone", quantidade: 1, subtotal: 200 }],
  };

  it("soma valorTotal de todas as vendas", () => {
    const dados = montarDadosRelatorio([
      { ...base, id: 1, itens: [{ produtoNome: "A", quantidade: 1, subtotal: 100 }] },
      { ...base, id: 2, itens: [{ produtoNome: "B", quantidade: 2, subtotal: 300 }] },
    ]);
    expect(dados.totalVendas).toBe(2);
    expect(dados.valorTotal).toBe(400);
  });

  it("totalDescontoFolha soma apenas vendas via desconto em folha", () => {
    const dados = montarDadosRelatorio([
      { ...base, id: 1, formaPagamento: "DESCONTO_FOLHA", itens: [{ produtoNome: "A", quantidade: 1, subtotal: 100 }] },
      { ...base, id: 2, formaPagamento: "BOLETO", itens: [{ produtoNome: "B", quantidade: 1, subtotal: 250 }] },
    ]);
    expect(dados.valorTotal).toBe(350);
    expect(dados.totalDescontoFolha).toBe(100);
  });

  it("detecta desconto em folha via flags legados quando formaPagamento e nulo", () => {
    const dados = montarDadosRelatorio([
      { ...base, id: 1, formaPagamento: null, descontoEmFolha: true, itens: [{ produtoNome: "A", quantidade: 1, subtotal: 150 }] },
    ]);
    expect(dados.linhas[0]!.descontoEmFolha).toBe(true);
    expect(dados.totalDescontoFolha).toBe(150);
  });

  it("monta o cronograma de parcelas ordenado por numero", () => {
    const dados = montarDadosRelatorio([
      {
        ...base,
        id: 1,
        parcelasVencimento: [
          { numeroParcela: 2, dataVencimento: new Date(2026, 7, 10), valorParcela: 100 },
          { numeroParcela: 1, dataVencimento: new Date(2026, 6, 10), valorParcela: 100 },
        ],
      },
    ]);
    const linha = dados.linhas[0]!;
    expect(linha.parcelas.map((p) => p.numero)).toEqual([1, 2]);
    expect(linha.parcelasTexto).toContain("2x de");
  });

  it("usa fallback de nome/matricula quando cliente ausente", () => {
    const dados = montarDadosRelatorio([{ ...base, cliente: null }]);
    expect(dados.linhas[0]!.colaborador).toBe("N/D");
    expect(dados.linhas[0]!.matricula).toBe("—");
  });
});

describe("helpers de periodo", () => {
  it("periodoLabel formata mes/ano em pt-BR", () => {
    expect(periodoLabel("2026-07")).toBe("julho/2026");
    expect(periodoLabel("2026-01")).toBe("janeiro/2026");
  });

  it("periodoBoundaries cobre o mes inteiro", () => {
    const { inicio, fim } = periodoBoundaries("2026-02"); // fevereiro (28 dias em 2026)
    expect(inicio.getDate()).toBe(1);
    expect(inicio.getMonth()).toBe(1);
    expect(fim.getDate()).toBe(28);
    expect(fim.getMonth()).toBe(1);
  });

  it("periodoMesAnterior retorna o mes anterior", () => {
    expect(periodoMesAnterior(new Date(2026, 6, 14))).toBe("2026-06"); // julho -> junho
    expect(periodoMesAnterior(new Date(2026, 0, 5))).toBe("2025-12"); // janeiro -> dez ano anterior
  });
});
