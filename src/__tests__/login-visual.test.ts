import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import path from "node:path";

// A página de login usa o router do Next; no SSR de teste basta um stub.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import LoginPage from "@/app/(auth)/login/page";

// Tira os marcadores `<!-- -->` que o React põe entre trechos de texto no SSR.
const html = renderToString(createElement(LoginPage)).split("<!-- -->").join("");
const lerFonte = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

// Tags de abertura que contêm um trecho (sem regex de exec).
function tagsCom(trecho: string): string[] {
  return html
    .split("<")
    .filter((p) => p.includes(trecho))
    .map((p) => p.split(">")[0]);
}

describe("tela de login (Vantage)", () => {
  it("tem um h1 'Entrar'", () => {
    expect(html).toContain(">Entrar</h1>");
  });

  it("não oferece 'esqueci a senha' (a função não existe)", () => {
    expect(html.toLowerCase()).not.toContain("esqueci");
  });

  it("painel de marca é decorativo: aria-hidden, shell, sem números", () => {
    const partes = html.split('data-painel-marca="true"');
    expect(partes.length).toBe(2);
    const [abertura] = tagsCom('data-painel-marca="true"');
    expect(abertura).toContain('aria-hidden="true"');
    expect(abertura).toContain("rounded-shell");
    expect(abertura).toContain("bg-card");
    const texto = partes[1].split("</section>")[0].split(">").slice(1).map((t) => t.split("<")[0]).join(" ");
    // Nenhum dígito no texto do painel (valores, meses, percentuais).
    expect(texto.split("").some((c) => c >= "0" && c <= "9")).toBe(false);
    expect(texto).toContain("Vendas, parcelas e antecipação num lugar só.");
    expect(texto).toContain("BFX Manager");
  });

  it("barras animadas com --i", () => {
    expect(html).toContain("anim-barra");
    expect(html).toContain("--i");
  });

  it("usuário, senha e botão têm 48px (h-12) e raio de controle", () => {
    for (const trecho of ['name="username"', 'name="password"', 'type="submit"']) {
      const [tag] = tagsCom(trecho);
      expect(tag, trecho).toContain("h-12");
      expect(tag, trecho).toContain("rounded-controle");
    }
  });

  it("botão de mostrar senha tem 44px", () => {
    const [tag] = tagsCom('aria-label="Mostrar senha"');
    expect(tag).toContain("h-11");
    expect(tag).toContain("w-11");
  });

  it("formulário entra com .anim-entrada", () => {
    const [tag] = tagsCom("form ");
    expect(tag).toContain("anim-entrada");
  });

  it("preserva autocomplete dos campos", () => {
    const baixo = html.toLowerCase();
    expect(baixo).toContain('autocomplete="username"');
    expect(baixo).toContain('autocomplete="current-password"');
  });

  it("região de erro sempre no DOM, role alert com tokens de erro", () => {
    const [tag] = tagsCom('role="alert"');
    expect(tag).toContain("bg-error-bg");
    expect(tag).toContain("text-error-text");
  });
});

describe("login-painel-marca (página pública)", () => {
  const fonte = lerFonte("src/components/login-painel-marca.tsx");
  it("não importa finance, db, prisma nem evolucao-mensal", () => {
    // Só as linhas de import contam: o comentário do arquivo cita esses nomes.
    const imports = fonte.split("\n").filter((l) => l.startsWith("import ")).join("\n");
    expect(imports).not.toContain("@/lib/finance");
    expect(imports).not.toContain("@/lib/db");
    expect(imports).not.toContain("evolucao-mensal");
    expect(imports).not.toContain("prisma");
    expect(imports).not.toContain("@/lib/");
  });
});
