# Coding Conventions

**Analysis Date:** 2026-02-19

## Naming Patterns

**Files:**
- Client components: `kebab-case-client.tsx` (e.g., `venda-rapida-form-client.tsx`)
- Server components: `kebab-case.tsx` (e.g., `dashboard-charts.tsx`)
- UI components: `kebab-case.tsx` in `src/components/ui/`
- Features/utilities: `kebab-case.ts` (e.g., `action-response.ts`, `design-tokens.ts`)
- Validation schemas: `kebab-case.ts` in `src/lib/validations/` (e.g., `venda.ts`, `cliente.ts`)
- Business logic: `kebab-case.ts` in `src/lib/` (e.g., `finance.ts`, `ai.ts`)
- Exception: Mixed case for top-level utility components (`LogoutButton.tsx`)

**Functions:**
- camelCase for all functions: `selectProduto()`, `adicionarProduto()`, `removerProduto()`
- Async functions prefix with verb: `fetchClientes()`, `calculateDre()`, `updateVenda()`
- Handler functions use `handle` prefix: `handleLogout()`, `handleValueChange()`
- Server Actions with descriptive names: `updateVenda()`, `deleteVenda()`, `addCliente()`
- Utility functions are lowercase, no prefix: `formatBRL()`, `maskCpf()`, `maskTel()`

**Variables:**
- camelCase for all variables: `selectedCliente`, `produtoSuggestions`, `clienteQuery`
- React state hooks use singular/plural appropriately: `selectedProduto`, `produtos` (array)
- Callback refs use `useRef`: `debounceTimer`, `inputRef`
- State booleans prefix with `is` or `has`: `temNota`, `loading`, `open`, `searchable`
- Fetched/computed data preserve domain names: `parcelasVencimento`, `limiteData`, `aiSuggestions`

**Types:**
- PascalCase for all types: `Props`, `EvoRow`, `TopRow`, `ClienteFormData`, `VendaRapidaFormData`
- Interface prefix with `I` is NOT used (follow React conventions)
- Exported types use explicit naming: `type ActionResponse<T>`, `type FormSelectProps`
- Zod schemas use camelCase with Schema suffix: `vendaRapidaSchema`, `clienteSchema`

**Constants:**
- UPPER_SNAKE_CASE for true constants: stored in `design-tokens.ts` using `as const`
- Feature flags in `readOnlyActions` Set: `new Set(["listar_vendas", "listar_clientes"])`
- Design tokens exported as objects: `spacing`, `typography`, `colors`, `borders`

## Code Style

**Formatting:**
- No explicit Prettier config found, but codebase follows Next.js default conventions
- Line length: ~80-120 chars observed
- Indentation: 2 spaces (inferred from component structure)
- Arrow functions preferred: `(prop) => type`

**Linting:**
- ESLint configured via `eslint.config.mjs` (v9 flat config)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- No custom eslint rules beyond Next.js defaults

**Import Order:**
1. External packages (React, hooks, third-party libraries)
2. @ai-sdk, @hookform, @radix-ui packages
3. Absolute imports from `@/` (lib, components, ui)
4. Type imports separated: `import type { ... }`

**Path Aliases:**
- `@/` resolves to `src/` directory (Next.js default)
- Consistent use in all imports: `@/lib/utils`, `@/components/ui/card`, `@/lib/validations/venda`

## Error Handling

**Patterns:**
- Try-catch blocks in async functions (most common pattern)
- Server Actions use `ActionResponse<T>` type for structured error handling
  ```typescript
  return successResponse("Mensagem de sucesso", data)
  return errorResponse("Mensagem de erro")
  ```
- Client components use try-finally for cleanup: `setLoading(false)` in finally block
- Error alerts use browser `alert()` or `console.error()` (no centralized error logging)
- API errors caught and logged: `.catch(error => console.error("Erro ao buscar:", error))`

**Error Messages:**
- Portuguese error messages in validation schemas and alerts
- User-facing messages in `toast.success()` and `toast.error()` (Sonner integration)
- Validation errors from Zod returned in form fields via `<FormMessage />`

## Logging

**Framework:** console (native browser/Node.js)

**Patterns:**
- `console.log()` for informational messages (e.g., "Buscando vendas para...")
- `console.error()` for error reporting (e.g., "Erro ao fazer upload do comprovante:")
- Conditional logging in utility functions: `console.log(`Client ${i} z-index:`, zIndex)`
- Finance calculations log context: `console.log(`Buscando vendas para ${mesAno}...`)`

