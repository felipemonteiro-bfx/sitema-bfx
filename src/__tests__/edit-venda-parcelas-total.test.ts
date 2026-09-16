// Edicao de venda: parcelas somam itens + frete - desconto, e abrir a tela nao redistribui (2026-09-16).
//
// `EditVendaComParcelas` guardava so a soma dos itens e passava esse valor como total das
// parcelas. Como `EditVendaItens` avisa o subtotal logo na montagem, o total mudava de
// `valorTotalVenda` (com frete/desconto) para a soma dos itens e `EditParcelasSection`
// redistribuia as parcelas so por abrir a edicao: venda de R$ 260 + R$ 20 de frete em 2x
// salva sem mexer ficava com parcelas de R$ 130 (soma 260) contra total 280. Producao em
// 16/09: vendas 67, 69, 70, 77, 81, 100, 162 e 228 com esse padrao.
//
// Sem biblioteca de render de componente no projeto: a regra de valor e testada pura e a
// ligacao dos componentes e verificada no fonte (so `.includes()`, sem o metodo de execucao
// de regex — hook de seguranca do CLAUDE.md).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { totalParaParcelas } from "@/lib/parcelas-ajuste";
import { valorTotalVenda } from "@/lib/venda-utils";

const ler = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("totalParaParcelas", () => {
  it("e o mesmo total da venda gravada (itens + frete - desconto)", () => {
    const itens = [{ subtotal: 150 }, { subtotal: 110 }];
    expect(
      totalParaParcelas({ subtotalItens: 260, frete: 20, desconto: 0 }),
    ).toBe(valorTotalVenda({ itens, valorFrete: 20, desconto: 0 }));
    expect(totalParaParcelas({ subtotalItens: 2249, frete: 0, desconto: 149 })).toBe(2100);
  });

  it("arredonda em centavos para nao disparar redistribuicao por ruido de ponto flutuante", () => {
    expect(totalParaParcelas({ subtotalItens: 0.1 + 0.2, frete: 0, desconto: 0 })).toBe(0.3);
  });
});

describe("ligacao dos componentes", () => {
  const comParcelas = ler("src/components/edit-venda-com-parcelas.tsx");
  const form = ler("src/components/edit-venda-historico-form.tsx");

  it("EditVendaComParcelas passa itens + frete - desconto para as parcelas", () => {
    expect(comParcelas.includes("valorTotal={totalParaParcelas({ subtotalItens, frete, desconto })}")).toBe(true);
  });

  it("o subtotal inicial vem dos itens, nao de initialTotal (senao a montagem redistribui)", () => {
    expect(comParcelas.includes("initialTotal")).toBe(false);
    expect(comParcelas.includes("initialItens.reduce((s, i) => s + i.subtotal, 0)")).toBe(true);
  });

  it("o form de edicao acompanha frete e desconto digitados e repassa para as parcelas", () => {
    expect(form.includes("frete={Number(frete) || 0}")).toBe(true);
    expect(form.includes("desconto={Number(desconto) || 0}")).toBe(true);
    expect(form.includes('name="frete"')).toBe(true);
    expect(form.includes('name="desconto"')).toBe(true);
  });
});
