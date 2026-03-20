---
phase: quick-260320-lwq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/produtos-tab-client.tsx
  - src/lib/ai-actions.ts
  - src/lib/ai.ts
  - prisma/schema.prisma
autonomous: true
requirements: [SEARCH-UX, MARCA-UPPER, FORNECEDOR-FIX, LITELLM-THINKING]

must_haves:
  truths:
    - "Produtos search filters live as user types (debounced 300ms)"
    - "Clear button appears when search has value and clears it on click"
    - "Empty state shows helpful message when no products match"
    - "Loading spinner shows on Search icon while debounce is pending"
    - "AI criar_produto and atualizar_produto normalize marca to UPPERCASE"
    - "AI atualizar_produto can update fornecedorId"
    - "LiteLLM passes enable_thinking when config flag is true"
  artifacts:
    - path: "src/components/produtos-tab-client.tsx"
      provides: "Live debounced search with clear button and empty state"
    - path: "src/lib/ai-actions.ts"
      provides: "marca toUpperCase + fornecedorId in atualizar_produto"
    - path: "src/lib/ai.ts"
      provides: "providerOptions with enable_thinking for LiteLLM"
    - path: "prisma/schema.prisma"
      provides: "litellmEnableThinking field on Config model"
  key_links:
    - from: "src/components/produtos-tab-client.tsx"
      to: "router.push with search params"
      via: "onChange debounce -> startTransition -> router.push"
      pattern: "router\\.push.*q_produtos"
    - from: "src/lib/ai.ts"
      to: "LiteLLM provider"
      via: "providerOptions.openai.body.chat_template_kwargs"
      pattern: "enable_thinking"
---

<objective>
Four targeted fixes: (1) live debounced search with clear/empty state in produtos tab, (2) marca UPPERCASE normalization in AI actions, (3) fix fornecedorId missing from atualizar_produto, (4) enable_thinking support for LiteLLM.

Purpose: Improve search UX, data consistency, and AI provider compatibility.
Output: Updated components, AI actions, AI provider config, and schema migration.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/produtos-tab-client.tsx
@src/lib/ai-actions.ts
@src/lib/ai.ts
@prisma/schema.prisma

<interfaces>
From src/components/produtos-tab-client.tsx (current search - lines 156-165):
```tsx
<form className="relative w-full max-w-sm">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input name="q_produtos" placeholder="Pesquisar produtos..." defaultValue={searchQuery} className="pl-9 h-9" />
  <input type="hidden" name="tab" value="produtos" />
</form>
```

From src/lib/ai-actions.ts - Zod helpers (lines 29-42):
```typescript
const optionalNumber = () => toOptional(z.coerce.number().refine(Number.isFinite));
const optionalString = () => toOptional(z.string().min(1));
```

From src/lib/ai-actions.ts - atualizar_produto Zod schema (lines 224-231):
```typescript
atualizar_produto: z.object({
  id: requiredNumber(),
  custoPadrao: optionalNumber(),
  valorVenda: optionalNumber(),
  marca: optionalString(),
  categoria: optionalString(),
  qtdEstoque: optionalNumber(),
  // NOTE: fornecedorId is MISSING here — that's the bug
}),
```

From src/lib/ai-actions.ts - atualizar_produto case (lines 1312-1328):
```typescript
case "atualizar_produto": {
  requireAdmin(ctx);
  const { id, ...data } = parsedParams;
  // NOTE: fornecedorId not spread into update data — also missing
  const updatedProduto = await prisma.produto.update({
    where: { id },
    data: {
      ...(data.custoPadrao !== undefined && { custoPadrao: data.custoPadrao }),
      ...(data.valorVenda !== undefined && { valorVenda: data.valorVenda }),
      ...(data.marca !== undefined && { marca: data.marca }),
      ...(data.categoria !== undefined && { categoria: data.categoria }),
      ...(data.qtdEstoque !== undefined && { qtdEstoque: data.qtdEstoque }),
    },
  });
```

From src/lib/ai-actions.ts - atualizar_produto tool params (lines 719-730):
```typescript
parameters: {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "number", description: "ID do produto" },
    custoPadrao: { type: "number" },
    valorVenda: { type: "number" },
    marca: { type: "string" },
    categoria: { type: "string" },
    qtdEstoque: { type: "number", description: "Quantidade absoluta em estoque" },
    // NOTE: fornecedorId missing from tool params too
  },
},
```

From prisma/schema.prisma - Config model (lines 137-167):
```prisma
model Config {
  ...
  litellmUrl    String? @map("litellm_url")
  litellmKey    String? @map("litellm_key")
  litellmModel  String? @map("litellm_model")
  // NOTE: no litellmEnableThinking field exists yet
  @@map("config")
}
```

