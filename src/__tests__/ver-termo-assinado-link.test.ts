import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerTermoAssinadoLink } from "@/components/ver-termo-assinado-link";

describe("Ver termo antes de enviar ao RH", () => {
  it("abre o PDF assinado no navegador, sem forçar download", () => {
    const markup = renderToStaticMarkup(React.createElement(VerTermoAssinadoLink, { vendaId: 42 }));

    expect(markup).toContain("Ver termo");
    expect(markup).toContain('href="/api/assinatura/documento?vendaId=42&amp;inline=1"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("Abre em uma nova aba");
    expect(markup).not.toContain("download=");
  });

  it("fica dentro do bloco de venda assinada, antes de reenviar ao RH", () => {
    const fonte = readFileSync("src/app/(app)/historico/page.tsx", "utf8");
    const inicio = fonte.indexOf("return termoEmail.mostrarReenvio &&");
    const fim = fonte.indexOf("EnviarEmailEmpresaButton", inicio);
    const bloco = fonte.slice(inicio, fim);

    expect(inicio).toBeGreaterThan(-1);
    expect(bloco).toContain("<VerTermoAssinadoLink");
  });

  it("no cartão do celular só aparece quando a venda está assinada", () => {
    const fonte = readFileSync("src/components/historico-vendas-cards.tsx", "utf8");

    expect(fonte).toContain('assinaturaStatus === "assinado" ? (\n              <VerTermoAssinadoLink');
    expect(fonte).toContain("<CopiarLinkAssinatura");
    expect(fonte).toContain('className="touch-manipulation min-h-[44px]"');
  });
});
