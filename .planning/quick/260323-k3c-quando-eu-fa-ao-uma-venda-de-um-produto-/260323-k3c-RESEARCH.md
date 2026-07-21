# Quick Task: Stock Decrement on Sale — Research

**Researched:** 2026-03-23
**Domain:** Venda creation flow + Produto.qtdEstoque
**Confidence:** HIGH

---

## Summary

Stock (`Produto.qtdEstoque`) is never decremented when a sale is created. Neither `criarVendaV2` (the main PDV action) nor `criarVenda` (legacy action) nor `criar_venda` (AI action) contains any `prisma.produto.update` call. The `Produto` model has a `qtdEstoque Int?` field, but it is only ever written by `registrar_entrada_estoque` (AI action) and `atualizar_produto` (AI action). All three sale-creation paths completely omit stock management.

There is also a second problem: `ItemVenda` stores only `produtoNome` (a string), not a `produtoId` FK. The link from a sold item to its catalog entry is a name-based match, which means the backfill for historical sales must do `WHERE nome = itemVenda.produtoNome`.

**Primary recommendation:** Add a `prisma.produto.updateMany({ where: { nome: p.produtoNome }, data: { qtdEstoque: { decrement: p.quantidade } } })` step inside the `$transaction` block in `criarVendaV2`. Then run a one-time backfill that sums all existing `ItemVenda` quantities grouped by `produtoNome` and decrements `Produto.qtdEstoque` accordingly.

---

## Findings

### 1. Sale creation paths — none decrement stock

| Path | File | Stock logic? |
|------|------|-------------|
| `criarVendaV2` (PDV main form) | `src/app/(app)/venda-rapida/actions.ts` line 65 | None |
| `criarVenda` (legacy single-product) | same file, line 19 | None |
| `criar_venda` (AI action) | `src/lib/ai-actions.ts` line 821 | None |

All three create `Venda` + `ItemVenda` records but never touch `produtos.qtd_estoque`.

### 2. Only stock-modifying operations

| Operation | File | Logic |
|-----------|------|-------|
| `registrar_entrada_estoque` | `ai-actions.ts` line 1349 | `{ increment: quantidade }` |
| `atualizar_produto` | `ai-actions.ts` line 1385 | Absolute overwrite of `qtdEstoque` |

### 3. ItemVenda has no produtoId FK

`ItemVenda` schema (prisma/schema.prisma line 107):
- `produtoNome String` — only link to catalog
- No `produtoId` or relation to `Produto`

Consequence: decrement query must use `nome` match. Multiple products can share a name if they have different `fornecedorId` (unique constraint is `(nome, fornecedorId)`), so a `updateMany` on name alone may update more than one row in theory. In practice this is the only available link since the form sends only `produtoNome`.

### 4. Form sends produtoNome only

`venda-rapida-form-v2.tsx` line 503:
```
formData.append("produtos", JSON.stringify(produtosFiltrados));
```
`ProdutoItem` interface has `id: string` (UUID — React key only, not DB id). The JSON sent to the action contains: `{ produtoNome, custoProduto, valorVenda, quantidade, subtotal }`.

The autocomplete endpoint (`/api/vendas/autocomplete/produtos`) returns `id` from DB, but the form uses `crypto.randomUUID()` as the item's local id and does NOT pass the DB produto id in the submitted JSON. Therefore the action has no DB `produtoId` to work with — name-based decrement is the only option without a schema change.

### 5. Where to add the fix in criarVendaV2

The `$transaction` block is at line 131. Steps currently are:
1. `tx.venda.create(...)` — creates Venda
2. `tx.itemVenda.createMany(...)` — creates items
3. `tx.parcelaVencimento.createMany(...)` — creates parcelas (optional)

**Step 4 to add** (inside the same transaction, after step 2):
```typescript
// Debitar estoque para cada item
for (const p of produtosValidados) {
  await tx.produto.updateMany({
    where: { nome: p.produtoNome },
    data: { qtdEstoque: { decrement: p.quantidade } },
  });
}
```

