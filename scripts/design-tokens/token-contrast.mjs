// Verificador de contraste dos tokens de cor (UI-05) — módulo puro, sem
// dependências externas.
//
// Lê `--nome: oklch(...)` de `:root` e `.dark` em `src/app/globals.css`,
// converte OKLCH → sRGB, calcula a razão de contraste WCAG 2.x entre pares
// declarados (texto/fundo, borda/fundo, indicador de foco/fundo) e reprova
// (`exit 1`) qualquer par abaixo do mínimo exigido, nos dois temas.
//
// Só usa `node:fs`, `node:path` e `node:url`. Nenhum pacote foi instalado.
//
// Nota de segurança (CLAUDE.md): o hook de segurança do projeto bloqueia o
// padrão imperativo de execução de regex com estado (`RegExp.prototype.exec`
// + `lastIndex` em loop). Este módulo NUNCA usa esse padrão — a extração de
// blocos CSS usa varredura de índice/brace-matching e `String.prototype.split`,
// nunca `exec`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- OKLCH -> sRGB ------------------------------------------------------
//
// OKLCH -> OKLab -> LMS (cubo) -> sRGB linear -> gama sRGB. Constantes das
// matrizes de Björn Ottosson (https://bottosson.github.io/posts/oklab/),
// mantidas juntas neste bloco para revisão futura.

const OKLAB_TO_LMS_ = {
  m1: 0.3963377774,
  m2: 0.2158037573,
  m3: 0.1055613458,
  m4: 0.0638541728,
  m5: 0.0894841775,
  m6: 1.2914855480,
};

const LMS_TO_LINEAR_SRGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.7076147010],
];

function srgbGammaEncode(channel) {
  const abs = Math.abs(channel);
  const encoded = abs <= 0.0031308 ? 12.92 * abs : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
  return channel < 0 ? -encoded : encoded;
}

function clamp255(value) {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

/**
 * Converte OKLCH (L 0-1, C croma, H graus) para sRGB 0-255. Valores fora de
 * gama são fixados no intervalo válido — nunca devolve NaN.
 */
export function oklchToSrgb(l, c, h) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + OKLAB_TO_LMS_.m1 * a + OKLAB_TO_LMS_.m2 * b;
  const m_ = l - OKLAB_TO_LMS_.m3 * a - OKLAB_TO_LMS_.m4 * b;
  const s_ = l - OKLAB_TO_LMS_.m5 * a - OKLAB_TO_LMS_.m6 * b;

  const lCubed = l_ * l_ * l_;
  const mCubed = m_ * m_ * m_;
  const sCubed = s_ * s_ * s_;

  const lms = [lCubed, mCubed, sCubed];
  const linear = LMS_TO_LINEAR_SRGB.map(
    (row) => row[0] * lms[0] + row[1] * lms[1] + row[2] * lms[2]
  );

  const [rLin, gLin, bLin] = linear;

  return {
    r: clamp255(srgbGammaEncode(rLin) * 255),
    g: clamp255(srgbGammaEncode(gLin) * 255),
    b: clamp255(srgbGammaEncode(bLin) * 255),
  };
}

// --- Razão de contraste WCAG 2.x --------------------------------------

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const cs = value / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste WCAG entre duas cores sRGB — ordem dos argumentos não importa. */
export function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- parseTokens --------------------------------------------------------

/** Remove comentários /* ... *\/ sem regex com estado — varredura por índice. */
function stripComments(css) {
  let result = "";
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf("/*", i);
    if (start === -1) {
      result += css.slice(i);
      break;
    }
    result += css.slice(i, start);
    const end = css.indexOf("*/", start + 2);
    if (end === -1) break;
    i = end + 2;
  }
  return result;
}

/** Extrai blocos top-level `seletor { corpo }`, com brace-matching manual. */
function extractTopLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    const openIdx = css.indexOf("{", i);
    if (openIdx === -1) break;
    const selector = css.slice(i, openIdx).trim();
    let depth = 1;
    let j = openIdx + 1;
    while (j < n && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    blocks.push({ selector, body: css.slice(openIdx + 1, j - 1) });
    i = j;
  }
  return blocks;
}

