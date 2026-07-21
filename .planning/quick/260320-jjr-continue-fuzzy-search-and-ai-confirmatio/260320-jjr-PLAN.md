---
phase: quick
plan: 260320-jjr
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/db-search.ts
  - src/app/api/search/route.ts
  - src/lib/ai.ts
autonomous: true
requirements: [fuzzy-search-api, ai-confirmation-flow]

must_haves:
  truths:
    - "UI search endpoint returns fuzzy-matched results for clientes, produtos, and usuarios"
    - "AI resolves FK references (e.g. fornecedor name) before presenting confirmation to user"
    - "AI system prompt instructs model to look up related entities before proposing write actions"
  artifacts:
    - path: "src/lib/db-search.ts"
      provides: "fuzzyFindUsuarios helper"
      contains: "fuzzyFindUsuarios"
    - path: "src/app/api/search/route.ts"
      provides: "Fuzzy search for clientes, produtos, usuarios"
      contains: "fuzzyFind"
    - path: "src/lib/ai.ts"
      provides: "Updated SYSTEM_PROMPT with FK lookup and confirmation instructions"
      contains: "ANTES de propor"
  key_links:
    - from: "src/app/api/search/route.ts"
      to: "src/lib/db-search.ts"
      via: "import fuzzyFindClientes, fuzzyFindProdutos, fuzzyFindUsuarios"
      pattern: "fuzzyFind(Clientes|Produtos|Usuarios)"
    - from: "src/lib/ai.ts"
      to: "SYSTEM_PROMPT"
      via: "AI model receives instructions to resolve FKs before confirmation"
      pattern: "listar_fornecedores|consultar.*antes"
---

<objective>
Complete the fuzzy search migration and AI confirmation flow improvements.

Purpose: (1) Replace remaining `contains` queries in the UI search API with pg_trgm fuzzy search, and (2) update the AI system prompt so the model resolves FK references before proposing write actions to the user.

Output: Updated search route with fuzzy matching; updated AI system prompt with confirmation flow instructions.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/lib/db-search.ts
@src/app/api/search/route.ts
@src/lib/ai.ts
@src/lib/ai-actions.ts

<interfaces>
From src/lib/db-search.ts (existing exports):
```typescript
export async function fuzzyFindClientes(search: string, limit?: number): Promise<Cliente[]>
export async function fuzzyFindProdutos(search: string, limit?: number): Promise<Produto[]>
export async function fuzzyFindFornecedores(search: string, limit?: number): Promise<Fornecedor[]>
export async function fuzzyFindClienteByNome(nome: string): Promise<Cliente | null>
export async function fuzzyFindProdutoByNome(nome: string): Promise<Produto | null>
// Internal: fuzzyIds(table, column, query, limit, threshold?) -> number[]
```

From src/app/api/search/route.ts (current structure):
- GET handler with params: type ("clientes"|"produtos"|"usuarios"), q (search term), limit
- Returns: { options: { value: string, label: string }[] }

From src/lib/ai.ts:
- SYSTEM_PROMPT constant (lines 15-27) — instructions for the AI assistant
- readOnlyActions Set — actions that execute without confirmation
- Write actions go through plan mode (proposed, not executed immediately)

Prisma Usuario model (table "usuarios"):
- nomeExibicao: String? (mapped to "nome_exibicao")
- username: String (unique)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add fuzzyFindUsuarios and migrate search API route to fuzzy</name>
  <files>src/lib/db-search.ts, src/app/api/search/route.ts</files>
  <action>
1. In `src/lib/db-search.ts`, add a new exported function `fuzzyFindUsuarios(search: string, limit = 50)`:
   - Call `fuzzyIds("usuarios", "nome_exibicao", search, limit)` to get IDs by similarity on `nomeExibicao`
   - If no IDs found, fallback: try `fuzzyIds("usuarios", "username", search, limit)` (users without nomeExibicao)
   - Combine unique IDs, then `prisma.usuario.findMany({ where: { id: { in: ids } }, take: limit })`
   - Return the results

