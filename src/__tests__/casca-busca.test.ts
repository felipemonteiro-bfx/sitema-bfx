import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BotaoBuscaMobile } from "@/components/mobile-menu-trigger";
import { BuscaRapidaGatilho } from "@/components/busca-rapida";

// Lê o fonte do layout (server component async, que não dá para renderizar em node).
const layout = readFileSync(join(process.cwd(), "src/app/(app)/layout.tsx"), "utf8");
const ocorrencias = (texto: string, trecho: string) => texto.split(trecho).length - 1;

describe("busca ⌘K na casca (F3)", () => {
  it("monta <BuscaRapida> UMA vez, com o perfil da sessão, fora do SidebarContent", () => {
    expect(ocorrencias(layout, "<BuscaRapida ")).toBe(1);
    expect(layout).toContain("<BuscaRapida role={session.role} urlPendentes={urlPendentes} />");
    // O SidebarContent é montado duas vezes: a paleta (um só listener de teclado) não pode ficar nele.
    const corpoSidebar = layout.split("function SidebarContent")[1] ?? "";
    expect(corpoSidebar).not.toContain("<BuscaRapida ");
  });

  it("o gatilho entra no slot `busca` da sidebar do desktop, uma vez", () => {
    expect(ocorrencias(layout, "busca={<BuscaRapidaGatilho")).toBe(1);
  });

  it("o gatilho anuncia o atalho (aria-keyshortcuts)", () => {
    const html = renderToStaticMarkup(createElement(BuscaRapidaGatilho));
    expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
  });

  it("o cabeçalho mobile tem o botão de busca de 44px com nome acessível", () => {
    const html = renderToStaticMarkup(createElement(BotaoBuscaMobile));
    expect(html).toContain('aria-label="Buscar (Ctrl K)"');
    expect(html).toContain("size-11");
    expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
    expect(layout).toContain("<BotaoBuscaMobile");
  });

  it("sino e olho no desktop não ocupam linha própria acima do conteúdo", () => {
    expect(layout).toContain("lg:float-right");
  });
});
