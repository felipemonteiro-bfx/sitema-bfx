# Seletor Entrega/Retirada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obrigar a escolha Entrega/Retirada na venda nova e exigir o custo real de envio quando for entrega, mesmo com frete grátis.

**Architecture:** Coluna nullable `vendas.entrega`. Regras puras em `src/lib/validations/venda.ts`, consumidas por `vendaV2Schema`, pela edição do histórico, pelo form de venda e pelas tools do chat. Venda antiga fica `null` e mantém só a regra `frete > 0 ⇒ envio > 0` da PR #37.

**Tech Stack:** Next.js 15 (App Router), Prisma, zod 4, vitest, shadcn/ui (`FormSelect`).

**Spec:** `docs/superpowers/specs/2026-10-02-entrega-retirada-design.md`

## Global Constraints

- Não rodar `npm install` (falha por permissões); não criar arquivos na raiz do projeto.
- Hook bloqueia padrão `RegExp exec` em edições e arquivos: usar `.split()` + regex.
- Migration só com `ADD COLUMN "entrega" BOOLEAN`, sem `DEFAULT` e sem `NOT NULL`.
- `entrega`: `true` = entrega, `false` = retirada, `null` = venda anterior à regra. Sem backfill.
- Escolha obrigatória na venda nova, **sem valor padrão** no formulário.
- Fora de escopo: importação em lote, relatórios por tipo de entrega, action legada `criarVenda`.
- Mensagens de erro e textos de UI em português com acentuação correta.
- Cor só por token (`text-error-text`, `border-destructive`); sem cor crua.
- Antes de commitar: `git pull --rebase origin nextjs-migration`. Trabalhar no worktree `feat/entrega-retirada`; o working tree principal do André tem alterações locais que não são deste trabalho.
- `tsc` local acusa erros de client do Prisma desatualizado (`src/generated` é gitignored). Conferir só erros nos arquivos tocados e deixar o CI gerar o client.

## Review Focus

1. `entrega` no `FormData` com valor estranho (`"on"`, `"true"`, `""`, `"2"`): na criação é rejeitado como "não escolhido"; nunca vira `true` por engano.
2. Editar venda `entrega = null` sem tocar em frete, envio nem entrega salva normalmente (round-trip), inclusive nos forms de edição que não postam o campo.
3. O chat manda `entrega` como string `"true"`/`"false"` ou booleano: ambos aceitos; `entrega` ausente em `criar_venda` devolve erro claro.
4. Cotação Uber aplicada e operador troca para Retirada com frete > 0: recusa (retirada com frete cobrado).
5. `envio` NaN ou negativo com `entrega = true`: bloqueia (`!(envio > 0)`).
6. Após salvar com sucesso, o seletor do form volta a "não escolhido" (não herda a escolha da venda anterior).

---

## File Structure

- Modify `prisma/schema.prisma` — campo `Venda.entrega`.
- Create `prisma/migrations/20261002120000_add_venda_entrega/migration.sql`.
- Modify `src/lib/validations/venda.ts` — `erroEntrega`, `erroEntregaNaEdicao`, `lerEntregaDoForm`, constantes, `vendaV2Schema`.
- Modify `src/app/(app)/venda-rapida/actions.ts` — lê e grava `entrega`.
- Modify `src/components/venda-rapida-form-v2.tsx` — seletor e marca da Uber.
- Modify `src/app/(app)/historico/actions.ts` — valida e grava na edição.
- Modify `src/components/edit-venda-historico-form.tsx` e `src/components/edit-venda-form-client.tsx` — seletor na edição.
- Modify `src/lib/ai-actions.ts` — `criar_venda` e `atualizar_venda`.
- Create `src/__tests__/entrega-retirada.test.ts` — regras puras, schema, migration e adoção.
- Modify `src/__tests__/frete-real-obrigatorio.test.ts` — fixtures passam a informar `entrega`.

---

### Task 1: Coluna `entrega` (schema + migration)

**Files:**
- Modify: `prisma/schema.prisma` (model `Venda`, depois de `custoEnvio`)
- Create: `prisma/migrations/20261002120000_add_venda_entrega/migration.sql`
- Test: `src/__tests__/entrega-retirada.test.ts`

