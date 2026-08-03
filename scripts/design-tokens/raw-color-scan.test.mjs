import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import {
  RAW_COLOR_PREFIXES,
  RAW_COLOR_FAMILIES,
  RAW_COLOR_SCALE,
  RAW_COLOR_PATTERN_SOURCE,
  createRawColorRegex,
  scanText,
  scanPaths,
  readBaseline,
  writeBaseline,
  compareToBaseline,
} from "./raw-color-scan.mjs";

const SCRIPT_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), "raw-color-scan.mjs");

// --- Task 1: scanText -------------------------------------------------

test("RAW_COLOR_PATTERN_SOURCE is built from the exported prefix/family/scale arrays", () => {
  assert.ok(Array.isArray(RAW_COLOR_PREFIXES) && RAW_COLOR_PREFIXES.length > 0);
  assert.ok(Array.isArray(RAW_COLOR_FAMILIES) && RAW_COLOR_FAMILIES.length > 0);
  assert.ok(Array.isArray(RAW_COLOR_SCALE) && RAW_COLOR_SCALE.length > 0);
  assert.equal(typeof RAW_COLOR_PATTERN_SOURCE, "string");
  for (const prefix of RAW_COLOR_PREFIXES) {
    assert.ok(RAW_COLOR_PATTERN_SOURCE.includes(prefix));
  }
});

test("createRawColorRegex returns a fresh RegExp instance every call", () => {
  const a = createRawColorRegex("g");
  const b = createRawColorRegex("g");
  assert.notEqual(a, b);
  assert.equal(a.source, b.source);
  assert.equal(a.flags, "g");
});

test("scanText matches every raw-color utility prefix listed in the plan", () => {
  const positives = [
    "bg-red-500",
    "text-slate-700",
    "border-amber-200",
    "ring-blue-500",
    "from-purple-600",
    "to-slate-900",
    "via-indigo-400",
    "fill-green-500",
    "stroke-gray-400",
    "divide-zinc-200",
    "outline-rose-500",
    "decoration-sky-600",
    "placeholder-gray-400",
    "shadow-blue-500",
    "accent-teal-500",
    "caret-cyan-500",
  ];
  for (const className of positives) {
    const occurrences = scanText(`<div className="${className}" />`);
    assert.equal(
      occurrences.length,
      1,
      `esperava casar "${className}", achou ${occurrences.length} ocorrencia(s)`
    );
  }
});

test("scanText matches with variant prefixes and opacity modifiers", () => {
  const positives = [
    "hover:bg-red-500",
    "dark:text-gray-400",
    "md:border-slate-200",
    "group-hover:text-blue-600",
    "data-[state=open]:bg-slate-100",
    "bg-red-500/20",
    "text-emerald-950",
  ];
  for (const className of positives) {
    const occurrences = scanText(`<div className="${className}" />`);
    assert.ok(
      occurrences.length >= 1,
      `esperava casar "${className}", achou ${occurrences.length} ocorrencia(s)`
    );
  }
});

test("scanText does NOT match semantic tokens and unrelated numeric utilities", () => {
  const negatives = [
    "bg-background",
    "text-foreground",
    "border-border",
    "text-muted-foreground",
    "bg-card",
    "bg-success",
    "text-destructive",
    "bg-muted/30",
    "duration-500",
    "delay-300",
    "z-50",
    "grid-cols-12",
    "min-w-[44px]",
    "text-[10px]",
    "translate-y-100",
    "opacity-50",
  ];
  for (const className of negatives) {
    const occurrences = scanText(`<div className="${className}" />`);
    assert.equal(
      occurrences.length,
      0,
      `NAO esperava casar "${className}", achou ${occurrences.length} ocorrencia(s)`
    );
  }
});

test("scanText only accepts the Tailwind numeric scale, rejecting a trailing digit", () => {
  assert.equal(scanText("bg-red-5000").length, 0);
  assert.equal(scanText("bg-red-500").length, 1);
});

test("scanText counts two raw-color classes on one line as two occurrences", () => {
  const occurrences = scanText("bg-red-500 text-blue-600");
  assert.equal(occurrences.length, 2);
  assert.equal(occurrences[0].className, "bg-red-500");
  assert.equal(occurrences[1].className, "text-blue-600");
  assert.equal(occurrences[0].index, 0);
  assert.equal(occurrences[1].index, 11);
});

