import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RAW_COLOR_PATTERN_SOURCE } from "./scripts/design-tokens/raw-color-scan.mjs";
import { plugin as shadcn } from "@shadcn/lint";
import * as shadcnPolicy from "./design-system/lint-policy.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Baseline versionado das ocorrencias de cor crua (D-05, plano 10-01). A
// lista de arquivos legados/excecao e derivada dele, nunca digitada a mao —
// lida com node:fs + JSON.parse, sem import attribute de JSON: o CI roda
// Node 20 e o suporte a essa sintaxe e instavel nessa faixa.
const rawColorBaselinePath = path.join(__dirname, "design-system", "raw-color-baseline.json");
const rawColorBaseline = JSON.parse(fs.readFileSync(rawColorBaselinePath, "utf8"));
/**
 * Rotas dinamicas do Next.js tem colchetes no caminho (`app/assinatura/[token]/`),
 * e em glob `[token]` e classe de caracteres — casaria "t", "o", "k"... e nunca o
 * diretorio literal. Sem escapar, o arquivo escapa da lista de legados e cai na
 * regra geral como `error`, quebrando o build por um caminho que o baseline ja
 * conhecia. Escapa-se cada colchete com barra invertida, que e como o minimatch
 * trata literal.
 */
const escaparGlob = (caminho) => caminho.split("[").join("\\[").split("]").join("\\]");

const legacyRawColorFiles = Object.keys(rawColorBaseline.files).map(escaparGlob);
const exceptionRawColorFiles = (rawColorBaseline.exceptions ?? []).map((exception) =>
  escaparGlob(exception.file)
);

/**
 * Plugin inline (sem pacote instalado — flat config aceita objeto de plugin
 * literal) com a regra que barra classe utilitaria Tailwind de cor crua
 * (escala numerica) em favor de token semantico (D-04).
 *
 * Fonte unica do padrao: RAW_COLOR_PATTERN_SOURCE, importado de
 * scripts/design-tokens/raw-color-scan.mjs — o mesmo modulo que alimenta a
 * catraca de CI em node puro (Camada B do plano 10-02).
 */
const bfxPlugin = {
  rules: {
    "no-raw-color": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Bloqueia classe utilitaria Tailwind de cor crua (ex.: bg-red-500) — usar token semantico (ver design-system/DE-PARA-CORES.md).",
        },
        schema: [],
      },
      create(context) {
        // Regex construida dentro de create(): nunca compartilhada em escopo
        // entre arquivos ou execucoes de lint.
        function reportRawColorOccurrences(node, text) {
          const rawColorRegex = new RegExp(RAW_COLOR_PATTERN_SOURCE, "g");
          const matches = text.match(rawColorRegex);
          if (!matches) return;

          const reportedClassNames = new Set();
          for (const className of matches) {
            if (reportedClassNames.has(className)) continue;
            reportedClassNames.add(className);
            context.report({
              node,
              message: `Cor crua "${className}" nao permitida em src/ — use um token semantico (ver design-system/DE-PARA-CORES.md).`,
            });
          }
        }

        return {
          Literal(node) {
            if (typeof node.value !== "string") return;
            reportRawColorOccurrences(node, node.value);
          },
          TemplateElement(node) {
            reportRawColorOccurrences(node, node.value.raw);
          },
        };
      },
    },
  },
};

/**
 * Regras do @shadcn/lint com a politica de design-system/lint-policy.mjs.
 * `severidade` so muda no bloco temporario do escopo de outras tarefas.
 */
const shadcnRules = (severidade = {}) => ({
  "shadcn/no-unknown-classes": [severidade.unknown ?? "error", shadcnPolicy.noUnknownClasses],
  "shadcn/no-raw-colors": [severidade.raw ?? "error", shadcnPolicy.noRawColors],
  "shadcn/no-arbitrary-values": [severidade.arbitrary ?? "warn", shadcnPolicy.noArbitraryValues],
  "shadcn/no-inline-styles": [severidade.inline ?? "error", shadcnPolicy.noInlineStyles],
  "shadcn/require-static-classes": [severidade.static ?? "warn", shadcnPolicy.requireStaticClasses],
  "shadcn/no-restyle": [severidade.restyle ?? "warn", shadcnPolicy.noRestyle],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  // D-04: a trava de cor crua. Bloco geral — barra ocorrencia nova em
  // qualquer arquivo de src/.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { bfx: bfxPlugin },
    rules: { "bfx/no-raw-color": "error" },
  },
  // Bloco legado — arquivos com divida pre-existente, listados em
  // design-system/raw-color-baseline.json. Severidade rebaixada para nao
  // travar o build nestes arquivos; a lista encolhe a cada tela migrada nas
  // fases 11-14 (D-05), ate ficar vazia.
  // `files: []` e rejeitado pelo ESLint ("Expected value to be a non-empty
  // array"), e a lista de legados chega a zero justamente quando a migracao
  // termina — o sucesso da fase 14 quebraria o config. Espalha-se o bloco
  // condicionalmente para que ele simplesmente deixe de existir.
  ...(legacyRawColorFiles.length > 0
    ? [{ files: legacyRawColorFiles, rules: { "bfx/no-raw-color": "warn" } }]
    : []),
  // Bloco de excecao — unico caso do projeto: documento HTML autonomo
  // servido com Tailwind por CDN, fora do pipeline de tokens do app.
  ...(exceptionRawColorFiles.length > 0
    ? [{ files: exceptionRawColorFiles, rules: { "bfx/no-raw-color": "off" } }]
    : []),
  // @shadcn/lint (linter do design system Tailwind v4). Descobre os componentes
  // pelo components.json e o tema pelo globals.css. A POLITICA (o que cada
  // componente aceita do chamador) mora em design-system/lint-policy.mjs e esta
  // descrita em design-system/VANTAGE-PADROES.md ("Lint do design system").
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { shadcn },
    rules: shadcnRules(),
  },
  // Os componentes de src/components/ui/ sao DONOS da aparencia: la dentro eles
  // se estilizam (classes de cor/raio/tamanho, valores estruturais como
  // `ring-[3px]`, className montado por variante). no-raw-colors e
  // no-inline-styles continuam valendo ali.
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },
  // temporario: tarefas N/L em andamento. Atendimento WhatsApp, janela
  // destacada, esqueletos (loading.tsx) e a lib de whatsapp/atendimento estao
  // sendo editados em outras tarefas; ali as regras ficam em "warn" ate elas
  // terminarem. Remover este bloco quando N/L fecharem.
  {
    files: [
      "src/app/(app)/crm/atendimento/**/*.{ts,tsx}",
      "src/app/(janela)/**/*.{ts,tsx}",
      "src/**/loading.tsx",
      "src/lib/**/whatsapp*/**/*.{ts,tsx}",
      "src/lib/**/whatsapp*.{ts,tsx}",
      "src/lib/**/atendimento*/**/*.{ts,tsx}",
      "src/lib/**/atendimento*.{ts,tsx}",
    ],
    rules: shadcnRules({ unknown: "warn", raw: "warn", arbitrary: "warn", inline: "warn", static: "warn", restyle: "warn" }),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".pnp.*",
    "node_modules/**",
    "test-results/**",
    "src/generated/**",
    "prisma/*.js",
    "scripts/**",
  ]),
]);

export default eslintConfig;