From src/lib/ai.ts - LiteLLM generateText call (lines 288-298):
```typescript
const result = await generateText({
  model: litellmModel,
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...(ctx.history ?? []),
    { role: "user", content: prompt },
  ],
  tools,
  stopWhen: stepCountIs(5),
});
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Live debounced search with clear button and empty state in produtos tab</name>
  <files>src/components/produtos-tab-client.tsx</files>
  <action>
Replace the `<form>` search block (lines 156-165) with a controlled Input using live debounced search.

1. Add imports: `useCallback, useEffect, useRef` from react; `Loader2, X` from lucide-react (alongside existing Search, Pencil, Trash2).

2. Add state and refs after existing state declarations:
   ```
   const [searchValue, setSearchValue] = useState(searchQuery ?? "");
   const [isSearching, setIsSearching] = useState(false);
   const debounceRef = useRef<NodeJS.Timeout | null>(null);
   ```

3. Add a `handleSearchChange` callback:
   - Takes the input's `e.target.value`
   - Sets `searchValue` state
   - Clears existing debounceRef timeout
   - If value is empty, immediately push with q_produtos removed and return
   - Sets `isSearching(true)`
   - Sets new 300ms timeout that:
     - Builds new URLSearchParams from current searchParams
     - Sets `q_produtos` to trimmed value (or deletes if empty)
     - Ensures `tab=produtos` is set
     - Calls `startTransition(() => router.push(pathname + "?" + params.toString()))`
     - Sets `isSearching(false)`

4. Add `useEffect` cleanup to clear debounceRef on unmount.

5. Add `useEffect` that syncs `searchQuery` prop to `searchValue` state and sets `isSearching(false)` — this handles when the server responds with new data after navigation:
   ```
   useEffect(() => { setSearchValue(searchQuery ?? ""); setIsSearching(false); }, [searchQuery]);
   ```

6. Replace the `<form>` block with a `<div>` (no form submission needed):
   ```tsx
   <div className="relative w-full max-w-sm">
     {isSearching ? (
       <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
     ) : (
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
     )}
     <Input
       placeholder="Pesquisar produtos..."
       value={searchValue}
       onChange={handleSearchChange}
       className={cn("pl-9 h-9", searchValue && "pr-8")}
     />
     {searchValue && (
       <button
         type="button"
         onClick={() => { setSearchValue(""); handleSearchChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>); }}
         className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sm text-muted-foreground hover:text-foreground"
       >
         <X className="h-4 w-4" />
       </button>
     )}
   </div>
   ```
   NOTE: For the clear button, instead of faking an event, create a separate `clearSearch` function that sets `searchValue("")`, clears debounce, removes `q_produtos` from params, and pushes.

7. Update the empty state row (line 221-226). Change the message to be context-aware:
   ```tsx
   {produtos.length === 0 ? (
     <TableRow>
       <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
         {searchQuery ? (
           <div className="space-y-1">
             <p>Nenhum produto encontrado para &quot;{searchQuery}&quot;</p>
             <p className="text-xs">Tente outro termo ou limpe a busca.</p>
           </div>
         ) : (
           "Sem produtos cadastrados."
         )}
       </TableCell>
     </TableRow>
   ) : ( ... )}
   ```
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/components/produtos-tab-client.tsx 2>&1 | head -30</automated>
  </verify>
  <done>
  - Typing in search input triggers debounced (300ms) URL update with q_produtos param
  - Loader2 spinner replaces Search icon while debounce is pending
  - X clear button appears when input has value, clears search on click
  - Empty state shows "Nenhum produto encontrado para [query]" with hint when searching, or "Sem produtos cadastrados." when no search
  </done>
</task>

<task type="auto">
  <name>Task 2: Marca UPPERCASE + fix fornecedorId in atualizar_produto</name>
  <files>src/lib/ai-actions.ts</files>
  <action>
Three changes in ai-actions.ts:

**A. Marca UPPERCASE normalization (2 locations):**

1. In `case "criar_produto"` (line 854-857), add normalization before Prisma call:
   ```typescript
   case "criar_produto":
     requireAdmin(ctx);
     if (parsedParams.marca) parsedParams.marca = parsedParams.marca.toUpperCase();
     result = await prisma.produto.create({ data: parsedParams });
     break;
   ```

2. In `case "atualizar_produto"` (line 1312+), add normalization before the update:
   ```typescript
   case "atualizar_produto": {
     requireAdmin(ctx);
     const { id, ...data } = parsedParams;
     if (data.marca) data.marca = data.marca.toUpperCase();
   ```

**B. Fix fornecedorId in atualizar_produto (3 locations):**

1. Add `fornecedorId` to the Zod schema for `atualizar_produto` (line 224-231):
   ```typescript
   atualizar_produto: z.object({
     id: requiredNumber(),
     custoPadrao: optionalNumber(),
     valorVenda: optionalNumber(),
     marca: optionalString(),
     categoria: optionalString(),
     qtdEstoque: optionalNumber(),
     fornecedorId: optionalNumber(),   // ADD THIS LINE
   }),
   ```

2. Add `fornecedorId` to the tool parameters object for `atualizar_produto` (around line 722-729):
   ```typescript
   properties: {
     id: { type: "number", description: "ID do produto" },
     custoPadrao: { type: "number" },
     valorVenda: { type: "number" },
     marca: { type: "string" },
     categoria: { type: "string" },
     qtdEstoque: { type: "number", description: "Quantidade absoluta em estoque" },
     fornecedorId: { type: "number", description: "ID do fornecedor. Use listar_fornecedores para resolver." },  // ADD
   },
   ```

3. Add `fornecedorId` to the Prisma update data spread (around line 1322-1328):
   ```typescript
   data: {
     ...(data.custoPadrao !== undefined && { custoPadrao: data.custoPadrao }),
     ...(data.valorVenda !== undefined && { valorVenda: data.valorVenda }),
     ...(data.marca !== undefined && { marca: data.marca }),
     ...(data.categoria !== undefined && { categoria: data.categoria }),
     ...(data.qtdEstoque !== undefined && { qtdEstoque: data.qtdEstoque }),
     ...(data.fornecedorId !== undefined && { fornecedorId: data.fornecedorId }),  // ADD
   },
   ```
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit src/lib/ai-actions.ts 2>&1 | head -30</automated>
  </verify>
  <done>
  - criar_produto and atualizar_produto normalize marca to UPPERCASE before Prisma call
  - atualizar_produto Zod schema, tool params, and Prisma update all include fornecedorId
  </done>
</task>

<task type="auto">
  <name>Task 3: Add litellmEnableThinking to Config + pass providerOptions in ai.ts</name>
  <files>prisma/schema.prisma, src/lib/ai.ts</files>
  <action>
**A. Schema change (prisma/schema.prisma):**

Add field to Config model, right after `litellmModel` line (line 164):
```prisma
litellmEnableThinking Boolean? @default(false) @map("litellm_enable_thinking")
```

Then run migration:
```bash
cd /tmp/sitema-bfx && npx prisma db push --accept-data-loss 2>&1
```
(Use `db push` not `migrate` since this is a dev branch with SQLite. If db push fails, try `npx prisma migrate dev --name add-litellm-enable-thinking`.)

Also regenerate Prisma client:
```bash
npx prisma generate
```

**B. ai.ts changes:**

In the `runAiWithActions` function, LiteLLM branch (starts around line 263):

After building `litellmModel` (line 269), add providerOptions logic. Modify the `generateText` call (lines 289-298) to conditionally include `providerOptions`:

```typescript
const litellmProviderOptions = cfg.litellmEnableThinking
  ? { openai: { body: { chat_template_kwargs: { enable_thinking: true } } } }
  : undefined;
```

Then in the `generateText` call, add:
```typescript
const result = await generateText({
  model: litellmModel,
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...(ctx.history ?? []),
    { role: "user", content: prompt },
  ],
  tools,
  stopWhen: stepCountIs(5),
  ...(litellmProviderOptions && { providerOptions: litellmProviderOptions }),
});
```

Also apply the same to the simple `runAi` function's litellm branch (lines 41-49):
```typescript
const litellmProviderOptions = cfg.litellmEnableThinking
  ? { openai: { body: { chat_template_kwargs: { enable_thinking: true } } } }
  : undefined;
