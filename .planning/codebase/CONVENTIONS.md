# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- PascalCase for React components: `VendaRapidaFormClient.tsx`, `ParcelasVencimentoForm.tsx`
- camelCase for utilities and lib files: `venda-utils.ts`, `action-response.ts`, `db.ts`
- camelCase with hyphens for multi-word utilities: `use-query-param.tsx`, `venda-rapida-dropdown.spec.ts`
- Suffix pattern: `*-client.tsx` for client-side components, `*-actions.ts` for Server Actions, `*-form.tsx` for form components

**Functions:**
- camelCase for all functions: `criarVenda()`, `criarVendaV2()`, `formatBRL()`, `maskCpf()`
- Async functions clearly named with action verb: `createInstance()`, `getWhatsAppConfig()`, `getOrCreateCustomer()`
- Helper functions with action prefix: `calcularPrimeiroVencimento()`, `sugerirNcm()`

**Variables:**
- camelCase for local variables and state: `selectedCliente`, `produtoQuery`, `limiteData`
- UPPERCASE for constants and static data: `SYSTEM_PROMPT`, `TABLE_BLOCK_RE`, `toolSchema`
- Prefix patterns for state: `is*` for booleans (`temNota`, `descontoEmFolha`), `*Data` for data containers

**Types:**
- PascalCase for interfaces and types: `Props`, `Parcela`, `ProdutoItem`, `ActionResponse<T>`
- Generic type parameters: `<T>` for generic data, context-specific prefixes if needed
- Exported type definitions always include explicit exports: `export type VendaV2FormData = z.infer<typeof vendaV2Schema>`

## Code Style

**Formatting:**
- No Prettier config found; using ESLint with Next.js defaults
- 2-space indentation (inferred from codebase)
- Semicolons used consistently throughout
- Template literals preferred over string concatenation

**Linting:**
- ESLint with `eslint-config-next` (flat config in `eslint.config.mjs`)
- Rules overridden: `@typescript-eslint/no-explicit-any` disabled (allows `any` type)
- Hook purity checks disabled: `react-hooks/purity`, `react-hooks/set-state-in-effect`
- Ignored directories: `scripts/`, `streamlit/`, `src/generated/`, `prisma/*.js`

**TypeScript:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- Target: ES2017
- Path alias `@/*` mapped to `./src/*` for clean imports
- `noEmit: true` (type checking only, Next.js handles compilation)
- `skipLibCheck: true` (skip type checking of dependencies)

## Import Organization

**Order:**
1. External library imports (`react`, `next/*`, `ai`, `zod`, etc.)
2. Third-party UI components and utilities (`@radix-ui/*`, `lucide-react`, `sonner`)
3. Internal lib imports (`@/lib/*`)
4. Internal component imports (`@/components/*`)
5. Type-only imports separated at the end

**Pattern:**
```typescript
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatBRL, cn } from "@/lib/utils";
import type { ActionResponse } from "@/lib/action-response";
```

**Path Aliases:**
- Always use `@/` for imports from `src/`
- Never use relative paths (`../`, `./`) even when in adjacent directories
- Grouped by category: `lib` (utilities), `components` (UI), `generated` (Prisma types)

## Error Handling

**Patterns:**