**Interfaces:**
- Produces: `Venda.entrega Boolean?` (coluna `entrega`), usado nas Tasks 3 a 5.

- [ ] **Step 1: Write the failing test**

Criar `src/__tests__/entrega-retirada.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("migration da coluna entrega", () => {
  it("adiciona so a coluna nullable, sem default nem NOT NULL", () => {
    const sql = readFileSync("prisma/migrations/20261002120000_add_venda_entrega/migration.sql", "utf8");
    expect(sql.includes('ADD COLUMN "entrega" BOOLEAN')).toBe(true);
    expect(sql.toUpperCase().includes("DEFAULT")).toBe(false);
    expect(sql.toUpperCase().includes("NOT NULL")).toBe(false);
  });
  it("o schema Prisma declara Venda.entrega como Boolean?", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema.split("\n").some((l) => l.trim().startsWith("entrega") && l.includes("Boolean?"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts`
Expected: FAIL (arquivo da migration não existe).

- [ ] **Step 3: Write minimal implementation**

Em `prisma/schema.prisma`, no model `Venda`, depois da linha `custoEnvio`:

```prisma
  // true = entrega, false = retirada, null = venda anterior ao seletor (sem backfill).
  entrega            Boolean?  @map("entrega")
```

Criar `prisma/migrations/20261002120000_add_venda_entrega/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "vendas" ADD COLUMN "entrega" BOOLEAN;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261002120000_add_venda_entrega src/__tests__/entrega-retirada.test.ts
git commit -m "feat(venda): coluna entrega (nullable) em vendas"
```

---

### Task 2: Regras puras de entrega

**Files:**
- Modify: `src/lib/validations/venda.ts` (depois de `erroCustoEnvioNaEdicao`)
- Test: `src/__tests__/entrega-retirada.test.ts`

**Interfaces:**
- Consumes: `erroCustoEnvio(frete: number, envio: number): string | null` e `erroCustoEnvioNaEdicao` já existentes.
- Produces (Tasks 3 a 5):
  - `MSG_ENTREGA_OBRIGATORIA`, `MSG_RETIRADA_COM_FRETE`, `MSG_CUSTO_ENVIO_ENTREGA` (strings)
  - `erroEntrega(v: { entrega: boolean | null | undefined; frete: number; envio: number }): string | null`
  - `erroEntregaNaEdicao(novo: { entrega: boolean | null; frete: number; envio: number }, atual: { entrega: boolean | null; frete: number; envio: number } | null): string | null`
  - `lerEntregaDoForm(v: FormDataEntryValue | null): boolean | undefined` (`"1"` → true, `"0"` → false, qualquer outra coisa → undefined)

- [ ] **Step 1: Write the failing test**

Acrescentar a `src/__tests__/entrega-retirada.test.ts` (e importar no topo):

