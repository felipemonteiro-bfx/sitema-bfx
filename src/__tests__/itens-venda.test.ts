// Tabela do popover de produtos da fila de antecipação (2026-09-11).
//
// A lista mostrava "CROPPED BÁSIC MARROM (2x) R$ 90,00" e o André perguntou "o
// que é 1x 2x?". Agora é uma tabela Produto | Qtd. | Valor, com o preço de
// cada unidade quando a quantidade passa de 1 e o total no rodapé.
import { describe, it, expect } from "vitest";
import { linhasDosItens } from "@/lib/itens-venda";

describe("linhasDosItens", () => {
  it("preço de cada unidade só aparece quando a quantidade passa de 1", () => {
    const { linhas } = linhasDosItens([
      { produtoNome: "CROPPED BÁSIC MARROM", quantidade: 2, subtotal: 90 },
      { produtoNome: "CHAPÉU VAQUEJADA", quantidade: 1, subtotal: 440 },
    ]);
    expect(linhas[0]).toEqual({ produtoNome: "CROPPED BÁSIC MARROM", quantidade: 2, subtotal: 90, unitario: 45 });
    expect(linhas[1].unitario).toBeNull();
  });

  it("preço unitário arredonda para centavos", () => {
    const { linhas } = linhasDosItens([{ produtoNome: "KIT", quantidade: 3, subtotal: 100 }]);
    expect(linhas[0].unitario).toBe(33.33);
  });

  it("quantidade zero ou inválida não divide por zero", () => {
    const { linhas, totais } = linhasDosItens([{ produtoNome: "ITEM", quantidade: 0, subtotal: 50 }]);
    expect(linhas[0].unitario).toBeNull();
    expect(totais).toEqual({ quantidade: 0, valor: 50 });
  });

  it("totais da venda real que o André mostrou: 12 unidades, R$ 4.274,99", () => {
    const { totais } = linhasDosItens([
      { produtoNome: "CHAPÉU VAQUEJADA", quantidade: 1, subtotal: 440 },
      { produtoNome: "CROPPED BÁSIC MARROM", quantidade: 2, subtotal: 90 },
      { produtoNome: "BOLSA V VOICCE", quantidade: 1, subtotal: 179.99 },
      { produtoNome: "CONJUNTO IIAHO ROSA", quantidade: 1, subtotal: 490 },
      { produtoNome: "CONJUNTO LAVINK", quantidade: 1, subtotal: 400 },
      { produtoNome: "VESTIDO GRÉCIA", quantidade: 1, subtotal: 130 },
      { produtoNome: "CONJUNTO ALFAIATARIIA ZARA", quantidade: 1, subtotal: 125 },
      { produtoNome: "CONJUNTO FARM VERÃO", quantidade: 2, subtotal: 600 },
      { produtoNome: "KIT PERFUME EUDORA SUAVE", quantidade: 1, subtotal: 520 },
      { produtoNome: 'SMARTPHONE GALAXY A07 TELA 6.7" 128GB 4G OCTA CORE ANDROID - SAMSUNG', quantidade: 1, subtotal: 1300 },
    ]);
    expect(totais).toEqual({ quantidade: 12, valor: 4274.99 });
  });

  it("soma em centavos não acumula erro de ponto flutuante", () => {
    const { totais } = linhasDosItens([
      { produtoNome: "A", quantidade: 1, subtotal: 0.1 },
      { produtoNome: "B", quantidade: 1, subtotal: 0.2 },
    ]);
    expect(totais.valor).toBe(0.3);
  });
});
