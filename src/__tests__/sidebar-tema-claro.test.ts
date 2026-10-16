import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { CHAVES_ICONE } from "@/lib/menu";

/**
 * A sidebar precisa acompanhar o tema.
 *
 * Ate aqui `--sidebar` era escura nos DOIS temas por decisao explicita
 * ("Sidebar - sempre escura"). O efeito colateral so aparecia no tema claro:
 * tudo que a sidebar hospeda mas NAO desenha — o `ThemeToggle` (`variant
 * outline`, que resolve `--border`/`--background`/`--foreground` globais) e o
 * `LogoutButton` (`--destructive` global) — renderizava com a paleta CLARA
 * sobre um fundo ESCURO. E o que o dono descreve como "buga e fica preta":
 * nao e um bug de renderizacao, e um painel escuro cercado de tokens claros.
 *
 * A correcao nao e trocar uma variavel. Toda a familia `--sidebar-*` estava
 * calibrada para fundo escuro, entao cada token ganha valor proprio no tema
 * claro e cada par novo entra em `TOKEN_PAIRS` — token sem par nao e
 * policiado, e ja houve precedente de utilitaria que ficou meses sem existir
 * porque a catraca media so as variaveis.
 *
 * Este arquivo NAO reimplementa a matematica de contraste: ele executa a
 * propria catraca (`token-contrast.mjs`) e le o veredito. Assim o teste e a
 * catraca nunca divergem — e um `import` do `.mjs` foi evitado de proposito,
 * porque `scripts/` esta fora do `include` do tsconfig e o `next build` roda
 * `tsc`.
 *
 * Nota de seguranca (CLAUDE.md): nenhuma execucao de regex com estado aqui —
 * so `.split()`, `.startsWith()` e `.includes()`.
 */

const raiz = process.cwd();
const ler = (rel: string) => readFileSync(join(raiz, rel), "utf8");

const css = ler("src/app/globals.css");
const sidebarNav = ler("src/components/sidebar-nav.tsx");
const appLayout = ler("src/app/(app)/layout.tsx");
const script = ler("scripts/design-tokens/token-contrast.mjs");
const mobileMenu = ler("src/components/mobile-menu-trigger.tsx");
// Pode ainda nao existir no RED: a leitura vazia deixa os testes que dependem dele reprovarem
// com a mensagem certa em vez de derrubar o arquivo inteiro na carga.
function lerSeExistir(rel: string): string {
  try {
    return ler(rel);
  } catch {
    return "";
  }
}
const alertasHoje = lerSeExistir("src/components/alertas-hoje.tsx");

/**
 * Remove comentarios antes de procurar por classe crua. Sem isto, um
 * comentario explicando *por que* `text-white` saiu faria o teste reprovar a
 * propria correcao — e o incentivo viraria apagar a explicacao. Mesma
 * precaucao do `stripComments` de `token-contrast.mjs`.
 *
 * O `//` so e cortado quando abre a linha (apos indentacao), para nao mutilar
 * `https://` nem o `/` de uma expressao.
 */
function semComentarios(fonte: string): string {
  const semBloco = fonte
    .split("/*")
    .map((parte, i) => (i === 0 ? parte : parte.split("*/").slice(1).join("*/")))
    .join("");
  return semBloco
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("//"))
    .join("\n");
}

const sidebarNavCodigo = semComentarios(sidebarNav);
const appLayoutCodigo = semComentarios(appLayout);
const alertasHojeCodigo = semComentarios(alertasHoje);
const cssCodigo = semComentarios(css);

// --- leitura da catraca -------------------------------------------------

type Linha = { par: string; tema: string; razao: number; minimo: number; resultado: string };

/**
 * A catraca sai com codigo 1 quando algum par reprova, e `execFileSync` lanca
 * nesse caso. Sem o try/catch a excecao subiria na CARGA do modulo e o arquivo
 * inteiro morreria com um erro opaco, em vez de reprovar o teste que aponta o
 * par culpado. `error.stdout` traz a tabela completa mesmo no caminho de erro.
 */
