import { describe, expect, it } from "vitest";
import {
  consolidarProdutosRelatorio,
  type VendaRelatorioProduto,
} from "@/lib/relatorio-mensal-produtos";

const INICIO = new Date("2026-09-01T00:00:00.000Z");
const FIM = new Date("2026-09-21T23:59:59.999Z");

function venda(
  id: number,
  dataVenda: string,
  extra: Partial<VendaRelatorioProduto> = {}
): VendaRelatorioProduto {
  return {
    id,
    dataVenda: new Date(`${dataVenda}T12:00:00.000Z`),
    formaPagamento: "DESCONTO_FOLHA",
    descontoEmFolha: false,
    itens: [{ produtoNome: "Notebook", quantidade: 1, subtotal: 300 }],
    parcelasVencimento: [
      {
        numeroParcela: 1,
        dataVencimento: new Date("2026-10-10T00:00:00.000Z"),
        valorParcela: 300,
      },
    ],
    cliente: {
      id: 10,
      nome: "Ana Lima",
      cpf: "123.456.789-00",
      matricula: "0010",
      empresa: "Amazon Five",
    },
    ...extra,
  };
}

describe("consolidarProdutosRelatorio", () => {
  it("mantem produtos separados e soma compras repetidas apenas no mesmo funcionario e produto", () => {
    const resultado = consolidarProdutosRelatorio(
      [
        venda(1, "2026-09-05", {
          itens: [
            { produtoNome: " Notebook ", quantidade: 1, subtotal: 600 },
            { produtoNome: "Mouse", quantidade: 1, subtotal: 200 },
          ],
          parcelasVencimento: [
            { numeroParcela: 1, dataVencimento: new Date("2026-10-10T00:00:00.000Z"), valorParcela: 400 },
            { numeroParcela: 2, dataVencimento: new Date("2026-11-10T00:00:00.000Z"), valorParcela: 400 },
          ],
        }),
        venda(2, "2026-09-12", {
          cliente: {
            id: 999,
            nome: "ANA LIMA",
            cpf: "12345678900",
            matricula: "0010",
            empresa: "Amazon Five",
          },
          itens: [{ produtoNome: "notebook", quantidade: 1, subtotal: 300 }],
          parcelasVencimento: [
            { numeroParcela: 1, dataVencimento: new Date("2026-10-10T00:00:00.000Z"), valorParcela: 150 },
            { numeroParcela: 2, dataVencimento: new Date("2026-11-10T00:00:00.000Z"), valorParcela: 150 },
          ],
        }),
      ],
      INICIO,
      FIM
    );

    expect(resultado.linhas).toHaveLength(2);
    expect(resultado.linhas.map(({ produto, valorAcumulado }) => ({ produto, valorAcumulado }))).toEqual([
      { produto: "Mouse", valorAcumulado: 200 },
      { produto: "Notebook", valorAcumulado: 900 },
    ]);
    expect(resultado.linhas[1]).toMatchObject({
      clienteId: 10,
      nome: "Ana Lima",
      cpf: "123.456.789-00",
      matricula: "0010",
      empresa: "Amazon Five",
      dataCompra: "05/09/2026, 12/09/2026",
      parcela: "1/2, 2/2",
      dataDesconto: "10/10/2026, 10/11/2026",
    });
    expect(resultado).toMatchObject({ totalFuncionarios: 1, totalProdutos: 2, totalDesconto: 1100 });
  });

  it("distribui o centavo residual pelo produto canonico independentemente da ordem dos itens", () => {
    const consolidar = (itens: VendaRelatorioProduto["itens"]) =>
      consolidarProdutosRelatorio(
        [
          venda(9, "2026-09-10", {
            itens,
            parcelasVencimento: [
              {
                numeroParcela: 1,
                dataVencimento: new Date("2026-10-10T00:00:00.000Z"),
                valorParcela: 1.01,
              },
            ],
          }),
        ],
        INICIO,
        FIM
      ).linhas.map(({ produto, valorAcumulado }) => ({ produto, valorAcumulado }));
    const itens = [
      { produtoNome: "Mouse", quantidade: 1, subtotal: 1 },
      { produtoNome: "Notebook", quantidade: 1, subtotal: 1 },
    ];
    const esperado = [
      { produto: "Mouse", valorAcumulado: 0.5 },
      { produto: "Notebook", valorAcumulado: 0.51 },
    ];

    expect(consolidar(itens)).toEqual(esperado);
    expect(consolidar([...itens].reverse())).toEqual(esperado);
  });

  it("nao mistura o mesmo produto de clientes diferentes e ordena por nome e produto", () => {
    const resultado = consolidarProdutosRelatorio(
      [
        venda(3, "2026-09-08", {
          cliente: { id: 20, nome: "Bruno", cpf: null, matricula: "20", empresa: "Empresa B" },
        }),
        venda(4, "2026-09-07", {
          cliente: { id: 30, nome: "Álvaro", cpf: null, matricula: "30", empresa: "Empresa A" },
        }),
      ],
      INICIO,
      FIM
    );

    expect(resultado.linhas.map((linha) => [linha.nome, linha.produto, linha.valorAcumulado])).toEqual([
      ["Álvaro", "Notebook", 300],
      ["Bruno", "Notebook", 300],
    ]);
    expect(resultado.totalFuncionarios).toBe(2);
  });

  it("exclui vendas fora do periodo e vendas que nao sao desconto em folha", () => {
    const resultado = consolidarProdutosRelatorio(
      [
        venda(5, "2026-08-31"),
        venda(6, "2026-09-22"),
        venda(7, "2026-09-10", { formaPagamento: "PIX", descontoEmFolha: false }),
      ],
      INICIO,
      FIM
    );

    expect(resultado).toEqual({ linhas: [], totalFuncionarios: 0, totalProdutos: 0, totalDesconto: 0 });
  });

  it("inclui venda exatamente no inicio do periodo", () => {
    const resultado = consolidarProdutosRelatorio(
      [venda(10, "2026-09-01", { dataVenda: new Date(INICIO) })],
      INICIO,
      FIM
    );

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({ dataCompra: "01/09/2026", valorAcumulado: 300 });
  });

  it("inclui venda exatamente no fim do periodo", () => {
    const resultado = consolidarProdutosRelatorio(
      [venda(11, "2026-09-21", { dataVenda: new Date(FIM) })],
      INICIO,
      FIM
    );

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({ dataCompra: "21/09/2026", valorAcumulado: 300 });
  });

  it("usa o produto legado e o valor da venda quando nao ha itens nem parcelas", () => {
    const resultado = consolidarProdutosRelatorio(
      [
        venda(8, "2026-09-10", {
          formaPagamento: null,
          descontoEmFolha: true,
          itens: [],
          parcelasVencimento: [],
          produtoNome: "Cadeira",
          valorVenda: 125.5,
          quantidade: 2,
        }),
      ],
      INICIO,
      FIM
    );

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({ produto: "Cadeira", valorAcumulado: 251, parcela: "1/1" });
    expect(resultado.totalDesconto).toBe(251);
  });

  it("retorna totais zerados quando nao ha vendas", () => {
    expect(consolidarProdutosRelatorio([], INICIO, FIM)).toEqual({
      linhas: [],
      totalFuncionarios: 0,
      totalProdutos: 0,
      totalDesconto: 0,
    });
  });
});
