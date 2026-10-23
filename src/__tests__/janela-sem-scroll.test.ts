import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// A janela própria do WhatsApp não pode rolar a página: cabeçalho + atendimento cabem na
// tela e só o log de mensagens rola por dentro. O cálculo antigo (`h-dvh -mb-22 pb-22`)
// dependia da altura exata do cabeçalho e deixava sobra de scroll.
const fonte = readFileSync(join(process.cwd(), "src/app/(app)/crm/atendimento/tela-atendimento.tsx"), "utf8");

describe("janela do atendimento sem scroll de página", () => {
  it("a janela é uma coluna da altura da tela com overflow escondido", () => {
    expect(fonte).toContain("flex h-dvh flex-col overflow-hidden bg-background");
  });
  it("o main da janela é flex-1 com min-h-0 (o atendimento ocupa só o resto)", () => {
    expect(fonte).toContain("<main className={`flex min-h-0 flex-1 flex-col");
  });
  it("não usa mais a compensação fixa do cabeçalho na janela", () => {
    expect(fonte).not.toContain("h-dvh -mb-22 pb-22");
  });
  it("o main da janela não rola em volta do kanban", () => {
    expect(fonte).not.toContain("visao==='kanban'?'overflow-y-auto'");
    expect(fonte).toContain("flex min-h-0 flex-1 flex-col overflow-hidden p-3 lg:p-4");
  });
  it("o corpo do kanban ocupa o resto da altura (janela) ou a altura compensada (rota normal)", () => {
    const trecho = fonte.slice(fonte.indexOf("const corpo=visao==='kanban'"), fonte.indexOf("<div data-atendimento-raiz"));
    expect(trecho).toContain("min-h-0 flex-1");
    expect(trecho).toContain("${alturaKanban}");
    expect(trecho).not.toContain("BuscaConversas");
  });
});