`updateMany` is used (not `update`) because the unique constraint is `(nome, fornecedorId)` and we only have `nome`. If zero rows match (produto was typed manually and doesn't exist in catalog), it silently no-ops — which is the correct behavior.

### 6. Legacy criarVenda (single-product, line 19)

Uses `produto` (String, product name) and `quantidade` (number). Same fix pattern:
```typescript
if (produto) {
  await prisma.produto.updateMany({
    where: { nome: produto },
    data: { qtdEstoque: { decrement: quantidade } },
  });
}
```
This action does NOT use a transaction. Should either wrap in one or add the updateMany after the venda.create.

### 7. AI criar_venda (ai-actions.ts line 821)

Uses `parsedParams.produtoNome` and quantity hardcoded as `1`. Same fix:
```typescript
if (parsedParams.produtoNome) {
  await tx.produto.updateMany({
    where: { nome: parsedParams.produtoNome },
    data: { qtdEstoque: { decrement: 1 } },
  });
}
```

### 8. Backfill for existing sales

Approach: aggregate sold quantities from `itens_venda` grouped by `produto_nome`, then decrement `produtos.qtd_estoque` for each.

This can be done via a Prisma script or raw SQL. Since we cannot install packages, a Node script using `prisma.$queryRaw` is safest:

```sql
-- Preview: what would be decremented
SELECT iv.produto_nome, SUM(iv.quantidade) as total_vendido
FROM itens_venda iv
JOIN vendas v ON v.id = iv.venda_id
WHERE v.status != 'cancelada'
GROUP BY iv.produto_nome;
```

Then for each row, run `UPDATE produtos SET qtd_estoque = qtd_estoque - total_vendido WHERE nome = produto_nome AND qtd_estoque > 0`.

**Important caveat:** `qtdEstoque` may already be partially decremented (if any manual adjustments were made). The safest backfill is:
- Set `qtd_estoque = MAX(0, qtd_estoque - total_vendido_sem_estoque_atual)` — but we don't know what the "correct" starting stock was.
- A simpler and transparent approach: implement a dedicated API endpoint `/api/admin/backfill-estoque` (admin-only) that shows the preview and lets the user confirm. This avoids silent data corruption.

### 9. cancelarVenda / deleteVenda — stock restoration needed too

`deleteVenda` (historico/actions.ts line 144): deletes the Venda record (cascade deletes ItemVenda). No stock restoration. Should increment back before delete.

`updateVenda` (historico/actions.ts line 10): replaces `ItemVenda` records. If quantities change, the delta should be applied to stock. This is more complex — needs old quantities fetched before update.

For the scope of this task, focus is on:
1. Decrement on new sales (criarVendaV2, criarVenda, criar_venda AI)
2. Backfill for existing sales
3. Optionally: restore on deleteVenda

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(app)/venda-rapida/actions.ts` | Add stock decrement in `criarVendaV2` transaction + `criarVenda` |
| `src/lib/ai-actions.ts` | Add stock decrement in `criar_venda` case |
| New: `src/app/api/admin/backfill-estoque/route.ts` | GET (preview) + POST (apply) backfill |

---

## Common Pitfalls

- **qtdEstoque can go negative:** `updateMany` with `decrement` does NOT enforce a floor of 0. Prisma will happily set stock to -5. Either add a check before decrementing or accept negative stock as valid (shows oversell). Recommend: allow negative (shows problem) rather than silently capping.
- **Name collisions:** If two products share the same `nome` but different `fornecedorId`, `updateMany` will decrement all of them. Very unlikely in practice but worth noting.
- **Backfill idempotency:** Running the backfill twice will decrement stock twice. The endpoint must be guarded (one-time flag or confirm prompt).
- **Cancelled/returned sales:** Current `status` field values are `"ativa" | "cancelada" | "estornada"`. Backfill should exclude `cancelada` and `estornada` sales.

---

## Sources

- `/tmp/sitema-bfx/src/app/(app)/venda-rapida/actions.ts` — confirmed no stock logic (HIGH)
- `/tmp/sitema-bfx/src/lib/ai-actions.ts` — confirmed no stock decrement in criar_venda (HIGH)
- `/tmp/sitema-bfx/prisma/schema.prisma` — confirmed ItemVenda has no produtoId FK (HIGH)
- `/tmp/sitema-bfx/src/components/venda-rapida-form-v2.tsx` — confirmed form sends only produtoNome (HIGH)
