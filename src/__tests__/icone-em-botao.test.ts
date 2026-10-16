import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Os cinco defeitos de icone em botao medidos em producao no build 82dcc8b
 * (21 rotas x {1440, 390} x {claro, escuro}). Ver
 * `.planning/quick/260805-icone-em-botao-e-gate-de-runtime/SPEC.md`.
 *
 * Este arquivo trava o CODIGO-FONTE. A medida em PIXEL de cada um destes cinco
 * e responsabilidade de `npm run ui:runtime` (gate de runtime), que precisa de
 * navegador e por isso nao roda aqui — o vitest do projeto e `environment:
 * "node"`. Os dois se complementam: este garante que a correcao nao volte
 * atras no fonte; aquele garante que o fonte de fato chega na tela.
 *
 * Nota de seguranca (CLAUDE.md): sem execucao de regex com estado — so
 * `.includes()`, `.split()` e `.indexOf()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

describe("D1 — badge do sino nao vaza do botao", () => {
  const fonte = ler("src/components/notification-bell.tsx");

  it("nao usa mais deslocamento negativo, que era o que punha o badge fora da caixa", () => {
    expect(fonte.includes("-top-1")).toBe(false);
    expect(fonte.includes("-right-1")).toBe(false);
  });

  it("ancora o badge dentro do botao", () => {
    expect(fonte.includes("absolute right-0.5 top-0.5")).toBe(true);
  });

  it("separa o badge do glifo do sino com anel na cor da superficie", () => {
    expect(fonte.includes("ring-2 ring-controle")).toBe(true);
  });

  it("nao intercepta clique do gatilho do popover", () => {
    expect(fonte.includes("pointer-events-none")).toBe(true);
  });
});

describe("D2 — classe de tamanho no proprio <svg> vence o padrao da base", () => {
  const variants = ler("src/components/ui/button-variants.ts");

  it("o padrao size-4 da base passa a ser condicional", () => {
    expect(variants.includes("[&_svg]:size-4")).toBe(false);
    expect(
      variants.includes("[&_svg:not([class*='size-']):not([class*=' h-']):not([class^='h-'])]:size-4")
    ).toBe(true);
  });

  it("a guarda casa em borda de palavra — `lucide-trash-2` contem a substring `h-2`", () => {
    // Sem a borda, `[class*='h-']` casaria com o NOME do icone que o lucide
    // injeta (`class=\"lucide lucide-trash-2\"`), e um <Trash2 /> sem classe de
    // tamanho pararia de herdar o padrao — cairia em `width=\"24\"`, 24px dentro
    // de um botao, sem nada acusar. Vale tambem para `lucide-refresh-cw`.
    expect(variants.includes("[class*='h-']")).toBe(false);
    for (const nome of ["lucide lucide-trash-2", "lucide lucide-refresh-cw"]) {
      expect(nome.includes("h-")).toBe(true); // a armadilha existe...
      expect(nome.includes(" h-") || nome.startsWith("h-")).toBe(false); // ...e a borda a desarma
    }
    // e a classe de tamanho de verdade continua casando
    const comTamanho = "lucide lucide-trash-2 h-4 w-4";
    expect(comTamanho.includes(" h-") || comTamanho.startsWith("h-")).toBe(true);
  });

  it("mantem shrink-0 e pointer-events-none incondicionais — nao sao tamanho", () => {
    expect(variants.includes("[&_svg]:shrink-0")).toBe(true);
    expect(variants.includes("[&_svg]:pointer-events-none")).toBe(true);
  });

  it("expoe uma size real de 32px para acao em tabela, em vez de remendo por call site", () => {
    // E1 (redesign): o iconSm continua 32x32 visuais, mas ganhou `relative` e o
    // `after:` de 44px de area de toque — por isso o literal ja nao e so "h-8 w-8".
    expect(variants.includes('iconSm: "relative h-8 w-8')).toBe(true);
    expect(variants.includes("after:min-w-11")).toBe(true);
  });

  it("os botoes de acao de /cadastros usam a size nova, sem o py-2 herdado da default", () => {
    const telas = [
      "src/components/produtos-tab-client.tsx",
      "src/components/empresas-tab-client.tsx",
      "src/components/clientes-tab-client.tsx",
      "src/components/fornecedores-tab-client.tsx",
    ];
    for (const tela of telas) {
      const fonte = ler(tela);
      expect(fonte.includes("h-8 px-2 text-muted-foreground")).toBe(false);
      expect(fonte.includes('size: "iconSm"') || fonte.includes('size="iconSm"')).toBe(true);
    }
  });
});

