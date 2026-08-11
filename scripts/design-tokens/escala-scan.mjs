// Detector de valor FORA DA ESCALA do design system — módulo puro, sem dependências.
//
// Complementa `raw-color-scan.mjs`, que só enxerga classe Tailwind de COR. Duas
// coisas escaparam inteiras daquela catraca e da de contraste:
//
//   1. Tamanho de fonte arbitrário (`text-[10px]`, `text-[9px]`). Não é cor,
//      então o scanner de cor nunca o viu. Medido em 2026-08-11: 71 usos em 21
//      arquivos, incluindo 8 de `text-[9px]`, abaixo do limite prático de
//      legibilidade. Nenhum deles acompanha a escala tipográfica.
//
//   2. Cor escrita em CSS PURO. A catraca varre classes Tailwind em `src/**`,
//      não `globals.css`. O degradê de três cores dos títulos de página vivia em
//      `.page-title-gradient` como `linear-gradient(oklch(...))` e atravessou
//      INTACTO a troca da paleta da marca — invisível para as duas travas.
//      Cor em CSS puro tem de vir de `var(--token)`.
//
// Como o de cor: conta, compara com baseline versionado e falha em regressão
// (`--check`, exit 1). Corrigir reduz o número; nada obriga a corrigir tudo de
// uma vez, mas ninguém consegue piorar.
//
// Nota de segurança (CLAUDE.md): o hook do projeto bloqueia o padrão imperativo
// de `RegExp.prototype.exec` + `lastIndex` em loop. Este módulo NUNCA o usa —
// toda extração é `String.prototype.split()` com regex global.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, "..", "..");
export const DEFAULT_BASELINE_PATH = path.join(RAIZ, "design-system", "escala-baseline.json");

/** Extensões varridas para classe utilitária. */
const EXT_CODIGO = new Set([".tsx", ".ts", ".jsx", ".js"]);
/** Extensões varridas para cor em CSS puro. */
const EXT_ESTILO = new Set([".css"]);

const IGNORAR_DIR = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);

/**
 * Exceção declarada: serve HTML autônomo com Tailwind via CDN, fora do pipeline
 * de tokens. Mesma exceção que o scanner de cor já reconhece.
 */
export const EXCECOES = ["src/app/api/relatorios/catalogo/route.ts"];

// --- 1. tamanho de fonte arbitrário -----------------------------------

/** `text-[10px]`, `text-[0.625rem]`, `text-[9px]` — qualquer literal no lugar da escala. */
export const TAMANHO_ARBITRARIO_SOURCE = "(text-\\[[0-9.]+(?:px|rem|em|pt)\\])";

export function criarRegexTamanho(flags = "g") {
  return new RegExp(TAMANHO_ARBITRARIO_SOURCE, flags);
}

/**
 * Remove comentário de código antes de contar.
 *
 * Sem isto, o comentário que DOCUMENTA a correção conta como se fosse a
 * violação: `notification-bell.tsx` foi corrigido na onda 1 e o comentário que
 * explica a troca cita `text-[9px]` na prosa — o contador daquele arquivo
 * ficava travado em 1 para sempre, e a leitura natural seria "corrigir" código
 * que já está certo. Mesmo cuidado que a varredura de CSS já tinha; faltava no
 * lado do código.
 */
export function removerComentariosDeCodigo(texto) {
  let saida = "";
  let dentroDeBloco = false;

  for (const linha of texto.split("\n")) {
    let util = "";
    let resto = linha;

    while (resto.length > 0) {
      if (dentroDeBloco) {
        const fim = resto.indexOf("*/");
        if (fim === -1) { resto = ""; break; }
        dentroDeBloco = false;
        resto = resto.slice(fim + 2);
      } else {
        const bloco = resto.indexOf("/*");
        const linhaUnica = resto.indexOf("//");
        // `//` dentro de string (ex.: uma URL) não abre comentário; o caso é
        // raro em className e o custo de um falso negativo aqui é menor que o
        // de um falso positivo permanente.
        if (bloco === -1 && linhaUnica === -1) { util += resto; break; }
        if (linhaUnica !== -1 && (bloco === -1 || linhaUnica < bloco)) {
          util += resto.slice(0, linhaUnica);
          break;
        }
        util += resto.slice(0, bloco);
        dentroDeBloco = true;
        resto = resto.slice(bloco + 2);
      }
    }
    saida += util + "\n";
  }
  return saida;
}

