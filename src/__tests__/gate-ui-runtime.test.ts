import { describe, it, expect } from "vitest";

/**
 * Gate de runtime — camada pura (`scripts/ui-runtime/rendered-ui-rules.mjs`).
 *
 * Contexto: quatro fases de revisao passaram pelos cinco defeitos de icone em
 * botao sem ver nenhum, porque as catracas do projeto auditam TOKEN e
 * CODIGO-FONTE, nunca PIXEL RENDERIZADO. `<Trash2 className="h-3 w-3" />` se le
 * como 12px em qualquer revisao de diff e renderiza 16px no navegador.
 *
 * Este arquivo testa as quatro afirmacoes do gate contra snapshots sinteticos
 * que reproduzem numero por numero o que foi medido em producao no build
 * 82dcc8b. O navegador so COLETA o snapshot; quem julga e a camada pura testada
 * aqui — e por isso ela roda no vitest `environment: "node"`, sem jsdom.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui nem
 * no modulo sob teste — so `.split()` e casamento sem `lastIndex`.
 */

import {
  relativeLuminance,
  contrastRatio,
  compositeOver,
  effectiveBackground,
  parseDeclaredIconSize,
  agruparLinhas,
  analyzeSnapshot,
  fingerprint,
  LIMITES,
  // @ts-expect-error — modulo .mjs sem tipos, importado pelo caminho relativo do repo
} from "../../scripts/ui-runtime/rendered-ui-rules.mjs";

type Rgba = [number, number, number, number];

function snapshotBase(over: Record<string, unknown> = {}) {
  return {
    route: "/dashboard",
    viewport: "1440",
    theme: "light",
    doc: { scrollWidth: 1440, clientWidth: 1440 },
    buttons: [],
    icons: [],
    texts: [],
    ...over,
  };
}

describe("cor: luminancia, contraste e composicao de alfa", () => {
  it("da 21:1 entre preto e branco e 1:1 entre iguais", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 2);
    expect(contrastRatio([18, 18, 18], [18, 18, 18])).toBeCloseTo(1, 5);
  });

  it("compoe alfa sobre o fundo (50% de preto sobre branco)", () => {
    const [r, g, b] = compositeOver([0, 0, 0, 0.5], [255, 255, 255]);
    expect(r).toBeCloseTo(127.5, 1);
    expect(g).toBeCloseTo(127.5, 1);
    expect(b).toBeCloseTo(127.5, 1);
  });

  it("sobe a cadeia de ancestrais ate achar opacidade e compoe o que houver no caminho", () => {
    // elemento transparente > tint 20% de preto > ancestral branco opaco
    const cadeia: Rgba[] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0.2],
      [255, 255, 255, 1],
    ];
    const efetivo = effectiveBackground(cadeia);
    expect(efetivo.resolved).toBe(true);
    expect(efetivo.rgb[0]).toBeCloseTo(204, 0);
  });

  it("marca como nao resolvido quando a cadeia acaba sem fundo opaco", () => {
    expect(effectiveBackground([[0, 0, 0, 0]]).resolved).toBe(false);
  });

  it("marca como nao resolvido quando ha gradiente/imagem no caminho", () => {
    const efetivo = effectiveBackground([
      [0, 0, 0, 0],
      { rgba: [255, 255, 255, 1], hasImage: true },
    ] as never);
    expect(efetivo.resolved).toBe(false);
  });
});