```ts
import {
  erroEntrega, erroEntregaNaEdicao, lerEntregaDoForm,
  MSG_ENTREGA_OBRIGATORIA, MSG_RETIRADA_COM_FRETE, MSG_CUSTO_ENVIO_ENTREGA,
  MSG_CUSTO_ENVIO_OBRIGATORIO,
} from "@/lib/validations/venda";

describe("erroEntrega (venda nova)", () => {
  it("sem escolha e erro, mesmo com frete e envio", () => {
    expect(erroEntrega({ entrega: undefined, frete: 0, envio: 0 })).toBe(MSG_ENTREGA_OBRIGATORIA);
    expect(erroEntrega({ entrega: null, frete: 30, envio: 18 })).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
  it("entrega exige envio > 0 mesmo com frete 0", () => {
    expect(erroEntrega({ entrega: true, frete: 0, envio: 0 })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntrega({ entrega: true, frete: 0, envio: Number.NaN })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntrega({ entrega: true, frete: 0, envio: -5 })).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("entrega com envio > 0 e ok, com ou sem frete", () => {
    expect(erroEntrega({ entrega: true, frete: 0, envio: 12 })).toBeNull();
    expect(erroEntrega({ entrega: true, frete: 30, envio: 12 })).toBeNull();
  });
  it("retirada com frete cobrado e erro; retirada sem frete e ok", () => {
    expect(erroEntrega({ entrega: false, frete: 30, envio: 0 })).toBe(MSG_RETIRADA_COM_FRETE);
    expect(erroEntrega({ entrega: false, frete: 0, envio: 0 })).toBeNull();
  });
});

describe("erroEntregaNaEdicao", () => {
  const antigaNull = { entrega: null, frete: 30, envio: 0 };
  it("venda null sem mexer em nada salva", () => {
    expect(erroEntregaNaEdicao({ ...antigaNull }, antigaNull)).toBeNull();
  });
  it("venda null que segue null aplica so a regra do frete (piso da #37)", () => {
    expect(erroEntregaNaEdicao({ entrega: null, frete: 45, envio: 0 }, antigaNull)).toBe(MSG_CUSTO_ENVIO_OBRIGATORIO);
    expect(erroEntregaNaEdicao({ entrega: null, frete: 0, envio: 0 }, antigaNull)).toBeNull();
  });
  it("trocar null para entrega sem envio recusa; com envio ok", () => {
    expect(erroEntregaNaEdicao({ entrega: true, frete: 30, envio: 0 }, antigaNull)).toBe(MSG_CUSTO_ENVIO_ENTREGA);
    expect(erroEntregaNaEdicao({ entrega: true, frete: 30, envio: 20 }, antigaNull)).toBeNull();
  });
  it("trocar para retirada mantendo frete cobrado recusa", () => {
    expect(erroEntregaNaEdicao({ entrega: false, frete: 30, envio: 0 }, antigaNull)).toBe(MSG_RETIRADA_COM_FRETE);
  });
  it("venda ja marcada entrega: mudar so o frete exige o envio", () => {
    const atual = { entrega: true, frete: 0, envio: 15 };
    expect(erroEntregaNaEdicao({ entrega: true, frete: 10, envio: 0 }, atual)).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("sem registro atual aplica a regra de venda nova", () => {
    expect(erroEntregaNaEdicao({ entrega: null, frete: 0, envio: 0 }, null)).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
});

describe("lerEntregaDoForm", () => {
  it("so aceita 1 e 0", () => {
    expect(lerEntregaDoForm("1")).toBe(true);
    expect(lerEntregaDoForm("0")).toBe(false);
    for (const v of ["on", "true", "", "2", " 1", null]) expect(lerEntregaDoForm(v)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts`
Expected: FAIL (exports não existem).

- [ ] **Step 3: Write minimal implementation**

Em `src/lib/validations/venda.ts`, depois de `erroCustoEnvioNaEdicao`:

```ts
export const MSG_ENTREGA_OBRIGATORIA = "Escolha Entrega ou Retirada."
export const MSG_RETIRADA_COM_FRETE = "Retirada não pode ter frete cobrado."
export const MSG_CUSTO_ENVIO_ENTREGA = "Informe o custo real do envio: a venda é uma entrega."

type EntregaFrete = { entrega: boolean | null | undefined; frete: number; envio: number }

/** Venda nova: a escolha é obrigatória e entrega exige o custo real do envio. */
export function erroEntrega(v: EntregaFrete): string | null {
  if (v.entrega === null || v.entrega === undefined) return MSG_ENTREGA_OBRIGATORIA
  if (v.entrega && !(v.envio > 0)) return MSG_CUSTO_ENVIO_ENTREGA
  if (!v.entrega && v.frete > 0) return MSG_RETIRADA_COM_FRETE
  return null
}

/**
 * Edição: venda sem alteração em entrega, frete e envio salva sempre. Venda que segue `null`
 * só responde ao piso `frete > 0 ⇒ envio > 0`; qualquer outra segue a regra de venda nova.
 */
export function erroEntregaNaEdicao(
  novo: { entrega: boolean | null; frete: number; envio: number },
  atual: { entrega: boolean | null; frete: number; envio: number } | null,
): string | null {
  if (!atual) return erroEntrega(novo)
  if (novo.entrega === atual.entrega && novo.frete === atual.frete && novo.envio === atual.envio) return null
  if (novo.entrega === null) return erroCustoEnvio(novo.frete, novo.envio)
  return erroEntrega(novo)
}

/** `"1"` = entrega, `"0"` = retirada; qualquer outro valor conta como "não escolhido". */
export function lerEntregaDoForm(v: FormDataEntryValue | null): boolean | undefined {
  if (v === "1") return true
  if (v === "0") return false
  return undefined
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/venda.ts src/__tests__/entrega-retirada.test.ts
git commit -m "feat(venda): regras puras de entrega e retirada"
```

