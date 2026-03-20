---
phase: quick-260320-lmt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/cadastros/page.tsx
  - src/components/produtos-tab-client.tsx
  - src/components/clientes-tab-client.tsx
  - src/components/fornecedores-tab-client.tsx
  - src/components/empresas-tab-client.tsx
autonomous: true
requirements: [BULK-DELETE-01]

must_haves:
  truths:
    - "User can select multiple rows via checkboxes in each tab (clientes, produtos, fornecedores, empresas)"
    - "User sees a bulk delete button with count when 1+ rows are selected"
    - "User can select/deselect all rows via header checkbox"
    - "Bulk delete shows AlertDialog confirmation before executing"
    - "After bulk delete, selection is cleared and data refreshes"
  artifacts:
    - path: "src/app/(app)/cadastros/page.tsx"
      provides: "Bulk delete server actions (bulkDeleteClientes, bulkDeleteProdutos, bulkDeleteFornecedores, bulkDeleteEmpresas) + client component wiring"
      contains: "bulkDelete"
    - path: "src/components/produtos-tab-client.tsx"
      provides: "Checkbox selection + bulk delete UI for produtos"
      contains: "selectedIds"
    - path: "src/components/clientes-tab-client.tsx"
      provides: "Client component for clientes tab with checkbox selection + bulk delete"
      contains: "selectedIds"
    - path: "src/components/fornecedores-tab-client.tsx"
      provides: "Client component for fornecedores tab with checkbox selection + bulk delete"
      contains: "selectedIds"
    - path: "src/components/empresas-tab-client.tsx"
      provides: "Client component for empresas tab with checkbox selection + bulk delete"
      contains: "selectedIds"
  key_links:
    - from: "src/components/clientes-tab-client.tsx"
      to: "src/app/(app)/cadastros/page.tsx"
      via: "onBulkDeleteAction prop calling bulkDeleteClientes server action"
      pattern: "onBulkDeleteAction"
    - from: "src/components/produtos-tab-client.tsx"
      to: "src/app/(app)/cadastros/page.tsx"
      via: "onBulkDeleteAction prop calling bulkDeleteProdutos server action"
      pattern: "onBulkDeleteAction"
---

<objective>
Add bulk delete functionality to all tabs in the cadastros page (clientes, produtos, fornecedores, empresas).

Purpose: Allow users to select multiple rows and delete them at once instead of one-by-one, improving efficiency for bulk data management.
Output: Checkbox selection on all table rows, select-all header checkbox, bulk delete button with count, confirmation dialog, and server actions for batch deletion.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(app)/cadastros/page.tsx
@src/components/produtos-tab-client.tsx
@src/components/ui/checkbox.tsx
@src/components/ui/alert-dialog.tsx

<interfaces>
<!-- Existing Checkbox component from shadcn/ui -->
From src/components/ui/checkbox.tsx:
```typescript
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
export { Checkbox }
// Props: checked, onCheckedChange, className, etc. (Radix UI CheckboxPrimitive.Root)
```

From src/components/ui/alert-dialog.tsx:
```typescript
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger }
```

From src/components/produtos-tab-client.tsx:
```typescript
interface Props {
  produtos: ProdutoListItem[];
  fornecedores: { id: number; nome: string }[];
  categoriasExistentes?: string[];
  searchQuery?: string;
  initialProduto?: ProdutoEdit | null;
  onCreateAction: (formData: FormData) => Promise<void>;
  onUpdateAction: (formData: FormData) => Promise<void>;
  onDeleteAction: (formData: FormData) => Promise<void>;
}
```

