# Coding Conventions

**Analysis Date:** 2026-02-05

## Naming Patterns

**Files:**
- PascalCase for React components: `SidebarNav.tsx`, `LogoUploadForm.tsx`, `ChatPromptInput.tsx`
- camelCase for utility/library files: `utils.ts`, `finance.ts`, `guards.ts`, `session.ts`, `ai.ts`, `mcp.ts`
- kebab-case for route files (Next.js convention): `login/route.ts`, `autocomplete/route.ts`

**Functions:**
- camelCase for regular functions: `formatBRL()`, `maskCpf()`, `maskCnpj()`, `requireAdmin()`, `calcularDre()`, `createSessionToken()`
- PascalCase for React components/exports: `SidebarNav()`, `LogoUploadForm()`, `QueryTabs()`
- Private helper functions are camelCase, lowercase: `sanitizeSql()`, `requireAdmin()`, `calcularTaxaPercent()`, `calcularPrazoMedioDias()`

**Variables:**
- camelCase: `session`, `fileName`, `selectedIds`, `totalSelecionado`, `valorTaxa`, `prazoMedio`
- Constants (module-level) use UPPER_SNAKE_CASE: `TAXA_MENSAL` (see `antecipacao-client.tsx:22`)
- Record/map variables: `icons`, `ncms`, `actionParamSchemas`, `rules`

**Types:**
- PascalCase for interfaces and types: `SessionPayload`, `MenuItem`, `QueryTabItem`, `McpTool`, `ActionContext`, `AiActionDef`
- Props types end with "Props": Inferred from pattern (e.g., in `LogoUploadForm`, `{currentLogoPath}` type is implicit)

## Code Style

**Formatting:**
- ESLint (v9) with Next.js config
- Config: `eslint.config.mjs`
- Rules: Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- No Prettier config detected; formatting follows ESLint rules

**Linting:**
- ESLint flat config (modern ESLint v9 format)
- Enforces Next.js core web vitals
- TypeScript strict mode enabled in `tsconfig.json`
- Command: `yarn lint` or `npm run lint`

## Import Organization

**Order:**
1. External library imports (React, Next.js, third-party)
2. Internal imports from `@/` path alias
3. Type imports (implicit, no separate section observed)

**Examples:**
```typescript
// From src/components/sidebar-nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarChart3, Brain, ... } from "lucide-react";

// From src/lib/finance.ts
import { prisma } from "@/lib/db";
import { addMonths, format } from "date-fns";
```

**Path Aliases:**
- `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- Used consistently for imports: `@/components`, `@/lib`, `@/app`

## Error Handling

**Patterns:**
- try-catch blocks with `.catch(() => null)` for JSON parsing:
  ```typescript
  // From api routes
  const body = await req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return NextResponse.json({ error: "message" }, { status: 400 });
  }
  ```

- Token verification returns null on error (no throw):
  ```typescript
  // From session.ts
  export async function verifySessionToken(token: string) {
    try {
      const { payload } = await jwtVerify<SessionPayload>(token, secret);
      return payload;
    } catch {
      return null;
    }
  }
  ```

- Named error throws for action validation:
  ```typescript
  // From ai-actions.ts
  function requireAdmin(ctx: ActionContext) {
    if (ctx.role != "admin") {
      throw new Error("Acao permitida apenas para administradores.");
    }
  }
  ```

- API route error responses use NextResponse.json with status codes:
  ```typescript
  return NextResponse.json({ error: "message" }, { status: 400 });
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  ```

- Async function error logging: `console.error("Context:", error)`

**Guard Functions:**
- Simple boolean return pattern:
  ```typescript
  export async function requireAdmin() {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return false;
    }
    return true;
  }
  ```

## Logging

**Framework:** console (console.log, console.error)

**Patterns:**
- Debug info in business logic: `console.log()` for calculation steps
  ```typescript
  // finance.ts
  console.log(`Buscando vendas para ${mesAno} entre ${ini.toISOString()} e ${fim.toISOString()}`);
  console.log(`Vendas encontradas: ${vendas.length}`);
  ```

- Error logging in client components and API routes:
  ```typescript
  console.error("Erro ao enviar logo:", error);
  console.error('Erro ao buscar comissões:', error);
  console.error("Error fetching suggestions:", error);
  ```

- No structured logging; all output uses console directly
- Error context is added as string: `"Erro na antecipação:"`, `"Failed to load or embed logo:"`
- Audit logging via Prisma: `prisma.auditLog.create()` in `ai-actions.ts`

## Comments

**When to Comment:**
- Inline comments explaining complex logic:
  ```typescript
  // From products/autocomplete/route.ts
  // 1. Buscar produtos similares (para autocomplete e verificação de duplicidade)
  // 2. Se solicitado, sugerir NCM via IA
  ```

- Section headers for logical flow in async operations
- Comments in Portuguese (language of UI/domain terms)

**JSDoc/TSDoc:**
- Not used extensively
- Type definitions and exports use implicit TypeScript types
- No formal documentation comments observed

## Function Design

**Size:** Generally 10-50 lines
- Utility functions 5-20 lines: `formatBRL()`, `maskCpf()`, `maskCnpj()`, `maskCep()`, `maskTel()`
- Complex business logic 30-100 lines: `executeAiAction()` (180 lines with switch statement), `calcularDre()` (67 lines)
- React components 50-150 lines: `LogoUploadForm()` (81 lines), `SidebarNav()` (84 lines)

**Parameters:**
- Single object destructuring for component props:
  ```typescript
  export function LogoUploadForm({ currentLogoPath }: { currentLogoPath?: string })
  export function SidebarNav({ menu }: { menu: MenuItem[] })
  export function QueryTabs({ tabs, defaultTab, param = "tab" }: {...})
  ```

- Multiple params for utilities (simple types):
  ```typescript
  function maskCpf(val?: string | null)
  function formatBRL(value?: number | null)
  ```

**Return Values:**
- Nullable returns explicit: `return null` on error paths
- Promise returns implicit typing: `async function executeAiAction(...)`
- Objects returned with all properties: `{ receita, custosVar, margem, fixas, lucro, pontoEq, metaGlobal, detalhe }`

## Module Design

**Exports:**
- Named exports for most functions: `export function cn(...)`, `export async function requireAdmin()`
- Default exports for React pages (Next.js convention): `export default async function Home()`
- No barrel files observed; direct imports from source files

**Barrel Files:**
- Not used in codebase
- Each `@/components/ui/*.tsx` is imported directly
- No index.ts files aggregating exports

## Type System

**Usage:**
- TypeScript strict mode enabled
- Explicit type annotations for function parameters
- Object type unions for complex data: `role: "admin" | "vendedor"`
- z.ZodTypeAny for runtime validation schemas (Zod library)

**Pattern Example:**
```typescript
export type SessionPayload = {
  id: number;
  username: string;
  role: string;
  nomeExibicao?: string | null;
};

const actionParamSchemas: Record<string, z.ZodTypeAny> = {
  listar_vendas: z.object({...}),
  criar_venda: z.object({...}),
};
```

---

*Convention analysis: 2026-02-05*
