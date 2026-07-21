---
phase: quick-260320-kuo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(app)/inteligencia/page.tsx
  - src/lib/ai.ts
  - src/components/intelligence-chat-client.tsx
  - prisma/schema.prisma
autonomous: false
requirements: [KUO-01, KUO-02]

must_haves:
  truths:
    - "AI receives summarized/compressed context history, not raw full messages"
    - "User sees exact original messages in chat UI, never summarized"
    - "Write actions (criar_produto, criar_cliente, etc.) execute immediately without confirmation dialog"
    - "No confirmation modal/buttons visible in chat interface"
    - "Action results display inline in assistant message with success feedback"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "AiMensagem model with contextResumo field"
      contains: "contextResumo"
    - path: "src/app/(app)/inteligencia/page.tsx"
      provides: "Server actions with direct execution, summarized context builder"
      contains: "getContextHistory"
    - path: "src/lib/ai.ts"
      provides: "AI logic executing all actions directly (no plan mode for writes)"
      contains: "runAiWithActions"
    - path: "src/components/intelligence-chat-client.tsx"
      provides: "Chat UI without confirmation modal"
  key_links:
    - from: "src/app/(app)/inteligencia/page.tsx"
      to: "src/lib/ai.ts"
      via: "askAi calls runAiWithActions with direct execution"
      pattern: "runAiWithActions"
    - from: "src/app/(app)/inteligencia/page.tsx"
      to: "prisma.aiMensagem"
      via: "getContextHistory reads contextResumo for AI, getDisplayHistory reads content for UI"
      pattern: "getContextHistory|getDisplayHistory"
    - from: "src/components/intelligence-chat-client.tsx"
      to: "src/app/(app)/inteligencia/page.tsx"
      via: "Client receives action prop only (no confirmAction/cancelAction)"
      pattern: "IntelligenceChatClient"
---

<objective>
Separate AI context from user display and remove the confirmation modal so the AI executes actions directly.

Purpose: The AI should get a compressed/summarized conversation history for better inference (token-optimized), while the user always sees their exact original messages. Write actions should execute immediately without requiring user confirmation clicks.

Output: Modified chat system where (1) AI context uses summarized history stored in a new `contextResumo` field on AiMensagem, (2) display always shows original content, and (3) write actions execute directly with results shown inline.
</objective>

<execution_context>
@/home/claudeuser/.claude/get-shit-done/workflows/execute-plan.md
@/home/claudeuser/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/(app)/inteligencia/page.tsx
@src/lib/ai.ts
@src/components/intelligence-chat-client.tsx
@prisma/schema.prisma
@CLAUDE.md
</context>

<interfaces>
<!-- Current key interfaces the executor needs -->

From src/components/intelligence-chat-client.tsx:
```typescript
type Message = {
  prompt: string;
  response: string;
  provider: string;
  at: string;
  actions?: { name: string; params: Record<string, unknown> }[];
  status?: "pending" | "done";
  links?: { label: string; url: string }[];
};

type IntelligenceChatClientProps = {
  history: Message[];
  action: (formData: FormData) => Promise<void> | void;
  confirmAction: (formData: FormData) => Promise<void> | void;  // TO REMOVE
  cancelAction?: (formData: FormData) => Promise<void> | void;  // TO REMOVE
  formId?: string;
};
```

From src/lib/ai.ts:
```typescript
type AiResult = { text: string; actions: unknown[]; links?: { label: string; url: string }[] };

export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini" | "litellm",
  ctx: ActionContext & {
    mode?: "plan" | "execute";
    executeAction?: { name: string; params: Record<string, unknown> };
    baseUrl?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }
): Promise<AiResult>;
```

