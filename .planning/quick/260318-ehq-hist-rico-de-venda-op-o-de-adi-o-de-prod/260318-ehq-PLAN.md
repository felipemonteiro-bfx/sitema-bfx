---
phase: quick-260318-ehq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/historico/page.tsx
  - src/components/historico-vendas-cards.tsx
  - src/components/edit-venda-itens-client.tsx
autonomous: true
requirements: [HIST-ITENS-01, HIST-ITENS-02]

must_haves:
  truths:
    - "Na tabela do historico, cada venda exibe a lista de produtos vendidos (nome, quantidade, valor) de forma expandivel"
    - "Nos cards mobile do historico, cada venda exibe os produtos vendidos individualmente quando expandido"
    - "No formulario de edicao de venda, o usuario pode adicionar, remover e editar itens/produtos da venda"
    - "Ao salvar a edicao, os itens da venda sao atualizados no banco de dados (ItemVenda)"
  artifacts:
    - path: "src/components/edit-venda-itens-client.tsx"
      provides: "Client component for editing venda items (add/remove/edit products)"
      min_lines: 80
    - path: "src/app/(app)/historico/page.tsx"
      provides: "Updated historico page with product listing in table and edit form with multi-product support"
    - path: "src/components/historico-vendas-cards.tsx"
      provides: "Updated mobile cards showing individual product items when expanded"
  key_links:
    - from: "src/components/edit-venda-itens-client.tsx"
      to: "/api/vendas/autocomplete/produtos"
      via: "fetch autocomplete for product search"
      pattern: "fetch.*autocomplete/produtos"
    - from: "src/app/(app)/historico/page.tsx"
      to: "prisma.itemVenda"
      via: "server action updateVenda saves itens"
      pattern: "itemVenda\\.(deleteMany|createMany)"
    - from: "src/app/(app)/historico/page.tsx"
      to: "src/components/edit-venda-itens-client.tsx"
      via: "import and render in edit form"
      pattern: "EditVendaItens"
---

<objective>
Add full product listing and product editing capabilities to the Historico de Vendas page.

Purpose: Currently the historico page shows products as a truncated comma-separated text string and the edit form only handles single-product fields (legacy). This plan upgrades the historico to (1) display individual product items (ItemVenda) clearly in both desktop table and mobile cards, and (2) allow adding/removing/editing products when editing a sale, using the same ProdutoItemForm component used in the PDV.

Output: Updated historico page with expandable product details and a client-side multi-product editor in the edit form.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

<interfaces>
<!-- Key types and contracts the executor needs -->

From prisma/schema.prisma:
```prisma
model ItemVenda {
  id           Int     @id @default(autoincrement())
  vendaId      Int     @map("venda_id")
  produtoNome  String  @map("produto_nome")
  custoProduto Float   @map("custo_produto")
  valorVenda   Float   @map("valor_venda")
  quantidade   Int     @default(1)
  subtotal     Float
  venda        Venda   @relation(fields: [vendaId], references: [id], onDelete: Cascade)
}
```

From src/components/produto-item-form.tsx:
```typescript
interface ProdutoItem {
  id: string;
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}

interface Props {
  item: ProdutoItem;
  index: number;
  onUpdate: (index: number, item: ProdutoItem) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  hasError?: boolean;
}

export function ProdutoItemForm({ item, index, onUpdate, onRemove, canRemove, hasError }: Props)
```

From src/lib/venda-utils.ts:
```typescript
export function valorTotalVenda(v: { itens?: { subtotal: number }[]; valorVenda?: number | null; quantidade?: number | null; valorFrete?: number | null; }): number
export function produtosTexto(v: { itens?: { produtoNome: string; quantidade: number }[]; produtoNome?: string | null; }): string
export function quantidadeTotal(v: { itens?: { quantidade: number }[]; quantidade?: number | null; }): number
```

