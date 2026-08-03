// Teste de fiacao do plano 10-02. O ESLint nao roda nesta maquina (sem
// node_modules), entao este arquivo nao testa a regra em execucao — testa o
// contrato de fiacao do config, que e o que pode quebrar em silencio:
// import do padrao unico, leitura do baseline sem `with { type: "json" }` e
// a lista de arquivos legados/excecao derivada dele.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(REPO_ROOT, "eslint.config.mjs");
const BASELINE_PATH = path.join(REPO_ROOT, "design-system", "raw-color-baseline.json");

// --- Task 1: fiacao do eslint.config.mjs ---------------------------------

test("eslint.config.mjs passa em checagem de sintaxe (node --check)", () => {
  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ["--check", CONFIG_PATH], { stdio: "pipe" });
  });
});

test("eslint.config.mjs importa RAW_COLOR_PATTERN_SOURCE do scanner de cor crua (padrao unico)", () => {
  const text = fs.readFileSync(CONFIG_PATH, "utf8");
  assert.match(
    text,
    /import\s*\{\s*RAW_COLOR_PATTERN_SOURCE\s*\}\s*from\s*["']\.\/scripts\/design-tokens\/raw-color-scan\.mjs["']/,
    "config deveria importar RAW_COLOR_PATTERN_SOURCE de ./scripts/design-tokens/raw-color-scan.mjs"
  );
});

test("eslint.config.mjs le o baseline via node:fs, sem 'with { type: \"json\" }'", () => {
  const text = fs.readFileSync(CONFIG_PATH, "utf8");
  assert.ok(
    text.includes("design-system/raw-color-baseline.json"),
    "config deveria referenciar design-system/raw-color-baseline.json"
  );
  assert.ok(text.includes("readFileSync"), "config deveria ler o baseline com readFileSync");
  assert.equal(
    text.includes("with { type:"),
    false,
    "config nao deveria usar import attribute 'with { type: ... }' (instavel no Node 20)"
  );
});

test("lista de arquivos legados do baseline tem 22 entradas e excecoes tem 1", () => {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const legacyFiles = Object.keys(baseline.files);
  const exceptionFiles = (baseline.exceptions ?? []).map((exception) => exception.file);
  assert.equal(legacyFiles.length, 22);
  assert.equal(exceptionFiles.length, 1);
});

test("todo arquivo do baseline existe em disco", () => {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const allFiles = [
    ...Object.keys(baseline.files),
    ...(baseline.exceptions ?? []).map((exception) => exception.file),
  ];
  for (const relPath of allFiles) {
    const fullPath = path.join(REPO_ROOT, relPath);
    assert.ok(fs.existsSync(fullPath), `arquivo do baseline nao existe em disco: ${relPath}`);
  }
});

// --- Task 2: divida de lint pre-existente (location.href) ----------------

const LOCATION_ASSIGNMENT_SITES = [
  "src/components/historico-antecipacoes.tsx",
  "src/components/antecipacao-client.tsx",
  "src/components/report-buttons-client.tsx",
];

test("historico-antecipacoes.tsx, antecipacao-client.tsx e report-buttons-client.tsx nao atribuem direto a location.href", () => {
  for (const relPath of LOCATION_ASSIGNMENT_SITES) {
    const fullPath = path.join(REPO_ROOT, relPath);
    const text = fs.readFileSync(fullPath, "utf8");
    const linhasComAtribuicaoDireta = text
      .split("\n")
      .filter((line) => line.includes("location.href") && line.includes("="));

    assert.equal(
      linhasComAtribuicaoDireta.length,
      0,
      `${relPath} ainda atribui direto a location.href: ${linhasComAtribuicaoDireta.join(" | ")}`
    );
    assert.ok(
      text.includes("location.assign("),
      `${relPath} deveria navegar via location.assign(...)`
    );
  }
});