**Server Actions (try/catch with ActionResponse):**
```typescript
// src/app/(app)/venda-rapida/actions.ts (lines 74-387)
export async function criarVendaV2(formData: FormData): Promise<ActionResponse<{ vendaId: number }>> {
  try {
    // ... validation and processing
    const parsed = vendaV2Schema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      const msg = Object.values(firstError).flat().find(Boolean) || parsed.error.message;
      return errorResponse(String(msg || "Dados inválidos"));
    }
    // ... business logic
    return successResponse(`Venda #${venda.id} criada com sucesso!`, { vendaId: venda.id });
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    const err = error as Error & { code?: string };

    // Map known Prisma errors
    if (err?.code === "P2003") {
      return errorResponse("Cliente ou vendedor inválido...");
    }
    // Safe-to-show determination
    const safeToShow = errMsg.includes("Foreign key") || process.env.NODE_ENV === "development";
    return errorResponse(safeToShow ? `Erro: ${errMsg}` : "Erro ao processar...");
  }
}
```

**Client Components (toast notifications):**
```typescript
// src/components/gerar-boleto-button.tsx (lines 26-44)
try {
  const result = await gerarBoletoAction(formData);
  if (result.success) {
    toast.success("Boleto gerado com sucesso!");
    router.refresh();
  } else {
    toast.error(result.error || "Falha ao gerar boleto.");
  }
} catch (err) {
  const msg = err instanceof Error ? err.message : "Erro inesperado...";
  toast.error(msg);
} finally {
  setLoading(false);
}
```

**API Routes (NextResponse with status codes):**
```typescript
// src/app/api/whatsapp/route.ts (lines 6-12)
export async function GET() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getInstanceState();
  return NextResponse.json(result);
}
```

**Error Response Types:**
- Server Actions: `ActionResponse<T>` with `success`, `message`, `data`, `error` fields
- API Routes: `NextResponse.json()` with `{ error: string }` on failure
- Toast notifications: Use sonner toast API (`toast.success()`, `toast.error()`, `toast.warning()`)

## TypeScript Usage

**Strict Mode Enforcement:**
- All variables typed (no implicit `any` unless explicitly disabled)
- Interfaces defined for component props: `interface Props { vendaId: number; ... }`
- Generic types used for reusable patterns: `ActionResponse<T>`, `Promise<ActionResponse<Data>>`

**Type Definitions:**
```typescript
// Validation schemas with inference
export const vendaV2Schema = z.object({ ... });
export type VendaV2FormData = z.infer<typeof vendaV2Schema>;

// Component props
interface Props {
  vendaId: number;
  gerarBoletoAction: (formData: FormData) => Promise<GerarBoletoResult>;
  className?: string;
  children?: React.ReactNode;
}

// State types
interface ProdutoItem {
  produtoNome: string;
  custoProduto: number;
  valorVenda: number;
  quantidade: number;
  subtotal: number;
}
```

**Type Guards:**
```typescript
// Discriminated unions in responses
const err = error as Error & { code?: string };
if (err?.code === "P2003") { ... }

// Type narrowing with instanceof
const msg = err instanceof Error ? err.message : String(err);
```

## Server Actions Patterns

**Location:** `src/app/*/actions.ts` with `"use server"` directive at top

**Structure:**
1. Validation (Zod schema with `safeParse`)
2. Database operations (Prisma transactions for complex operations)
3. Side effects (revalidatePath, audit logs, external APIs)
4. Return ActionResponse

**Validation Pattern:**
```typescript
// src/lib/validations/venda.ts
const parsed = vendaV2Schema.safeParse(raw);
if (!parsed.success) {
  const firstError = parsed.error.flatten().fieldErrors;
  const msg = Object.values(firstError).flat().find(Boolean) || parsed.error.message;
  return errorResponse(String(msg || "Dados inválidos"));
}
const { field1, field2 } = parsed.data; // Safe to use now
```

**Database Transactions:**
```typescript
// Wrap multiple operations in transaction for atomicity
const venda = await prisma.$transaction(async (tx) => {
  const vendaCriada = await tx.venda.create({ ... });
  await tx.itemVenda.createMany({ ... });
  await tx.parcelaVencimento.createMany({ ... });
  await tx.produto.updateMany({ ... });
  return vendaCriada;
});
```

**Cache Invalidation:**
```typescript
revalidatePath("/venda-rapida");
revalidatePath("/historico");
revalidatePath("/dashboard");
```

## Prisma Usage Conventions

**Client Initialization:**
```typescript
// src/lib/db.ts - Singleton pattern with hot reload prevention
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Query Patterns:**
- Select specific fields: `select: { id: true, nome: true, email: true }`
- Filter with findUnique for single records: `findUnique({ where: { id } })`
- Use findMany with where for lists: `findMany({ where: { clienteId } })`
- Include relations when needed: `include: { vendas: true }`
- Always handle null cases: `cliente ?? null`

**Update Patterns:**
```typescript
// Increment/decrement operators
await tx.produto.updateMany({
  where: { nome: p.produtoNome },
  data: { qtdEstoque: { decrement: p.quantidade } },
});
```

## Component Patterns (shadcn/ui + Tailwind)

**Component Files:**
- Naming: `ComponentName.tsx` (PascalCase)
- Client components: `"use client"` directive at top
- Props interface: Always define `interface Props` for clarity
- Exports: Named exports for most components, default for page components

**Styling Pattern:**
```typescript
// src/components/theme-toggle.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Utility helper for dynamic classes
className={cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  className
)}
```

**Tailwind Extensions:**
- Colors use CSS variables: `bg-primary`, `text-muted-foreground`
- Custom spacing: `space-y-form-gap`, `p-card-padding`
- Z-index tailwind: `z-[9999]` for overlays/dropdowns
- Responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Dark mode: Uses `dark:` prefix for dark theme styles

**Form State Management:**
```typescript
// Local state with useState
const [clienteQuery, setClienteQuery] = useState('');
const [selectedCliente, setSelectedCliente] = useState<{id: number, nome: string} | null>(null);

// Effects for side effects
useEffect(() => {
  if (selectedCliente) {
    fetch(`/api/clientes/${selectedCliente.id}/limite`)
      .then(res => res.json())
      .then(data => setLimiteData(data));
  }
}, [selectedCliente]);

// Debounced search
const debounceTimer = useRef<NodeJS.Timeout | null>(null);
```

**UI Component Usage:**
- Card: `<Card variant="elevated">` with CardHeader, CardContent, CardTitle
- Input: `<Input type="text" placeholder="..." />`
- Button: `<Button variant="outline" size="sm">Click</Button>`
- Select: Custom `FormSelect` component (see `src/components/form-select.tsx`)
- Toast: `toast.success()`, `toast.error()`, `toast.warning()`
- Icons: Lucide React (`import { User, Package, Calendar } from "lucide-react"`)

## Logging

**Framework:** `console` API with structured messages

**Patterns:**
- Error logging: `console.error("Context:", error)` - used in Server Actions and API routes
- Debug info: `console.log(...)` - used during development, often commented out in production code
- No centralized logging service detected; using direct console calls

**Guidelines:**
- Log errors with context before re-throwing or returning error response
- Include relevant IDs and data for debugging: `console.error("Erro ao gerar boleto Asaas:", err)`
- Never log sensitive data (passwords, tokens, full customer details)

## Comments

**When to Comment:**
- Schema documentation: Comments above Zod schemas explain purpose and business rules
- Complex calculations: Business logic comments (e.g., "Regra dia 20")
- TODO/FIXME marked for known issues (but ESLint ignores scripts/ and src/generated/)

**JSDoc/TSDoc:**
Used minimally, mainly for:
- Server Action docstrings explaining parameters and return types
- Function docstrings for complex utility functions (e.g., `calcularPrimeiroVencimento`)
- Action function comments explaining old vs new format

**Example:**
```typescript
/**
 * Calcula o primeiro vencimento do boleto/parcela:
 * - Compra até dia 20 → dia 10 do próximo mês
 * - Compra após dia 20 → dia 10 do mês subsequente (dois meses à frente)
 */