---

### Task 3: Criação da venda (schema, action e formulário)

**Files:**
- Modify: `src/lib/validations/venda.ts` (`vendaV2Schema`)
- Modify: `src/app/(app)/venda-rapida/actions.ts` (`criarVendaV2`)
- Modify: `src/components/venda-rapida-form-v2.tsx`
- Modify: `src/__tests__/frete-real-obrigatorio.test.ts` (fixtures)
- Test: `src/__tests__/entrega-retirada.test.ts`

**Interfaces:**
- Consumes: `erroEntrega`, `lerEntregaDoForm`, `MSG_*` da Task 2; `Venda.entrega` da Task 1.
- Produces: `vendaV2Schema` com campo `entrega?: boolean` (obrigatório por regra, não por tipo); `FormData` campo `entrega` = `"1"` | `"0"`.

- [ ] **Step 1: Write the failing test**

Acrescentar a `src/__tests__/entrega-retirada.test.ts` (importar `vendaV2Schema`):

```ts
import { vendaV2Schema } from "@/lib/validations/venda";

const baseV2 = {
  data: "2026-10-02", vendedor: "Maria", clienteId: 1, frete: 0, envio: 0, parcelas: 1,
  temNota: false, taxaNota: 0,
  produtos: [{ produtoNome: "Notebook", custoProduto: 100, valorVenda: 200, quantidade: 1, subtotal: 200 }],
};

describe("vendaV2Schema com entrega", () => {
  it("sem entrega rejeita apontando o campo entrega", () => {
    const r = vendaV2Schema.safeParse(baseV2);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === "entrega")?.message).toBe(MSG_ENTREGA_OBRIGATORIA);
  });
  it("entrega com frete 0 e envio > 0 passa", () => {
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: true, envio: 14 }).success).toBe(true);
  });
  it("entrega com envio 0 rejeita no campo envio", () => {
    const r = vendaV2Schema.safeParse({ ...baseV2, entrega: true });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === "envio")?.message).toBe(MSG_CUSTO_ENVIO_ENTREGA);
  });
  it("retirada sem frete passa; retirada com frete rejeita", () => {
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: false }).success).toBe(true);
    expect(vendaV2Schema.safeParse({ ...baseV2, entrega: false, frete: 30 }).success).toBe(false);
  });
});

describe("adocao na criacao", () => {
  it("criarVendaV2 le e grava entrega", () => {
    const src = readFileSync("src/app/(app)/venda-rapida/actions.ts", "utf8");
    expect(src.includes('lerEntregaDoForm(formData.get("entrega"))')).toBe(true);
    expect(src.includes("entrega,")).toBe(true);
  });
  it("o form tem o seletor, manda o campo e marca Entrega na cotacao Uber", () => {
    const src = readFileSync("src/components/venda-rapida-form-v2.tsx", "utf8");
    expect(src.includes('formData.append("entrega"')).toBe(true);
    expect(src.includes('id="entrega"')).toBe(true);
    expect(src.includes('setEntrega("1")')).toBe(true);
    expect(src.includes('setEntrega("")')).toBe(true);
  });
});
```

