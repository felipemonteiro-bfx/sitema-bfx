// Detector de cor crua (Tailwind) — módulo puro, sem dependências externas.
//
// Conta ocorrências de classes utilitárias Tailwind com escala numérica de cor
// (ex.: `bg-red-500`) em `src/`, compara contra um baseline versionado e falha
// (`--check`, exit 1) quando algum arquivo regride. Fonte única do padrão de
// detecção — consumido também pela regra de ESLint do plano 02 via
// `RAW_COLOR_PATTERN_SOURCE`.
//
// Só usa `node:fs`, `node:path` e `node:url`. Nenhum pacote foi instalado.
//
// Nota de segurança (T-10-02, CLAUDE.md): o hook de segurança do projeto
// bloqueia o padrão imperativo de execução de regex com estado
// (`RegExp.prototype.exec` + `lastIndex` em loop). Este módulo NUNCA usa esse
// padrão — toda extração de ocorrências usa `String.prototype.split()` com um
// regex global, que devolve os grupos capturados intercalados com o texto ao
// redor sem exigir controle manual de estado.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- Fonte única do padrão --------------------------------------------

/** Prefixos de utilitário Tailwind que aceitam cor. */
export const RAW_COLOR_PREFIXES = [
  "bg",
  "text",
  "border",
  "ring",
  "from",
  "to",
  "via",
  "fill",
  "stroke",
  "divide",
  "outline",
  "decoration",
  "placeholder",
  "shadow",
  "accent",
  "caret",
];

/** Famílias de paleta cruas do Tailwind (não inclui tokens semânticos). */
export const RAW_COLOR_FAMILIES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
];

/** Degraus da escala numérica Tailwind, em ordem decrescente. */
export const RAW_COLOR_SCALE = [950, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50];

/**
 * Source (sem flags) do regex que casa `prefixo-familia-escala`, com sufixo
 * de borda que rejeita dígito subsequente (`bg-red-5000` não conta) e
 * modificador de opacidade opcional (`bg-red-500/20`). Montado só com
 * alternâncias literais e quantificadores simples — sem grupo aninhado com
 * quantificador sobre quantificador, para nunca sofrer backtracking
 * catastrófico (T-10-02).
 *
 * Reusado pela regra de ESLint do plano 02 (via esquery) — por isso não
 * inclui a lógica de borda de string (espaço/aspas/`:`/etc.), que é
 * específica de varredura de texto bruto e vive só em `scanText`.
 */
export const RAW_COLOR_PATTERN_SOURCE =
  `(?:${RAW_COLOR_PREFIXES.join("|")})-` +
  `(?:${RAW_COLOR_FAMILIES.join("|")})-` +
  `(?:${RAW_COLOR_SCALE.join("|")})(?!\\d)` +
  `(?:/\\d{1,3})?`;

/** Devolve um `RegExp` novo a cada chamada — nunca compartilha estado. */
export function createRawColorRegex(flags) {
  return new RegExp(RAW_COLOR_PATTERN_SOURCE, flags);
}

// Caracteres de borda que podem preceder uma ocorrência dentro de um arquivo
// de código: início de string, espaço, aspas, crase, `:` (variantes como
// `hover:`, `dark:`, `data-[state=open]:`), `[`, `(`, `{` ou `;`.
const BOUNDARY_CLASS_SOURCE = "[\\s\"'`:\\[({;]";

// --- scanText -------------------------------------------------------------

/**
 * Varre um texto e devolve todas as ocorrências de cor crua como
 * `{ className, index }`. Usa `String.prototype.split()` com um regex global
 * de dois grupos captura (borda, classe) — nunca `RegExp.prototype.exec`.
 */
export function scanText(text) {
  const fullSource = `(^|${BOUNDARY_CLASS_SOURCE})(${RAW_COLOR_PATTERN_SOURCE})`;
  const re = new RegExp(fullSource, "g");
  const parts = text.split(re);

  const occurrences = [];
  let offset = 0;

  for (let i = 0; i < parts.length; i += 3) {
    const literalChunk = parts[i] ?? "";
    offset += literalChunk.length;

    const boundaryChunk = parts[i + 1];
    const classNameChunk = parts[i + 2];
    if (classNameChunk === undefined) continue;

    offset += boundaryChunk.length;
    occurrences.push({ className: classNameChunk, index: offset });
    offset += classNameChunk.length;
  }

  return occurrences;
}

// --- scanPaths --------------------------------------------------------

const IGNORED_DIR_NAMES = new Set(["node_modules", ".next", "generated"]);
const SCANNED_EXTENSIONS = [".ts", ".tsx"];

function walk(dir, fileList) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return fileList;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) continue;
      walk(path.join(dir, entry.name), fileList);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;
    fileList.push(path.join(dir, entry.name));
  }

  return fileList;
}

/**
 * Varre recursivamente `.ts`/`.tsx` sob cada raiz de `roots`, ignorando
 * `node_modules`, `.next` e `generated`. Devolve `{ files: { caminho: n },
 * total: n }`; arquivos com zero ocorrência não entram em `files`.
 */
export function scanPaths(roots) {
  const rootList = Array.isArray(roots) ? roots : [roots];
  const files = {};

  for (const root of rootList) {
    const collected = walk(root, []);
    for (const filePath of collected) {
      const text = fs.readFileSync(filePath, "utf8");
      const occurrences = scanText(text);
      if (occurrences.length === 0) continue;
      files[filePath] = (files[filePath] ?? 0) + occurrences.length;
    }
  }

  const total = Object.values(files).reduce((sum, n) => sum + n, 0);
  return { files, total };
}

// --- CLI --------------------------------------------------------------

function printTable(result) {
  const rows = Object.entries(result.files).sort((a, b) => b[1] - a[1]);
  for (const [file, count] of rows) {
    console.log(`${count}\t${file}`);
  }
  console.log(`TOTAL: ${result.total} (${rows.length} arquivos)`);
}

function parseArgs(argv) {
  const roots = [];

  for (const arg of argv) {
    if (arg.startsWith("--")) {
      throw new Error(`Flag desconhecida: ${arg}`);
    }
    roots.push(arg);
  }

  if (roots.length === 0) roots.push("src");
  return { roots };
}

function runCli(argv) {
  const { roots } = parseArgs(argv);
  const result = scanPaths(roots);
  printTable(result);
  return 0;
}

// --- Entry point --------------------------------------------------------

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const exitCode = runCli(process.argv.slice(2));
  process.exit(exitCode);
}