describe("(c) tamanho declarado do icone", () => {
  it("le a escala do Tailwind, inclusive meio-passo", () => {
    expect(parseDeclaredIconSize("h-4 w-4")).toMatchObject({ width: 16, height: 16 });
    expect(parseDeclaredIconSize("h-3 w-3")).toMatchObject({ width: 12, height: 12 });
    expect(parseDeclaredIconSize("h-3.5 w-3.5")).toMatchObject({ width: 14, height: 14 });
    expect(parseDeclaredIconSize("size-4")).toMatchObject({ width: 16, height: 16 });
  });

  it("le valor arbitrario em rem e px", () => {
    expect(parseDeclaredIconSize("absolute h-[1.2rem] w-[1.2rem] rotate-0")).toMatchObject({
      width: 19.2,
      height: 19.2,
    });
    expect(parseDeclaredIconSize("h-[18px] w-[18px]")).toMatchObject({ width: 18, height: 18 });
  });

  it("ignora classe sem tamanho", () => {
    expect(parseDeclaredIconSize("text-muted-foreground shrink-0")).toBeNull();
  });

  it("nao afirma nada quando ha prefixo responsivo/estado — evita falso positivo", () => {
    expect(parseDeclaredIconSize("h-4 w-4 sm:h-5 sm:w-5")?.ambiguous).toBe(true);
  });
});

describe("as quatro afirmacoes, contra o que foi medido em producao (82dcc8b)", () => {
  it("(b) pega o badge do sino vazando do botao — clientWidth 34 vs scrollWidth 38", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        buttons: [
          {
            path: "button.relative.h-9.w-9",
            cls: "relative h-9 w-9 rounded-xl border",
            scrollWidth: 38,
            clientWidth: 34,
            scrollHeight: 34,
            clientHeight: 34,
            text: "3",
          },
        ],
      })
    );
    const b = achados.filter((f: { rule: string }) => f.rule === "BUTTON_OVERFLOW");
    expect(b).toHaveLength(1);
    expect(b[0].measured).toContain("38");
  });

  it("(b) nao acusa botao sao", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        buttons: [
          {
            path: "button.h-9.w-9",
            cls: "h-9 w-9",
            scrollWidth: 34,
            clientWidth: 34,
            scrollHeight: 34,
            clientHeight: 34,
            text: "",
          },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "BUTTON_OVERFLOW")).toHaveLength(0);
  });

  it("(c) pega o chevron declarado h-3.5 que renderiza 16 — o `[&_svg]:size-4` sobrescrevendo", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        icons: [
          {
            path: "button > svg.h-3.5.w-3.5",
            cls: "h-3.5 w-3.5",
            renderedWidth: 16,
            renderedHeight: 16,
            ownerPath: "button.table-pagination",
          },
        ],
      })
    );
    const c = achados.filter((f: { rule: string }) => f.rule === "ICON_SIZE");
    expect(c).toHaveLength(1);
    expect(c[0].detail).toContain("14");
    expect(c[0].measured).toContain("16");
  });

  it("(c) pega o sol/lua declarado h-[1.2rem] (19.2px) que renderiza 16", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        icons: [
          {
            path: "button > svg",
            cls: "absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all",
            renderedWidth: 16,
            renderedHeight: 16,
            ownerPath: "button.theme-toggle",
          },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "ICON_SIZE")).toHaveLength(1);
  });

  it("(c) pega o 'Ver boleto' achatado — declarado 12x12, renderiza 8.42x12.00", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        viewport: "390",
        icons: [
          {
            path: "a.inline-flex > svg.h-3.w-3",
            cls: "h-3 w-3",
            renderedWidth: 8.42,
            renderedHeight: 12,
            ownerPath: "a.text-xs.text-primary",
          },
        ],
      })
    );
    const c = achados.filter((f: { rule: string }) => f.rule === "ICON_SIZE");
    expect(c).toHaveLength(1);
    expect(c[0].measured).toContain("8.42");
  });

  it("(c) aceita o icone que renderiza o que declarou, e ignora o ambiguo e o sem declaracao", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        icons: [
          { path: "a", cls: "h-4 w-4", renderedWidth: 16, renderedHeight: 16, ownerPath: "b" },
          { path: "b", cls: "h-4 w-4 sm:h-5", renderedWidth: 20, renderedHeight: 20, ownerPath: "b" },
          { path: "c", cls: "shrink-0", renderedWidth: 16, renderedHeight: 16, ownerPath: "b" },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "ICON_SIZE")).toHaveLength(0);
  });

  it("(d) pega a rolagem horizontal do documento — /importacao 393 vs 390", () => {
    const achados = analyzeSnapshot(
      snapshotBase({ route: "/importacao", viewport: "390", doc: { scrollWidth: 393, clientWidth: 390 } })
    );
    const d = achados.filter((f: { rule: string }) => f.rule === "DOC_OVERFLOW");
    expect(d).toHaveLength(1);
    expect(d[0].measured).toContain("393");
  });

  it("(a) pega 1.00:1 de icone contra o fundo efetivo — o par cruzado entre familias de token", () => {
    // `--sidebar-foreground` renderizado sobre `--background` global: cores iguais.
    const achados = analyzeSnapshot(
      snapshotBase({
        texts: [
          {
            path: "button > svg",
            kind: "icon",
            sample: "",
            fontSizePx: 16,
            fontWeight: 400,
            color: [250, 250, 250, 1],
            bgChain: [
              [0, 0, 0, 0],
              [250, 250, 250, 1],
            ],
          },
        ],
      })
    );
    const a = achados.filter((f: { rule: string }) => f.rule === "CONTRAST");
    expect(a).toHaveLength(1);
    expect(a[0].measured).toContain("1.00");
  });

  it("(a) usa 3:1 para icone e 4.5:1 para texto de corpo", () => {
    expect(LIMITES.iconeMinimo).toBe(3);
    expect(LIMITES.textoMinimo).toBe(4.5);
    expect(LIMITES.textoGrandeMinimo).toBe(3);

    // 4.0:1 reprova como texto de corpo...
    const corpo = analyzeSnapshot(
      snapshotBase({
        texts: [
          {
            path: "p",
            kind: "text",
            sample: "Total",
            fontSizePx: 14,
            fontWeight: 400,
            color: [120, 120, 120, 1],
            bgChain: [[255, 255, 255, 1]],
          },
        ],
      })
    );
    expect(corpo.filter((f: { rule: string }) => f.rule === "CONTRAST")).toHaveLength(1);

    // ...e passa como texto grande (>= 24px).
    const grande = analyzeSnapshot(
      snapshotBase({
        texts: [
          {
            path: "h1",
            kind: "text",
            sample: "Painel",
            fontSizePx: 30,
            fontWeight: 400,
            color: [120, 120, 120, 1],
            bgChain: [[255, 255, 255, 1]],
          },
        ],
      })
    );
    expect(grande.filter((f: { rule: string }) => f.rule === "CONTRAST")).toHaveLength(0);
  });

  it("(a) nao inventa achado quando o fundo efetivo nao pode ser resolvido", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        texts: [
          {
            path: "span",
            kind: "text",
            sample: "BFX",
            fontSizePx: 14,
            fontWeight: 400,
            color: [255, 255, 255, 1],
            bgChain: [{ rgba: [0, 0, 0, 0], hasImage: true }],
          },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "CONTRAST")).toHaveLength(0);
  });
});