describe("D3 — icone do link 'Ver boleto' nao e comprimido pelo flex", () => {
  it("o <a> de /boletos nao usa buttonVariants, entao o shrink-0 tem de ser explicito", () => {
    const fonte = ler("src/app/(app)/boletos/page.tsx");
    expect(fonte.includes('<ExternalLink className="h-3 w-3" />')).toBe(false);
    expect(fonte.includes('<ExternalLink className="h-3 w-3 shrink-0" />')).toBe(true);
  });
});

describe("D4 — um unico gap entre icone e texto do botao", () => {
  const fonte = ler("src/components/ui/button.tsx");

  it("os wrappers de leftIcon/rightIcon nao somam margem ao gap-2 da base", () => {
    expect(fonte.includes('className="mr-2 inline-flex')).toBe(false);
    expect(fonte.includes('className="ml-2 inline-flex')).toBe(false);
  });

  it("o spinner de loading tambem nao soma margem", () => {
    expect(fonte.includes('<Loader2 className="mr-2')).toBe(false);
  });

  it("nao deixa margem somando ao gap-2 em icone que e filho direto do botao", () => {
    // Enquanto children era embrulhado, icone e texto eram UM item flex e o
    // `gap-2` nao se aplicava entre eles — o `mr-2` fazia o espaco sozinho.
    // Sem o embrulho sao dois itens, e os dois somam: 16px onde a escala pede 8.
    for (const arquivo of [
      "src/components/cadastrar-cliente-rapido-dialog.tsx",
      "src/components/cadastrar-fornecedor-rapido-dialog.tsx",
      "src/components/cadastrar-produto-rapido-dialog.tsx",
    ]) {
      expect(ler(arquivo).includes('<Loader2 className="h-4 w-4 mr-2 animate-spin" />')).toBe(false);
    }
    expect(ler("src/app/(app)/boletos/page.tsx").includes('<ExternalLink className="h-4 w-4 ml-1" />')).toBe(false);
  });

  it("nao renderiza item flex vazio quando o IconButton esta em loading", () => {
    expect(fonte.includes("{loading && !loadingText && children ? (")).toBe(true);
  });

  it("nao embrulha children num <span> — era a causa raiz da quebra de linha no botao", () => {
    // O preflight do Tailwind declara `svg { display: block }`. Com o embrulho,
    // um <Button><Icone/>Texto</Button> punha um BLOCO dentro de um <span>
    // inline, e bloco dentro de inline parte a linha: medido no "Copiar Link"
    // de /historico, botao de 44px com o <svg> em top 890.5 e o texto em 905.5.
    // O `whitespace-nowrap` da base nao salvava — a quebra nao era do texto.
    expect(fonte.includes('<span className={cn(loading && !loadingText && "opacity-0")}>')).toBe(false);
    // o unico <span> que sobra e o de esconder o rotulo durante o loading,
    // e ele e inline-flex pelo mesmo motivo
    expect(fonte.includes('<span className="inline-flex items-center gap-2 opacity-0">{children}</span>')).toBe(true);
  });
});

