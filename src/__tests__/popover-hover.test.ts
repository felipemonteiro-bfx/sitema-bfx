// Popover de produtos da fila: abre no hover, clique fixa (2026-09-11).
//
// Pedido do André: "abrir o popover no hover; se eu clicar ele continua aberto,
// mas se não clicar ele fecha quando eu sair do componente". No toque não há
// hover: o clique abre e já fixa.
import { describe, it, expect } from "vitest";
import { transicaoPopoverHover, POPOVER_FECHADO } from "@/lib/popover-hover";
import { moverDestaque } from "@/lib/lista-teclado";

describe("transicaoPopoverHover", () => {
  it("passar o mouse abre sem fixar", () => {
    expect(transicaoPopoverHover(POPOVER_FECHADO, "entrar")).toEqual({ aberto: true, fixo: false });
  });

  it("sair sem ter clicado fecha", () => {
    const aberto = transicaoPopoverHover(POPOVER_FECHADO, "entrar");
    expect(transicaoPopoverHover(aberto, "sair")).toEqual(POPOVER_FECHADO);
  });

  it("clicar com ele aberto pelo hover fixa, e sair não fecha mais", () => {
    const aberto = transicaoPopoverHover(POPOVER_FECHADO, "entrar");
    const fixo = transicaoPopoverHover(aberto, "clicar");
    expect(fixo).toEqual({ aberto: true, fixo: true });
    expect(transicaoPopoverHover(fixo, "sair")).toEqual(fixo);
  });

  it("clicar de novo no gatilho fixo fecha", () => {
    expect(transicaoPopoverHover({ aberto: true, fixo: true }, "clicar")).toEqual(POPOVER_FECHADO);
  });

  it("no toque (sem hover), o clique abre e já fixa", () => {
    expect(transicaoPopoverHover(POPOVER_FECHADO, "clicar")).toEqual({ aberto: true, fixo: true });
  });

  it("clique fora ou Esc fecha mesmo fixo", () => {
    expect(transicaoPopoverHover({ aberto: true, fixo: true }, "fechar")).toEqual(POPOVER_FECHADO);
  });

  it("entrar de novo com ele fixo não desfaz o fixo", () => {
    expect(transicaoPopoverHover({ aberto: true, fixo: true }, "entrar")).toEqual({ aberto: true, fixo: true });
  });
});

describe("moverDestaque — setas na lista do dropdown", () => {
  it("seta para baixo avança e volta ao começo no fim", () => {
    expect(moverDestaque(0, 3, "ArrowDown")).toBe(1);
    expect(moverDestaque(2, 3, "ArrowDown")).toBe(0);
  });

  it("seta para cima recua e vai ao fim a partir do começo", () => {
    expect(moverDestaque(1, 3, "ArrowUp")).toBe(0);
    expect(moverDestaque(0, 3, "ArrowUp")).toBe(2);
  });

  it("sem destaque, a primeira seta para baixo pega o primeiro e para cima o último", () => {
    expect(moverDestaque(-1, 3, "ArrowDown")).toBe(0);
    expect(moverDestaque(-1, 3, "ArrowUp")).toBe(2);
  });

  it("Home e End vão às pontas", () => {
    expect(moverDestaque(1, 5, "Home")).toBe(0);
    expect(moverDestaque(1, 5, "End")).toBe(4);
  });

  it("lista vazia não tem destaque", () => {
    expect(moverDestaque(0, 0, "ArrowDown")).toBe(-1);
  });
});