/** Parseia um valor `oklch(l c h)` ou `oklch(l c h / a%)` — devolve null se não for oklch. */
function parseOklchValue(rawValue) {
  const value = rawValue.trim();
  if (!value.startsWith("oklch(") || !value.endsWith(")")) return null;

  const inner = value.slice("oklch(".length, -1);
  const [colorPart, alphaPart] = inner.split("/");
  const components = colorPart.trim().split(/\s+/).filter(Boolean);
  if (components.length < 3) return null;

  const l = Number.parseFloat(components[0]);
  const c = Number.parseFloat(components[1]);
  const h = Number.parseFloat(components[2]);
  if (Number.isNaN(l) || Number.isNaN(c) || Number.isNaN(h)) return null;

  return { l, c, h, hasAlpha: alphaPart !== undefined, raw: value };
}

function parseDeclarations(body) {
  const tokens = {};
  const declarations = body.split(";");
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed.startsWith("--")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const name = trimmed.slice(2, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    const parsed = parseOklchValue(rawValue);
    if (!parsed) continue; // ignora --radius, --space-*, --shadow-*, --transition-*, etc.

    tokens[name] = parsed;
  }
  return tokens;
}

/**
 * Lê declarações `--nome: oklch(...)` de todos os blocos `:root` e `.dark`
 * de `cssTexto`. Devolve `{ light: {...}, dark: {...} }`. Tokens com alfa
 * ficam marcados `hasAlpha: true` e não são convertidos para sRGB aqui —
 * quem decide o que fazer com eles é `checkPairs`.
 */
export function parseTokens(cssTexto) {
  const clean = stripComments(cssTexto);
  const blocks = extractTopLevelBlocks(clean);

  const light = {};
  const dark = {};

  for (const { selector, body } of blocks) {
    if (selector === ":root") {
      Object.assign(light, parseDeclarations(body));
    } else if (selector === ".dark") {
      Object.assign(dark, parseDeclarations(body));
    }
  }

  return { light, dark };
}

// --- checkPairs ------------------------------------------------------

/**
 * Verifica uma lista de pares `{ foreground, background, min, label }` contra
 * `tokens` (`{ light, dark }`). Devolve uma linha por par por tema. Par cujo
 * token (texto ou fundo) tenha alfa vem com `skipped: true` e motivo — nunca
 * com `pass: true` (T-10-08: evita falso verde).
 */
export function checkPairs(tokens, pares) {
  const rows = [];

  for (const par of pares) {
    for (const theme of ["light", "dark"]) {
      const themeTokens = tokens[theme] ?? {};
      const fg = themeTokens[par.foreground];
      const bg = themeTokens[par.background];

      const base = {
        label: par.label,
        foreground: par.foreground,
        background: par.background,
        theme,
        min: par.min,
      };

      if (!fg || !bg) {
        rows.push({
          ...base,
          ratio: null,
          pass: false,
          skipped: true,
          reason: `token ausente no tema ${theme}: ${!fg ? par.foreground : par.background}`,
        });
        continue;
      }

      if (fg.hasAlpha || bg.hasAlpha) {
        rows.push({
          ...base,
          ratio: null,
          pass: false,
          skipped: true,
          reason: "token com alfa — contraste não calculável sem compor com o fundo real",
        });
        continue;
      }

      const ratio = contrastRatio(oklchToSrgb(fg.l, fg.c, fg.h), oklchToSrgb(bg.l, bg.c, bg.h));
      rows.push({
        ...base,
        ratio,
        pass: ratio >= par.min,
        skipped: false,
        reason: null,
      });
    }
  }

  return rows;
}

// --- Cobertura do @theme (fase 18, achado 1) --------------------------
//
// Medir o par de tokens NAO prova que a cor chega a tela. No Tailwind v4 a
// utilitaria `text-X` so e gerada se `--color-X` estiver declarado no bloco
// `@theme`. `--destructive-foreground` existia em `:root` e `.dark`, casava
// 4.69/6.09 com `--destructive` e a catraca dava PASS — mas
// `--color-destructive-foreground` nunca entrou no `@theme`, entao
// `text-destructive-foreground` nao gerava regra nenhuma: o texto herdava
// `--foreground` e o botao destrutivo media 4.04:1 no claro e 3.23:1 no
// escuro, em 10 call sites.
//
// A diferenca e entre medir a fonte e medir o resultado. Estas funcoes
// fecham o degrau que faltava: variavel CSS -> classe utilitaria.

