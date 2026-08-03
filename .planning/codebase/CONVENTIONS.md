# Coding Conventions

**Analysis Date:** 2026-08-03

## Naming Patterns

**Files:**
- Utility modules: kebab-case (e.g., `action-response.ts`, `build-cadastros-url.ts`, `venda-item-validation.ts`)
- Component files: kebab-case (e.g., `month-filter.tsx`, `empresas-tab-client.tsx`, `receipt-editor-client.tsx`)
- Test files: co-located with source, named `[name].test.ts` (e.g., `venda-item-validation.test.ts`)
- Server actions: in `actions.ts` files at route level (e.g., `src/app/(app)/venda-rapida/actions.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `checkCredito()`, `formatBRL()`, `buildComissoesWhere()`)
- React components: PascalCase (e.g., `MonthFilter`, `EmpresasTabClient`, `MarkdownContent`)
- Async functions: camelCase with no special suffix (e.g., `checkCredito()` for async queries)
- Exported utility functions: camelCase (e.g., `maskCpf()`, `maskCnpj()`, `calcularPrimeiroVencimento()`)

**Variables:**
- Local variables: camelCase (e.g., `clienteId`, `parcNova`, `formaPagamento`)
- State variables (React): camelCase (e.g., `selectedIds`, `editingEmpresa`, `submittingAdd`)
- Constants: UPPER_SNAKE_CASE (e.g., `TOLERANCIA_CENTAVOS`, `FORMA_PAGAMENTO`)
- Query parameters: lowercase when extracted from search params (e.g., `mes`, `dataInicio`)

**Types:**
- Type definitions: PascalCase (e.g., `ActionResponse<T>`, `ItemVendaParaValidar`, `CatalogoProduto`)
- Type imports: use `import type` (e.g., `import type { ActionResponse } from "@/lib/action-response"`)
- Generic type parameters: single capital letters (e.g., `<T>`)
- Prisma type imports: `import type { Prisma } from "@/generated/prisma"`

## Code Style

**Formatting:**
- No dedicated Prettier config; relies on ESLint formatting rules
- TypeScript strict mode enabled (`tsconfig.json`)
- Target: ES2017 with JSX support

**Linting:**
- ESLint with Next.js core-web-vitals and TypeScript rules
- Config: `eslint.config.mjs` (flat config format)
- Disabled rules:
  - `@typescript-eslint/no-explicit-any` — allows `any` type (project choice)
  - `react-hooks/set-state-in-effect` — allows setState inside useEffect
  - `react-hooks/purity` — relaxes strict purity checks

**Security Hook (from CLAUDE.md):**
- Blocks edits matching `RegExp.exec()` pattern — use `.split()` + regex instead
- Also blocks file writes containing `RegExp.exec()` pattern in content

## Import Organization

**Order (within file):**
1. External library imports (e.g., `import { useState } from "react"`)
2. Next.js/internal framework imports (e.g., `import { revalidatePath } from "next/cache"`)
3. Type imports from external/internal (e.g., `import type { Prisma } from "@/generated/prisma"`)
4. Relative imports from `@/lib`, `@/components`, `@/hooks`, etc.
5. Relative imports from same directory

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vitest.config.ts`)
- Always use alias imports (e.g., `@/lib/venda-item-validation`, `@/components/month-filter`)

**Example Import Pattern:**
```typescript
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ActionResponse } from "@/lib/action-response";
import type { Prisma } from "@/generated/prisma";

import { cn } from "@/lib/utils";
import { maskCpf } from "@/lib/utils";
import { MonthFilter } from "@/components/month-filter";
```

## Error Handling

**Server Actions Pattern:**
- Use `ActionResponse<T>` type from `@/lib/action-response.ts`
- Return `{ success: true, message?, data? }` or `{ success: false, error }`
- Helper functions: `successResponse(message?, data?)` and `errorResponse(error)`
- Example in `src/app/(app)/venda-rapida/actions.ts`

**Business Logic Pattern:**
- Validation functions return `string | null` (error message or null if valid)
- Example: `validarItensContraCatalogo()` in `src/lib/venda-item-validation.ts`
- **Reference pattern for server-side validation:** `src/lib/venda-item-validation.ts` + `src/__tests__/venda-item-validation.test.ts`

**Database/Query Pattern:**
- Async functions query Prisma directly
- Return early with sensible defaults for missing data
- Example: `checkCredito()` returns `{ ok, disp, tomado, teto }` with calculated defaults

**Async Error Handling:**
- Use `try/catch` for server actions
- Use `expect().rejects.toThrow()` in tests for error assertions

## Logging

**Framework:** Native `console` only (no external logging library detected)

**Patterns:**
- Not standardized in codebase; `console` used ad-hoc
- No centralized logger; direct console calls acceptable

## Comments

