/**
 * Modo discreto (2026-09-24): o botão de olho que oculta valores e dados sensíveis em todas as
 * telas, como no app do Inter. Quem oculta é o CSS — as páginas do BFX são server components e um
 * contexto de client não alcançaria os ~150 pontos de dinheiro renderizados no servidor.
 *
 * Aqui ficam as regras puras: ler e gravar a preferência do aparelho, ligar/desligar o atributo no
 * <html> e o script que aplica a escolha antes da primeira pintura (sem ele, o valor aparece por um
 * instante antes de ser ocultado — justamente o que o modo existe para evitar).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATRIBUTO_DISCRETO,
  CHAVE_DISCRETO,
  CLASSE_BLOCO_SENSIVEL,
  CLASSE_VALOR_SENSIVEL,
  aplicarNoDocumento,
  lerPreferencia,
  rotuloDoBotao,
  scriptDeInicializacao,
  valorParaGuardar,
} from "@/lib/modo-discreto";

/** Todo .tsx e .ts de tela, para conferir como a classe foi escrita. */
function arquivosDeTela(raiz: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const caminho = join(raiz, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "generated" || entrada.name === "__tests__") continue;
      achados.push(...arquivosDeTela(caminho));
    } else if (entrada.name.endsWith(".tsx") || entrada.name.endsWith(".ts")) {
      achados.push(caminho);
    }
  }
  return achados;
}

function raizFalsa() {
  const atributos = new Map<string, string>();
  return {
    atributos,
    setAttribute(nome: string, valor: string) {
      atributos.set(nome, valor);
    },
    removeAttribute(nome: string) {
      atributos.delete(nome);
    },
  };
}

describe("modo discreto: preferência do aparelho", () => {
  it("nasce desligado: sem nada guardado, os valores aparecem", () => {
    expect(lerPreferencia(null)).toBe(false);
    expect(lerPreferencia(undefined)).toBe(false);
    expect(lerPreferencia("")).toBe(false);
  });

  it("liga só com o valor que o próprio botão grava", () => {
    expect(lerPreferencia(valorParaGuardar(true))).toBe(true);
    expect(lerPreferencia(valorParaGuardar(false))).toBe(false);
  });

  it("valor estranho no armazenamento não liga o modo", () => {
    // localStorage é do usuário: extensão, aba antiga ou lixo de outra versão não podem virar
    // "ocultar" nem derrubar a tela.
    for (const bruto of ["0", "lixo", "true ", "{}", "[1]", "null"]) {
      expect(lerPreferencia(bruto)).toBe(false);
    }
  });
});

describe("modo discreto: atributo no documento", () => {
  it("ligado marca o documento; desligado tira a marca", () => {
    const raiz = raizFalsa();
    aplicarNoDocumento(raiz, true);
    expect(raiz.atributos.get(ATRIBUTO_DISCRETO)).toBe("1");
    aplicarNoDocumento(raiz, false);
    expect(raiz.atributos.has(ATRIBUTO_DISCRETO)).toBe(false);
  });

  it("aplicar duas vezes não muda nada (o botão pode ser clicado rápido)", () => {
    const raiz = raizFalsa();
    aplicarNoDocumento(raiz, true);
    aplicarNoDocumento(raiz, true);
    expect(raiz.atributos.get(ATRIBUTO_DISCRETO)).toBe("1");
    expect(raiz.atributos.size).toBe(1);
  });

  it("documento ausente não quebra (render no servidor)", () => {
    expect(() => aplicarNoDocumento(null, true)).not.toThrow();
  });
});

describe("modo discreto: script que roda antes da primeira pintura", () => {
  const script = scriptDeInicializacao();

  it("usa a mesma chave e o mesmo atributo do resto do código", () => {
    expect(script).toContain(CHAVE_DISCRETO);
    expect(script).toContain(ATRIBUTO_DISCRETO);
  });

  it("nunca deixa a tela em branco: tudo dentro de try/catch", () => {
    // localStorage lança em modo restrito/anônimo; um erro aqui roda antes do React e levaria a
    // página inteira.
    expect(script).toContain("try");
    expect(script).toContain("catch");
  });

  it("não fecha a tag de script nem injeta HTML", () => {
    expect(script.toLowerCase()).not.toContain("</script");
    expect(script).not.toContain("document.write");
    expect(script).not.toContain("innerHTML");
  });
});

describe("modo discreto: rótulos e classes", () => {
  it("o rótulo diz o que o clique faz, não o estado atual", () => {
    expect(rotuloDoBotao(false)).toBe("Ocultar valores");
    expect(rotuloDoBotao(true)).toBe("Mostrar valores");
  });

  it("as classes são as que o CSS global procura", () => {
    expect(CLASSE_VALOR_SENSIVEL).toBe("valor-sensivel");
    expect(CLASSE_BLOCO_SENSIVEL).toBe("bloco-sensivel");
  });
});

describe("modo discreto: o CSS e as telas falam a mesma língua", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("globals.css define a máscara das duas classes", () => {
    // Sem isto, renomear a classe num lado e esquecer o outro deixaria o modo ligado sem
    // esconder nada — e nada quebraria em nenhum teste.
    expect(css).toContain(`[data-valores-ocultos="1"] .${CLASSE_VALOR_SENSIVEL}`);
    expect(css).toContain(`[data-valores-ocultos="1"] .${CLASSE_BLOCO_SENSIVEL}`);
  });

  it("a máscara vale só na tela, para impressão e PDF saírem completos", () => {
    // Toda regra da máscara vive dentro do `@media screen` do fim do arquivo (o globals.css
    // tem outros blocos, inclusive um `@media print` antigo que não é dela). Desfazer a
    // máscara num bloco de print devolvia `color: inherit` e apagava a cor semântica do
    // valor no papel — por isso ela nasce restrita à tela, em vez de ser desfeita depois.
    const daMascara = css.slice(css.lastIndexOf("@media screen"));
    expect(daMascara).toContain(CLASSE_VALOR_SENSIVEL);
    expect(daMascara).not.toContain("@media print");
    // Conta só regra, não comentário: o bloco é precedido de um comentário longo que cita a
    // classe pelo nome.
    const semComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, "");
    const noArquivo = semComentarios(css).split(CLASSE_VALOR_SENSIVEL).length;
    const noBloco = semComentarios(daMascara).split(CLASSE_VALOR_SENSIVEL).length;
    expect(noBloco).toBe(noArquivo);
  });

  it("nenhuma tela escreve a classe errado", () => {
    const permitidas = new Set([CLASSE_VALOR_SENSIVEL, `${CLASSE_VALOR_SENSIVEL}-fim`, CLASSE_BLOCO_SENSIVEL]);
    const erradas = new Map<string, string[]>();
    for (const arquivo of arquivosDeTela(join(process.cwd(), "src"))) {
      const fonte = readFileSync(arquivo, "utf8");
      for (const achado of fonte.split(/[\s"'`{}()<>=,;:.]+/)) {
        // Só o que PARECE classe: tem hífen antes de "sensiv". "valor sensível" solto em
        // comentário não conta; `valor-sensível` (com acento) e `valor-sensivel-direita` contam.
        if (!/-sensi[vt]/i.test(achado) && !/-sensív/i.test(achado)) continue;
        if (permitidas.has(achado)) continue;
        const lista = erradas.get(achado) ?? [];
        lista.push(arquivo.replace(process.cwd() + "/", ""));
        erradas.set(achado, lista);
      }
    }
    expect([...erradas.entries()].map(([classe, onde]) => `${classe} em ${onde.join(", ")}`)).toEqual([]);
  });
});
