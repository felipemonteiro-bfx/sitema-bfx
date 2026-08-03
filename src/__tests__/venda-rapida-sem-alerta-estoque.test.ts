// Trava de regressao da decisao de negocio UXP-01 / UXP-02 / D-03.
//
// D-03 (decisao do Andre, 2026-08-03): a venda rapida deixa de exibir qualquer
// alerta de estoque (badge "Sem estoque", rotulo de estoque baixo) e deixa de
// aplicar teto de quantidade baseado no estoque disponivel. O decremento de
// estoque na gravacao da venda (`src/app/(app)/venda-rapida/actions.ts`)
// continua intacto — so o controle na tela sumiu.
//
// Este arquivo trava a DECISAO DE NEGOCIO, protegendo os dois lados dela: o
// que saiu (avisos, teto) e o que ficou (decremento). Se algum "hardening"
// futuro reintroduzir controle de estoque na tela do PDV, os testes abaixo
// devem quebrar, com esta explicacao a vista.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const componentePath = "src/components/produto-item-form.tsx";
const actionsPath = "src/app/(app)/venda-rapida/actions.ts";
const policyPath = "src/lib/estoque-venda-policy.ts";

function lerFonte(caminho: string): string {
  return readFileSync(caminho, "utf8");
}

describe("UXP-01/UXP-02: alertas de estoque nao voltam a venda rapida (D-03)", () => {
  it("o componente da venda rapida nao contem nenhum identificador de alerta de estoque nem teto no input de quantidade", () => {
    const componente = lerFonte(componentePath);
    const proibidos = [
      "estoqueDisponivel",
      "semEstoque",
      "Sem estoque",
      "AlertTriangle",
      "qtdEstoque <= 0",
      "qtdEstoque <= 5",
    ];
    const achados = proibidos.filter((p) => componente.includes(p));
    expect(achados).toEqual([]);
    expect(componente.includes("max={")).toBe(false);
  });

  it("o componente continua chamando aplicarTetoQuantidade a partir de estoque-venda-policy", () => {
    const componente = lerFonte(componentePath);
    expect(componente.includes("aplicarTetoQuantidade(")).toBe(true);
    expect(componente.includes("@/lib/estoque-venda-policy")).toBe(true);
  });

  it("actions.ts continua com exatamente 2 ocorrencias do decremento de estoque (D-03: o que fica)", () => {
    const actions = lerFonte(actionsPath);
    const decrementos = actions.split("qtdEstoque: { decrement:").length - 1;
    expect(decrementos).toBe(2);
  });

  it("estoque-venda-policy.ts continua sem nenhuma linha de import (modulo puro)", () => {
    const policy = lerFonte(policyPath);
    const linhasDeImport = policy
      .split("\n")
      .filter((l) => l.trim().startsWith("import "));
    expect(linhasDeImport).toEqual([]);
  });
});
