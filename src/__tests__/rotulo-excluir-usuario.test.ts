import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rotuloDoPerfil } from "@/lib/rotulo-perfil";

/**
 * Fase 18 — "rotulo errado".
 *
 * O botao de excluir dizia "Excluir Vendedor" para todo mundo, inclusive para
 * o `Administrador`: era string fixa, sem condicional por perfil
 * (`delete-user-button.tsx:55` no momento do achado). Este e o unico dos
 * achados da fase com logica condicional de verdade — os outros sao markup e
 * classe de cor, cobertos pelas catracas de contraste.
 *
 * Nota de seguranca (CLAUDE.md): nada de regex com estado aqui.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("rotulo do botao de excluir usuario", () => {
  it('admin vira "Administrador"', () => {
    expect(rotuloDoPerfil("admin")).toBe("Administrador");
  });

  it('vendedor vira "Vendedor"', () => {
    expect(rotuloDoPerfil("vendedor")).toBe("Vendedor");
  });

  it("perfil ausente cai em Vendedor, igual ao default do formulario", () => {
    // `gestao-rh/page.tsx` usa `u.role || "vendedor"` no select; o rotulo
    // precisa concordar com esse mesmo default.
    expect(rotuloDoPerfil(undefined)).toBe("Vendedor");
    expect(rotuloDoPerfil(null)).toBe("Vendedor");
    expect(rotuloDoPerfil("")).toBe("Vendedor");
  });

  it("admin e vendedor produzem rotulos DIFERENTES (o defeito era serem iguais)", () => {
    expect(rotuloDoPerfil("admin")).not.toBe(rotuloDoPerfil("vendedor"));
  });

  it("o componente deriva o rotulo do perfil em vez de fixa-lo", () => {
    // Checar a ausencia da string "Excluir Vendedor" seria fragil: ela aparece
    // (legitimamente) no comentario que explica o defeito. O que importa e que
    // o rotulo saia da funcao.
    const fonte = ler("src/components/delete-user-button.tsx");
    expect(fonte.includes("Excluir {rotuloDoPerfil(userRole)}")).toBe(true);
  });

  it("a pagina de RH passa o perfil do usuario para o botao", () => {
    const fonte = ler("src/app/(app)/gestao-rh/page.tsx");
    expect(
      fonte.includes("userRole={u.role}"),
      "sem a prop o rotulo volta a ser sempre 'Vendedor'",
    ).toBe(true);
  });
});
