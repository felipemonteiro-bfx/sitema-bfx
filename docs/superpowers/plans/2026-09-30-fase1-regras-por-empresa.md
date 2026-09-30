# Fase 1 — Regras por empresa e parcela única — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `RegraEmpresa` (dia de corte, vencimento, Pix, repasse e flag `cobrancaViaBfx`, com vigência), fazer a venda rápida, o limite e a geração de parcelas lerem a regra da empresa do cliente, e tornar `(vendaId, numeroParcela)` único.

**Architecture:** Regra pura em `src/lib/regra-empresa.ts` (vigência, sobreposição, validação, `REGRA_PADRAO` idêntico ao comportamento atual: corte 20, vencimento dia 10). Leitura do banco isolada em `src/lib/regra-empresa-db.ts`. As funções de vencimento existentes ganham um parâmetro opcional `regra` cujo default reproduz o comportamento atual, então nenhum chamador que não passa regra muda.

**Tech Stack:** Next.js 15 App Router, Prisma/Postgres, vitest (`npx vitest run` nativo no Mac), shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md` (§3.1, §3.2 unique, §7 último parágrafo, §8 fase 1)

## Global Constraints

- Worktree: `/Users/andrebrumcortezferreira/Documents/BFX/sitema-bfx-fechamento`, branch `feat/fechamento-pix-prudent`. `node_modules` é symlink — não rodar `npm install`.
- Testes: `DATABASE_URL=postgresql://x:y@localhost:5432/x npx vitest run <arquivos>`. Linha de base: 1.650 testes passando; 8 arquivos falham por env antes desta fase (assinatura-termo-email, cadastros-rbac, empresa-email-copia-cadastro, fornecedor-rbac-auditoria, fornecedor-soft-delete, termo-email-status, uber-config-resolve, uber-delivery-quote-auth) — não é regressão.
- Antes de cada commit: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "<arquivos tocados>"` (há erros pré-existentes em outros arquivos), `npx eslint <arquivos>`, e `npm run -s escala:check && npm run -s cores:check && npm run -s jsx:check && npm run -s contraste:check` quando tocar UI.
- Cor só por token semântico (`design-system/DE-PARA-CORES.md`); nada de `text-[Npx]`.
- Toda server action que grava começa com `await requireAdminOrThrow()` (`@/lib/guards`).
- Datas de vencimento em UTC (`Date.UTC`), nunca construtor local.
- Hook de segurança bloqueia código com o padrão `RegExp` + `.exec(` — usar `.split()`/`.match()`/`.test()`.
- Commits: `git add <caminhos explícitos>` (nunca `-A`), mensagem em português sem acento no título, terminando com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_012gGWB9ATfPTpnBjEZGDFGU
  ```
- Não fazer push (o orquestrador faz).

## Review Focus

1. Venda feita no dia 31 com `diaCorte = 20` e `diaVencimento = 28` → vencimento em fevereiro tem de cair em 28/02, não pular para março (clamp não é necessário porque dias são 1–28, mas o teste fixa isso).
2. Cliente sem `empresaParceiraId` → `REGRA_PADRAO`, vencimento idêntico ao de hoje (dia 10, corte 20).
3. Duas regras com vigências encostadas (`vigenteAte` de uma = `vigenteDe` da outra) **não** são sobreposição; uma aberta (`vigenteAte` nulo) seguida de outra é.
4. Edição de venda com payload `[{numeroParcela:1},{numeroParcela:1}]` é recusada antes de qualquer escrita.
5. Migração da unique com dados duplicados aborta com mensagem legível (testada em Postgres local).

---

### Task 1: Regra pura (`regra-empresa.ts`)

**Files:**
- Create: `src/lib/regra-empresa.ts`
- Test: `src/__tests__/regra-empresa.test.ts`

**Interfaces — Produces:**
```ts
export type RegraVencimento = { diaCorte: number; diaVencimento: number };
export type RegraEmpresaDados = RegraVencimento & {
  diaPix: number;
  repassePct: number | null;
  repasseBase: "venda" | null;
  cobrancaViaBfx: boolean;
};
export type RegraComVigencia = RegraEmpresaDados & { id?: number; vigenteDe: Date; vigenteAte: Date | null };
export const REGRA_PADRAO: RegraEmpresaDados; // { diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx: false }
export function regraVigente(regras: RegraComVigencia[], data: Date): RegraEmpresaDados;
export function vigenciasSobrepostas(regras: Pick<RegraComVigencia, "id" | "vigenteDe" | "vigenteAte">[]): [number, number] | null; // índices do primeiro par sobreposto
export function validarRegra(input: Record<string, unknown>): { ok: true; valor: Omit<RegraComVigencia, "id"> } | { ok: false; erro: string };
```

- [ ] **Step 1: Escrever o teste que falha** — `src/__tests__/regra-empresa.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { REGRA_PADRAO, regraVigente, vigenciasSobrepostas, validarRegra, type RegraComVigencia } from "@/lib/regra-empresa";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const base = { diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx: false } as const;

describe("regraVigente", () => {
  it("sem regra devolve o padrão igual ao comportamento atual", () => {
    expect(regraVigente([], d("2026-10-05"))).toEqual(REGRA_PADRAO);
    expect(REGRA_PADRAO).toEqual({ diaCorte: 20, diaVencimento: 10, diaPix: 15, repassePct: null, repasseBase: null, cobrancaViaBfx: false });
  });
  it("escolhe a regra cuja janela contém a data (vigenteDe inclusivo, vigenteAte exclusivo)", () => {
    const regras: RegraComVigencia[] = [
      { ...base, repassePct: 10, repasseBase: "venda", vigenteDe: d("2026-10-01"), vigenteAte: d("2027-01-01") },
      { ...base, repassePct: 7, repasseBase: "venda", vigenteDe: d("2027-01-01"), vigenteAte: null },
    ];
    expect(regraVigente(regras, d("2026-10-01")).repassePct).toBe(10);
    expect(regraVigente(regras, d("2026-12-31")).repassePct).toBe(10);
    expect(regraVigente(regras, d("2027-01-01")).repassePct).toBe(7);
    expect(regraVigente(regras, d("2026-09-30"))).toEqual(REGRA_PADRAO);
  });
  it("não devolve id nem vigência", () => {
    const r = regraVigente([{ ...base, id: 3, vigenteDe: d("2026-01-01"), vigenteAte: null }], d("2026-05-01"));
    expect(r).not.toHaveProperty("id");
    expect(r).not.toHaveProperty("vigenteDe");
  });
});

describe("vigenciasSobrepostas", () => {
  it("encostadas não se sobrepõem", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-01-01"), vigenteAte: d("2026-04-01") },
      { vigenteDe: d("2026-04-01"), vigenteAte: null },
    ])).toBeNull();
  });
  it("aberta seguida de outra se sobrepõe", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-01-01"), vigenteAte: null },
      { vigenteDe: d("2026-06-01"), vigenteAte: null },
    ])).toEqual([0, 1]);
  });
  it("intervalos cruzados se sobrepõem em qualquer ordem", () => {
    expect(vigenciasSobrepostas([
      { vigenteDe: d("2026-03-01"), vigenteAte: d("2026-09-01") },
      { vigenteDe: d("2026-01-01"), vigenteAte: d("2026-04-01") },
    ])).toEqual([0, 1]);
  });
});

describe("validarRegra", () => {
  const ok = { vigenteDe: "2026-10-01", vigenteAte: "", diaCorte: "20", diaVencimento: "15", diaPix: "15", repassePct: "", cobrancaViaBfx: "" };
  it("aceita e converte", () => {
    const r = validarRegra(ok);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.vigenteDe).toEqual(d("2026-10-01"));
      expect(r.valor.vigenteAte).toBeNull();
      expect(r.valor.diaVencimento).toBe(15);
      expect(r.valor.repassePct).toBeNull();
      expect(r.valor.repasseBase).toBeNull();
      expect(r.valor.cobrancaViaBfx).toBe(false);
    }
  });
  it("dias fora de 1–28 são recusados", () => {
    expect(validarRegra({ ...ok, diaVencimento: "31" })).toEqual({ ok: false, erro: "Dia de vencimento deve ser entre 1 e 28." });
    expect(validarRegra({ ...ok, diaPix: "0" })).toEqual({ ok: false, erro: "Dia do Pix deve ser entre 1 e 28." });
    expect(validarRegra({ ...ok, diaCorte: "29" })).toEqual({ ok: false, erro: "Dia de corte deve ser entre 1 e 28." });
  });
  it("repasse vira base 'venda' e aceita vírgula", () => {
    const r = validarRegra({ ...ok, repassePct: "7,5" });
    expect(r.ok && r.valor.repassePct).toBe(7.5);
    expect(r.ok && r.valor.repasseBase).toBe("venda");
    expect(validarRegra({ ...ok, repassePct: "101" }).ok).toBe(false);
  });
  it("vigenteAte deve ser depois de vigenteDe", () => {
    expect(validarRegra({ ...ok, vigenteAte: "2026-10-01" })).toEqual({ ok: false, erro: "O fim da vigência deve ser depois do início." });
  });
  it("cobrancaViaBfx 'on' liga", () => {
    const r = validarRegra({ ...ok, cobrancaViaBfx: "on" });
    expect(r.ok && r.valor.cobrancaViaBfx).toBe(true);
  });
  it("data inválida é recusada", () => {
    expect(validarRegra({ ...ok, vigenteDe: "31/10/2026" })).toEqual({ ok: false, erro: "Início da vigência inválido." });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `DATABASE_URL=postgresql://x:y@localhost:5432/x npx vitest run src/__tests__/regra-empresa.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar** — `src/lib/regra-empresa.ts`:

```ts
/**
 * Regras por empresa conveniada e por período (spec 2026-09-30 §3.1): dia de corte, dia de
 * vencimento das parcelas, dia do Pix do fechamento, repasse e a chave do fluxo novo de cobrança.
 * Puro — a leitura do banco está em `@/lib/regra-empresa-db`.
 *
 * `REGRA_PADRAO` reproduz o que o código fazia antes (corte 20, vencimento dia 10): empresa sem
 * regra cadastrada não muda de comportamento.
 */
export type RegraVencimento = { diaCorte: number; diaVencimento: number };
export type RegraEmpresaDados = RegraVencimento & {
  diaPix: number;
  repassePct: number | null;
  repasseBase: "venda" | null;
  cobrancaViaBfx: boolean;
};
export type RegraComVigencia = RegraEmpresaDados & { id?: number; vigenteDe: Date; vigenteAte: Date | null };

export const REGRA_PADRAO: RegraEmpresaDados = Object.freeze({
  diaCorte: 20,
  diaVencimento: 10,
  diaPix: 15,
  repassePct: null,
  repasseBase: null,
  cobrancaViaBfx: false,
}) as RegraEmpresaDados;

function contem(r: Pick<RegraComVigencia, "vigenteDe" | "vigenteAte">, t: number): boolean {
  return r.vigenteDe.getTime() <= t && (r.vigenteAte === null || t < r.vigenteAte.getTime());
}

export function regraVigente(regras: RegraComVigencia[], data: Date): RegraEmpresaDados {
  const t = data.getTime();
  const r = regras.find((x) => contem(x, t));
  if (!r) return { ...REGRA_PADRAO };
  return {
    diaCorte: r.diaCorte,
    diaVencimento: r.diaVencimento,
    diaPix: r.diaPix,
    repassePct: r.repassePct,
    repasseBase: r.repasseBase,
    cobrancaViaBfx: r.cobrancaViaBfx,
  };
}

export function vigenciasSobrepostas(
  regras: Pick<RegraComVigencia, "id" | "vigenteDe" | "vigenteAte">[]
): [number, number] | null {
  const fim = (r: { vigenteAte: Date | null }) => (r.vigenteAte ? r.vigenteAte.getTime() : Infinity);
  for (let i = 0; i < regras.length; i++) {
    for (let j = i + 1; j < regras.length; j++) {
      const a = regras[i];
      const b = regras[j];
      if (a.vigenteDe.getTime() < fim(b) && b.vigenteDe.getTime() < fim(a)) return [i, j];
    }
  }
  return null;
}

function dataPura(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  const partes = s.split("-");
  if (partes.length !== 3 || partes[0].length !== 4) return null;
  const [a, m, dd] = partes.map(Number);
  if (!a || !m || !dd) return null;
  const d = new Date(Date.UTC(a, m - 1, dd));
  return d.getUTCMonth() === m - 1 && d.getUTCDate() === dd ? d : null;
}

function dia(v: unknown): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : null;
}

export function validarRegra(
  input: Record<string, unknown>
): { ok: true; valor: Omit<RegraComVigencia, "id"> } | { ok: false; erro: string } {
  const vigenteDe = dataPura(input.vigenteDe);
  if (!vigenteDe) return { ok: false, erro: "Início da vigência inválido." };
  const ateTxt = String(input.vigenteAte ?? "").trim();
  const vigenteAte = ateTxt ? dataPura(ateTxt) : null;
  if (ateTxt && !vigenteAte) return { ok: false, erro: "Fim da vigência inválido." };
  if (vigenteAte && vigenteAte.getTime() <= vigenteDe.getTime()) {
    return { ok: false, erro: "O fim da vigência deve ser depois do início." };
  }
  const diaCorte = dia(input.diaCorte);
  if (diaCorte === null) return { ok: false, erro: "Dia de corte deve ser entre 1 e 28." };
  const diaVencimento = dia(input.diaVencimento);
  if (diaVencimento === null) return { ok: false, erro: "Dia de vencimento deve ser entre 1 e 28." };
  const diaPix = dia(input.diaPix);
  if (diaPix === null) return { ok: false, erro: "Dia do Pix deve ser entre 1 e 28." };
  const pctTxt = String(input.repassePct ?? "").trim().replace(",", ".");
  let repassePct: number | null = null;
  if (pctTxt) {
    const n = Number(pctTxt);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false, erro: "Repasse deve ser entre 0 e 100%." };
    repassePct = n;
  }
  const flag = String(input.cobrancaViaBfx ?? "").trim().toLowerCase();
  return {
    ok: true,
    valor: {
      vigenteDe,
      vigenteAte,
      diaCorte,
      diaVencimento,
      diaPix,
      repassePct,
      repasseBase: repassePct === null ? null : "venda",
      cobrancaViaBfx: flag === "on" || flag === "true" || flag === "1",
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/regra-empresa.ts src/__tests__/regra-empresa.test.ts && git commit -m "feat(regras): regra por empresa com vigencia (pura)"` + trailers.

---

### Task 2: Vencimentos pela regra

**Files:**
- Modify: `src/lib/utils.ts:53-63` (`calcularPrimeiroVencimento`)
- Modify: `src/lib/parcelas.ts` (`parcelasDaVendaRapida`, `parcelaUnicaDaFolha`)
- Modify: `src/lib/parcelas-ajuste.ts` (`ajustarParcelas`)
- Test: `src/__tests__/vencimento-por-regra.test.ts`

**Interfaces:**
- Consumes: `RegraVencimento` (Task 1).
- Produces:
  ```ts
  calcularPrimeiroVencimento(dataCompra: Date, regra?: RegraVencimento): Date // default { diaCorte: 20, diaVencimento: 10 }
  parcelasDaVendaRapida(input: { ...atual, regra?: RegraVencimento })
  parcelaUnicaDaFolha(input: { ...atual, regra?: RegraVencimento })
  ajustarParcelas(input: { ...atual, regra?: RegraVencimento })
  ```

- [ ] **Step 1: Teste que falha** — `src/__tests__/vencimento-por-regra.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calcularPrimeiroVencimento } from "@/lib/utils";
import { parcelasDaVendaRapida, parcelaUnicaDaFolha } from "@/lib/parcelas";
import { ajustarParcelas } from "@/lib/parcelas-ajuste";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("calcularPrimeiroVencimento com regra", () => {
  it("sem regra mantém corte 20 / dia 10", () => {
    expect(iso(calcularPrimeiroVencimento(d("2026-09-20")))).toBe("2026-10-10");
    expect(iso(calcularPrimeiroVencimento(d("2026-09-21")))).toBe("2026-11-10");
  });
  it("usa corte e dia da regra", () => {
    const regra = { diaCorte: 25, diaVencimento: 15 };
    expect(iso(calcularPrimeiroVencimento(d("2026-09-25"), regra))).toBe("2026-10-15");
    expect(iso(calcularPrimeiroVencimento(d("2026-09-26"), regra))).toBe("2026-11-15");
  });
  it("dia 28 em fevereiro não pula de mês", () => {
    expect(iso(calcularPrimeiroVencimento(d("2027-01-10"), { diaCorte: 20, diaVencimento: 28 }))).toBe("2027-02-28");
  });
  it("virada de ano", () => {
    expect(iso(calcularPrimeiroVencimento(d("2026-12-22"), { diaCorte: 20, diaVencimento: 15 }))).toBe("2027-02-15");
  });
});

describe("parcelas geradas pela regra", () => {
  it("venda rápida parcelada usa o dia da regra em todas as parcelas", () => {
    const ps = parcelasDaVendaRapida({ parcelas: 3, dataVenda: d("2026-09-10"), total: 300, emFolha: true, regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(ps.map((p) => iso(p.dataVencimento))).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
  });
  it("sem regra continua dia 10", () => {
    const ps = parcelasDaVendaRapida({ parcelas: 2, dataVenda: d("2026-09-10"), total: 200, emFolha: true });
    expect(ps.map((p) => iso(p.dataVencimento))).toEqual(["2026-10-10", "2026-11-10"]);
  });
  it("folha em 1x usa a regra", () => {
    const [p] = parcelaUnicaDaFolha({ emFolha: true, dataVenda: d("2026-09-10"), total: 100, regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(iso(p.dataVencimento)).toBe("2026-10-15");
  });
  it("ajustarParcelas gera do zero no dia da regra", () => {
    const { parcelas } = ajustarParcelas({ parcelas: [], numeroParcelas: 2, valorTotal: 200, dataVenda: "2026-09-10", regra: { diaCorte: 20, diaVencimento: 15 } });
    expect(parcelas.map((p) => p.dataVencimento)).toEqual(["2026-10-15", "2026-11-15"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** (datas no dia 10 / parâmetro ignorado).
- [ ] **Step 3: Implementar.**
  - `utils.ts`:
    ```ts
    export function calcularPrimeiroVencimento(
      dataCompra: Date,
      regra: { diaCorte: number; diaVencimento: number } = { diaCorte: 20, diaVencimento: 10 }
    ): Date {
      const dia = dataCompra.getUTCDate();
      const mesesAFrente = dia <= regra.diaCorte ? 1 : 2;
      return new Date(Date.UTC(dataCompra.getUTCFullYear(), dataCompra.getUTCMonth() + mesesAFrente, regra.diaVencimento));
    }
    ```
    Atualizar o JSDoc para dizer "pela regra da empresa; default corte 20 / dia 10". (Tipo inline para `utils.ts` não importar `regra-empresa`.)
  - `parcelas.ts`: `parcelasDaVendaRapida` aceita `regra?: RegraVencimento`, passa para `calcularPrimeiroVencimento(dataVenda, regra)` e usa `regra?.diaVencimento ?? 10` no lugar do `10` fixo do `Date.UTC(...)`. `parcelaUnicaDaFolha` aceita `regra?` e repassa. `parcelasDaVendaRapida` repassa `regra` para `parcelaUnicaDaFolha`.
  - `parcelas-ajuste.ts`: `ajustarParcelas` aceita `regra?`; na geração do zero usa `calcularPrimeiroVencimento(..., regra)` e `regra?.diaVencimento ?? 10` no lugar do `10`.
- [ ] **Step 4: Rodar este teste e os existentes** — `npx vitest run src/__tests__/vencimento-por-regra.test.ts src/__tests__/parcelas-vencimento-auto.test.ts src/__tests__/parcela-unica-folha.test.ts src/__tests__/parcelas-ajuste.test.ts src/__tests__/venda-rapida-guarda-e-parcela.test.ts` → PASS.
- [ ] **Step 5: Commit** — `feat(regras): vencimento das parcelas pela regra da empresa`.

---

### Task 3: Schema, migração e leitura do banco

**Files:**
- Modify: `prisma/schema.prisma` (novo `model RegraEmpresa`; relação em `EmpresaParceira`; `@@unique([vendaId, numeroParcela])` em `ParcelaVencimento`)
- Create: `prisma/migrations/20260930120000_regras_empresa/migration.sql`
- Create: `src/lib/regra-empresa-db.ts`
- Test: `src/__tests__/regra-empresa-db.test.ts`

**Interfaces — Produces:**
```ts
// regra-empresa-db.ts
export async function regrasDaEmpresa(empresaParceiraId: number): Promise<RegraComVigencia[]>;
export async function regraDaEmpresaNaData(empresaParceiraId: number | null | undefined, data: Date): Promise<RegraEmpresaDados>; // null → REGRA_PADRAO sem consultar
export async function regraDoClienteNaData(clienteId: number, data: Date): Promise<RegraEmpresaDados>;
```

- [ ] **Step 1: Schema.**
  ```prisma
  model RegraEmpresa {
    id                Int       @id @default(autoincrement())
    empresaParceiraId Int       @map("empresa_parceira_id")
    vigenteDe         DateTime  @map("vigente_de")
    vigenteAte        DateTime? @map("vigente_ate")
    diaCorte          Int       @default(20) @map("dia_corte")
    diaVencimento     Int       @default(10) @map("dia_vencimento")
    diaPix            Int       @default(15) @map("dia_pix")
    repassePct        Float?    @map("repasse_pct")
    repasseBase       String?   @map("repasse_base")
    cobrancaViaBfx    Boolean   @default(false) @map("cobranca_via_bfx")
    observacao        String?
    criadaEm          DateTime  @default(now()) @map("criada_em")
    criadaPor         String?   @map("criada_por")

    empresaParceira EmpresaParceira @relation(fields: [empresaParceiraId], references: [id], onDelete: Cascade)

    @@index([empresaParceiraId, vigenteDe])
    @@map("regras_empresa")
  }
  ```
  Em `EmpresaParceira`: `regras RegraEmpresa[]`. Em `ParcelaVencimento`: `@@unique([vendaId, numeroParcela])` (manter os `@@index` existentes).
- [ ] **Step 2: Migração** — `migration.sql` escrita à mão no estilo das existentes (comentário explicando o porquê):
  ```sql
  -- Regras por empresa e parcela única — 2026-09-30.
  -- Ver docs/superpowers/specs/2026-09-30-fechamento-pix-prudent-design.md §3.1 e §3.2.
  -- A unique (venda_id, numero_parcela) abortaria com erro genérico se houvesse duplicata e o pod
  -- ficaria em CrashLoop (P3009). O bloco abaixo aborta antes, dizendo quais vendas reparar.
  DO $$
  DECLARE dups text;
  BEGIN
    SELECT string_agg(venda_id || '/' || numero_parcela, ', ') INTO dups
    FROM (SELECT venda_id, numero_parcela FROM parcelas_vencimento
          GROUP BY venda_id, numero_parcela HAVING count(*) > 1) d;
    IF dups IS NOT NULL THEN
      RAISE EXCEPTION 'parcelas_vencimento com numero repetido (venda/parcela): %', dups;
    END IF;
  END $$;

  CREATE TABLE "regras_empresa" (
    "id" SERIAL PRIMARY KEY,
    "empresa_parceira_id" INTEGER NOT NULL REFERENCES "empresas_parceiras"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "vigente_de" TIMESTAMP(3) NOT NULL,
    "vigente_ate" TIMESTAMP(3),
    "dia_corte" INTEGER NOT NULL DEFAULT 20,
    "dia_vencimento" INTEGER NOT NULL DEFAULT 10,
    "dia_pix" INTEGER NOT NULL DEFAULT 15,
    "repasse_pct" DOUBLE PRECISION,
    "repasse_base" TEXT,
    "cobranca_via_bfx" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criada_por" TEXT
  );
  CREATE INDEX "regras_empresa_empresa_parceira_id_vigente_de_idx" ON "regras_empresa"("empresa_parceira_id", "vigente_de");
  CREATE UNIQUE INDEX "parcelas_vencimento_venda_id_numero_parcela_key" ON "parcelas_vencimento"("venda_id", "numero_parcela");
  ```
  Conferir com `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script --shadow-database-url <pg local>` (Step 4) que não sobra diferença.
- [ ] **Step 3: `npx prisma generate`** e escrever `regra-empresa-db.ts`:
  ```ts
  import { prisma } from "@/lib/db";
  import { REGRA_PADRAO, regraVigente, type RegraComVigencia, type RegraEmpresaDados } from "@/lib/regra-empresa";

  export async function regrasDaEmpresa(empresaParceiraId: number): Promise<RegraComVigencia[]> {
    const linhas = await prisma.regraEmpresa.findMany({ where: { empresaParceiraId }, orderBy: { vigenteDe: "asc" } });
    return linhas.map((r) => ({
      id: r.id,
      vigenteDe: r.vigenteDe,
      vigenteAte: r.vigenteAte,
      diaCorte: r.diaCorte,
      diaVencimento: r.diaVencimento,
      diaPix: r.diaPix,
      repassePct: r.repassePct,
      repasseBase: r.repasseBase === "venda" ? "venda" : null,
      cobrancaViaBfx: r.cobrancaViaBfx,
    }));
  }

  export async function regraDaEmpresaNaData(empresaParceiraId: number | null | undefined, data: Date): Promise<RegraEmpresaDados> {
    if (!empresaParceiraId) return { ...REGRA_PADRAO };
    return regraVigente(await regrasDaEmpresa(empresaParceiraId), data);
  }

  export async function regraDoClienteNaData(clienteId: number, data: Date): Promise<RegraEmpresaDados> {
    const c = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { empresaParceiraId: true } });
    return regraDaEmpresaNaData(c?.empresaParceiraId ?? null, data);
  }
  ```
  Teste com `vi.mock("@/lib/db", ...)` no padrão de `src/__tests__/baixa-asaas-db.test.ts`: (a) `empresaParceiraId` nulo não consulta o banco e devolve `REGRA_PADRAO`; (b) com duas regras mockadas, a data escolhe a certa; (c) cliente sem empresa → padrão.
- [ ] **Step 4: Testar a migração num Postgres local:**
  ```bash
  docker run -d --name pg-fase1 -e POSTGRES_PASSWORD=pg -p 55432:5432 postgres:16
  sleep 5
  for f in prisma/migrations/*/migration.sql; do psql "postgresql://postgres:pg@localhost:55432/postgres" -v ON_ERROR_STOP=1 -q -f "$f" || { echo "FALHOU $f"; break; }; done
  ```
  Todas devem aplicar. Depois, num banco recriado até a migração anterior, inserir duas parcelas com mesmo `(venda_id, numero_parcela)` e aplicar a nova: deve falhar com `parcelas_vencimento com numero repetido (venda/parcela): <id>/1`. Rodar o `prisma migrate diff` do Step 2 contra esse banco (sem diferença). `docker rm -f pg-fase1` no fim.
- [ ] **Step 5: Commit** — `feat(regras): tabela regras_empresa e parcela unica por venda`.

---

### Task 4: Edição de venda recusa número de parcela repetido

**Files:**
- Modify: `src/lib/parcelas.ts` (nova função pura)
- Modify: `src/app/(app)/historico/actions.ts` (chamar antes de qualquer escrita, junto da guarda T-ddr-01 por volta da linha 236)
- Test: `src/__tests__/parcelas-numero-repetido.test.ts`

**Interfaces — Produces:** `export function numerosDeParcelaRepetidos(parcelas: { numeroParcela: number }[]): number[]` (ordenados, sem repetição).

- [ ] **Step 1: Teste** — `[1,2,3]` → `[]`; `[1,1,2,3,3,3]` → `[1,3]`; `[]` → `[]`.
- [ ] **Step 2: Ver falhar. Step 3: Implementar** e, em `updateVenda`, logo antes da guarda T-ddr-01: se `numerosDeParcelaRepetidos(parcelasForm).length > 0`, retornar o erro no mesmo formato de retorno que a guarda T-ddr-01 usa (ler o código ao redor e copiar o formato), com a mensagem `Parcela ${n} aparece mais de uma vez. Revise as datas de vencimento.` (lista separada por vírgula).
- [ ] **Step 4: Rodar** o teste novo e `src/__tests__/historico-*.test.ts src/__tests__/edit-venda-parcelas-total.test.ts` → PASS.
- [ ] **Step 5: Commit** — `fix(historico): recusa parcela com numero repetido na edicao`.

---

### Task 5: Venda rápida, limite e IA leem a regra

**Files:**
- Modify: `src/app/(app)/venda-rapida/actions.ts:254` (`parcelasDaVendaRapida(..., regra)`), `:278` (`checkCredito`), `:474` (1º vencimento do boleto Asaas)
- Modify: `src/lib/credit.ts` (`checkCredito(clienteId, parcNova, diaCorte = 20)` — trocar o `dia <= 20` por `dia <= diaCorte`)
- Modify: `src/lib/ai-actions.ts:931` (passar o corte da regra do cliente)
- Modify: `src/lib/consignado-db.ts` (`payloadLimiteCliente` inclui `regraVencimento: { diaCorte, diaVencimento }` da regra vigente hoje)
- Modify: `src/components/venda-rapida-form-v2.tsx` (passar `limiteData?.regraVencimento` para `ParcelasVencimentoForm`)
- Modify: `src/components/parcelas-vencimento-form.tsx` (prop `regra?: RegraVencimento` repassada a `ajustarParcelas`; incluir no array de dependências do efeito)
- Test: `src/__tests__/venda-rapida-regra-empresa.test.ts`

- [ ] **Step 1: Teste que falha** — seguir o padrão de `src/__tests__/venda-rapida-guarda-e-parcela.test.ts` (que já mocka o que a action importa). Caso: cliente com `empresaParceiraId: 7` e mock de `@/lib/regra-empresa-db` devolvendo `{ ...REGRA_PADRAO, diaVencimento: 15 }`; venda de 3x sem `parcelasVencimento` no form → `parcelaVencimento.createMany` (ou o que a action usa para gravar — conferir no teste existente) recebe datas no dia 15. Segundo caso: `checkCredito` é chamado com o `diaCorte` da regra.
- [ ] **Step 2: Ver falhar. Step 3: Implementar**: na action, depois de resolver o cliente e a `dataStr`, `const regra = await regraDoClienteNaData(clienteId, new Date(dataStr));` e passar `regra` (tem `diaCorte`/`diaVencimento`) às três chamadas. Em `credit.ts`, novo parâmetro com default 20. Em `ai-actions.ts`, `regraDoClienteNaData(clienteId, new Date())` e passar `.diaCorte`. `LimiteClientePayload` (tipo em `consignado-db.ts` ou onde estiver declarado) ganha `regraVencimento?: { diaCorte: number; diaVencimento: number }`.
- [ ] **Step 4: Rodar** o teste novo + `src/__tests__/venda-rapida-*.test.ts src/__tests__/consignado*.test.ts` → PASS. `tsc` limpo nos arquivos tocados.
- [ ] **Step 5: Commit** — `feat(venda-rapida): vencimento e limite pela regra da empresa do cliente`.

---

### Task 6: Cadastro das regras na empresa

**Files:**
- Create: `src/app/(app)/cadastros/regras-actions.ts` (`"use server"`)
- Create: `src/components/regras-empresa-section.tsx` (client)
- Modify: `src/app/(app)/cadastros/page.tsx` (carregar `regrasDaEmpresa(editEmpresaId)` quando editando empresa e passar ao componente)
- Modify: `src/components/empresas-tab-client.tsx` (renderizar a seção no formulário de edição da empresa)
- Test: `src/__tests__/regras-actions.test.ts`

**Interfaces — Produces:**
```ts
export async function salvarRegraEmpresa(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }>; // cria (sem id) ou atualiza (com id)
export async function excluirRegraEmpresa(id: number): Promise<{ ok: true } | { ok: false; erro: string }>;
```

- [ ] **Step 1: Teste** (mock de `@/lib/db`, `@/lib/guards`, `@/lib/audit`, `next/cache`): (a) primeira linha é `requireAdminOrThrow` — se ele lança, nada é gravado; (b) payload inválido devolve o `erro` de `validarRegra` sem gravar; (c) regra nova que se sobrepõe a uma existente da mesma empresa devolve `{ ok: false, erro: "Vigência se sobrepõe a outra regra desta empresa." }`; (d) atualização ignora a própria regra na checagem de sobreposição; (e) sucesso grava e chama `createAuditLog("empresa:regra", ...)` com `empresaParceiraId`, `vigenteDe`, `cobrancaViaBfx`; (f) ligar `cobrancaViaBfx` grava `observacao` obrigatória? — **não**: apenas audita.
- [ ] **Step 2: Ver falhar. Step 3: Implementar** as actions (`requireAdminOrThrow()` na primeira linha; `validarRegra(Object.fromEntries(formData))`; carregar as outras regras da empresa, `vigenciasSobrepostas([...outras, nova])`; `prisma.regraEmpresa.create/update`; `createAuditLog`; `revalidatePath("/cadastros")`). Componente: tabela das regras (Vigência "01/10/2026 → aberta", Corte, Vencimento, Pix, Repasse, "Cobrança via BFX" como `Badge`) e um formulário inline com `Input type="date"`, `Input type="number" min=1 max=28`, `Checkbox` para `cobrancaViaBfx` com texto de ajuda "Só ligue depois da confirmação formal da Prudent." Usar componentes shadcn já existentes (`@/components/ui/*`) e a skill `shadcn-bfx` para escolher. Mensagens de erro em `text-destructive`.
- [ ] **Step 4: Rodar** teste + `escala:check`, `cores:check`, `jsx:check`, `contraste:check` → PASS.
- [ ] **Step 5: Commit** — `feat(cadastros): regras por empresa com vigencia`.

---

### Task 7: Verificação da fase

- [ ] Suíte inteira: `DATABASE_URL=postgresql://x:y@localhost:5432/x npx vitest run` → mesmos 8 arquivos com falha de env da linha de base, nenhum outro; total de testes ≥ 1.650 + novos.
- [ ] `npx tsc --noEmit -p tsconfig.json` sem erro novo nos arquivos da fase.
- [ ] `npx eslint` nos arquivos tocados; as quatro travas de design.
