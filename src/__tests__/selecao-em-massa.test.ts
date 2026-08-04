import { describe, it, expect } from "vitest";
import {
  alternarSelecaoDaPagina,
  contarSelecionadosForaDaPagina,
  estadoCheckboxDaPagina,
} from "@/lib/selecao-em-massa";

// Contexto: a tabela de Cadastros renderiza table.paginatedData (uma pagina),
// mas o "Selecionar todos" marcava o dataset inteiro. Medido em producao:
// 15 linhas visiveis e a barra dizendo "834 selecionado(s)" — o bulk delete
// seguinte apagaria os 834.

describe("alternarSelecaoDaPagina", () => {
  it("marca apenas os ids visiveis na pagina, nunca o dataset inteiro", () => {
    const visiveis = [1, 2, 3];
    const resultado = alternarSelecaoDaPagina(new Set<number>(), visiveis, true);
    expect([...resultado].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("preserva a selecao feita em outras paginas ao marcar a atual", () => {
    const jaSelecionadoNaPagina1 = new Set([90, 91]);
    const visiveisNaPagina2 = [1, 2];
    const resultado = alternarSelecaoDaPagina(jaSelecionadoNaPagina1, visiveisNaPagina2, true);
    expect([...resultado].sort((a, b) => a - b)).toEqual([1, 2, 90, 91]);
  });

  it("ao desmarcar, remove so os visiveis e mantem os das outras paginas", () => {
    const selecionados = new Set([1, 2, 90, 91]);
    const visiveis = [1, 2];
    const resultado = alternarSelecaoDaPagina(selecionados, visiveis, false);
    expect([...resultado].sort((a, b) => a - b)).toEqual([90, 91]);
  });

  it("nao muta o Set recebido", () => {
    const original = new Set([90]);
    alternarSelecaoDaPagina(original, [1, 2], true);
    expect([...original]).toEqual([90]);
  });

  it("com pagina vazia devolve a selecao inalterada", () => {
    const selecionados = new Set([90, 91]);
    const resultado = alternarSelecaoDaPagina(selecionados, [], true);
    expect([...resultado].sort((a, b) => a - b)).toEqual([90, 91]);
  });

  it("com pagina vazia devolve a MESMA referencia, sem render a toa", () => {
    const selecionados = new Set([90, 91]);
    expect(alternarSelecaoDaPagina(selecionados, [], true)).toBe(selecionados);
  });
});

// A selecao sobrevive a troca de pagina e ao filtro de busca — de proposito,
// mas isso abre um caminho para excluir o que nao se ve. A UI precisa do numero
// para avisar.
describe("contarSelecionadosForaDaPagina", () => {
  it("conta zero quando tudo que esta selecionado esta visivel", () => {
    expect(contarSelecionadosForaDaPagina(new Set([1, 2]), [1, 2, 3])).toBe(0);
  });

  it("conta os selecionados em outra pagina", () => {
    expect(contarSelecionadosForaDaPagina(new Set([1, 90, 91]), [1, 2, 3])).toBe(2);
  });

  it("conta tudo quando a busca escondeu os selecionados", () => {
    expect(contarSelecionadosForaDaPagina(new Set([1, 2, 3]), [])).toBe(3);
  });

  it("conta zero com selecao vazia", () => {
    expect(contarSelecionadosForaDaPagina(new Set(), [1, 2, 3])).toBe(0);
  });
});

describe("estadoCheckboxDaPagina", () => {
  it("marca quando todos os visiveis estao selecionados", () => {
    expect(estadoCheckboxDaPagina(new Set([1, 2, 3]), [1, 2, 3])).toBe(true);
  });

  it("fica indeterminado quando so parte dos visiveis esta selecionada", () => {
    expect(estadoCheckboxDaPagina(new Set([1]), [1, 2, 3])).toBe("indeterminate");
  });

  it("fica desmarcado quando nenhum visivel esta selecionado", () => {
    expect(estadoCheckboxDaPagina(new Set(), [1, 2, 3])).toBe(false);
  });

  it("ignora selecao de outras paginas ao decidir o estado", () => {
    // 90 e 91 sao de outra pagina; nenhum visivel esta marcado
    expect(estadoCheckboxDaPagina(new Set([90, 91]), [1, 2, 3])).toBe(false);
  });

  it("marca quando os visiveis estao todos selecionados, mesmo havendo outros", () => {
    expect(estadoCheckboxDaPagina(new Set([1, 2, 3, 90]), [1, 2, 3])).toBe(true);
  });

  it("fica desmarcado com pagina vazia", () => {
    expect(estadoCheckboxDaPagina(new Set([90]), [])).toBe(false);
  });
});