**When to Comment:**
- Complex business logic (e.g., "Compra até dia 20 → dia 10 do próximo mês")
- Security/validation rules (e.g., "evita venda registrada com subtotal dissociado")
- Non-obvious calculations or side effects
- Do NOT comment trivial code

**JSDoc/TSDoc:**
- Used for exported functions and public APIs
- Format: `/** description */` for single-line, multi-line for complex
- Example from `venda-item-validation.ts`:
  ```typescript
  /**
   * Valida itens de uma venda antes de gravar no banco:
   * 
   * 1. subtotal deve ser exatamente valorVenda x quantidade...
   * 2. Quando o nome do item bate com um produto do catálogo...
   */
  export function validarItensContraCatalogo(...): string | null { ... }
  ```

## Function Design

**Size:** Keep functions focused on single responsibility; ~30-50 lines typical for utility functions, ~50-100 for components

**Parameters:** 
- Destructure object parameters when 2+ arguments (e.g., `{ role, nomeExibicao }`)
- Use optional parameters with defaults (e.g., `value?: number | null`)
- Strongly typed via TypeScript interfaces/types

**Return Values:**
- Explicit return types required (TypeScript strict mode)
- Async functions always explicitly typed (e.g., `Promise<ActionResponse<T>>`)
- Simple functions return values/objects; validation functions return `T | null`

## Module Design

**Exports:**
- Use named exports (e.g., `export function fn() {}`, `export type Type = {}`)
- Default exports rare; prefer named exports
- Re-export types from generated code (e.g., `import type { Prisma }`)

**Barrel Files:**
- Not used in `src/lib/` or `src/components/` (each file standalone)
- Each module explicitly imports what it needs

## Client vs Server Code

**Client Components:**
- Mark with `'use client';` at top of file
- Examples: `*-client.tsx`, `*-tab-client.tsx`, `receipt-editor-client.tsx`
- Use React hooks, event handlers, state management

**Server Components:**
- Default for all `.tsx` unless marked `'use client'`
- Can call server actions, access database directly via props
- No hooks, event listeners only via server actions

**Server Actions:**
- Mark with `"use server";` at top of file
- Located in `actions.ts` at route level
- Use `ActionResponse<T>` for return type
- Call Prisma directly, perform validation, return typed response

## Code Quality Patterns

**Validation:**
- Business rule validation: standalone functions returning `string | null` with error message
- Reference pattern: `src/lib/venda-item-validation.ts` + `src/__tests__/venda-item-validation.test.ts`
- Server-side validation mandatory for sensitive operations (security hook)

**Dependency Injection:**
- Minimal; configuration via function parameters or environment variables
- Example: `checkCredito(clienteId, parcNova)` takes values directly, queries database

**Nullish Coalescing:**
- Use `??` for default values with nulls (e.g., `value ?? 0`)
- Use `||` for falsy defaults (e.g., `str || ""`)

## BFX Intelligence (AI) Conventions

**Key Components:**
- Chat client: `src/components/intelligence-chat-client.tsx`
- AI logic and tools: `src/lib/ai.ts` → `runAiWithActions()`
- Tool results formatting: `buildToolSummary()` returns markdown with tables
- Table rendering: use `MarkdownContent` + `MarkdownTable` (native parser, no `remark-gfm`)
- Table parsing: `split(TABLE_BLOCK_RE)` to separate text and table blocks

**Supported AI Providers:**
- Default: `gemini` (Google)
- Alternatives: `openai`, `litellm`
- SDK: `@ai-sdk/google`, `@ai-sdk/openai`, `ai` package

**Table Structure (from buildToolSummary):**
- Clientes: Nome | Telefone | E-mail
- Produtos: Produto | Estoque | Preco
- Vendas: Cliente | Data | Valor | Status
- Despesas: Descricao | Data | Valor
- Empresas: Nome | CNPJ
- Usuarios: Nome | E-mail | Perfil

## Workflow (from CLAUDE.md)

**For non-trivial bug fixes or features, follow this order (NO SKIPPING):**

1. **Spec** — Write what changes and why before touching code
   - Current vs. expected behavior
   - Affected files
   - Scope decisions

2. **TDD** — Write failing test BEFORE implementation
   - Place test in `src/__tests__/[name].test.ts`
   - Use vitest globals (`describe`, `it`, `expect`)
   - Reference: `src/__tests__/venda-item-validation.test.ts`
   - Run with `npm test` or `npm run test:watch`

3. **Implementation** — Minimal code to make test pass
   - Don't expand scope beyond spec
   - Follow conventions above

4. **Review** — Dispatch subagent review before commit
   - Use Agent tool (not inline review)
   - Apply confirmed findings
   - Then commit and push

**Skip only if user explicitly requests faster approach.**

---

*Convention analysis: 2026-08-03*