export function acharTamanhosArbitrarios(texto) {
  const partes = removerComentariosDeCodigo(texto).split(criarRegexTamanho());
  const achados = [];
  // split com 1 grupo de captura devolve [antes, grupo, entre, grupo, ...]
  for (let i = 1; i < partes.length; i += 2) achados.push(partes[i]);
  return achados;
}

// --- 2. cor em CSS puro ------------------------------------------------

/**
 * Função de cor literal em CSS: `oklch(...)`, `#rrggbb`, `rgb(...)`, `hsl(...)`.
 * O que É permitido: `var(--token)`. Por isso a declaração de token no `:root`
 * e no `.dark` precisa ser ignorada — é justamente lá que a cor literal deve
 * viver.
 */
export const COR_CSS_SOURCE = "(oklch\\([^)]*\\)|#[0-9a-fA-F]{3,8}\\b|rgba?\\([^)]*\\)|hsla?\\([^)]*\\))";

export function criarRegexCorCss(flags = "g") {
  return new RegExp(COR_CSS_SOURCE, flags);
}

/**
 * Uma linha declara token quando define uma custom property (`--x: ...`).
 * Essas são a FONTE dos tokens: cor literal ali é obrigatória, não divergência.
 */
function ehDeclaracaoDeToken(linha) {
  const semEspaco = linha.trim();
  return semEspaco.startsWith("--") && semEspaco.includes(":");
}

/**
 * `oklch(from var(--token) ...)` DERIVA de um token — é exatamente o que se
 * quer, não cor literal. Sem esta exceção o detector acusaria o realce de foco
 * e o degradê de skeleton, que são os dois usos mais corretos do arquivo.
 */
function ehDerivacaoDeToken(trecho) {
  return trecho.includes("from var(--");
}

export function acharCoresCssPuro(texto) {
  const achados = [];
  const linhas = texto.split("\n");
  // Comentário de bloco atravessa linhas: sem rastrear o estado, a PROSA que
  // explica uma cor (e cita `oklch(...)` no texto) era contada como se fosse
  // código. Sete dos nove primeiros achados eram isso — falso positivo que
  // ensina a ignorar a trava.
  let dentroDeComentario = false;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    let util = "";
    let resto = linha;

    while (resto.length > 0) {
      if (dentroDeComentario) {
        const fim = resto.indexOf("*/");
        if (fim === -1) { resto = ""; break; }
        dentroDeComentario = false;
        resto = resto.slice(fim + 2);
      } else {
        const inicio = resto.indexOf("/*");
        if (inicio === -1) { util += resto; break; }
        util += resto.slice(0, inicio);
        dentroDeComentario = true;
        resto = resto.slice(inicio + 2);
      }
    }

    if (!util.trim() || ehDeclaracaoDeToken(util)) continue;

    const partes = util.split(criarRegexCorCss());
    for (let j = 1; j < partes.length; j += 2) {
      const valor = partes[j];
      const contexto = util.slice(Math.max(0, util.indexOf(valor) - 20), util.indexOf(valor) + valor.length);
      if (ehDerivacaoDeToken(valor) || ehDerivacaoDeToken(contexto)) continue;
      achados.push({ linha: i + 1, valor });
    }
  }
  return achados;
}

// --- varredura ---------------------------------------------------------

function listarArquivos(raiz, acumulador = []) {
  let entradas;
  try {
    entradas = fs.readdirSync(raiz, { withFileTypes: true });
  } catch {
    return acumulador;
  }
  for (const entrada of entradas) {
    const completo = path.join(raiz, entrada.name);
    if (entrada.isDirectory()) {
      if (IGNORAR_DIR.has(entrada.name)) continue;
      listarArquivos(completo, acumulador);
    } else {
      acumulador.push(completo);
    }
  }
  return acumulador;
}