// --- Task 1: scanPaths --------------------------------------------------

function makeFixtureDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "raw-color-scan-"));
}

test("scanPaths walks .ts/.tsx recursively, ignoring node_modules/.next/src/generated", () => {
  const dir = makeFixtureDir();
  fs.mkdirSync(path.join(dir, "nested"), { recursive: true });
  fs.mkdirSync(path.join(dir, "node_modules", "pkg"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".next"), { recursive: true });
  fs.mkdirSync(path.join(dir, "generated"), { recursive: true });

  fs.writeFileSync(
    path.join(dir, "a.tsx"),
    `export const A = () => <div className="bg-red-500 text-blue-600" />;\n`
  );
  fs.writeFileSync(
    path.join(dir, "nested", "b.tsx"),
    `export const B = () => <span className="border-amber-200" />;\n`
  );
  fs.writeFileSync(path.join(dir, "c.txt"), "bg-red-500 bg-red-500 bg-red-500\n");
  fs.writeFileSync(
    path.join(dir, "node_modules", "pkg", "ignored.tsx"),
    `bg-red-500 bg-red-500\n`
  );
  fs.writeFileSync(path.join(dir, ".next", "ignored.tsx"), `bg-red-500\n`);
  fs.writeFileSync(path.join(dir, "generated", "ignored.tsx"), `bg-red-500\n`);

  const result = scanPaths([dir]);

  const aPath = path.join(dir, "a.tsx");
  const bPath = path.join(dir, "nested", "b.tsx");

  assert.equal(result.files[aPath], 2);
  assert.equal(result.files[bPath], 1);
  assert.equal(Object.keys(result.files).length, 2);
  assert.equal(result.total, 3);
});

test("scanPaths omits files with zero occurrences from the files map", () => {
  const dir = makeFixtureDir();
  fs.writeFileSync(path.join(dir, "clean.tsx"), `export const X = () => <div className="bg-background" />;\n`);
  const result = scanPaths([dir]);
  assert.equal(Object.keys(result.files).length, 0);
  assert.equal(result.total, 0);
});

test("scanPaths is deterministic across repeated runs on the same tree", () => {
  const dir = makeFixtureDir();
  fs.writeFileSync(path.join(dir, "a.tsx"), `bg-red-500 text-blue-600\n`);
  const first = scanPaths([dir]);
  const second = scanPaths([dir]);
  assert.deepEqual(first, second);
});

// --- Task 2: writeBaseline / readBaseline -------------------------------

test("writeBaseline writes files (minus exceptions), total and exceptions to disk", () => {
  const dir = makeFixtureDir();
  const baselinePath = path.join(dir, "baseline.json");
  const scanResult = {
    files: { "src/a.tsx": 3, "src/exempt.ts": 5, "src/b.tsx": 2 },
    total: 10,
  };
  const exceptions = [{ file: "src/exempt.ts", reason: "CDN Tailwind autonomo" }];

  const written = writeBaseline(baselinePath, scanResult, exceptions);

  assert.equal(written.total, 5); // 3 + 2, exclui a excecao
  assert.deepEqual(written.files, { "src/a.tsx": 3, "src/b.tsx": 2 });
  assert.deepEqual(written.exceptions, exceptions);
  assert.equal(typeof written.generatedAt, "string");
  assert.equal(typeof written.command, "string");

  const reloaded = readBaseline(baselinePath);
  assert.deepEqual(reloaded, written);
});

// --- Task 2: compareToBaseline -------------------------------------------

test("compareToBaseline: file with lower current count is an improvement, ok stays true", () => {
  const baseline = { files: { "src/a.tsx": 5 }, exceptions: [] };
  const atual = { files: { "src/a.tsx": 3 } };
  const result = compareToBaseline(atual, baseline);
  assert.equal(result.ok, true);
  assert.equal(result.regressions.length, 0);
  assert.equal(result.improvements.length, 1);
  assert.equal(result.improvements[0].file, "src/a.tsx");
});