From page.tsx server actions pattern:
```typescript
async function deleteProduto(formData: FormData) {
  "use server";
  const id = Number(formData.get("id") || 0);
  if (!id) return;
  // ... prisma.produto.delete + createAuditLog + revalidatePath
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add bulk delete server actions + extract clientes/fornecedores/empresas into client components</name>
  <files>src/app/(app)/cadastros/page.tsx, src/components/clientes-tab-client.tsx, src/components/fornecedores-tab-client.tsx, src/components/empresas-tab-client.tsx</files>
  <action>
**1. Add 4 bulk delete server actions to `page.tsx`** following the existing `deleteProduto` pattern:

```typescript
async function bulkDeleteProdutos(ids: number[]) {
  "use server";
  if (!ids.length) return;
  const produtos = await prisma.produto.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } });
  await prisma.produto.deleteMany({ where: { id: { in: ids } } });
  for (const p of produtos) {
    await createAuditLog("produto:delete", { produtoId: p.id, nome: p.nome });
  }
  revalidatePath("/cadastros");
}
```

Similarly create `bulkDeleteClientes`, `bulkDeleteFornecedores`, `bulkDeleteEmpresas` using the same pattern with appropriate model names and audit log event names (e.g., "cliente:delete", "fornecedor:delete", "empresa:delete").

**2. Create `src/components/clientes-tab-client.tsx`** — a "use client" component that:
- Receives props: `clientes` (array with id, nome, cpf, cnpj, renda, empresa, matricula, telefone, cep, tipo), `buildUrl` function (or just the relevant URL params), `onBulkDeleteAction: (ids: number[]) => Promise<void>`, `errorMsg`, `editClienteData`, `searchQuery` (`q_clientes`), and the `addCliente`/`updateCliente` server actions.
- Renders the existing clientes table (move the Table JSX from page.tsx into this component).
- Adds checkbox selection state: `const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())`.
- Adds a Checkbox in each TableRow and a "select all" Checkbox in the TableHeader.
- Shows a bulk delete bar above the table when selectedIds.size > 0: a flex row with text "N selecionado(s)" and a red "Excluir selecionados" button.
- The bulk delete button opens an AlertDialog confirming "Excluir N clientes?" with destructive action calling onBulkDeleteAction.
- After successful bulk delete, clear selectedIds and call `router.refresh()`.
- Keep the existing Pencil edit link and inline forms (add + edit) as they are.

**3. Create `src/components/fornecedores-tab-client.tsx`** — same pattern as clientes but simpler (fewer columns: nome, telefone). Props: `fornecedores`, `onBulkDeleteAction`, `searchQuery`, `editFornecedorData`, `addFornecedor`/`updateFornecedor` actions, `buildUrl`.

**4. Create `src/components/empresas-tab-client.tsx`** — same pattern. Props: `empresas`, `onBulkDeleteAction`, `searchQuery`, `editEmpresaData`, `addEmpresa`/`updateEmpresa` actions, `buildUrl`.

**5. Update page.tsx** to use the new client components instead of inline JSX for clientes/fornecedores/empresas tabs. Pass the bulk delete server actions and existing add/update actions as props. The forms for adding/editing can stay inside the client components (they accept server actions as props).

IMPORTANT: For the `buildUrl` helper — since it uses server-side `searchParams`, pass the constructed URLs or the search params to the client components so they can build edit links. Simplest approach: pass the current search params as a plain object and reconstruct buildUrl client-side using `useSearchParams` + `usePathname`.

IMPORTANT: Do NOT create the forms from scratch — move the existing JSX from page.tsx into the client components. The forms use server actions passed as props, which works fine in Next.js 15 (server actions can be passed to client components as props).

IMPORTANT: Remember from CLAUDE.md — hook blocks `RegExp exec` pattern. Use `.split()` + regex instead if any regex matching is needed.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -40</automated>
  </verify>
  <done>
  - 4 bulk delete server actions exist in page.tsx (bulkDeleteProdutos, bulkDeleteClientes, bulkDeleteFornecedores, bulkDeleteEmpresas)
  - 3 new client components exist (clientes-tab-client, fornecedores-tab-client, empresas-tab-client)
  - page.tsx uses client components for all 4 tabs
  - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add checkbox bulk selection UI to ProdutosTabClient and verify all tabs</name>
  <files>src/components/produtos-tab-client.tsx</files>
  <action>
**1. Update `ProdutosTabClient` to support bulk delete:**

- Add `onBulkDeleteAction: (ids: number[]) => Promise<void>` to Props interface.
- Add state: `const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())`.
- Add state: `const [bulkDeleting, setBulkDeleting] = useState(false)`.
- Add a Checkbox column as the FIRST column in the table:
  - Header: `<Checkbox checked={produtos.length > 0 && selectedIds.size === produtos.length} onCheckedChange={(checked) => { if (checked) setSelectedIds(new Set(produtos.map(p => p.id))); else setSelectedIds(new Set()); }} />` (use indeterminate state when some but not all selected: `checked={selectedIds.size === produtos.length ? true : selectedIds.size > 0 ? "indeterminate" : false}`)
  - Each row: `<Checkbox checked={selectedIds.has(p.id)} onCheckedChange={(checked) => { const next = new Set(selectedIds); if (checked) next.add(p.id); else next.delete(p.id); setSelectedIds(next); }} />`
- Add the `<TableHead className="w-[40px]">` for the checkbox column (first column).
- Update the empty state colSpan from 7 to 8.
- Add bulk delete bar between the search form and the table, shown only when `selectedIds.size > 0`:
  ```tsx
  {selectedIds.size > 0 && (
    <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 mb-2">
      <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={bulkDeleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            Excluir selecionados
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} produto(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} produto(s)? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={bulkDeleting}
              onClick={async () => {
                setBulkDeleting(true);
                try {
                  await onBulkDeleteAction(Array.from(selectedIds));
                  setSelectedIds(new Set());
                  startTransition(() => { router.refresh(); });
                } finally {
                  setBulkDeleting(false);
                }
              }}
            >
              {bulkDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
        Limpar selecao
      </Button>
    </div>
  )}
  ```

**2. Update page.tsx** to pass `onBulkDeleteAction={bulkDeleteProdutos}` to `ProdutosTabClient`. Note: since `bulkDeleteProdutos` accepts `number[]` not `FormData`, pass it directly.

**3. Verify the same pattern is consistent across all 4 tab client components** (clientes, fornecedores, empresas from Task 1, and produtos from this task). All should have:
  - Checkbox first column with select-all in header (indeterminate state)
  - Bulk delete bar with count + AlertDialog
  - Clear selection after delete
  - `router.refresh()` after successful deletion
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -40 && echo "---" && grep -c "selectedIds" src/components/produtos-tab-client.tsx src/components/clientes-tab-client.tsx src/components/fornecedores-tab-client.tsx src/components/empresas-tab-client.tsx</automated>
  </verify>
  <done>
  - All 4 tabs have checkbox selection with select-all in header
  - Bulk delete bar appears when 1+ rows selected showing count
  - AlertDialog confirmation before bulk delete
  - Selection clears and data refreshes after deletion
  - TypeScript compiles without errors
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. All 4 bulk delete server actions exist in page.tsx (grep for "bulkDelete")
3. All 4 client components have selectedIds state (grep for "selectedIds")
4. All 4 client components have AlertDialog for bulk delete confirmation
5. All 4 client components have Checkbox import and usage
</verification>

<success_criteria>
- Checkbox column visible on all 4 tabs (clientes, produtos, fornecedores, empresas)
- Header checkbox toggles select-all / deselect-all with indeterminate state
- Bulk delete bar shows count and "Excluir selecionados" button when rows selected
- Confirmation dialog appears before deletion
- After bulk delete: rows removed, selection cleared, data refreshed via revalidatePath
- Audit logs created for each deleted item
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/260320-lmt-implementar-bulk-delete-na-area-de-cadas/260320-lmt-SUMMARY.md`
</output>
