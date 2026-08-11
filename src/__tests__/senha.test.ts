import { describe, it, expect } from "vitest";
import { hashSenha, verificarSenha, verificarSenhaFalsa, ehHashScrypt, PREFIXO_SCRYPT } from "@/lib/senha";

/**
 * T-CYM-07: substitui a senha em texto puro por hash scrypt (node:crypto,
 * sem instalar pacote). Sem mock — modulo puro, sem I/O.
 */
describe("hashSenha / verificarSenha / ehHashScrypt", () => {
  it("Teste 1: hashSenha gera salt aleatorio (hashes diferentes), e verificarSenha aceita os dois", async () => {
    const hash1 = await hashSenha("segredo123");
    const hash2 = await hashSenha("segredo123");

    expect(hash1).not.toBe(hash2);
    expect(await verificarSenha("segredo123", hash1)).toBe(true);
    expect(await verificarSenha("segredo123", hash2)).toBe(true);
  });

  it("Teste 2: senha errada nao verifica", async () => {
    const hash = await hashSenha("segredo123");
    expect(await verificarSenha("errada", hash)).toBe(false);
  });

  it("Teste 3: valor devolvido comeca com o prefixo do formato e tem 6 campos separados por $; ehHashScrypt aceita", async () => {
    const hash = await hashSenha("segredo123");

    expect(hash.startsWith(`${PREFIXO_SCRYPT}$`)).toBe(true);
    expect(hash.split("$").length).toBe(6);
    expect(ehHashScrypt(hash)).toBe(true);
  });

  it("Teste 4: caminho legado — texto puro nao passa em ehHashScrypt, mas verifica contra si mesmo", async () => {
    expect(ehHashScrypt("senhaEmTextoPuro")).toBe(false);
    expect(await verificarSenha("senhaEmTextoPuro", "senhaEmTextoPuro")).toBe(true);
  });

  it("Teste 5: espacos nas pontas do valor digitado sao ignorados, no caminho novo e no legado", async () => {
    const hash = await hashSenha("segredo123");

    expect(await verificarSenha("  segredo123  ", hash)).toBe(true);
    expect(await verificarSenha("  senhaLegada  ", "senhaLegada")).toBe(true);
  });

  it("Teste 6: valor armazenado vazio nao lanca; valor com prefixo mas mal-formado nao cai no comparador de texto puro (T-CYM-04)", async () => {
    expect(await verificarSenha("qualquer", "")).toBe(false);

    const malformado = `${PREFIXO_SCRYPT}$abc$8$1$saltinvalido$hashinvalido`;
    expect(ehHashScrypt(malformado)).toBe(false);
    // Mesmo comparando o valor mal-formado contra si mesmo, nao pode
    // autenticar caindo no comparador legado de texto puro.
    expect(await verificarSenha(malformado, malformado)).toBe(false);
  });

  it("Teste 7: verificarSenhaFalsa sempre resolve false, gastando o tempo de um scrypt real", async () => {
    expect(await verificarSenhaFalsa("qualquer")).toBe(false);
  });
});
