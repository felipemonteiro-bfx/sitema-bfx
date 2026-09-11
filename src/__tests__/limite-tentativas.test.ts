// Limite de tentativas do login (2026-09-11, achado MEDIUM do hook de
// segurança): falhas por chave numa janela de tempo, em memória.
import { describe, it, expect } from "vitest";
import { criarLimitador } from "@/lib/limite-tentativas";

describe("criarLimitador — falhas por chave numa janela", () => {
  it("bloqueia ao atingir o limite e diz quantos segundos faltam", () => {
    const l = criarLimitador({ limite: 3, janelaMs: 60_000 });
    l.registrarFalha("a", 1000);
    l.registrarFalha("a", 1001);
    l.registrarFalha("a", 1002);
    // A falha mais antiga (1000) sai da janela em 61000.
    expect(l.situacao("a", 2000)).toEqual({ bloqueado: true, esperarSegundos: 59 });
  });

  it("abaixo do limite não bloqueia", () => {
    const l = criarLimitador({ limite: 3, janelaMs: 60_000 });
    l.registrarFalha("a", 1000);
    l.registrarFalha("a", 1001);
    expect(l.situacao("a", 2000)).toEqual({ bloqueado: false, esperarSegundos: 0 });
  });

  it("falha antiga sai da janela", () => {
    const l = criarLimitador({ limite: 2, janelaMs: 60_000 });
    l.registrarFalha("a", 1000);
    l.registrarFalha("a", 2000);
    expect(l.situacao("a", 61_000).bloqueado).toBe(false);
  });

  it("limpar zera a chave", () => {
    const l = criarLimitador({ limite: 1, janelaMs: 60_000 });
    l.registrarFalha("a", 1000);
    l.limpar("a");
    expect(l.situacao("a", 1001).bloqueado).toBe(false);
  });

  it("chaves são independentes", () => {
    const l = criarLimitador({ limite: 1, janelaMs: 60_000 });
    l.registrarFalha("a", 1000);
    expect(l.situacao("b", 1001).bloqueado).toBe(false);
  });

  it("não cresce sem fim: guarda no máximo maxChaves, descartando a mais antiga", () => {
    const l = criarLimitador({ limite: 1, janelaMs: 60_000, maxChaves: 2 });
    l.registrarFalha("a", 1);
    l.registrarFalha("b", 2);
    l.registrarFalha("c", 3);
    expect(l.tamanho()).toBe(2);
    expect(l.situacao("a", 4).bloqueado).toBe(false);
    expect(l.situacao("c", 4).bloqueado).toBe(true);
  });
});

describe("desfazerFalha — o login certo devolve só a própria tentativa", () => {
  it("registrarFalha devolve o instante gravado", () => {
    const l = criarLimitador({ limite: 1, janelaMs: 1000 });
    expect(l.registrarFalha("a", 42)).toBe(42);
  });

  it("tira aquele registro e mantém os anteriores", () => {
    const l = criarLimitador({ limite: 2, janelaMs: 60_000 });
    l.registrarFalha("ip", 1000);
    const instante = l.registrarFalha("ip", 2000);
    l.desfazerFalha("ip", instante);
    expect(l.situacao("ip", 3000).bloqueado).toBe(false);
    l.registrarFalha("ip", 3000);
    expect(l.situacao("ip", 3001).bloqueado).toBe(true);
  });
});