Também em `src/__tests__/frete-real-obrigatorio.test.ts`: no objeto `base` do `describe("vendaV2Schema")`, adicionar `entrega: false`; nos casos com `frete: 30`, usar `entrega: true`. (O caso "rejeita frete > 0 com envio 0" continua apontando o campo `envio` com `entrega: true`, mas a mensagem passa a ser `MSG_CUSTO_ENVIO_ENTREGA`; ajustar a asserção.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts src/__tests__/frete-real-obrigatorio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`vendaV2Schema` (`src/lib/validations/venda.ts`): adicionar ao objeto `entrega: z.boolean().optional(),` e trocar o `superRefine` final por:

```ts
}).superRefine((v, ctx) => {
  const msg = erroEntrega({ entrega: v.entrega, frete: v.frete, envio: v.envio })
  if (!msg) return
  const path = msg === MSG_ENTREGA_OBRIGATORIA ? "entrega" : msg === MSG_RETIRADA_COM_FRETE ? "entrega" : "envio"
  ctx.addIssue({ code: "custom", path: [path], message: msg })
})
```

`criarVendaV2` (`venda-rapida/actions.ts`): importar `lerEntregaDoForm` de `@/lib/validations/venda`; no objeto `raw` adicionar `entrega: lerEntregaDoForm(formData.get("entrega")),`; ao desestruturar `parsed.data` incluir `entrega`; no `prisma.venda.create`, ao lado de `custoEnvio: envio,` adicionar `entrega,`.

Formulário (`venda-rapida-form-v2.tsx`):
1. Estado: `const [entrega, setEntrega] = useState<"" | "1" | "0">("");` junto de `freteViaUber`.
2. Em `cotarFreteUber`, depois de `setFreteViaUber(true);` adicionar `setEntrega("1");`.
3. Em `validationErrors` acrescentar `entrega?: boolean;`.
4. Em `handleSubmit`, antes do bloco do custo de envio:
   ```tsx
   if (entrega === "") {
     errors.entrega = true;
     msgs.push("Entrega ou Retirada");
   }
   ```
   e trocar a checagem existente `erroCustoEnvio(frete, envio)` por `entrega === "1" ? !(envio > 0) : entrega === "0" ? frete > 0 : erroCustoEnvio(frete, envio) !== null`, mantendo `errors.envio = true` para o caso `"1"` e acrescentando a mensagem "Retirada não pode ter frete" quando `entrega === "0" && frete > 0` (usar `errors.entrega = true`).
5. Ao montar o `FormData`: `if (entrega) formData.append("entrega", entrega);`.
6. Seletor, no bloco do frete, antes do campo "Envio (Custo)", seguindo o `FormSelect` já usado em "Forma de pagamento":
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="entrega" className={cn("text-xs font-bold uppercase tracking-wider", validationErrors.entrega ? "text-error-text" : "text-muted-foreground")}>
       Entrega ou retirada <span className="text-error-text">*</span>
       {validationErrors.entrega && " (obrigatório)"}
     </Label>
     <FormSelect
       id="entrega"
       name="entrega"
       value={entrega}
       onValueChange={(v) => setEntrega(v as "" | "1" | "0")}
       placeholder="Selecione"
       options={[
         { value: "1", label: "Entrega" },
         { value: "0", label: "Retirada" },
       ]}
     />
   </div>
   ```
7. O asterisco do "Envio (Custo)" passa a aparecer quando `frete > 0 || entrega === "1"`.
8. No reset após sucesso (`void setFormState({ ... })`) chamar `setEntrega("");` e `setFreteViaUber(false);`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`
Expected: PASS na suíte inteira, exceto `uber-config-resolve` e `uber-delivery-quote-auth` (env vars) e o intermitente `login-limite-tentativas`. Se outros testes que postam `FormData` para `criarVendaV2` falharem por falta de `entrega`, acrescentar `fd.set("entrega", "0")` (ou `"1"` + `envio`) ao fixture deles.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/venda.ts "src/app/(app)/venda-rapida/actions.ts" src/components/venda-rapida-form-v2.tsx src/__tests__
git commit -m "feat(venda): escolha obrigatoria entre entrega e retirada na venda nova"
```

---

### Task 4: Edição do histórico

**Files:**
- Modify: `src/app/(app)/historico/actions.ts` (`updateVenda`)
- Modify: `src/components/edit-venda-historico-form.tsx`
- Modify: `src/components/edit-venda-form-client.tsx`
- Test: `src/__tests__/entrega-retirada.test.ts`

**Interfaces:**
- Consumes: `erroEntregaNaEdicao`, `lerEntregaDoForm` (Task 2); `Venda.entrega` (Task 1).
- Produces: `FormData` campo `entrega` opcional (`"1"` | `"0"`; ausente ou vazio = não alterar).

- [ ] **Step 1: Write the failing test**

Acrescentar a `src/__tests__/entrega-retirada.test.ts`:

```ts
describe("adocao na edicao", () => {
  it("updateVenda le o valor gravado, valida e so grava quando o form manda", () => {
    const src = readFileSync("src/app/(app)/historico/actions.ts", "utf8");
    expect(src.includes("erroEntregaNaEdicao(")).toBe(true);
    expect(src.includes("entrega: true")).toBe(true);
    expect(src.includes('lerEntregaDoForm(formData.get("entrega"))')).toBe(true);
    expect(src.includes("entregaForm !== undefined")).toBe(true);
  });
  it("os dois forms de edicao mostram o seletor com Nao informado", () => {
    for (const f of ["src/components/edit-venda-historico-form.tsx", "src/components/edit-venda-form-client.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src.includes('name="entrega"') || src.includes('formData.set("entrega"')).toBe(true);
      expect(src.includes("Não informado")).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`historico/actions.ts`, em `updateVenda`:
1. Importar `erroEntregaNaEdicao` e `lerEntregaDoForm` de `@/lib/validations/venda` (trocar o import de `erroCustoEnvioNaEdicao`, que deixa de ser usado ali).
2. Perto dos outros `formData.get`: `const entregaForm = lerEntregaDoForm(formData.get("entrega"));`.
3. No tipo de `vendaAntes` acrescentar `entrega: boolean | null;` e no `select` acrescentar `entrega: true,`.
4. Trocar o bloco `erroCustoEnvioNaEdicao(...)` por:
   ```ts
   const erroEnvio = erroEntregaNaEdicao(
     { entrega: entregaForm ?? vendaAntes?.entrega ?? null, frete, envio },
     vendaAntes ? { entrega: vendaAntes.entrega ?? null, frete: vendaAntes.valorFrete ?? 0, envio: vendaAntes.custoEnvio ?? 0 } : null,
   );
   if (erroEnvio) return { success: false, error: erroEnvio };
   ```
5. No `data` do `prisma.venda.update`, ao lado de `custoEnvio: envio,`:
   ```ts
   ...(entregaForm !== undefined ? { entrega: entregaForm } : {}),
   ```

`edit-venda-form-client.tsx`: estado `const [entrega, setEntrega] = useState<string>(editVenda.entrega === true ? "1" : editVenda.entrega === false ? "0" : "");`; antes do `formData.set("envio", ...)` acrescentar `if (entrega) formData.set("entrega", entrega);`; renderizar um `FormSelect` (`name="entrega"`, `id="edit-entrega"`) com as opções `{ value: "", label: "Não informado" }`, `{ value: "1", label: "Entrega" }`, `{ value: "0", label: "Retirada" }`, junto do campo "Custo de envio". Incluir `entrega: boolean | null` no tipo de `editVenda` desse componente.

`edit-venda-historico-form.tsx`: mesmo seletor ao lado de `edit-envio`, com `defaultValue` derivado de `editVenda.entrega` e o mesmo tipo acrescentado.

Onde `editVenda` é montado a partir do banco (páginas que renderizam esses forms), incluir `entrega` no `select` do Prisma.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`
Expected: PASS (mesmas exceções de ambiente da Task 3). Os testes existentes de edição (`historico-edicao-parcela-unica` e afins) devem continuar verdes sem `entrega` no `FormData`, o que prova o round-trip de venda `null`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/historico/actions.ts" src/components src/__tests__ "src/app/(app)"
git commit -m "feat(venda): entrega e retirada na edicao do historico"
```

---

### Task 5: Tools do chat

**Files:**
- Modify: `src/lib/ai-actions.ts`
- Modify: `src/__tests__/frete-real-obrigatorio.test.ts`
- Test: `src/__tests__/entrega-retirada.test.ts`

**Interfaces:**
- Consumes: `erroEntrega`, `erroEntregaNaEdicao` (Task 2); `Venda.entrega` (Task 1).
- Produces: parâmetro `entrega` (boolean ou `"true"`/`"false"`) em `criar_venda` (obrigatório na prática) e `atualizar_venda` (opcional).

- [ ] **Step 1: Write the failing test**

Acrescentar a `src/__tests__/entrega-retirada.test.ts`:

```ts
describe("tools do chat", () => {
  const ai = readFileSync("src/lib/ai-actions.ts", "utf8");
  it("criar_venda declara entrega e valida com erroEntrega", () => {
    expect(ai.includes("optionalBoolean")).toBe(true);
    expect(ai.includes("erroEntrega({ entrega: parsedParams.entrega")).toBe(true);
    expect(ai.includes("entrega: { type: \"boolean\"")).toBe(true);
  });
  it("atualizar_venda confere o valor gravado e grava entrega", () => {
    expect(ai.includes("erroEntregaNaEdicao(")).toBe(true);
    expect(ai.includes("entrega: parsedParams.entrega ?? undefined")).toBe(true);
  });
});
```

Em `frete-real-obrigatorio.test.ts`, no teste "as tools do chat ... seguem a mesma regra", trocar a primeira asserção por `src.includes("erroEntrega({ entrega: parsedParams.entrega")`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/entrega-retirada.test.ts src/__tests__/frete-real-obrigatorio.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`ai-actions.ts`:
1. Importar `erroEntrega` e `erroEntregaNaEdicao` (trocar o import de `erroCustoEnvio`/`erroCustoEnvioNaEdicao`).
2. Depois de `optionalNumber`, o helper (aceita o que o modelo costuma mandar):
   ```ts
   const optionalBoolean = () =>
     toOptional(
       z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]),
     );
   ```
3. `criar_venda` (zod): acrescentar `entrega: optionalBoolean(),`. Na definição da tool, em `properties`: `entrega: { type: "boolean", description: "true = entrega, false = retirada. Obrigatório." },` e incluir `"entrega"` em `required`.
4. No handler `criar_venda`, trocar `const erroEnvioIa = erroCustoEnvio(valorFrete, custoEnvio);` por `const erroEnvioIa = erroEntrega({ entrega: parsedParams.entrega, frete: valorFrete, envio: custoEnvio });` e gravar `entrega: parsedParams.entrega,` no `prisma.venda.create` ao lado de `custoEnvio,`.
5. `atualizar_venda` (zod): `entrega: optionalBoolean(),`; `properties` da tool: `entrega: { type: "boolean" },`.
6. No handler, ampliar a condição para `parsedParams.valorFrete != null || parsedParams.custoEnvio != null || parsedParams.entrega != null`, incluir `entrega: true` no `select` e trocar a chamada por:
   ```ts
   const atual = antes ? { entrega: antes.entrega ?? null, frete: antes.valorFrete ?? 0, envio: antes.custoEnvio ?? 0 } : null;
   const erroEnvioIa = erroEntregaNaEdicao(
     { entrega: parsedParams.entrega ?? atual?.entrega ?? null, frete: parsedParams.valorFrete ?? atual?.frete ?? 0, envio: parsedParams.custoEnvio ?? atual?.envio ?? 0 },
     atual,
   );
   ```
   e no `data` do `update`: `entrega: parsedParams.entrega ?? undefined,`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`
Expected: PASS (mesmas exceções de ambiente).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai-actions.ts src/__tests__
git commit -m "feat(venda): tools do chat exigem entrega ou retirada"
```

---

### Task 6: Revisão, PR e deploy

**Files:** nenhum novo.

- [ ] **Step 1:** `npx vitest run` e `npx eslint` nos arquivos tocados (erro de lint já derrubou o CI na PR #37: sem `require()`, sem imports não usados).
- [ ] **Step 2:** Disparar subagente de revisão (Agent tool) sobre `git diff origin/nextjs-migration...HEAD`, com o foco do bloco Review Focus. Aplicar os achados confirmados.
- [ ] **Step 3:** `git pull --rebase origin nextjs-migration`, `git push`, abrir PR contra `nextjs-migration`.
- [ ] **Step 4:** Esperar o CI verde (`gh pr checks --watch`), mergear com `gh pr merge --squash --delete-branch` e conferir os workflows do commit de merge (CI e "Build → ECR → Deploy (Kustomize)").
- [ ] **Step 5:** Confirmar que a migration subiu: o job de deploy só atualiza a tag; a migration roda na subida do container (`migrate deploy`). Registrar no resumo final que as duas instâncias aplicam a coluna na próxima subida.