From prisma/schema.prisma:
```prisma
model AiMensagem {
  id             Int      @id @default(autoincrement())
  sessaoId       String   @map("sessao_id")
  role           String
  content        String
  promptOriginal String?  @map("prompt_original")
  actions        Json?
  status         String   @default("done")
  links          Json?
  usuario        String?
  criadoEm       DateTime @default(now()) @map("criado_em")

  @@index([sessaoId, criadoEm])
  @@map("ai_mensagens")
}
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add contextResumo field to AiMensagem + update context/display separation in page.tsx</name>
  <files>prisma/schema.prisma, src/app/(app)/inteligencia/page.tsx</files>
  <action>
**1. Schema change (prisma/schema.prisma — requires sudo):**

Add a new optional field `contextResumo` to model AiMensagem, right after `content`:

```prisma
contextResumo  String?  @map("context_resumo")
```

This field stores a token-optimized summary of the assistant's response for AI context. The original `content` field remains the verbatim display text.

Run migration:
```bash
sudo chmod u+w prisma/schema.prisma
# (edit file)
cd /tmp/sitema-bfx && npx prisma db push --skip-generate 2>/dev/null; npx prisma generate
```

**2. Modify `getContextHistory()` in page.tsx:**

Change the function to prefer `contextResumo` over `content` when building the AI's conversation history. This means the AI gets summarized context while the UI always shows original `content`.

```typescript
async function getContextHistory(sessaoId: string) {
  const rows = await prisma.aiMensagem.findMany({
    where: { sessaoId, role: "assistant" },
    orderBy: { criadoEm: "desc" },
    take: 5,
    select: { promptOriginal: true, content: true, contextResumo: true },
  });
  rows.reverse();
  const history: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of rows) {
    if (row.promptOriginal === "Confirmacao de acoes") continue;
    if (row.promptOriginal) {
      history.push({ role: "user", content: row.promptOriginal });
    }
    // Use summarized context if available, fall back to full content
    history.push({ role: "assistant", content: row.contextResumo ?? row.content });
  }
  return history;
}
```

**3. Modify `addAssistantMessage()` in page.tsx:**

Add a `contextResumo` parameter. Generate a summary by truncating the content to ~300 chars and stripping markdown tables (tables are display-only, not useful for AI context). The summary keeps the first meaningful text.

```typescript
function buildContextSummary(content: string): string {
  // Remove markdown tables (they bloat context and are display-only)
  const withoutTables = content.split(/((?:^\|.+\|\s*$\n?){3,})/gm)
    .filter(s => !/^\|/.test(s.trimStart()))
    .join(' ');
  // Collapse whitespace and truncate
  const cleaned = withoutTables.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 300) return cleaned;
  return cleaned.slice(0, 297) + '...';
}
```

Add to `addAssistantMessage`:
```typescript
contextResumo: buildContextSummary(msg.content),
```

**4. Remove `confirmAi` and `cancelAi` server actions from page.tsx entirely.** They are no longer needed since the AI executes actions directly.

**5. Modify `askAi` server action:**

Currently `askAi` calls `runAiWithActions` with `mode: "plan"`, which causes write actions to be "proposed" not executed. Change the flow so ALL actions (both read and write) execute directly:

- Remove `mode: "plan"` — do not pass any `mode` (ai.ts will be simplified to always execute in Task 2)
- Remove the logic that checks for `plannedActions` vs `autoActions` — everything executes directly now
- Pass `baseUrl` always so links (recibo PDF, catalogo) are generated
- The result from `runAiWithActions` will contain `text` (with the summary/confirmation) and `links`
- Store with `status: "done"` always (no more "pending")

Simplified `askAi`:
```typescript
async function askAi(formData: FormData) {
  "use server";
  // ... (existing attachment/prompt parsing unchanged) ...
  const session = await getSession();
  if (!session) return;
  const usuario = session.username;
  const history = await getContextHistory(usuario);

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "http://localhost:3008");

  const response = await runAiWithActions(prompt, provider, {
    role: session.role as "admin" | "vendedor",
    username: session.username,
    displayName: session.nomeExibicao || session.username,
    history,
    baseUrl,
  });

  await addAssistantMessage({
    sessaoId: usuario,
    usuario,
    content: response.text,
    promptOriginal: prompt,
    status: "done",
    links: response.links,
  });
  revalidatePath("/inteligencia");
}
```

**6. Update the Page component JSX:** Remove `confirmAction={confirmAi}` and `cancelAction={cancelAi}` props from `<IntelligenceChatClient>`. Remove those imports/references.

**7. Update `clearAi`:** Keep as-is (unchanged).

**IMPORTANT:** Do NOT use patterns with `RegExp` and the word `exec` adjacent (hook blocks it). Use `.split()` + regex or `.test()` instead.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - AiMensagem model has `contextResumo` field
    - `getContextHistory` uses `contextResumo` for AI, `getDisplayHistory` uses `content` for UI
    - `askAi` calls runAiWithActions without mode (direct execution) and stores results with status "done"
    - `confirmAi` and `cancelAi` server actions are deleted
    - Page component passes only `action` prop (no confirmAction/cancelAction)
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove confirmation modal from chat client + make AI execute write actions directly</name>
  <files>src/components/intelligence-chat-client.tsx, src/lib/ai.ts</files>
  <action>
**1. Modify intelligence-chat-client.tsx:**

Remove ALL confirmation-related code:
- Remove `confirmAction` and `cancelAction` from `IntelligenceChatClientProps` type
- Remove `confirming` state (`useState(false)`)
- Remove `handleConfirm` function
- Remove `handleCancel` function
- Remove the entire confirmation UI block (the `{m.status === "pending" && m.actions && ...}` JSX block, lines ~240-281)
- Remove `actionLabel` function (no longer used)
- Remove `confirmAction` and `cancelAction` from the destructured props
- Keep `status` and `actions` in the `Message` type (harmless, avoids breaking existing DB rows) but they won't trigger any UI

The component becomes simpler — just shows messages with their text and links. No confirm/cancel buttons.

Updated props type:
```typescript
type IntelligenceChatClientProps = {
  history: Message[];
  action: (formData: FormData) => Promise<void> | void;
  formId?: string;
};
```

**2. Modify ai.ts — make write actions execute directly:**

In the SYSTEM_PROMPT, update the section about write actions. Change:
```
- Acoes de escrita (requerem confirmacao do usuario): criar venda, ...
```
To:
```
- Acoes de escrita (executadas diretamente): criar venda, criar cliente, cadastrar produto, registrar entrada de estoque, criar despesa, atualizar venda/produto/usuario/despesa, criar empresa/usuario/fornecedor, gerar catalogo
```

Remove the "FLUXO DE CADASTRO" section that says "NAO execute a acao de escrita diretamente" and "pergunte ao usuario: Confirma o cadastro acima?". Replace with:
```
FLUXO DE CADASTRO (acoes de escrita):
- ANTES de executar qualquer cadastro, resolva TODAS as referencias usando ferramentas de consulta (listar_fornecedores, listar_clientes, listar_produtos, etc.)
- Ao cadastrar produto: use listar_produtos para ver categorias e marcas existentes e escolha a mais adequada. Inclua TODOS os campos (categoria, marca, custoPadrao, valorVenda, fornecedorId, qtdEstoque).
- Execute a acao de escrita diretamente apos resolver as referencias
- Apresente um resumo do que foi criado apos a execucao
- Se alguma referencia nao for encontrada (ex: fornecedor "XYZ" nao existe), informe o usuario e pergunte se deseja criar primeiro
```

**3. In `runAiWithActions`, modify ALL three provider branches (gemini, litellm, openai):**

In the tool `execute` callback, change the logic. Currently:
```typescript
execute: async (args) => {
  if (action.readOnly || ctx.mode === "execute") {
    const result = await callMcpTool(action.name, args ?? {}, ctx);
    executed.push({ name: action.name, result });
    return result;
  }
  // mode === "plan" and write action: propose, don't execute
  planned.push({ name: action.name, params: ... });
  return 'Acao proposta...';
},
```

Change to ALWAYS execute (read or write):
```typescript
execute: async (args) => {
  const result = await callMcpTool(action.name, args ?? {}, ctx);
  executed.push({ name: action.name, result });
  return result;
},
```

Remove the `planned` array declarations from all three provider branches (gemini, litellm, openai) since actions are never "planned" anymore.

Remove the `if (ctx.mode === "plan")` blocks that check for `planned.length > 0` and call `inferReadOnlyActions` / `extractActions` — these are no longer needed since everything executes directly.

Remove `extractActions()`, `stripActions()`, `inferReadOnlyActions()` functions entirely — they were only used in plan mode.

Keep the `readOnlyActions` export (it may be imported elsewhere — safe to keep, just unused).

**4. Remove the `mode === "execute" && ctx.executeAction` special branch** at the top of `runAiWithActions` (lines 288-319). This was for confirming pre-planned actions. Since actions now execute inline via tools, this branch is dead code.

**5. Simplify the function signature:**

Remove `mode` and `executeAction` from the ctx type since they're no longer used:
```typescript
export async function runAiWithActions(
  prompt: string,
  provider: "openai" | "gemini" | "litellm",
  ctx: ActionContext & {
    baseUrl?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }
): Promise<AiResult>
```

**6. Handle links for write actions inline:**

Currently links (PDF recibo, catalogo) were generated in the `executeAction` branch. Move this logic into the `buildToolSummary` or as post-processing after tool execution. After all tools have run, check `executed` for:
- `criar_venda` results with `uuid` or `id` -> add link `{ label: "Recibo PDF", url: "${baseUrl}/api/recibo?id=${token}" }`
- `gerar_catalogo_produtos` -> add link `{ label: "Catalogo de Produtos (PDF)", url: "${baseUrl}/api/catalogo" }`

Add `baseUrl` from ctx to generate these links. Update the return value to include links:
```typescript
const links: { label: string; url: string }[] = [];
for (const item of executed) {
  if (item.name === "criar_venda" && item.result && typeof item.result === "object") {
    const venda = item.result as { uuid?: string; id?: number };
    const token = venda.uuid ?? String(venda.id ?? "");
    if (token && ctx.baseUrl) {
      links.push({ label: "Recibo PDF", url: `${ctx.baseUrl}/api/recibo?id=${token}` });
    }
  }
  if (item.name === "gerar_catalogo_produtos" && ctx.baseUrl) {
    links.push({ label: "Catalogo de Produtos (PDF)", url: `${ctx.baseUrl}/api/catalogo` });
  }
}
// Return { text, actions: executed, links } everywhere
```

**IMPORTANT:** Do NOT use patterns with `RegExp` and the word `exec` adjacent (hook blocks it). Use `.split()` + regex or `.test()` instead.
  </action>
  <verify>
    <automated>cd /tmp/sitema-bfx && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
    - No confirmation modal, confirm button, or cancel button in chat UI
    - AI executes ALL actions directly (both read and write) via tool callbacks
    - SYSTEM_PROMPT instructs AI to execute directly, not propose
    - plan/execute mode distinction is removed from ai.ts
    - inferReadOnlyActions, extractActions, stripActions functions removed
    - Links (recibo PDF, catalogo) generated inline after tool execution
    - TypeScript compiles without errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify dual context + direct execution in live chat</name>
  <files>n/a</files>
  <action>
  Human verification of the dual context system and direct action execution.
  </action>
  <what-built>
    Dual context system (summarized AI context vs raw display) and direct action execution (no confirmation modal).
  </what-built>
  <how-to-verify>
    1. Visit the BFX Intelligence chat page
    2. Send a read query like "liste os produtos" — should display results immediately (as before)
    3. Send a write command like "cadastre um produto teste com valor 10 reais" — should execute DIRECTLY without showing a confirmation dialog. The result should appear as an assistant message with success feedback.
    4. Verify NO "Confirmar"/"Cancelar" buttons appear anywhere in the chat
    5. Check that old messages still display correctly (backward compatible)
    6. Send a few messages, then verify the AI responds with context awareness (it remembers recent conversation via summarized history)
  </how-to-verify>
  <verify>Human confirms chat works without confirmation modal and with context awareness</verify>
  <done>User approves the dual context + direct execution behavior</done>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- No "Confirmar" or "Cancelar" text in intelligence-chat-client.tsx
- `contextResumo` field exists in prisma schema
- `getContextHistory` reads `contextResumo`, `getDisplayHistory` reads `content`
- No `confirmAction` or `cancelAction` props passed to IntelligenceChatClient
</verification>

<success_criteria>
- AI chat executes write actions (criar_produto, criar_cliente, etc.) directly without confirmation modal
- AI receives summarized context history (contextResumo field), user sees full original messages
- Chat UI is cleaner — no confirm/cancel buttons, no pending status indicators
- TypeScript compilation passes
- Existing read-only queries (listar_produtos, etc.) continue to work unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/260320-kuo-separar-redis-em-dois-contexto-ia-resumi/260320-kuo-SUMMARY.md`
</output>
