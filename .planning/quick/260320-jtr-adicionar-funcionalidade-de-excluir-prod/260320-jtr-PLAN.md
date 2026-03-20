---
phase: quick-260320-jtr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/cadastros/page.tsx
  - src/components/produtos-tab-client.tsx
autonomous: true
requirements: [DELETE-PRODUTO]

must_haves:
  truths:
    - "User sees a Trash2 delete button inline in each product row"
    - "Clicking delete opens an AlertDialog confirmation before proceeding"
    - "Confirming deletion removes the product and refreshes the list"
    - "Product linked to sales by name only (no FK) — deletion is always safe"
  artifacts:
    - path: "src/app/(app)/cadastros/page.tsx"
      provides: "deleteProduto server action"
      contains: "prisma.produto.delete"
    - path: "src/components/produtos-tab-client.tsx"
      provides: "Trash2 button + AlertDialog confirm UI"
      contains: "AlertDialog"
  key_links:
    - from: "src/components/produtos-tab-client.tsx"
      to: "src/app/(app)/cadastros/page.tsx"
      via: "onDeleteAction prop (FormData with id)"
      pattern: "onDeleteAction"
---

<objective>
Add delete product functionality to the Cadastros page products tab.

Purpose: Users need to remove products that are no longer sold. Currently only create/edit exists.
Output: Inline Trash2 button per product row, AlertDialog confirmation, server action that deletes and audits.
</objective>

<context>
@src/app/(app)/cadastros/page.tsx
@src/components/produtos-tab-client.tsx
@src/components/ui/alert-dialog.tsx
</context>

<interfaces>
<!-- Existing contracts the executor needs -->

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
  // ADD: onDeleteAction: (formData: FormData) => Promise<void>;
}
```

From src/components/ui/alert-dialog.tsx:
```typescript
export {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
}
```

Schema note: Produto model has NO reverse FK from ItemVenda. ItemVenda stores
`produtoNome` as denormalized string. Deletion is safe — no cascade issues.
Produto has `@@unique([nome, fornecedorId])` constraint.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add deleteProduto server action and wire prop</name>
  <files>src/app/(app)/cadastros/page.tsx</files>
  <action>
1. Add a new server action `deleteProduto` in page.tsx following the exact pattern of `addProduto`/`updateProduto`:
   ```
   async function deleteProduto(formData: FormData) {
     "use server";
     const id = Number(formData.get("id") || 0);
     if (!id) return;
     const produto = await prisma.produto.findUnique({ where: { id }, select: { nome: true } });
     if (!produto) return;
     await prisma.produto.delete({ where: { id } });
     await createAuditLog("produto:delete", { produtoId: id, nome: produto.nome });
     revalidatePath("/cadastros");
   }
   ```
2. Pass `onDeleteAction={deleteProduto}` as a new prop to the `ProdutosTabClient` component (around line 516 where it's rendered). Add it after `onUpdateAction={updateProduto}`.

Note: No try/catch needed for FK errors because ItemVenda does NOT have a FK to Produto (it stores produtoNome as a plain string). If the unique constraint `@@unique([nome, fornecedorId])` causes issues on delete, Prisma will throw P2025 (record not found) which is fine — it means already deleted.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Server action `deleteProduto` exists, audits the deletion, revalidates path, and is passed as prop to ProdutosTabClient. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Add Trash2 button with AlertDialog confirmation in products table</name>
  <files>src/components/produtos-tab-client.tsx</files>
  <action>
1. Update the `Props` interface to add `onDeleteAction: (formData: FormData) => Promise<void>;` and destructure it in the component params.

2. Add imports at the top:
   - `Trash2` from `lucide-react` (add to existing Pencil import)
   - `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` from `@/components/ui/alert-dialog`

3. Add state for delete loading and tracking which product to delete:
   ```
   const [deleting, setDeleting] = useState<number | null>(null);
   ```

4. In the table row map (around line 165, the TableCell with the Pencil button), add a Trash2 button BEFORE the existing Pencil Button. Wrap the Trash2 in an AlertDialog:
   ```tsx
   <AlertDialog>
     <AlertDialogTrigger asChild>
       <Button
         type="button"
         variant="ghost"
         className="h-8 px-2 text-muted-foreground hover:text-destructive"
         title="Excluir"
       >
         <Trash2 className="h-4 w-4" />
       </Button>
     </AlertDialogTrigger>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Excluir produto</AlertDialogTitle>
         <AlertDialogDescription>
           Tem certeza que deseja excluir &quot;{p.nome}&quot;? Esta acao nao pode ser desfeita.
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancelar</AlertDialogCancel>
         <AlertDialogAction
           className="bg-destructive text-white hover:bg-destructive/90"
           disabled={deleting === p.id}
           onClick={async () => {
             setDeleting(p.id);
             try {
               const fd = new FormData();
               fd.append("id", String(p.id));
               await onDeleteAction(fd);
               startTransition(() => { router.refresh(); });
             } finally {
               setDeleting(null);
             }
           }}
         >
           {deleting === p.id ? "Excluindo..." : "Excluir"}
         </AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

5. Update the last TableCell to contain both buttons side by side. Use `flex items-center` to keep them aligned:
   ```tsx
   <TableCell>
     <div className="flex items-center gap-1">
       {/* AlertDialog with Trash2 here */}
       {/* Existing Pencil Button here */}
     </div>
   </TableCell>
   ```

6. The TableHead for the last column (w-[80px]) should be widened to w-[100px] to fit both buttons.

IMPORTANT: Use `&quot;` for quotes inside JSX attribute strings to avoid build issues. Or use template literals. Do NOT use escaped quotes with backslash in JSX text content — use the HTML entity or curly braces with JS string.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Each product row shows a Trash2 icon button. Clicking it opens an AlertDialog asking for confirmation. Confirming calls onDeleteAction with the product ID in FormData, shows "Excluindo..." while in progress, and refreshes the table on success. TypeScript compiles clean.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with no errors
2. Visual: products table shows both Trash2 and Pencil icons per row
3. Clicking Trash2 opens confirmation dialog with product name
4. Confirming deletes the product and it disappears from the list
5. Audit log entry created for produto:delete
</verification>

<success_criteria>
- Delete button (Trash2) visible inline in every product row
- AlertDialog confirmation prevents accidental deletion
- Server action deletes product, creates audit log, revalidates page
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/260320-jtr-adicionar-funcionalidade-de-excluir-prod/260320-jtr-SUMMARY.md`
</output>