const { text } = await generateText({
  model: litellm.chat(cfg.litellmModel || "gpt-4o"),
  prompt,
  ...(litellmProviderOptions && { providerOptions: litellmProviderOptions }),
});
```
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx prisma generate 2>&1 | tail -5 && npx tsc --noEmit src/lib/ai.ts 2>&1 | head -30</automated>
  </verify>
  <done>
  - Config model has litellmEnableThinking Boolean field
  - Prisma client regenerated with new field
  - Both runAi and runAiWithActions pass providerOptions with enable_thinking when cfg.litellmEnableThinking is true
  - No providerOptions passed when flag is false/null (backward compatible)
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Prisma schema valid: `npx prisma validate`
3. Build check: `npx next build` (or at minimum `npx tsc --noEmit`)
</verification>

<success_criteria>
- Live debounced search works in produtos tab with 300ms delay
- Clear (X) button visible when search has value, clears on click
- Empty state distinguishes between "no products" and "no search results"
- Spinner shows on search icon during debounce
- AI marca field always saved UPPERCASE for criar_produto and atualizar_produto
- AI atualizar_produto can now update fornecedorId
- LiteLLM enable_thinking passed via providerOptions when config flag is true
</success_criteria>

<output>
After completion, create `.planning/quick/260320-lwq-search-produtos-live-debounce-clear-empt/260320-lwq-SUMMARY.md`
</output>