/**
 * Extrai os nomes das chaves `--color-<nome>` declaradas em blocos `@theme`
 * (com ou sem `inline`). Devolve um Set com o `<nome>` — sem o prefixo
 * `--color-`, para casar direto com o lado de texto de `TOKEN_PAIRS`.
 */
export function parseThemeColorKeys(cssTexto) {
  const clean = stripComments(cssTexto);
  const blocos = extractTopLevelBlocks(clean);
  const chaves = new Set();

  for (const { selector, body } of blocos) {
    if (!selector.startsWith("@theme")) continue;
    for (const decl of body.split(";")) {
      const trimmed = decl.trim();
      if (!trimmed.startsWith("--color-")) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      chaves.add(trimmed.slice("--color-".length, colonIdx).trim());
    }
  }

  return chaves;
}

/**
 * Varre textos de codigo e devolve o Set de `<nome>` usados como `text-<nome>`.
 * Tolera variantes (`hover:`, `dark:`, `data-[...]:`), o prefixo `!` e o
 * sufixo de opacidade (`/80`) — todos escondem o nome de um grep ingenuo.
 *
 * Sem `RegExp.exec` com estado (CLAUDE.md): tokeniza por `split`.
 */
export function collectTextColorClasses(textos) {
  const usados = new Set();

  for (const texto of textos) {
    for (const bruto of texto.split(/[\s"'`{}()\[\],;=<>]+/)) {
      if (!bruto) continue;
      // ultima variante: `dark:hover:text-info` -> `text-info`
      const partes = bruto.split(":");
      const base = partes[partes.length - 1];
      // `!` e prefixo no Tailwind v3 (`!text-x`) e sufixo no v4 (`text-x!`).
      // Este projeto e v4; tolerar os dois custa duas linhas.
      const semPrefixo = base.startsWith("!") ? base.slice(1) : base;
      const semBang = semPrefixo.endsWith("!") ? semPrefixo.slice(0, -1) : semPrefixo;
      if (!semBang.startsWith("text-")) continue;
      const corpo = semBang.slice("text-".length);
      const nome = corpo.split("/")[0]; // descarta opacidade
      if (nome) usados.add(nome);
    }
  }

  return usados;
}

/**
 * Exige `--color-<nome>` no `@theme` para toda `text-<nome>` escrita no codigo
 * cujo `<nome>` seja um token de cor declarado (`declaredTokens`, vindo de
 * `:root`). Sem a chave a utilitaria nao existe e o contraste medido no par e
 * ficcao.
 *
 * O criterio e "token de cor declarado", nao "lado de texto de `TOKEN_PAIRS`":
 * a primeira versao desta funcao so olhava `par.foreground` e por isso deixava
 * escapar exatamente os dois tokens mais usados como texto que so aparecem do
 * lado do FUNDO nos pares — `destructive` (59 call sites de `text-destructive`)
 * e `primary` (72). Apagar `--color-destructive` do `@theme` reproduziria o bug
 * original inteiro com a catraca verde.
 *
 * `text-sm`/`text-xs`/`text-center` nao casam com nenhum token declarado e
 * ficam de fora sozinhos, sem lista de excecao para envelhecer mal. Falta de
 * chave e `pass: false`, nunca `skipped` (regra T-10-08: nada de falso verde).
 *
 * `pairs` entra so para rotular a linha quando o nome participa de um par.
 */
export function checkThemeCoverage({ themeKeys, usedAsText, declaredTokens, pairs = [] }) {
  const rotulos = new Map();
  for (const par of pairs) {
    if (!rotulos.has(par.foreground)) rotulos.set(par.foreground, par.label);
  }

  const alvos = new Set();
  for (const nome of usedAsText) {
    // Sem `declaredTokens` (chamadas antigas), cai no comportamento anterior:
    // so os nomes que aparecem como lado de texto de algum par.
    const ehTokenDeCor = declaredTokens ? declaredTokens.has(nome) : rotulos.has(nome);
    if (ehTokenDeCor) alvos.add(nome);
  }

  const rows = [];
  for (const nome of [...alvos].sort()) {
    const temChave = themeKeys.has(nome);
    rows.push({
      foreground: nome,
      label: rotulos.get(nome) ?? "uso direto como texto",
      utility: `text-${nome}`,
      pass: temChave,
      skipped: false,
      reason: temChave
        ? null
        : `\`text-${nome}\` e usada no codigo mas \`--color-${nome}\` nao esta no \`@theme\` — ` +
          "o Tailwind nao gera a utilitaria e o texto herda a cor do pai",
    });
  }

  return rows;
}

// --- Pares verificados --------------------------------------------------

const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3.0;

/**
 * Pares de tokens verificados nos dois temas. Exportado para as fases
 * seguintes poderem estender sem duplicar a lista.
 */
export const TOKEN_PAIRS = [
  { foreground: "foreground", background: "background", min: TEXT_MIN, label: "texto de corpo" },
  { foreground: "card-foreground", background: "card", min: TEXT_MIN, label: "texto em card" },
  { foreground: "popover-foreground", background: "popover", min: TEXT_MIN, label: "texto em popover" },
  { foreground: "muted-foreground", background: "background", min: TEXT_MIN, label: "texto secundario sobre fundo" },
  { foreground: "muted-foreground", background: "card", min: TEXT_MIN, label: "texto secundario em card" },
  // O gate de runtime pegou 22 rotulos de /venda-rapida a 4.40:1: eles vivem
  // sobre --card-elevated, que e' mais escuro que --card, e esse par nao estava
  // aqui. Mesmo padrao do --destructive-foreground: o defeito mora no par que
  // ninguem formou.
  { foreground: "muted-foreground", background: "card-elevated", min: TEXT_MIN, label: "texto secundario em card elevado" },
  // Mesma historia, um degrau adiante. Os tiles de metrica das telas
  // financeiras sao todos do mesmo desenho: rotulo `text-muted-foreground` de
  // 10px em cima, valor `text-<sem>-text` embaixo, os dois sobre o tint opaco
  // `bg-<sem>-bg`. O par do VALOR entrou na fase 16; o par do ROTULO nunca
  // existiu — e era ele que reprovava. `--info-bg` dava 4.47:1 e derrubou
  // "Valor Parcela" de /venda-rapida na varredura de runtime (f754f76).
  //
  // `error-bg` NAO entra: e o tint mais escuro da familia (4.23:1 com
  // `--muted-foreground`) e so chegaria a 4.50 com L=0.975, onde o tile some
  // contra o card (1.13:1). Nenhuma tela poe rotulo secundario sobre vermelho;
  // todas usam `text-error-text`. Registrar um par que ninguem forma seria
  // fabricar uma reprovacao. Se um dia alguem escrever
  // `text-muted-foreground` sobre `bg-error-bg`, o texto certo ali e
  // `--error-text`, nao um `--error-bg` clareado ate sumir.
  { foreground: "muted-foreground", background: "success-bg", min: TEXT_MIN, label: "rotulo do tile no tint de sucesso" },
  { foreground: "muted-foreground", background: "warning-bg", min: TEXT_MIN, label: "rotulo do tile no tint de alerta" },
  { foreground: "muted-foreground", background: "info-bg", min: TEXT_MIN, label: "rotulo do tile no tint de informacao" },
  // --- Sidebar (fase 19) ------------------------------------------------
  // Ate aqui a familia `--sidebar-*` tinha UM par medido, e a sidebar era
  // escura nos dois temas — o que escondia o resto: o rotulo inativo, o item
  // em hover, o icone da marca e os dois badges nunca foram medidos contra
  // nada. Com a sidebar acompanhando o tema, cada um desses elementos passa
  // por duas superficies diferentes (clara e escura) e todos entram aqui.
  // Token sem par nao e policiado.
  { foreground: "sidebar-foreground", background: "sidebar", min: TEXT_MIN, label: "texto na sidebar" },
  { foreground: "sidebar-muted", background: "sidebar", min: TEXT_MIN, label: "rotulo de item inativo e de grupo" },
  { foreground: "sidebar-muted", background: "sidebar-accent", min: TEXT_MIN, label: "rotulo e icone do item em hover" },
  { foreground: "sidebar-accent-foreground", background: "sidebar-accent", min: TEXT_MIN, label: "rotulo do item ativo" },
  { foreground: "sidebar-accent-foreground", background: "sidebar-primary-bg", min: TEXT_MIN, label: "icone do item em hover, no chip da marca" },
  // `--sidebar-primary` e cor de TEXTO/GRAFISMO da marca (icone do item ativo,
  // badge NOVO). Como PREENCHIMENTO, quem vai por cima e
  // `--sidebar-primary-foreground` — o par logo abaixo. Sao papeis distintos,
  // como `--success` vs `--success-text`.
  { foreground: "sidebar-primary", background: "sidebar", min: TEXT_MIN, label: "icone da marca sobre a sidebar" },
  { foreground: "sidebar-primary", background: "sidebar-primary-bg", min: TEXT_MIN, label: "badge NOVO — texto no tint da marca" },
  { foreground: "sidebar-primary-foreground", background: "sidebar-primary", min: TEXT_MIN, label: "badge de contagem — texto no preenchimento" },
  { foreground: "sidebar-primary", background: "sidebar-accent", min: NON_TEXT_MIN, label: "indicador do item ativo" },
  // Barras do "Clientes que compraram, mes a mes" (Dashboard): marca sobre o card.
  { foreground: "chart-novos", background: "card", min: NON_TEXT_MIN, label: "barra de clientes novos" },
  { foreground: "chart-recorrentes", background: "card", min: NON_TEXT_MIN, label: "barra de clientes recorrentes" },
  { foreground: "sidebar-ring", background: "sidebar", min: NON_TEXT_MIN, label: "anel de foco na sidebar (UI-06)" },
  // A sidebar hospeda componentes que ela NAO desenha e que resolvem tokens
  // GLOBAIS — foi exatamente isso que quebrou no tema claro. Enquanto a
  // sidebar era escura ninguem media esses tokens contra ela; agora que a
  // superficie muda, os dois que aparecem ali entram na catraca.
  //
  // `--error-text` e o texto do botao "Sair" (LogoutButton). Antes ele usava
  // `--destructive`, calibrado para 4.69:1 sobre `--background` (0.985) — e a
  // sidebar clara e 0.965, onde ele caia para 4.44:1 puro e 4.07:1 sobre o
  // tint. `--border` e a borda do painel e do ThemeToggle.
  { foreground: "error-text", background: "sidebar", min: TEXT_MIN, label: "texto do botao Sair na sidebar" },
  { foreground: "border", background: "sidebar", min: NON_TEXT_MIN, label: "borda de controle na sidebar" },
  // O icone do logo sobre o gradiente decorativo da marca. O gradiente e
  // identico nos dois temas; o extremo claro (rose) e o pior caso e vale como
  // grafico (>=3), o extremo escuro (violet) suporta texto.
  { foreground: "gradient-cta-foreground", background: "gradient-cta-from", min: NON_TEXT_MIN, label: "icone do logo — extremo claro do gradiente" },
  { foreground: "gradient-cta-foreground", background: "gradient-cta-to", min: TEXT_MIN, label: "icone do logo — extremo escuro do gradiente" },
  { foreground: "primary-foreground", background: "primary", min: TEXT_MIN, label: "texto em botao primario" },
  { foreground: "secondary-foreground", background: "secondary", min: TEXT_MIN, label: "texto em botao secundario" },
  { foreground: "accent-foreground", background: "accent", min: TEXT_MIN, label: "texto em accent" },
  { foreground: "success-foreground", background: "success", min: TEXT_MIN, label: "texto em sucesso" },
  { foreground: "warning-foreground", background: "warning", min: TEXT_MIN, label: "texto em alerta" },
  { foreground: "error-foreground", background: "error", min: TEXT_MIN, label: "texto em erro" },
  { foreground: "info-foreground", background: "info", min: TEXT_MIN, label: "texto em informacao" },
  { foreground: "destructive-foreground", background: "destructive", min: TEXT_MIN, label: "texto destrutivo" },
  // Variantes de TEXTO dos tokens semanticos (fase 16, achados 1/2/4). Os
  // tokens `--success`/`--warning`/`--info` sao cor de preenchimento e os
  // pares acima medem o texto ESCURO sobre eles; estes medem o caminho
  // inverso — o token colorido como texto sobre a superficie do card, que e
  // como as telas financeiras o usam. Sem estes pares, `--*-text` nao e
  // policiado e pode regredir em silencio.
  { foreground: "success-text", background: "card", min: TEXT_MIN, label: "texto de sucesso em card" },
  { foreground: "warning-text", background: "card", min: TEXT_MIN, label: "texto de alerta em card" },
  { foreground: "info-text", background: "card", min: TEXT_MIN, label: "texto de informacao em card" },
  // `--error-text` entrou na fase 17 (achado 3). Diferente dos outros tres,
  // `--error` ja aprovava como texto sobre card — o que reprovava era sobre o
  // proprio tint (4.01:1), que e como os callouts de /crm o usam.
  { foreground: "error-text", background: "card", min: TEXT_MIN, label: "texto de erro em card" },
  // Os mesmos tokens sobre o tint opaco da propria matiz (pilulas e caixas de
  // metrica). No tema escuro `--*-bg` tem alfa e o par sai como SKIP — nunca
  // como PASS (T-10-08).
  { foreground: "success-text", background: "success-bg", min: TEXT_MIN, label: "texto de sucesso em tint" },
  { foreground: "warning-text", background: "warning-bg", min: TEXT_MIN, label: "texto de alerta em tint" },
  { foreground: "info-text", background: "info-bg", min: TEXT_MIN, label: "texto de informacao em tint" },
  { foreground: "error-text", background: "error-bg", min: TEXT_MIN, label: "texto de erro em tint" },
  // --- Redesign Vantage (2026-10-16) ----------------------------------------
  // Tokens novos do contrato de superficies. Token sem par nao e policiado.
  //
  // ATENCAO: `--primary` (#0F7F0E no claro) como TEXTO fecha 5.17:1 no painel e
  // 4.72:1 no poco, mas so 4.43:1 sobre `--background` (#ECEEEC) e 4.45:1 sobre
  // `--marca-tint`. Por isso NAO ha par primary/background nem primary/marca-tint:
  // `text-primary` nao vai sobre a pagina nem sobre o tint no tema claro — la o
  // texto verde e `--marca-tint-texto` (par logo abaixo, 5.59:1).
  { foreground: "texto-secundario", background: "card", min: TEXT_MIN, label: "texto de 2o nivel no painel" },
  { foreground: "texto-secundario", background: "poco", min: TEXT_MIN, label: "texto de 2o nivel no poco" },
  { foreground: "texto-secundario", background: "card-elevated", min: TEXT_MIN, label: "texto de 2o nivel no card interno" },
  { foreground: "marca-tint-texto", background: "marca-tint", min: TEXT_MIN, label: "texto verde do selo no tint da marca" },
  { foreground: "primary", background: "card", min: TEXT_MIN, label: "texto verde no painel" },
  { foreground: "primary", background: "poco", min: NON_TEXT_MIN, label: "verde (barra, indicador) no poco" },
  { foreground: "foreground", background: "shell", min: TEXT_MIN, label: "texto na casca" },
  { foreground: "foreground", background: "poco", min: TEXT_MIN, label: "texto no poco" },
  { foreground: "foreground", background: "controle", min: TEXT_MIN, label: "texto no controle" },
  { foreground: "foreground", background: "controle-ativo", min: TEXT_MIN, label: "texto no controle selecionado" },
  { foreground: "muted-foreground", background: "shell", min: TEXT_MIN, label: "texto secundario na casca" },
  { foreground: "muted-foreground", background: "poco", min: TEXT_MIN, label: "texto secundario no poco" },
  { foreground: "muted-foreground", background: "controle", min: TEXT_MIN, label: "texto secundario no controle" },
  { foreground: "muted-foreground", background: "controle-ativo", min: TEXT_MIN, label: "texto secundario no controle selecionado" },
  { foreground: "grafico-neutro", background: "poco", min: NON_TEXT_MIN, label: "barra neutra no poco" },
  { foreground: "hachura-traco", background: "poco", min: NON_TEXT_MIN, label: "traco da hachura no poco" },
  // O vidro tem alfa (par seria SKIP); o par real e o do piso OPACO, que e o que
  // o navegador sem backdrop-filter pinta.
  { foreground: "foreground", background: "vidro-piso", min: TEXT_MIN, label: "texto no tooltip (piso opaco do vidro)" },
  { foreground: "muted-foreground", background: "vidro-piso", min: TEXT_MIN, label: "texto secundario no tooltip (piso opaco do vidro)" },
  { foreground: "ring", background: "background", min: NON_TEXT_MIN, label: "indicador de foco (UI-06)" },
  { foreground: "ring", background: "card", min: NON_TEXT_MIN, label: "indicador de foco no painel" },
  { foreground: "border", background: "background", min: NON_TEXT_MIN, label: "borda sobre fundo" },
  { foreground: "border", background: "card", min: NON_TEXT_MIN, label: "borda sobre card" },
];

// --- CLI --------------------------------------------------------------

export const DEFAULT_CSS_PATH = "src/app/globals.css";

function formatRatio(ratio) {
  return ratio === null ? "—" : ratio.toFixed(2);
}

function printTable(rows) {
  const header = ["par", "tema", "razao", "minimo", "resultado"];
  console.log(header.join(" | "));
  for (const row of rows) {
    const parLabel = `${row.foreground}/${row.background} (${row.label})`;
    const resultado = row.skipped ? `SKIP — ${row.reason}` : row.pass ? "PASS" : "FAIL";
    console.log([parLabel, row.theme, formatRatio(row.ratio), row.min, resultado].join(" | "));
  }
}

function parseArgs(argv) {
  let cssPath = DEFAULT_CSS_PATH;
  let srcDir = DEFAULT_SRC_DIR;
  for (const arg of argv) {
    if (arg.startsWith("--css=")) {
      cssPath = arg.slice("--css=".length);
    } else if (arg.startsWith("--src=")) {
      srcDir = arg.slice("--src=".length);
    } else if (arg.startsWith("--")) {
      throw new Error(`Flag desconhecida: ${arg}`);
    }
  }
  return { cssPath, srcDir };
}

export const DEFAULT_SRC_DIR = "src";

/** Le recursivamente os `.ts`/`.tsx` de `dir`. Devolve o conteudo de cada um. */
function readSourceFiles(dir) {
  const textos = [];
  const walk = (atual) => {
    for (const entrada of fs.readdirSync(atual, { withFileTypes: true })) {
      const p = path.join(atual, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === "node_modules") continue;
        walk(p);
      } else if (p.endsWith(".ts") || p.endsWith(".tsx")) {
        textos.push(fs.readFileSync(p, "utf8"));
      }
    }
  };
  walk(dir);
  return textos;
}

function printCoverageTable(rows) {
  console.log("\nutilitaria | chave exigida no @theme | resultado");
  for (const row of rows) {
    console.log(
      [row.utility, `--color-${row.foreground}`, row.pass ? "PASS" : `FAIL — ${row.reason}`].join(" | ")
    );
  }
}

function runCli(argv) {
  const { cssPath, srcDir } = parseArgs(argv);
  const cssText = fs.readFileSync(cssPath, "utf8");
  const tokens = parseTokens(cssText);
  const rows = checkPairs(tokens, TOKEN_PAIRS);

  printTable(rows);

  const failures = rows.filter((r) => !r.skipped && !r.pass);
  const skipped = rows.filter((r) => r.skipped);
  const passed = rows.filter((r) => !r.skipped && r.pass);

  console.log(
    `\nResumo: ${passed.length} passaram, ${failures.length} reprovaram, ${skipped.length} pulados (alfa/token ausente).`
  );

  // Segundo degrau: o par pode estar perfeito e a cor nunca chegar a tela.
  //
  // Se o diretorio de codigo nao existir, isto e ERRO, nao SKIP: pular em
  // silencio devolveria exit 0 e a catraca viraria no-op sempre que rodasse
  // fora da raiz do repo — o mesmo falso verde que ela existe para impedir
  // (o lado do CSS ja estoura alto, via readFileSync).
  if (!fs.existsSync(srcDir)) {
    throw new Error(
      `Diretorio de codigo '${srcDir}' nao encontrado — a cobertura do @theme nao pode ser verificada. ` +
        "Rode a partir da raiz do repo ou passe --src=<caminho>."
    );
  }

  const coverage = checkThemeCoverage({
    themeKeys: parseThemeColorKeys(cssText),
    usedAsText: collectTextColorClasses(readSourceFiles(srcDir)),
    declaredTokens: new Set(Object.keys(tokens.light ?? {})),
    pairs: TOKEN_PAIRS,
  });
  printCoverageTable(coverage);
  const coverageFailures = coverage.filter((r) => !r.pass);
  console.log(
    `\nCobertura do @theme: ${coverage.length - coverageFailures.length} de ${coverage.length} utilitarias usadas no codigo tem chave declarada.`
  );

  return failures.length > 0 || coverageFailures.length > 0 ? 1 : 0;
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const exitCode = runCli(process.argv.slice(2));
  process.exit(exitCode);
}