describe("(e) quebra de linha dentro de controle com icone + texto", () => {
  // Esta e a regra que faltava: o defeito que o dono do sistema enxerga e
  // conteudo de botao quebrando em DUAS LINHAS. Isso aumenta a ALTURA, e
  // `scrollWidth > clientWidth` (regra b) e cego para altura.

  it("agrupa retangulos da mesma linha visual, mesmo com tamanhos de fonte diferentes", () => {
    // rotulo 14px em top 100 e sufixo 11px em top 102 — uma linha so
    expect(agruparLinhas([[100, 16], [102, 13]]).tops).toHaveLength(1);
    // segunda linha 20px abaixo — duas linhas
    expect(agruparLinhas([[100, 16], [120, 16]]).tops).toHaveLength(2);
  });

  it("acusa o rotulo do cabecalho ordenavel quebrando ao lado do chevron", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        viewport: "390",
        wraps: [
          {
            path: "th > span.inline-flex.items-center.gap-1",
            cls: "inline-flex items-center gap-1",
            sample: "Data Compra",
            iconCount: 1,
            textRects: [
              [100, 16],
              [118, 16],
            ],
            iconCenters: [117],
            flexDirection: "row",
            flexWrap: "nowrap",
          },
        ],
      })
    );
    const e = achados.filter((f: { rule: string }) => f.rule === "CONTENT_WRAP");
    expect(e).toHaveLength(1);
    expect(e[0].measured).toContain("2 linhas");
    expect(e[0].detail).toContain("Data Compra");
  });

  it("acusa icone fora da linha do texto mesmo com o texto em uma linha so", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        wraps: [
          {
            path: "a.inline-flex",
            cls: "inline-flex items-center gap-2",
            sample: "Cadastrar cliente",
            iconCount: 1,
            textRects: [[100, 16]],
            iconCenters: [130],
            flexDirection: "row",
            flexWrap: "nowrap",
          },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "CONTENT_WRAP")).toHaveLength(1);
  });

  it("aceita desalinho de sub-pixel de items-center com fontes diferentes", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        wraps: [
          {
            path: "a.inline-flex",
            cls: "inline-flex items-center gap-2",
            sample: "Ver boleto",
            iconCount: 1,
            textRects: [[100, 16]],
            iconCenters: [109.5],
            flexDirection: "row",
            flexWrap: "nowrap",
          },
        ],
      })
    );
    expect(achados.filter((f: { rule: string }) => f.rule === "CONTENT_WRAP")).toHaveLength(0);
  });

  it("nao acusa quebra intencional: flex-col (item do sino) e flex-wrap explicito", () => {
    const coluna = analyzeSnapshot(
      snapshotBase({
        wraps: [
          {
            path: "button.flex-col",
            cls: "h-auto w-full flex-col items-start whitespace-normal",
            sample: "Estoque baixo em Cimento CP-II",
            iconCount: 1,
            textRects: [
              [100, 16],
              [120, 16],
            ],
            iconCenters: [100],
            flexDirection: "column",
            flexWrap: "nowrap",
          },
        ],
      })
    );
    expect(coluna).toHaveLength(0);

    const comWrap = analyzeSnapshot(
      snapshotBase({
        wraps: [
          {
            path: "div.flex-wrap",
            cls: "flex flex-wrap items-center gap-1",
            sample: "Tag",
            iconCount: 1,
            textRects: [
              [100, 16],
              [120, 16],
            ],
            iconCenters: [100],
            flexDirection: "row",
            flexWrap: "wrap",
          },
        ],
      })
    );
    expect(comWrap).toHaveLength(0);
  });

  it("nao acusa texto puro quebrando — so importa quando ha icone junto", () => {
    const achados = analyzeSnapshot(
      snapshotBase({
        wraps: [
          {
            path: "p",
            cls: "flex",
            sample: "paragrafo longo",
            iconCount: 0,
            textRects: [
              [100, 16],
              [120, 16],
            ],
            iconCenters: [],
            flexDirection: "row",
            flexWrap: "nowrap",
          },
        ],
      })
    );
    expect(achados).toHaveLength(0);
  });
});

describe("baseline", () => {
  it("da a mesma impressao digital para o mesmo achado e digitais diferentes por rota", () => {
    const um = analyzeSnapshot(
      snapshotBase({ route: "/importacao", doc: { scrollWidth: 393, clientWidth: 390 } })
    )[0];
    const outro = analyzeSnapshot(
      snapshotBase({ route: "/importacao", doc: { scrollWidth: 400, clientWidth: 390 } })
    )[0];
    const terceiro = analyzeSnapshot(
      snapshotBase({ route: "/dashboard", doc: { scrollWidth: 393, clientWidth: 390 } })
    )[0];

    // A digital nao inclui a medida: o baseline aceita o achado conhecido, nao o numero exato.
    expect(fingerprint(um)).toBe(fingerprint(outro));
    expect(fingerprint(um)).not.toBe(fingerprint(terceiro));
  });
});