2. In `src/app/api/search/route.ts`:
   - Add imports: `import { fuzzyFindClientes, fuzzyFindProdutos } from "@/lib/db-search"` and the new `fuzzyFindUsuarios`
   - Replace the `type === "clientes"` block: call `fuzzyFindClientes(q, limit)` instead of `prisma.cliente.findMany` with `contains`. Map results the same way: `{ value: String(c.id), label: c.nome }`
   - Replace the `type === "produtos"` block: call `fuzzyFindProdutos(q, limit)` instead of `prisma.produto.findMany` with `contains`. Map results the same way: `{ value: p.nome, label: p.nome }`
   - Replace the `type === "usuarios"` block: call `fuzzyFindUsuarios(q, limit)`. Map results: `{ value: String(u.nomeExibicao || u.username), label: String(u.nomeExibicao || u.username) }`
   - Remove the `import { prisma } from "@/lib/db"` line since it will no longer be needed directly (all queries go through db-search helpers)
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>Search API route uses fuzzy helpers for all three entity types; no more `contains` queries in route.ts; fuzzyFindUsuarios exported from db-search.ts</done>
</task>

<task type="auto">
  <name>Task 2: Update AI system prompt for FK resolution and confirmation flow</name>
  <files>src/lib/ai.ts</files>
  <action>
Update the `SYSTEM_PROMPT` constant in `src/lib/ai.ts` to add explicit instructions for the AI's confirmation behavior on write actions. Add the following section AFTER the existing "REGRAS:" block (before the closing backtick of the template literal):

```
FLUXO DE CADASTRO (acoes de escrita):
- ANTES de propor qualquer cadastro (criar_produto, criar_cliente, criar_venda, etc.), resolva TODAS as referencias usando ferramentas de consulta:
  * Se o usuario menciona um fornecedor por nome, use listar_fornecedores para buscar e encontrar o ID correto
  * Se menciona um cliente por nome, use listar_clientes para encontrar o ID
  * Se menciona um produto, use listar_produtos para verificar se ja existe
- Depois de resolver as referencias, apresente um RESUMO COMPLETO do que sera criado, incluindo:
  * Todos os campos que serao preenchidos com seus valores
  * Nomes resolvidos (ex: "Fornecedor: Distribuidora ABC (ID: 42)")
  * Campos opcionais que ficaram vazios
- Pergunte ao usuario: "Confirma o cadastro acima?"
- NAO execute a acao de escrita diretamente — apenas proponha (o sistema cuidara da confirmacao via interface)
- Se alguma referencia nao for encontrada (ex: fornecedor "XYZ" nao existe), informe o usuario e pergunte se deseja criar primeiro
```

IMPORTANT: Do NOT change any other code in the file. Only modify the SYSTEM_PROMPT string constant.

Also update the existing bullet point about write actions from:
`- Para ações de escrita: descreva o que vai fazer, use a ferramenta (ela pedirá confirmação ao usuário)`
to:
`- Para ações de escrita: siga o FLUXO DE CADASTRO abaixo`
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>SYSTEM_PROMPT contains "FLUXO DE CADASTRO" section; instructs AI to resolve FKs via lookup tools before proposing writes; instructs AI to present full summary with resolved names for user confirmation</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes for all modified files
2. `src/app/api/search/route.ts` no longer contains `prisma.cliente.findMany`, `prisma.produto.findMany`, or `prisma.usuario.findMany` — all replaced by fuzzy helpers
3. `src/lib/ai.ts` SYSTEM_PROMPT contains "FLUXO DE CADASTRO" and "ANTES de propor"
4. `src/lib/db-search.ts` exports `fuzzyFindUsuarios`
</verification>

<success_criteria>
- UI search autocomplete uses fuzzy matching (pg_trgm) for all entity types
- AI system prompt explicitly instructs model to resolve FK references before confirming write actions
- All TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/260320-jjr-continue-fuzzy-search-and-ai-confirmatio/260320-jjr-SUMMARY.md`
</output>