**Logging Levels Used:**
- `.log()`: Informational messages during execution
- `.error()`: Exceptions and error conditions
- No `.warn()` or `.info()` observed in codebase

## Comments

**When to Comment:**
- JSDoc for exported functions and types: `/** Schema de validação para venda rápida */`
- Section headers for file organization: `// ============================================================================`
- Complex algorithms get inline comments: date calculations, financial formulas
- Bug workarounds or non-obvious code receive explanatory comments

**JSDoc/TSDoc:**
- Function-level JSDoc before exports: `/** Cria uma resposta de sucesso */`
- Parameter types documented in JSDoc when not obvious
- Return type documented for complex returns
- Example: See `src/lib/action-response.ts` (lines 13-14, 24-25)

## Function Design

**Size:**
- Small functions preferred (50-150 lines typical for components)
- Complex logic extracted: `inferReadOnlyActions()` is focused on one task
- Helper functions like `currency()`, `shorten()` are 5-15 lines

**Parameters:**
- Props interface always defined separately: `interface Props { ... }`
- Destructure parameters in function signature
- Optional parameters documented via `?` in interface/type
- Callbacks passed as optional props: `onValueChange?: (val: string) => void`

**Return Values:**
- Explicit return types: `: Promise<ActionResponse<T>>`, `: JSX.Element`
- Server Actions return `ActionResponse` wrapper
- Components return JSX.Element or Fragment
- Utilities return specific types: `string`, `number`, `Record<string, string>`

## Module Design

**Exports:**
- Named exports preferred: `export function formatBRL()` vs default exports
- Components use default export when single export per file
- Utilities use named exports for tree-shaking
- Example: `src/lib/action-response.ts` exports type + functions

**Barrel Files:**
- NOT used for components (no `src/components/index.ts`)
- No barrel files in `src/lib/validations/`
- Imports are direct: `from "@/lib/action-response"`, not from `@/lib`

**Re-exports:**
- Button exports both component and variants: `export { Button, buttonVariants }`
- No index files creating side effects

## TypeScript Usage

**Strict Mode:** Inferred enabled (no explicit config, but types required throughout)

**Generics:**
- Used in utility types: `ActionResponse<T>` allows generic data typing
- Components accept props with generic parameters
- Zod schemas use `.infer<typeof schema>` for type inference

**Discriminated Unions:**
- Not heavily used, but present in validation schemas
- `type: z.enum(["PF", "PJ"])` discriminates client type

## Tailwind CSS Patterns

**Custom Classes:**
- No custom CSS, all Tailwind classes
- Design tokens defined in `src/lib/design-tokens.ts` as TypeScript constants
- CSS variables used for colors: `bg-primary`, `text-success`, `border-border`
- Opacity modifiers: `/10`, `/20`, `/40`, `/50` for subtle backgrounds

**Semantic Variants:**
- Color tokens: `primary`, `success`, `warning`, `error`, `info`, `destructive`
- Dark mode via CSS variables in `globals.css`
- No hardcoded colors (e.g., `#0f172a` or `bg-blue-900`)

## React Patterns

**Hooks Usage:**
- `useState` for local component state
- `useRef` for mutable references (debounce timers)
- `useEffect` for side effects (fetching data, listening to events)
- `useMemo` for expensive computations
- No custom hooks abstracted yet

**Component Structure:**
- Client components marked with `"use client"` at top
- Props interface always defined above component function
- Event handlers defined as arrow functions within component
- Conditional rendering uses ternary or `&&` operator

**Form Patterns:**
- HTML form elements used directly (not React Hook Form wrapper in all cases)
- FormData passed to Server Actions
- Client-side useState for UI state, Server Action for mutations
- Input onChange handlers update state immediately

## Special Patterns

**Server Actions:**
- Marked with `"use server"` directive
- Return `ActionResponse` for consistent error handling
- Call `revalidatePath()` after mutations
- Validation occurs before database operations

**API Routes:**
- Endpoints follow RESTful convention: `/api/clientes/{id}/limite`
- Fetch in client components and useEffect hooks
- Error handling with `.catch()` and console.error

**Z-Index Management:**
- Custom z-index class: `z-[9999]` for dropdowns (non-standard, specific value)
- Managed manually in component className attributes
- Not centralized in design tokens

---

*Convention analysis: 2026-02-19*
