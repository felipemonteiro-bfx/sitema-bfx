import { describe, it, expect } from "vitest";
import {
  validarForcaMinima,
  validarTrocaDeSenha,
  gerarSenhaForte,
  TAMANHO_MINIMO_SENHA,
} from "@/lib/senha-politica";

/**
 * Modulo isomorfico (sem node:crypto) — importado tanto por Server Action
 * quanto por componente 'use client' (D-03).
 */
describe("validarForcaMinima", () => {
  it("Teste 1a: senha com menos de 8 caracteres e' recusada com mensagem sobre o minimo", () => {
    const resultado = validarForcaMinima("1234567");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toContain(String(TAMANHO_MINIMO_SENHA));
    }
  });

  it("Teste 1b: senha com 8 caracteres e' aceita", () => {
    expect(validarForcaMinima("12345678")).toEqual({ ok: true });
  });
});

describe("validarTrocaDeSenha", () => {
  it("Teste 2: confirmacao divergente e' recusada", () => {
    const resultado = validarTrocaDeSenha({
      nova: "senhaboa1",
      confirmacao: "senhaboa2",
      igualAtual: false,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toMatch(/confirma/i);
    }
  });

  it("Teste 3: nova senha igual a atual e' recusada", () => {
    const resultado = validarTrocaDeSenha({
      nova: "senhaboa1",
      confirmacao: "senhaboa1",
      igualAtual: true,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toMatch(/igual/i);
    }
  });

  it("Teste 4: nova valida, confirmacao igual e diferente da atual e' aceita", () => {
    const resultado = validarTrocaDeSenha({
      nova: "senhaboa1",
      confirmacao: "senhaboa1",
      igualAtual: false,
    });
    expect(resultado).toEqual({ ok: true });
  });
});

describe("gerarSenhaForte", () => {
  it("Teste 5: gera o tamanho pedido, chamadas diferentes, sem caracteres ambiguos", () => {
    const AMBIGUOS = new Set(["0", "O", "o", "l", "1", "I"]);

    const s1 = gerarSenhaForte(16);
    const s2 = gerarSenhaForte(16);

    expect(s1).toHaveLength(16);
    expect(s2).toHaveLength(16);
    expect(s1).not.toBe(s2);
    for (const c of s1) {
      expect(AMBIGUOS.has(c)).toBe(false);
    }
  });
});