function rodarCatraca(): string {
  try {
    return execFileSync("node", ["scripts/design-tokens/token-contrast.mjs"], {
      cwd: raiz,
      encoding: "utf8",
    });
  } catch (erro) {
    const saidaDoErro = (erro as { stdout?: string }).stdout;
    if (typeof saidaDoErro === "string" && saidaDoErro.length > 0) return saidaDoErro;
    throw erro;
  }
}

const saida = rodarCatraca();

const linhas: Linha[] = saida
  .split("\n")
  .map((l) => l.split(" | "))
  .filter((cols) => cols.length === 5 && (cols[1] === "light" || cols[1] === "dark"))
  .map((cols) => ({
    // "fg/bg (rotulo)" -> "fg/bg"
    par: cols[0].split(" (")[0].trim(),
    tema: cols[1].trim(),
    razao: Number(cols[2]),
    minimo: Number(cols[3]),
    resultado: cols[4].trim(),
  }));

function medida(par: string, tema: "light" | "dark"): Linha {
  const achada = linhas.find((l) => l.par === par && l.tema === tema);
  if (!achada) {
    throw new Error(
      `par ${par} nao e medido pela catraca no tema ${tema} — token sem par nao e policiado`
    );
  }
  return achada;
}

/**
 * Valor de L (lightness OKLCH, 0-1) do token dentro do bloco `seletor`.
 * Le do CSS SEM comentarios: cada token da familia e precedido de um bloco de
 * comentario explicando o papel dele, e esse bloco viaja junto na hora de
 * fatiar por `;` — a declaracao passaria a "comecar" pelo comentario e o
 * `startsWith` nunca casaria.
 */
function lightnessDoToken(seletor: string, token: string): number {
  const blocos = cssCodigo.split(`${seletor} {`);
  if (blocos.length < 2) throw new Error(`bloco ${seletor} nao encontrado`);
  const corpo = blocos[1].split("\n}")[0];
  const decls = corpo.split(";").map((d) => d.trim());
  const decl = decls.find((d) => d.startsWith(`--${token}:`));
  if (!decl) throw new Error(`--${token} ausente em ${seletor}`);
  const dentro = decl.split("oklch(")[1];
  if (!dentro) throw new Error(`--${token} em ${seletor} nao e oklch()`);
  return Number(dentro.split(")")[0].trim().split(/\s+/)[0]);
}

// --- 1. a superficie ----------------------------------------------------

describe("a sidebar acompanha o tema", () => {
  it("no tema claro a sidebar e uma superficie CLARA", () => {
    // Criterio absoluto de proposito: nao basta ser "menos escura", tem de
    // estar do lado claro da escala junto de --card (0.995) e --background
    // (0.985). Antes: 0.19.
    expect(lightnessDoToken(":root", "sidebar")).toBeGreaterThan(0.9);
  });

  it("no tema claro o texto da sidebar inverte junto com o fundo", () => {
    // Fundo claro pede texto escuro. Se `--sidebar-foreground` continuasse
    // quase-branco (0.985) o rotulo sumiria — e assim que a familia "sempre
    // escura" quebra quando so o fundo e trocado.
    expect(lightnessDoToken(":root", "sidebar-foreground")).toBeLessThan(0.35);
  });

  it("no tema escuro nada muda: a sidebar continua escura", () => {
    // Redesign Vantage (2026-10-16): os L exatos mudaram porque a sidebar passou
    // a ser o PAINEL dos artboards (= --card #111312) e os neutros viraram
    // esverdeados de croma baixissimo. O que este teste guarda — a sidebar do
    // tema escuro continuar ESCURA — segue valendo, agora no degrau novo:
    // fundo 0.184 (era 0.17), accent 0.244 (0.28), texto 0.950 (0.985), muted
    // 0.703 (0.65), borda 0.248 (0.32; agora = --divisoria, decorativa).
    // O contraste de cada elemento e policiado pela catraca nos testes abaixo.
    expect(lightnessDoToken(".dark", "sidebar")).toBe(0.184);
    expect(lightnessDoToken(".dark", "sidebar-accent")).toBe(0.244);
    expect(lightnessDoToken(".dark", "sidebar-foreground")).toBe(0.95);
    expect(lightnessDoToken(".dark", "sidebar-muted")).toBe(0.703);
    // 0.76, nao mais 0.68: o accent deixou de ser o vermelho/rosa (hue 25) e
    // passou a ser o verde da logo BFX (hue 142.6). Verde e mais claro que
    // vermelho na mesma luminosidade percebida, entao o valor que entrega
    // contraste equivalente sobre a sidebar escura subiu. O que este teste
    // guarda — a sidebar do tema escuro continuar escura — segue valendo:
    // fundo, accent, texto, muted e borda estao inalterados acima.
    expect(lightnessDoToken(".dark", "sidebar-primary")).toBe(0.76);
    expect(lightnessDoToken(".dark", "sidebar-border")).toBe(0.248);
  });

  it("o comentario que declarava a sidebar 'sempre escura' saiu do CSS", () => {
    expect(cssCodigo.includes("sempre escura")).toBe(false);
  });
});

