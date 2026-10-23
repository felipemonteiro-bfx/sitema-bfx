import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { IntelligenceChatComposer } from "@/components/intelligence-chat-composer";
import { perguntaInicial, PERGUNTA_INICIAL_MAX } from "@/lib/pergunta-inicial";

// Tira os marcadores `<!-- -->` que o React põe entre trechos de texto no SSR.
const render = (el: React.ReactElement) => renderToString(el).split("<!-- -->").join("");

describe("perguntaInicial (param ?pergunta= de /inteligencia)", () => {
  it("devolve vazio sem o param", () => {
    expect(perguntaInicial(undefined)).toBe("");
    expect(perguntaInicial("")).toBe("");
    expect(perguntaInicial("   ")).toBe("");
  });

  it("usa o primeiro valor quando o param se repete", () => {
    expect(perguntaInicial(["a", "b"])).toBe("a");
  });

  it("limita o tamanho", () => {
    expect(perguntaInicial("x".repeat(PERGUNTA_INICIAL_MAX + 100))).toHaveLength(PERGUNTA_INICIAL_MAX);
  });
});

describe("IntelligenceChatComposer com initialPrompt", () => {
  it("vem com o campo preenchido e não envia sozinho no mount", () => {
    const action = vi.fn();
    const html = render(
      createElement(IntelligenceChatComposer, { action, showProviderSelect: false, initialPrompt: "vendas de ontem" }),
    );
    expect(html).toMatch(/<textarea[^>]*name="prompt"[^>]*>vendas de ontem<\/textarea>/);
    // Texto presente: o botão de envio aparece (não o de gravar áudio).
    expect(html).toContain('aria-label="Enviar mensagem"');
    expect(action).not.toHaveBeenCalled();
  });

  it("sem initialPrompt o campo vem vazio", () => {
    const html = render(createElement(IntelligenceChatComposer, { action: vi.fn(), showProviderSelect: false }));
    expect(html).toMatch(/<textarea[^>]*name="prompt"[^>]*><\/textarea>/);
    expect(html).toContain('aria-label="Gravar áudio"');
  });
});