export function calcularPrimeiroVencimento(dataCompra: Date): Date {
  // ...
}

/**
 * Nova action com suporte a múltiplos produtos e parcelas com datas
 */
export async function criarVendaV2(formData: FormData): Promise<ActionResponse<...>> {
  // ...
}
```

## Function Design

**Size:** Functions kept under 100 lines for readability; complex operations split into smaller helpers

**Parameters:**
- Prefer objects over multiple parameters: `{ vendaId, gerarBoletoAction, className }`
- Use destructuring in function signatures
- FormData used for Server Actions: `async function criarVenda(formData: FormData)`

**Return Values:**
- Typed returns: `Promise<ActionResponse<T>>` for Server Actions
- Nullable returns: `Cliente | null` when record may not exist
- Never silently return undefined; always explicit

## Module Design

**Exports:**
- Named exports for utilities: `export function formatBRL(...)`, `export function cn(...)`
- Type exports: `export type ActionResponse<T> = { ... }`
- Default exports used only for page components
- Barrel files: `src/components/ui/` has index files for exporting shadcn components

**Structure:**
```typescript
// 1. Imports
import { ... } from "@/lib/...";

// 2. Types/Interfaces
interface Props { ... }
type ApiResponse = { ... };

// 3. Exports
export function myFunction() { ... }
export const myConstant = "value";

// 4. Internal helpers (if any)
function internalHelper() { ... }
```

**Lib Organization:**
- `validations/`: Zod schemas organized by domain (`venda.ts`, `cliente.ts`, `produto.ts`)
- `lib/`: Utility functions grouped by concern (db, utils, masks, whatsapp, asaas, ai-actions)
- `components/ui/`: shadcn components (auto-generated from shadcn CLI)
- `components/`: Domain-specific components (venda-rapida-form, clientes-tab, etc.)

---

*Convention analysis: 2026-03-30*