describe("D6 — icone e texto no mesmo controle nao quebram em duas linhas", () => {
  /**
   * Este e o sintoma que o dono do sistema enxerga: o conteudo do botao
   * quebrando em duas linhas. Ele NAO aparece em `scrollWidth > clientWidth`,
   * porque quebra de linha aumenta a ALTURA, nao a largura — e por isso passou
   * batido pela varredura que achou o badge do sino.
   *
   * A causa e sempre a mesma: elemento com icone + texto que usa
   * `inline-flex items-center gap-*` SEM `buttonVariants`, logo sem o
   * `whitespace-nowrap` e sem o `[&_svg]:shrink-0` da base.
   */
  // `venda-rapida-form-v2.tsx` saiu desta lista em 2026-08-18. Ate 6e897e2 (11/08) o
  // "Cadastrar cliente" era marcacao a mao e precisava do `whitespace-nowrap` literal;
  // aquele commit o migrou para o `<Button>` padrao, que ja carrega a garantia na base
  // (`src/components/ui/button-variants.ts:26` tem `whitespace-nowrap` e `[&_svg]:shrink-0`,
  // e `button.tsx:78` embrulha o `leftIcon` em `shrink-0`). O gate seguiu cobrando a
  // marcacao antiga e ficou VERMELHO de 11/08 ate aqui — os deploys sairam sem CI verde.
  // A protecao nao sumiu: mudou de lugar, e o teste logo abaixo trava o novo mecanismo.
  const casos: Array<[string, string]> = [
    ["src/components/sortable-header.tsx", "cabecalho ordenavel (usado em 5 tabelas)"],
    ["src/components/ui/table.tsx", "TableHead sortable"],
    ["src/app/not-found.tsx", "links de acao do 404"],
    ["src/app/(app)/boletos/page.tsx", "link 'Ver boleto'"],
  ];

  for (const [arquivo, descricao] of casos) {
    it(`${descricao} nao deixa o texto quebrar ao lado do icone`, () => {
      const fonte = ler(arquivo);
      expect(fonte.includes("whitespace-nowrap")).toBe(true);
    });
  }

  it("os icones desses controles nao podem ser comprimidos pelo flex", () => {
    const sortable = ler("src/components/sortable-header.tsx");
    expect(sortable.includes('<ChevronUp className="h-3.5 w-3.5 shrink-0" />')).toBe(true);
    expect(sortable.includes('<ChevronDown className="h-3.5 w-3.5 shrink-0" />')).toBe(true);
    expect(sortable.includes('<ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />')).toBe(true);

    expect(ler("src/components/ui/table.tsx").includes('"h-3.5 w-3.5 shrink-0 transition-opacity"')).toBe(true);
    expect(ler("src/app/not-found.tsx").includes('<Home className="h-4 w-4 shrink-0" />')).toBe(true);
    expect(ler("src/app/not-found.tsx").includes('<LogIn className="h-4 w-4 shrink-0" />')).toBe(true);
  });

  it("o 'Cadastrar cliente' da venda rapida herda a garantia do Button em vez de repeti-la", () => {
    // Regressao que este assert pega: alguem trocar o `<Button>` por marcacao a mao
    // (`inline-flex` cru), que e exatamente o caso sem `buttonVariants` descrito acima.
    const form = ler("src/components/venda-rapida-form-v2.tsx");
    expect(form.includes("leftIcon={<Plus className=\"h-4 w-4\" />}")).toBe(true);

    const base = ler("src/components/ui/button-variants.ts");
    expect(base.includes("whitespace-nowrap")).toBe(true);
    expect(base.includes("[&_svg]:shrink-0")).toBe(true);
    expect(ler("src/components/ui/button.tsx").includes('<span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>')).toBe(true);
  });

  it("a pilula do ponto de equilibrio nao quebra", () => {
    // Aqui o "icone" e um <span> redondo de 6px, nao um <svg> — e o unico dos
    // casos que a regra (e) do gate NAO ve (ela exige um <svg>). Corrigido no
    // fonte e travado aqui.
    const fonte = ler("src/app/(app)/financeiro/page.tsx");
    // H3 (Vantage): a pilula virou <Badge> (inline-flex, rounded-full) e o ponto de cor
    // saiu — o estado vai so no tint do Badge. Resta travar que o texto nao quebra.
    expect(fonte.includes('<Badge')).toBe(true);
    expect(fonte.includes('className="whitespace-nowrap"')).toBe(true);
  });

  it("o unico whitespace-normal do projeto continua sendo o item do sino, que e flex-col de proposito", () => {
    const comWhitespaceNormal = [
      "src/components/notification-bell.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/tabs.tsx",
      "src/components/sortable-header.tsx",
    ].filter((f) => ler(f).includes("whitespace-normal"));
    expect(comWhitespaceNormal).toEqual(["src/components/notification-bell.tsx"]);

    const sino = ler("src/components/notification-bell.tsx");
    const linha = sino.split("\n").find((l) => l.includes("whitespace-normal")) || "";
    expect(linha.includes("flex-col")).toBe(true);
  });
});

describe("D5 — abas roladas tem pista visual", () => {
  it("o componente de abas oferece uma lista rolavel com affordance", () => {
    const tabs = ler("src/components/ui/tabs.tsx");
    expect(tabs.includes("ScrollableTabsList")).toBe(true);
    // gradiente de borda + chevron, ambos inertes ao ponteiro
    expect(tabs.includes("pointer-events-none")).toBe(true);
    expect(tabs.includes("ChevronLeft")).toBe(true);
    expect(tabs.includes("ChevronRight")).toBe(true);
  });

  it("as duas telas de abas usam o componente novo", () => {
    for (const tela of ["src/components/query-tabs.tsx", "src/components/gestao-rh-tabs.tsx"]) {
      expect(ler(tela).includes("ScrollableTabsList")).toBe(true);
    }
  });

  it("preserva a contencao de rolagem da fase 16 — quem rola continua sendo o tablist", () => {
    const tabs = ler("src/components/ui/tabs.tsx");
    expect(tabs.includes("overflow-x-auto")).toBe(true);
    expect(tabs.includes("max-w-full")).toBe(true);
    expect(tabs.includes("h-auto min-h-10")).toBe(true);
  });
});
