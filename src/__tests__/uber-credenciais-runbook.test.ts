import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * INT-01, D-01: trava de deriva entre o codigo que le as envs `UBER_*`, o
 * `.env.example` e o runbook em `deploy/bfx/README.md`. Se alguem renomear
 * uma dessas envs no codigo sem atualizar a documentacao, este teste quebra
 * o CI. Mesma tecnica de `src/__tests__/tokens-fundo-neutro.test.ts`:
 * `readFileSync` + `.split()`/`.includes()`, nunca `RegExp.exec`.
 */

const README_PATH = join(process.cwd(), "deploy/bfx/README.md");
const ENV_EXAMPLE_PATH = join(process.cwd(), ".env.example");
const UBER_LIB_PATH = join(process.cwd(), "src/lib/uber.ts");
const UBER_STATUS_ROUTE_PATH = join(
  process.cwd(),
  "src/app/api/frete/uber/status/route.ts",
);
const TEST_PATH = join(
  process.cwd(),
  "src/__tests__/uber-credenciais-runbook.test.ts",
);

const ENV_VARS = [
  "UBER_DIRECT_CUSTOMER_ID",
  "UBER_DIRECT_TOKEN",
  "UBER_PICKUP_ADDRESS_JSON",
];

const readme = readFileSync(README_PATH, "utf8");
const envExample = readFileSync(ENV_EXAMPLE_PATH, "utf8");
const codigo =
  readFileSync(UBER_LIB_PATH, "utf8") +
  readFileSync(UBER_STATUS_ROUTE_PATH, "utf8");
const proprioTeste = readFileSync(TEST_PATH, "utf8");

/**
 * Extrai o valor entre aspas apos o nome da chave numa linha JSON, ex:
 * `"UBER_DIRECT_TOKEN": "abc"` -> "abc". Devolve null se a linha nao tiver
 * pelo menos duas aspas apos o nome da chave (formato inesperado).
 */
function valorAposChave(linha: string, chave: string): string | null {
  const resto = linha.split(chave).slice(1).join(chave);
  // No runbook a chave aparece em JSON: `"UBER_DIRECT_TOKEN": "<token-da-uber>"`.
  // A primeira aspas do resto FECHA a chave — ela nao abre o valor. Sem descarta-la,
  // o valor extraido vira `: ` e qualquer linha do JSON e acusada de vazar credencial.
  const semAspasDeFechamento = resto.startsWith('"') ? resto.slice(1) : resto;
  const partes = semAspasDeFechamento.split('"');
  // partes[0] = separador entre a chave e o valor (ex.: `: `)
  // partes[1] = valor entre a 1a e 2a aspas do valor
  if (partes.length < 2) return null;
  return partes[1] ?? null;
}

describe("runbook de credenciais Uber Direct (INT-01, D-01)", () => {
  it("as 3 envs aparecem no .env.example", () => {
    for (const v of ENV_VARS) {
      expect(envExample.includes(v)).toBe(true);
    }
  });

  it("as 3 envs aparecem no runbook deploy/bfx/README.md", () => {
    for (const v of ENV_VARS) {
      expect(readme.includes(v)).toBe(true);
    }
  });

  it("as 3 envs aparecem no codigo que as le (uber.ts e status/route.ts) — trava de deriva", () => {
    for (const v of ENV_VARS) {
      expect(codigo.includes(v)).toBe(true);
    }
  });

  it("o runbook nomeia o parametro do SSM, ensina o force-sync e cita a prova de sucesso", () => {
    expect(readme.includes("bfx-app-secrets")).toBe(true);
    expect(readme.includes("force-sync")).toBe(true);
    expect(readme.includes("/api/frete/uber/status")).toBe(true);
  });

  it("T-09-14: nenhuma linha do runbook que cite as chaves de credencial carrega valor literal", () => {
    const linhasSuspeitas = readme
      .split("\n")
      .filter(
        (l) =>
          l.includes("UBER_DIRECT_TOKEN") ||
          l.includes("UBER_DIRECT_CUSTOMER_ID"),
      )
      .filter((l) => {
        const chave = l.includes("UBER_DIRECT_TOKEN")
          ? "UBER_DIRECT_TOKEN"
          : "UBER_DIRECT_CUSTOMER_ID";
        const valor = valorAposChave(l, chave);
        if (!valor) return false;
        return valor.length > 0 && !valor.startsWith("<") && valor !== "...";
      });
    expect(linhasSuspeitas).toEqual([]);
  });

  it(".env.example diz que em producao os valores vem do AWS SSM via bfx-app-secrets", () => {
    const blocoUber = (envExample.split("Uber Direct")[1] ?? "").split(
      "==========",
    )[0];
    expect(blocoUber.includes("SSM")).toBe(true);
    expect(blocoUber.includes("bfx-app-secrets")).toBe(true);
  });

  it("a propria trava de deriva cobre as 3 envs (garante que o teste nao fique desatualizado)", () => {
    for (const v of ENV_VARS) {
      expect(proprioTeste.includes(v)).toBe(true);
    }
  });
});
