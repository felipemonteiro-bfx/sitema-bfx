---
phase: quick-260320-kuo
plan: 01
subsystem: ai-chat
tags: [ai, chat, prisma, direct-execution, context-summarization]
dependency_graph:
  requires: []
  provides: [dual-ai-context, direct-write-execution]
  affects: [intelligence-chat, ai-inference]
tech_stack:
  added: []
  patterns: [summarized-ai-context, direct-tool-execution]
key_files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/app/(app)/inteligencia/page.tsx
    - src/components/intelligence-chat-client.tsx
    - src/lib/ai.ts
    - src/generated/prisma/ (regenerated)
decisions:
  - "AI gets contextResumo (token-optimized, tables stripped, 300 char max) for inference context; UI always displays original full content"
  - "Write actions execute directly via tool callbacks — no confirmation modal or plan/execute mode"
  - "buildLinks() generates recibo PDF and catalogo links inline from executed tool results"
metrics:
  duration: 252s
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 13
---

# Quick 260320-kuo: Separar Contexto IA / Display + Execucao Direta de Acoes

**One-liner:** Dual AI context (summarized for inference, original for display) and direct write-action execution via tool callbacks — no confirmation modal.

## What Was Built

### Task 1: Add contextResumo field + separate AI/display context (commit: 4f94087)

- Added `contextResumo String? @map("context_resumo")` field to `AiMensagem` model in Prisma schema
- Ran `prisma db push` and `prisma generate` to apply schema change and regenerate client
- `buildContextSummary()` strips markdown tables (display-only, bloat AI context) and truncates to 300 chars
- `getContextHistory()` now reads `contextResumo` for AI inference — falls back to `content` for old rows
- `getDisplayHistory()` continues reading full `content` for UI — users see original messages always
- `addAssistantMessage()` stores `contextResumo` on every new message
- `askAi()` simplified: calls `runAiWithActions` directly without `mode: "plan"`, always `status: "done"`
- Removed `confirmAi` and `cancelAi` server actions entirely
- Page JSX passes only `action={askAi}` prop — no `confirmAction` or `cancelAction`

### Task 2: Remove confirmation modal + AI executes write actions directly (commit: 633adb1)

- Removed `confirmAction` and `cancelAction` from `IntelligenceChatClientProps` type
- Removed `confirming` state, `handleConfirm`, `handleCancel` functions from component
- Removed entire confirmation UI block (warning border box, action list, Confirmar/Cancelar buttons)
- Removed `actionLabel` function (no longer used)
- Updated `SYSTEM_PROMPT`: write actions section now says "executadas diretamente" not "requerem confirmacao"
- Updated FLUXO DE CADASTRO: execute directly after resolving references, present summary afterward
- Removed `mode === "execute" && ctx.executeAction` special branch from `runAiWithActions`
- Removed `planned[]` arrays from all three provider branches (litellm, gemini, openai)
- Removed `inferReadOnlyActions`, `extractActions`, `stripActions` functions
- Removed `mode` and `executeAction` from ctx type signature
- All tool callbacks now always execute (read and write) via `callMcpTool` — no branching
- Added `buildLinks()` helper that generates recibo PDF and catalogo links from `executed` results
- Links passed as return value from `runAiWithActions` for storage and display

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **contextResumo backcompat:** Old rows without `contextResumo` fall back gracefully to `content` via `?? row.content` — no migration needed for existing data.

2. **readOnlyActions export kept:** The `readOnlyActions` Set export was retained in `ai.ts` as it may be imported elsewhere (safe to keep, unused internally now).

3. **isDespesasMes fallback kept:** The manual despesas-do-mes fallback path in gemini/openai branches was kept (without the `ctx.mode !== "plan"` guard which is now removed). This is a safety net for when the AI doesn't trigger the tool.

## Self-Check: PASSED

- prisma/schema.prisma contains `contextResumo`: FOUND
- src/app/(app)/inteligencia/page.tsx contains `getContextHistory`: FOUND
- src/components/intelligence-chat-client.tsx has no `confirmAction`: CLEAN
- src/lib/ai.ts has no `planned` or `inferReadOnlyActions`: CLEAN
- TypeScript compilation: PASSED (no errors)
- Commits 4f94087 and 633adb1: FOUND