export function varrer(raizes) {
  const porArquivo = {};
  let totalTamanho = 0;
  let totalCorCss = 0;

  for (const raiz of raizes) {
    for (const completo of listarArquivos(path.resolve(RAIZ, raiz))) {
      const relativo = path.relative(RAIZ, completo).split(path.sep).join("/");
      if (EXCECOES.includes(relativo)) continue;
      const ext = path.extname(completo);
      let texto;
      try {
        texto = fs.readFileSync(completo, "utf8");
      } catch {
        continue;
      }

      let tamanhos = 0;
      let coresCss = 0;
      if (EXT_CODIGO.has(ext)) tamanhos = acharTamanhosArbitrarios(texto).length;
      if (EXT_ESTILO.has(ext)) coresCss = acharCoresCssPuro(texto).length;

      if (tamanhos > 0 || coresCss > 0) {
        porArquivo[relativo] = { tamanhoArbitrario: tamanhos, corCssPuro: coresCss };
        totalTamanho += tamanhos;
        totalCorCss += coresCss;
      }
    }
  }

  return { porArquivo, totalTamanho, totalCorCss, total: totalTamanho + totalCorCss };
}

function lerBaseline(caminho) {
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch {
    return null;
  }
}

export function comparar(resultado, baseline) {
  const regressoes = [];
  for (const [arquivo, atual] of Object.entries(resultado.porArquivo)) {
    const antes = baseline.porArquivo?.[arquivo] ?? { tamanhoArbitrario: 0, corCssPuro: 0 };
    if (atual.tamanhoArbitrario > (antes.tamanhoArbitrario ?? 0)) {
      regressoes.push(
        `${arquivo}: tamanho de fonte fora da escala ${antes.tamanhoArbitrario ?? 0} -> ${atual.tamanhoArbitrario}`
      );
    }
    if (atual.corCssPuro > (antes.corCssPuro ?? 0)) {
      regressoes.push(
        `${arquivo}: cor literal em CSS puro ${antes.corCssPuro ?? 0} -> ${atual.corCssPuro}`
      );
    }
  }
  return regressoes;
}

function principal(argv) {
  const args = argv.slice(2);
  const check = args.includes("--check");
  const gravar = args.includes("--baseline");
  const raizes = args.filter((a) => !a.startsWith("--"));
  const alvos = raizes.length > 0 ? raizes : ["src"];

  const resultado = varrer(alvos);

  if (gravar) {
    fs.writeFileSync(
      DEFAULT_BASELINE_PATH,
      JSON.stringify(
        { total: resultado.total, totalTamanho: resultado.totalTamanho, totalCorCss: resultado.totalCorCss, porArquivo: resultado.porArquivo },
        null,
        2
      ) + "\n"
    );
    console.log(
      `Baseline gravado em ${DEFAULT_BASELINE_PATH} — ${resultado.totalTamanho} tamanho(s) fora da escala, ${resultado.totalCorCss} cor(es) em CSS puro.`
    );
    return 0;
  }

  if (!check) {
    console.log(`Tamanho de fonte fora da escala: ${resultado.totalTamanho}`);
    console.log(`Cor literal em CSS puro:        ${resultado.totalCorCss}`);
    const ordenado = Object.entries(resultado.porArquivo).sort(
      (a, b) => b[1].tamanhoArbitrario + b[1].corCssPuro - (a[1].tamanhoArbitrario + a[1].corCssPuro)
    );
    for (const [arquivo, d] of ordenado.slice(0, 20)) {
      console.log(`  ${String(d.tamanhoArbitrario + d.corCssPuro).padStart(3)}  ${arquivo}`);
    }
    return 0;
  }

  const baseline = lerBaseline(DEFAULT_BASELINE_PATH);
  if (!baseline) {
    console.error(
      `ERRO: baseline ausente em ${DEFAULT_BASELINE_PATH}. Rode: node scripts/design-tokens/escala-scan.mjs src src/app --baseline`
    );
    return 1;
  }

  const regressoes = comparar(resultado, baseline);
  if (regressoes.length > 0) {
    console.error("REGRESSAO — valor fora da escala do design system:\n");
    for (const r of regressoes) console.error(`  ${r}`);
    console.error(
      `\nUse a escala tipografica (text-xs, text-sm, ...) e cor por var(--token).\nVer design-system/IDENTIDADE-VISUAL.md.`
    );
    return 1;
  }

  const saldo = baseline.total - resultado.total;
  console.log(
    `OK — sem regressoes. Tamanho fora da escala: ${resultado.totalTamanho}, cor em CSS puro: ${resultado.totalCorCss}` +
      (saldo > 0 ? ` (${saldo} a menos que o baseline)` : "")
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("escala-scan.mjs")) {
  process.exit(principal(process.argv));
}
