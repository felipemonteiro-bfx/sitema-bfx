# Quick Task: Mostrar Custo e Margem de Lucro nas Vendas do Histórico

**Researched:** 2026-03-23
**Domain:** Historico page — cost/margin display
**Confidence:** HIGH

---

## Key Findings

### 1. Schema: `custoProduto` IS stored in `ItemVenda` at sale time (snapshot)

`ItemVenda` has:
- `custoProduto Float` — custo unitário capturado no momento da venda
- `valorVenda Float` — preço de venda unitário
- `quantidade Int`
- `subtotal Float` — `quantidade * valorVenda`

The legacy `Venda.custoProduto Float?` also exists for old single-product sales.

**Conclusion:** Cost is already snapshotted. No lookup against `Produto.custoPadrao` needed at display time — data is already in `ItemVenda.custoProduto`.

---

### 2. Current Historico Query — What's Fetched vs What's Missing

The page query (`historico/page.tsx`, line 80–106) fetches `itens` with:
```ts
itens: {
  select: { produtoNome: true, quantidade: true, subtotal: true },
}
```

`custoProduto` is NOT included in the main `vendas` query. It IS included in the `editVenda` query (line 117) but that's only for the edit sheet.

**Fix required:** Add `custoProduto: true` to the `itens` select in the main `vendas` query.

---

### 3. Margin Calculation Pattern (already established in `finance.ts`)

`src/lib/finance.ts` (lines 56–63) shows the canonical pattern:
```ts
// For multi-item venda:
const cmvVenda = v.itens.reduce((s, i) => s + (i.custoProduto || 0) * (i.quantidade || 1), 0);
// For legacy single-product:
const cmvVenda = v.custoProduto || 0;

const lucroLiquido = receita - cmvVenda - freteVenda - notaVenda;
const margemPct = receita > 0 ? (lucroLiquido / receita) * 100 : 0;
```

Note: `Venda.lucroLiquido` is stored on the model but the page currently doesn't fetch it. It was computed by the AI `criar_venda` action. However, `lucroLiquido` on `Venda` may not be populated for all sales, so computing from `itens.custoProduto` is more reliable.

---

### 4. TypeScript Type Gap

The `Venda` type in `historico-vendas-cards.tsx` (line 35–52) and the `itens` shape on line 51:
```ts
itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
```
Does not include `custoProduto`. This type definition must be extended.

---

### 5. Where to Show Cost/Margin

**Desktop table** (`page.tsx`): Currently has 11 columns — Data, Cliente, Vendedor, Produto, Qtd, Valor Total, Nota, Desconto folha, Boleto, Assinado, Actions. Adding 2 columns (Custo and Margem %) will make it 13 — tight but feasible with `text-right tabular-nums`.

**Mobile cards** (`historico-vendas-cards.tsx`): The expanded section already has a `grid grid-cols-2` detail grid. Cost and margin can be added there as additional rows in the expanded view.

---

## Implementation Plan

### Step 1: Extend the Prisma query in `page.tsx`

Change the `itens` select in `vendas` query from:
```ts
itens: { select: { produtoNome: true, quantidade: true, subtotal: true } }
```
to:
```ts
itens: { select: { produtoNome: true, custoProduto: true, quantidade: true, subtotal: true } }
```

Also fetch `custoProduto` and `lucroLiquido` on the `Venda` level for legacy support:
```ts
custoProduto: true,
lucroLiquido: true,
```

### Step 2: Add calculation helpers to `venda-utils.ts`

Two new exported functions:
```ts
export function custoTotalVenda(v: {
  itens?: { custoProduto: number; quantidade: number }[];
  custoProduto?: number | null;
  quantidade?: number | null;
}): number

export function margemBrutaVenda(v: {
  itens?: { custoProduto: number; quantidade: number; subtotal: number }[];
  custoProduto?: number | null;
  quantidade?: number | null;
  valorVenda?: number | null;
  valorFrete?: number | null;
}): { custo: number; margem: number; margemPct: number }
```

These mirror the pattern in `finance.ts`. Do NOT include `taxaNota`/`custoEnvio` — keep it as gross margin (receita - CMV) for simplicity in the list view, consistent with how costs are labeled there.

### Step 3: Update `historico-vendas-cards.tsx` TypeScript type

Add `custoProduto` to the `itens` type in the `Venda` type definition and add Custo/Margem rows in the expanded view.

### Step 4: Add Custo/Margem columns to desktop table in `page.tsx`

Two new `<TableHead>` columns (right-aligned, numeric) between "Valor Total" and "Nota":
- **Custo** — total CMV for the venda
- **Margem** — percentage formatted as "XX.X%", colored green if positive, amber if zero/negative

---

## Gotchas

- **Legacy single-product sales**: `v.itens` will be empty; fall back to `v.custoProduto * v.quantidade`. Some very old records may have `custoProduto = null` — show "—" in that case.
- **`Venda.lucroLiquido` is unreliable**: It's only populated by the AI action and may be null for manually-entered sales. Use computed value from `itens.custoProduto` instead.
- **Column width**: Desktop table is already wide. Use abbreviated headers ("Custo" not "Custo Total", "Margem" not "Margem de Lucro") and `tabular-nums` class for alignment.
- **Zero-cost items**: Some products may have `custoProduto = 0` (e.g., services). This is valid — show R$ 0,00 and 100% margin.

---

## Sources

- `prisma/schema.prisma` — verified `ItemVenda.custoProduto` field exists (HIGH)
- `src/app/(app)/historico/page.tsx` — verified current select query and table columns (HIGH)
- `src/components/historico-vendas-cards.tsx` — verified mobile card structure (HIGH)
- `src/lib/finance.ts` — verified canonical margin calculation pattern (HIGH)
- `src/lib/venda-utils.ts` — verified existing utility functions (HIGH)