From src/lib/action-response.ts:
```typescript
export type ActionResponse<T = unknown> = { success: true; message: string; data?: T } | { success: false; error: string }
export function successResponse<T>(message: string, data?: T): ActionResponse<T>
export function errorResponse(error: string): ActionResponse<never>
```

From src/components/historico-vendas-cards.tsx - Venda type:
```typescript
type Venda = {
  id: number; dataVenda: Date; vendedor: string | null; produtoNome: string | null;
  quantidade: number | null; valorVenda: number | null; valorFrete: number | null;
  temNota: boolean | null; taxaNota: number | null; descontoEmFolha: boolean | null;
  boleto: boolean | null; comprovantePdf: string | null; asaasPaymentId: string | null;
  boletoUrl: string | null; cliente: { nome: string } | null;
  itens?: { produtoNome: string; quantidade: number; subtotal: number }[];
};
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Display product items in historico table and mobile cards</name>
  <files>src/app/(app)/historico/page.tsx, src/components/historico-vendas-cards.tsx</files>
  <action>
**In `src/app/(app)/historico/page.tsx` (desktop table):**

1. The query already fetches `itens` with `produtoNome`, `quantidade`, `subtotal`. Expand the itens select to also include `valorVenda` and `custoProduto` so the edit form can use them:
   ```
   itens: {
     select: { id: true, produtoNome: true, quantidade: true, subtotal: true, valorVenda: true, custoProduto: true },
     orderBy: { id: "asc" },
   }
   ```

2. In the desktop table, replace the current "Produto" cell (which uses `produtosTexto()` to show a truncated string) with an expandable product list. For vendas with multiple itens, show a summary with item count, and use an HTML `<details>/<summary>` element (no client state needed since this is a Server Component):

   ```tsx
   <TableCell className="max-w-[250px]">
     {v.itens && v.itens.length > 1 ? (
       <details className="cursor-pointer">
         <summary className="truncate text-sm">
           {v.itens.length} produtos
         </summary>
         <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
           {v.itens.map((item, idx) => (
             <li key={idx} className="flex justify-between gap-2">
               <span className="truncate">{item.produtoNome} ({item.quantidade}x)</span>
               <span className="tabular-nums shrink-0">{formatBRL(item.subtotal)}</span>
             </li>
           ))}
         </ul>
       </details>
     ) : (
       <span className="block truncate" title={produtosTexto(v)}>
         {produtosTexto(v)}
       </span>
     )}
   </TableCell>
   ```

3. Also update the `editVenda` query to include full item details for the edit form:
   ```
   const editVenda = editId ? await prisma.venda.findUnique({
     where: { id: editId },
     select: {
       // ...existing fields...
       itens: {
         select: { id: true, produtoNome: true, custoProduto: true, valorVenda: true, quantidade: true, subtotal: true },
         orderBy: { id: "asc" },
       },
     },
   }) : null;
   ```

**In `src/components/historico-vendas-cards.tsx` (mobile cards):**

1. Update the Venda type to include `valorVenda` and `custoProduto` in itens:
   ```typescript
   itens?: { produtoNome: string; quantidade: number; subtotal: number; valorVenda: number; custoProduto: number }[];
   ```

2. In the expanded details section of VendaCard, add a dedicated product list section BEFORE the existing grid. When `venda.itens && venda.itens.length > 0`, render individual product items:
   ```tsx
   {venda.itens && venda.itens.length > 0 && (
     <div className="space-y-1.5 mb-2">
       <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produtos</span>
       {venda.itens.map((item, idx) => (
         <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2 py-1.5">
           <span className="truncate mr-2">{item.produtoNome} <span className="text-muted-foreground">({item.quantidade}x)</span></span>
           <span className="tabular-nums font-medium shrink-0">{formatBRL(item.subtotal)}</span>
         </div>
       ))}
     </div>
   )}
   ```
   Keep the existing "Qtd" row in the grid (it already computes sum from itens).
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -50</automated>
  </verify>
  <done>
    - Desktop table shows expandable product list for multi-product sales using details/summary
    - Mobile cards show individual product items when expanded
    - Edit venda query fetches full item details including custoProduto and valorVenda
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Create multi-product editor for historico edit form</name>
  <files>src/components/edit-venda-itens-client.tsx, src/app/(app)/historico/page.tsx</files>
  <action>
**Create `src/components/edit-venda-itens-client.tsx`:**

A "use client" component that manages a list of product items for editing a sale. It reuses `ProdutoItemForm` (already used in VendaRapidaFormV2) for consistency.

Props:
```typescript
interface Props {
  initialItens: {
    id: string;
    produtoNome: string;
    custoProduto: number;
    valorVenda: number;
    quantidade: number;
    subtotal: number;
  }[];
}
```

The component:
- Renders a list of `ProdutoItemForm` components (one per item)
- Has an "Adicionar" button to add a new empty product row
- Supports removing items (if more than 1)
- Shows a subtotal line at the bottom
- Serializes the filtered (non-empty) items into a hidden `<input type="hidden" name="itensJson">` as JSON so the native `<form action={updateVenda}>` can submit them
- The hidden input value should be `JSON.stringify(itensForSubmit)` where itensForSubmit filters out items with empty produtoNome and maps to `{ produtoNome, custoProduto, valorVenda, quantidade, subtotal }`

Layout: The component should span `md:col-span-3` to take the full width of the edit form grid.

**Update `src/app/(app)/historico/page.tsx` edit form:**

1. Import `EditVendaItens`:
   ```typescript
   import { EditVendaItens } from "@/components/edit-venda-itens-client";
   ```

2. In the edit form (inside `EditVendaSheetWrapper`), REPLACE the three single-product fields:
   - Remove: `<Input name="produto">` field and its label (Produto)
   - Remove: `<Input name="quantidade">` field and its label (Quantidade)
   - Remove: `<Input name="valor">` field and its label (Valor Unitario)
   - Remove: `<input type="hidden" name="custo_prod">` hidden field

   Replace with:
   ```tsx
   <EditVendaItens
     initialItens={
       editVenda.itens && editVenda.itens.length > 0
         ? editVenda.itens.map((i) => ({
             id: crypto.randomUUID(),
             produtoNome: i.produtoNome,
             custoProduto: i.custoProduto,
             valorVenda: i.valorVenda,
             quantidade: i.quantidade,
             subtotal: i.subtotal,
           }))
         : [{
             id: crypto.randomUUID(),
             produtoNome: editVenda.produtoNome || "",
             custoProduto: editVenda.custoProduto || 0,
             valorVenda: editVenda.valorVenda || 0,
             quantidade: editVenda.quantidade || 1,
             subtotal: (editVenda.valorVenda || 0) * (editVenda.quantidade || 1),
           }]
     }
   />
   ```

   NOTE: `crypto.randomUUID()` is NOT available in Server Components. Since the edit form renders server-side, generate UUIDs using a simple counter or pass the DB `id` as a string. Use `String(i.id)` for existing items and `"new-0"` for the legacy fallback. OR better: use `Math.random().toString(36).slice(2)` which works in both contexts. Actually, the `EditVendaItens` component itself is a client component, so the `initialItens` will be serialized as JSON props. Use `String(i.id || Math.random())` in the server-side prop construction, since the `id` field is only used as a React key inside the client component.

   Corrected approach -- in the server-side page.tsx, pass initialItens without the `id` field, and let the client component assign IDs:

   ```tsx
   <EditVendaItens
     initialItens={
       editVenda.itens && editVenda.itens.length > 0
         ? editVenda.itens.map((i) => ({
             produtoNome: i.produtoNome,
             custoProduto: i.custoProduto,
             valorVenda: i.valorVenda,
             quantidade: i.quantidade,
             subtotal: i.subtotal,
           }))
         : [{
             produtoNome: editVenda.produtoNome || "",
             custoProduto: editVenda.custoProduto || 0,
             valorVenda: editVenda.valorVenda || 0,
             quantidade: editVenda.quantidade || 1,
             subtotal: (editVenda.valorVenda || 0) * (editVenda.quantidade || 1),
           }]
     }
   />
   ```

   And update the Props interface in `edit-venda-itens-client.tsx` to accept items without `id`, then add `id: crypto.randomUUID()` inside the useState initializer.

3. Update the `updateVenda` server action to handle the new `itensJson` field. After the existing `prisma.venda.update()` call, add:

   ```typescript
   // Handle itens (multi-product)
   const itensRaw = formData.get("itensJson");
   if (itensRaw) {
     try {
       const itensData = JSON.parse(String(itensRaw)) as {
         produtoNome: string;
         custoProduto: number;
         valorVenda: number;
         quantidade: number;
         subtotal: number;
       }[];
       if (Array.isArray(itensData) && itensData.length > 0) {
         // Delete existing items and recreate
         await prisma.itemVenda.deleteMany({ where: { vendaId: id } });
         await prisma.itemVenda.createMany({
           data: itensData.map((item) => ({
             vendaId: id,
             produtoNome: item.produtoNome,
             custoProduto: item.custoProduto,
             valorVenda: item.valorVenda,
             quantidade: item.quantidade,
             subtotal: item.subtotal,
           })),
         });

         // Update legacy fields for backward compatibility
         await prisma.venda.update({
           where: { id },
           data: {
             produtoNome: itensData[0]?.produtoNome || "",
             custoProduto: itensData[0]?.custoProduto || 0,
             quantidade: itensData[0]?.quantidade || 1,
             valorVenda: itensData[0]?.valorVenda || 0,
           },
         });

         // Recalculate lucro from itens
         const subtotalItens = itensData.reduce((s, i) => s + i.subtotal, 0);
         const custoItens = itensData.reduce((s, i) => s + i.custoProduto * i.quantidade, 0);
         const totalComFrete = subtotalItens + frete;
         const valorDescontoNotaItens = temNota ? (subtotalItens * taxaNota) / 100 : 0;
         const lucroRecalc = totalComFrete - (custoItens + envio + valorDescontoNotaItens);
         await prisma.venda.update({
           where: { id },
           data: { lucroLiquido: lucroRecalc },
         });
       }
     } catch {
       // Fallback: itens not provided, legacy single-product update already done above
     }
   }
   ```

   Note: The existing single-product update in `updateVenda` (using `valor`, `quantidade`, `custo_prod` form fields) can remain as a fallback for old forms, but the new `itensJson` takes precedence when present. Since we removed the old fields from the form, the old single-product path will only fire for vendas without itensJson (which shouldn't happen with the new form, but is safe as fallback).
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -50</automated>
  </verify>
  <done>
    - New EditVendaItens client component exists at src/components/edit-venda-itens-client.tsx
    - Component reuses ProdutoItemForm for consistency with PDV
    - Edit form in historico uses EditVendaItens instead of single-product fields
    - updateVenda server action parses itensJson, deletes old items, creates new ones, updates legacy fields
    - Lucro is recalculated from itens data when itensJson is provided
    - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Navigate to /historico -- sales with multiple items show expandable product details in desktop table
3. Navigate to /historico on mobile -- expanded cards show individual product items
4. Click "Editar" on a sale -- the edit form shows the product items list with ProdutoItemForm components
5. Add a new product item, remove an existing one, change quantity -- save and verify items persisted in database
6. Legacy sales (no ItemVenda records) still display correctly with fallback to produtoNome/quantidade fields
</verification>

<success_criteria>
- Historico table displays individual products per sale (expandable for multi-product sales)
- Historico mobile cards display individual products in expanded view
- Edit form supports adding/removing/editing multiple products per sale
- Saving edit correctly persists ItemVenda records to database
- Legacy single-product sales remain backward compatible
</success_criteria>

<output>
After completion, create `.planning/quick/260318-ehq-hist-rico-de-venda-op-o-de-adi-o-de-prod/260318-ehq-SUMMARY.md`
</output>