test("compareToBaseline: file with higher current count is a regression, ok becomes false", () => {
  const baseline = { files: { "src/a.tsx": 5 }, exceptions: [] };
  const atual = { files: { "src/a.tsx": 8 } };
  const result = compareToBaseline(atual, baseline);
  assert.equal(result.ok, false);
  assert.equal(result.regressions.length, 1);
  assert.equal(result.regressions[0].file, "src/a.tsx");
});

test("compareToBaseline: new file with raw color not in baseline is a regression", () => {
  const baseline = { files: {}, exceptions: [] };
  const atual = { files: { "src/new-file.tsx": 2 } };
  const result = compareToBaseline(atual, baseline);
  assert.equal(result.ok, false);
  assert.equal(result.regressions.length, 1);
  assert.equal(result.regressions[0].file, "src/new-file.tsx");
});

test("compareToBaseline: file listed in exceptions is ignored in both directions", () => {
  const baseline = {
    files: { "src/exempt.ts": 5 },
    exceptions: [{ file: "src/exempt.ts", reason: "CDN" }],
  };
  const atual = { files: { "src/exempt.ts": 999 } };
  const result = compareToBaseline(atual, baseline);
  assert.equal(result.ok, true);
  assert.equal(result.regressions.length, 0);
  assert.equal(result.improvements.length, 0);
});

test("compareToBaseline: file that disappeared from current scan is not a regression", () => {
  const baseline = { files: { "src/gone.tsx": 4 }, exceptions: [] };
  const atual = { files: {} };
  const result = compareToBaseline(atual, baseline);
  assert.equal(result.ok, true);
  assert.equal(result.regressions.length, 0);
});

test("compareToBaseline: fixture with a doctored baseline (count lowered by 1) reports ok:false and names the file", () => {
  const dir = makeFixtureDir();
  fs.writeFileSync(path.join(dir, "a.tsx"), `bg-red-500 bg-red-500 bg-red-500\n`); // 3 ocorrencias
  const currentScan = scanPaths([dir]);
  const aPath = path.join(dir, "a.tsx");

  const doctoredBaseline = {
    files: { [aPath]: currentScan.files[aPath] - 1 },
    exceptions: [],
  };

  const result = compareToBaseline(currentScan, doctoredBaseline);
  assert.equal(result.ok, false);
  assert.equal(result.regressions.length, 1);
  assert.equal(result.regressions[0].file, aPath);
});

// --- Task 2: CLI --baseline / --check / --baseline-file -------------------

test("CLI --baseline writes the baseline JSON for a given root", () => {
  const dir = makeFixtureDir();
  fs.writeFileSync(path.join(dir, "a.tsx"), `bg-red-500 text-blue-600\n`);
  const baselineFile = path.join(dir, "baseline.json");

  const output = execFileSync(
    process.execPath,
    [SCRIPT_PATH, dir, "--baseline", `--baseline-file=${baselineFile}`],
    { encoding: "utf8" }
  );

  assert.match(output, /TOTAL/);
  const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
  assert.equal(baseline.total, 2);
});

test("CLI --check exits 0 when the current scan matches the baseline", () => {
  const dir = makeFixtureDir();
  fs.writeFileSync(path.join(dir, "a.tsx"), `bg-red-500\n`);
  const baselineFile = path.join(dir, "baseline.json");

  execFileSync(process.execPath, [SCRIPT_PATH, dir, "--baseline", `--baseline-file=${baselineFile}`]);

  assert.doesNotThrow(() => {
    execFileSync(process.execPath, [SCRIPT_PATH, dir, "--check", `--baseline-file=${baselineFile}`]);
  });
});

test("CLI --check exits 1 when a file regresses past the baseline", () => {
  const dir = makeFixtureDir();
  const filePath = path.join(dir, "a.tsx");
  fs.writeFileSync(filePath, `bg-red-500\n`);
  const baselineFile = path.join(dir, "baseline.json");

  execFileSync(process.execPath, [SCRIPT_PATH, dir, "--baseline", `--baseline-file=${baselineFile}`]);

  // Regride: adiciona uma segunda classe crua sem tocar no baseline.
  fs.writeFileSync(filePath, `bg-red-500 text-blue-600\n`);

  assert.throws(() => {
    execFileSync(process.execPath, [SCRIPT_PATH, dir, "--check", `--baseline-file=${baselineFile}`], {
      stdio: "pipe",
    });
  });
});