// --- 2. contraste, medido pela propria catraca --------------------------

describe("contraste de cada elemento da sidebar, nos dois temas", () => {
  const TEXTO: Array<[string, string]> = [
    ["titulo 'BFX Manager' e nome do usuario", "sidebar-foreground/sidebar"],
    ["rotulo de item inativo e de grupo", "sidebar-muted/sidebar"],
    ["rotulo e icone do item em hover", "sidebar-muted/sidebar-accent"],
    ["rotulo do item ativo", "sidebar-accent-foreground/sidebar-accent"],
    ["icone do item em hover, no chip da marca", "sidebar-accent-foreground/sidebar-primary-bg"],
    ["icone da marca sobre a sidebar", "sidebar-primary/sidebar"],
    ["badge NOVO — texto no tint da marca", "sidebar-primary/sidebar-primary-bg"],
    ["badge de contagem — texto no preenchimento", "sidebar-primary-foreground/sidebar-primary"],
  ];

  for (const [rotulo, par] of TEXTO) {
    it.each(["light", "dark"] as const)(`${rotulo} (%s) >= 4.5:1`, (tema) => {
      const m = medida(par, tema);
      expect(m.minimo).toBe(4.5);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(4.5);
    });
  }

  const GRAFICO: Array<[string, string]> = [
    ["indicador do item ativo", "sidebar-primary/sidebar-accent"],
    ["anel de foco", "sidebar-ring/sidebar"],
    ["icone do logo — extremo claro do gradiente", "gradient-cta-foreground/gradient-cta-from"],
  ];

  for (const [rotulo, par] of GRAFICO) {
    it.each(["light", "dark"] as const)(`${rotulo} (%s) >= 3:1`, (tema) => {
      const m = medida(par, tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(3);
    });
  }

  it.each(["light", "dark"] as const)(
    "icone do logo — extremo escuro do gradiente (%s) >= 4.5:1",
    (tema) => {
      const m = medida("gradient-cta-foreground/gradient-cta-to", tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(["light", "dark"] as const)(
    "texto do botao Sair, sobre a sidebar (%s) >= 4.5:1",
    (tema) => {
      // O LogoutButton usa tokens GLOBAIS dentro da sidebar. Enquanto ela era
      // escura ninguem media `--destructive` contra ela; com a sidebar clara
      // (0.965, mais escura que `--background` 0.985, para o qual o token foi
      // calibrado) ele caia para 4.44:1 puro e 4.07:1 sobre o tint.
      const m = medida("error-text/sidebar", tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(["light", "dark"] as const)(
    "borda de controle na sidebar (%s) >= 3:1",
    (tema) => {
      const m = medida("border/sidebar", tema);
      expect(m.resultado).toBe("PASS");
      expect(m.razao).toBeGreaterThanOrEqual(3);
    }
  );

  it("a catraca inteira continua verde", () => {
    expect(saida.includes(", 0 reprovaram")).toBe(true);
  });
});

// --- 3. os 3 pontos de um token novo ------------------------------------

describe("os tokens novos existem nos tres pontos", () => {
  const NOVOS = ["sidebar-muted", "sidebar-primary-bg", "gradient-cta-foreground"];

  it.each(NOVOS)("--%s tem valor em :root e em .dark", (nome) => {
    expect(() => lightnessDoToken(":root", nome)).not.toThrow();
    expect(() => lightnessDoToken(".dark", nome)).not.toThrow();
  });

  it.each(NOVOS)("--%s tem chave --color-* no bloco @theme", (nome) => {
    // Sem a chave no @theme o Tailwind v4 nao gera a utilitaria e a cor cai
    // silenciosamente para a herdada do pai (achado 1 da fase 18).
    expect(cssCodigo.includes(`--color-${nome}: var(--${nome});`)).toBe(true);
  });

  it("o gradiente da marca nao pode divergir entre :root e .dark", () => {
    // Os tres tokens do gradiente sao repetidos no `.dark` com os MESMOS
    // valores, so para a catraca medir o par nos dois temas em vez de dar
    // SKIP. O risco dessa duplicacao e a deriva: quem mudar o valor em
    // `:root` e esquecer o `.dark` fica com dois gradientes diferentes e a
    // catraca continua verde nos dois lados.
    for (const nome of ["gradient-cta-from", "gradient-cta-to", "gradient-cta-foreground"]) {
      expect(lightnessDoToken(":root", nome), `--${nome} divergiu entre os temas`).toBe(
        lightnessDoToken(".dark", nome)
      );
    }
  });

  it("os pares novos estao declarados em TOKEN_PAIRS", () => {
    // Redundante com os testes de contraste acima (que ja falham se o par nao
    // for medido), mas falha com uma mensagem que aponta a causa.
    for (const par of [
      "sidebar-muted",
      "sidebar-primary-bg",
      "gradient-cta-foreground",
    ]) {
      expect(script.includes(par), `nenhum par usa ${par}`).toBe(true);
    }
  });
});

// --- 4. os consumidores (redesign Vantage, tarefa B) --------------------

describe("a casca segue os degraus do Vantage", () => {
  it("a pagina e bg-background e o <main> e a casca (rounded-shell bg-shell)", () => {
    expect(appLayoutCodigo.includes("bg-background")).toBe(true);
    expect(appLayoutCodigo.includes("rounded-shell bg-shell")).toBe(true);
    expect(appLayoutCodigo.includes("border-shell-borda")).toBe(true);
  });

  it("a sidebar e um painel (bg-card rounded-painel) sem sombra pesada", () => {
    expect(appLayoutCodigo.includes("rounded-painel")).toBe(true);
    expect(appLayoutCodigo.includes("bg-card")).toBe(true);
    expect(appLayoutCodigo.includes("shadow-xl")).toBe(false);
    expect(appLayoutCodigo.includes("shadow-lg")).toBe(false);
    expect(appLayoutCodigo.includes("var(--sidebar)")).toBe(false);
  });

  it("o logo e um chip bg-primary com icone text-primary-foreground, sem cor crua", () => {
    expect(appLayoutCodigo.includes("text-white")).toBe(false);
    expect(appLayoutCodigo.includes("bg-primary")).toBe(true);
    expect(appLayoutCodigo.includes("text-primary-foreground")).toBe(true);
    expect(appLayoutCodigo.includes("font-display")).toBe(true);
  });

  it("o container da sidebar nao forca mais color-scheme: dark", () => {
    expect(appLayoutCodigo.includes("sidebar-dark")).toBe(false);
    expect(cssCodigo.includes(".sidebar-dark")).toBe(false);
  });

  it("nao existe 'Trocar empresa'", () => {
    expect(appLayoutCodigo.includes("Trocar empresa")).toBe(false);
    expect(sidebarNavCodigo.includes("Trocar empresa")).toBe(false);
  });

  it("reserva o lugar do gatilho da busca (prop busca) acima do menu", () => {
    expect(appLayoutCodigo.includes("busca?: ReactNode")).toBe(true);
    const iBusca = appLayoutCodigo.indexOf("{busca}");
    const iNav = appLayoutCodigo.indexOf("<SidebarNav");
    expect(iBusca).toBeGreaterThan(-1);
    expect(iBusca).toBeLessThan(iNav);
  });
});

describe("a navegacao consome o menu do modulo, sem copia local", () => {
  it("usa menuDoPerfil e nao declara agrupamento proprio", () => {
    expect(sidebarNavCodigo.includes("menuDoPerfil")).toBe(true);
    expect(sidebarNavCodigo.includes('from "@/lib/menu"')).toBe(true);
    // a copia que fez o /crm sumir: listas de hrefs por grupo e a rede "Outros"
    expect(sidebarNavCodigo.includes('"/venda-rapida"')).toBe(false);
    expect(sidebarNavCodigo.includes("Vendas & Operações")).toBe(false);
    expect(sidebarNavCodigo.includes("Outros")).toBe(false);
  });

  it("o layout tambem nao copia os arrays de menu", () => {
    expect(appLayoutCodigo.includes("adminMenu")).toBe(false);
    expect(appLayoutCodigo.includes("sellerMenu")).toBe(false);
  });

  it("mapeia TODA chave de icone do modulo para um componente lucide", () => {
    for (const chave of CHAVES_ICONE) {
      expect(sidebarNavCodigo.includes(`${chave}:`), `icone da chave ${chave} sem mapeamento`).toBe(true);
    }
  });
});

describe("o item de menu do Vantage", () => {
  it("o item ativo usa controle-ativo, texto semibold e aria-current", () => {
    // No claro `--controle-ativo` e branco (= painel) e sumiria: ali vale o tint da marca.
    expect(sidebarNavCodigo.includes("dark:bg-controle-ativo")).toBe(true);
    expect(sidebarNavCodigo.includes("dark:text-foreground")).toBe(true);
    expect(sidebarNavCodigo.includes("bg-marca-tint font-semibold text-marca-tint-texto")).toBe(true);
    expect(sidebarNavCodigo.includes("font-semibold")).toBe(true);
    expect(sidebarNavCodigo.includes('aria-current={active ? "page" : undefined}')).toBe(true);
  });

  it("o item tem 44px de altura, rounded-controle e hover pelo token --mov-nav", () => {
    expect(sidebarNavCodigo.includes("min-h-11")).toBe(true);
    expect(sidebarNavCodigo.includes("rounded-controle")).toBe(true);
    expect(sidebarNavCodigo.includes("duration-(--mov-nav)")).toBe(true);
  });

  it("a pill Novo usa o par marca-tint / marca-tint-texto", () => {
    expect(sidebarNavCodigo.includes("bg-marca-tint text-marca-tint-texto")).toBe(true);
  });

  it("o contador do Historico usa o par neutro em fonte mono", () => {
    expect(sidebarNavCodigo.includes("bg-divisoria")).toBe(true);
    expect(sidebarNavCodigo.includes("text-texto-secundario")).toBe(true);
    expect(sidebarNavCodigo.includes("font-mono")).toBe(true);
    // nao e mais o preenchimento da marca
    expect(sidebarNavCodigo.includes("sidebar-primary-foreground")).toBe(false);
  });

  it("nenhum texto da navegacao renderiza com opacidade parcial", () => {
    expect(sidebarNavCodigo.includes("text-sidebar-muted/")).toBe(false);
    expect(sidebarNavCodigo.includes("text-muted-foreground/")).toBe(false);
    expect(sidebarNavCodigo.includes("text-texto-secundario/")).toBe(false);
    expect(sidebarNavCodigo.includes("var(--sidebar-muted)]/")).toBe(false);
  });

  it("nao ha cor crua branca", () => {
    expect(sidebarNavCodigo.includes("text-white")).toBe(false);
    expect(sidebarNavCodigo.includes("bg-white/")).toBe(false);
  });

  it("o rotulo de grupo e pequeno e muted", () => {
    expect(sidebarNavCodigo.includes("text-sidebar-muted")).toBe(true);
  });
});

describe("controles do topo e do rodape", () => {
  it("sino e olho tem 44px e o visual de controle do Vantage", () => {
    const sino = semComentarios(ler("src/components/notification-bell.tsx"));
    const olho = semComentarios(ler("src/components/valores-toggle.tsx"));
    for (const fonte of [sino, olho]) {
      expect(fonte.includes("size-11")).toBe(true);
      expect(fonte.includes("bg-controle")).toBe(true);
      expect(fonte.includes("border-divisoria")).toBe(true);
      expect(fonte.includes("rounded-controle")).toBe(true);
    }
  });

  it("Sair e tema tem alvo de pelo menos 44px", () => {
    const sair = semComentarios(ler("src/components/LogoutButton.tsx"));
    const tema = semComentarios(ler("src/components/theme-toggle.tsx"));
    expect(sair.includes("min-h-11")).toBe(true);
    expect(tema.includes("size-11")).toBe(true);
  });

  it("o botao Sair usa a variante de TEXTO e o tint opaco", () => {
    const logout = semComentarios(ler("src/components/LogoutButton.tsx"));
    expect(logout.includes("text-destructive")).toBe(false);
    expect(logout.includes("bg-destructive/")).toBe(false);
    expect(logout.includes("border-destructive/")).toBe(false);
    expect(logout.includes("text-error-text")).toBe(true);
    expect(logout.includes("bg-error-bg")).toBe(true);
  });

  it("o menu mobile abre o mesmo conteudo numa folha no painel (bg-card) com gatilho de 44px", () => {
    const codigo = semComentarios(mobileMenu);
    expect(codigo.includes("bg-card")).toBe(true);
    expect(codigo.includes("var(--sidebar)")).toBe(false);
    expect(codigo.includes("size-11")).toBe(true);
  });
});

describe("alertas da sidebar: carregados uma vez e so para admin", () => {
  it("carregarAlertasShell e chamado UMA vez, no layout (SidebarContent monta duas vezes)", () => {
    const chamadas = appLayoutCodigo.split("carregarAlertasShell(").length - 1;
    expect(chamadas).toBe(1);
    // o SidebarContent recebe por prop, nao consulta
    expect(appLayoutCodigo.includes("alertas={alertas}")).toBe(true);
    expect(sidebarNavCodigo.includes("carregarAlertasShell")).toBe(false);
    expect(alertasHojeCodigo.includes("carregarAlertasShell")).toBe(false);
  });

  it("o contador do Historico aponta para a URL do helper único (não para /historico puro)", () => {
    expect(appLayoutCodigo.includes("urlPendentesDoUsuario(session)")).toBe(true);
    expect(appLayoutCodigo.includes('links={{ "/historico": urlPendentes }}')).toBe(true);
    expect(sidebarNavCodigo.includes("links?.[item.href]")).toBe(true);
    expect(appLayoutCodigo.includes("<BuscaRapida role={session.role} urlPendentes={urlPendentes}")).toBe(true);
  });

  it("o contador do Historico vem das assinaturas pendentes", () => {
    expect(appLayoutCodigo.includes("assinaturasPendentes")).toBe(true);
    expect(appLayoutCodigo.includes('"/historico"')).toBe(true);
  });

  it("o bloco aparece para admin, com os links certos, e some para vendedor", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { AlertasHoje } = await import("@/components/alertas-hoje");

    const admin = renderToStaticMarkup(
      createElement(AlertasHoje, {
        alertas: { assinaturasPendentes: 82, parcelasVencidas: 56 },
        urlAssinaturas: "/historico?assinatura=pendente&from=2000-01-01&to=2026-10-16",
      })
    );
    expect(admin.includes("Alertas de hoje")).toBe(true);
    // O destino é o MESMO conjunto do contador (helper único, com período e escopo).
    expect(admin.includes('href="/historico?assinatura=pendente&amp;from=2000-01-01&amp;to=2026-10-16"')).toBe(true);
    expect(admin.includes('href="/relatorios"')).toBe(true);
    expect(admin.includes("82")).toBe(true);
    expect(admin.includes("56")).toBe(true);
    expect(admin.toLowerCase().includes("estoque")).toBe(false);

    const vendedor = renderToStaticMarkup(
      createElement(AlertasHoje, { alertas: { assinaturasPendentes: 3 }, urlAssinaturas: "/historico" })
    );
    expect(vendedor).toBe("");
    const semDados = renderToStaticMarkup(createElement(AlertasHoje, { alertas: undefined, urlAssinaturas: "/historico" }));
    expect(semDados).toBe("");
  });

  it("o layout so entrega alertas ao bloco quando a sessao e admin", () => {
    expect(appLayoutCodigo.includes('session.role === "admin"')).toBe(true);
  });
});
