# Testing Patterns

**Analysis Date:** 2026-08-03

## Test Framework

**Runner:**
- vitest 4.1.2
- Config: `vitest.config.ts`
- Environment: Node.js
- Globals enabled (describe, it, expect available without imports)

**Assertion Library:**
- Vitest built-in `expect()` from `vitest` package

**Run Commands:**
```bash
npm test                # Run all tests once
npm run test:watch      # Watch mode with auto-rerun
```

**Test Discovery:**
- Pattern: `src/__tests__/**/*.test.ts`
- Config in `vitest.config.ts`: `include: ["src/__tests__/**/*.test.ts"]`

## Test File Organization

**Location:**
- Tests co-located in `src/__tests__/` directory
- Each test file named `[module-name].test.ts`
- Example: `src/__tests__/venda-item-validation.test.ts`

**Current Test Files:**
- `src/__tests__/env-validation.test.ts` — Environment validation
- `src/__tests__/asaas.test.ts` — Asaas configuration
- `src/__tests__/session-secret.test.ts` — Session secret handling
- `src/__tests__/venda-item-validation.test.ts` — Business rule validation (REFERENCE PATTERN)
- `src/__tests__/guards.test.ts` — Authorization guards with mocking
- `src/__tests__/comissoes-utils.test.ts` — Commission filtering/scoping
- `src/__tests__/vendedor-scope.test.ts` — Vendor scope logic
- `src/__tests__/recibo-url.test.ts` — Receipt URL generation
- `src/__tests__/credit.test.ts` — Credit checking with mocking

**Naming:**
- Test files: `[name].test.ts` (not `.spec.ts`)
- Test suites: describe blocks named descriptively

## Test Structure

**Suite Organization (Reference Pattern):**

```typescript
// From src/__tests__/venda-item-validation.test.ts

import { describe, it, expect } from "vitest";
import { validarItensContraCatalogo } from "@/lib/venda-item-validation";

// Optional factory helper for creating test data
function item(overrides: Partial<Parameters<typeof validarItensContraCatalogo>[0][number]> = {}) {
  return {
    produtoNome: "Fone Bluetooth X",
    custoProduto: 100,
    valorVenda: 200,
    quantidade: 1,
    subtotal: 200,
    ...overrides,
  };
}

describe("validarItensContraCatalogo", () => {
  // Each test case in its own it() block
  it("aceita item consistente sem correspondencia no catalogo (produto avulso)", () => {
    const erro = validarItensContraCatalogo([item()], []);
    expect(erro).toBeNull();
  });

  it("rejeita quando subtotal nao bate com valorVenda x quantidade", () => {
    const erro = validarItensContraCatalogo(
      [item({ quantidade: 5, valorVenda: 1000, subtotal: 1 })],
      []
    );
    expect(erro).not.toBeNull();
    expect(erro).toMatch(/subtotal/i);
  });
});
```

**Patterns:**

1. **Setup with Factories:**
   - Create helper functions to generate test objects with defaults
   - Use spread operator `...overrides` to customize per test
   - Example: `item({ quantidade: 5, valorVenda: 1000, subtotal: 1 })`

2. **Describe/It Organization:**
   - One `describe()` per function or module
   - One `it()` per test case
   - Test names should describe the scenario (in Portuguese, matching codebase style)

3. **Mocking Setup Pattern (with beforeEach/afterEach):**
   ```typescript
   import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

   vi.mock("@/lib/session", () => ({
     getSession: vi.fn(),
   }));

   import { requireAdmin } from "@/lib/guards";
   import { getSession } from "@/lib/session";

   const mockGetSession = vi.mocked(getSession);

   describe("requireAdmin", () => {
     beforeEach(() => {
       mockGetSession.mockReset(); // Clear mock history
     });

     it("retorna true para admin", async () => {
       mockGetSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
       expect(await requireAdmin()).toBe(true);
     });
   });
   ```

## Mocking

**Framework:** Vitest's `vi` object (from `vitest` package)

**Mocking Pattern:**

1. **Module mocking (at top of file, before imports):**
   ```typescript
   vi.mock("@/lib/db", () => ({
     prisma: {
       cliente: { findUnique: vi.fn() },
       venda: { findMany: vi.fn() },
     },
   }));

   // Now import the mocked module
   import { checkCredito } from "@/lib/credit";
   import { prisma } from "@/lib/db";
   ```

2. **Creating mocked references:**
   ```typescript
   const mockFindUniqueCliente = vi.mocked(prisma.cliente.findUnique);
   const mockFindManyVenda = vi.mocked(prisma.venda.findMany);
   ```

3. **Setting up mock returns:**
   ```typescript
   mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: 1000 } as never);
   mockFindManyVenda.mockResolvedValue([]);
   ```

4. **Resetting mocks between tests:**
   ```typescript
   beforeEach(() => {
     mockFindUniqueCliente.mockReset();
     mockFindManyVenda.mockReset();
   });
   ```

**Example from `src/__tests__/credit.test.ts`:**
```typescript
vi.mock("@/lib/db", () => ({
  prisma: {
    cliente: { findUnique: vi.fn() },
    venda: { findMany: vi.fn() },
  },
}));

import { checkCredito } from "@/lib/credit";
import { prisma } from "@/lib/db";

const mockFindUniqueCliente = vi.mocked(prisma.cliente.findUnique);
const mockFindManyVenda = vi.mocked(prisma.venda.findMany);

describe("checkCredito", () => {
  beforeEach(() => {
    mockFindUniqueCliente.mockReset();
    mockFindManyVenda.mockReset();
  });

  it("libera (ok=true) quando cliente nao tem renda cadastrada", async () => {
    mockFindUniqueCliente.mockResolvedValue({ id: 1, renda: null } as never);
    const result = await checkCredito(1, 500);
    expect(result.ok).toBe(true);
  });
});
```

**What to Mock:**
- External service clients (Prisma, API calls, file storage)
- Database queries (Prisma method calls)
- Environment-dependent code (getSession, auth guards)

**What NOT to Mock:**
- Pure utility functions (formatBRL, maskCpf)
- Validation logic (validarItensContraCatalogo)
- Business calculations
- Internal module dependencies (use real implementations unless testing in isolation)

## Fixtures and Factories

**Test Data Patterns:**

1. **Factory Functions (Preferred):**
   ```typescript
   function item(overrides: Partial<ItemVendaParaValidar> = {}) {
     return {
       produtoNome: "Fone Bluetooth X",
       custoProduto: 100,
       valorVenda: 200,
       quantidade: 1,
       subtotal: 200,
       ...overrides,
     };
   }

   // Use in tests:
   const erro = validarItensContraCatalogo([item({ custoProduto: 50 })], []);
   ```

2. **Inline Test Data:**
   ```typescript
   const params = new URLSearchParams({ vendedor: "Qualquer Um" });
   const where = buildComissoesWhere(params, { role: "admin", nomeExibicao: "Admin", username: "admin" });
   ```

3. **Location:**
   - Define factories inside test file, near the top, after imports
   - Keep factory functions simple and focused on single entity type

## Coverage

**Requirements:** Not enforced; no coverage threshold configured

**View Coverage:**
- Not configured in current setup
- To add: `npm test -- --coverage`

## Test Types

**Unit Tests:**
- Testing pure functions with known inputs/outputs
- Example: `venda-item-validation.test.ts` — tests `validarItensContraCatalogo()` function
- Location: `src/__tests__/`

**Integration Tests:**
- Testing functions that interact with external services (mocked)
- Example: `credit.test.ts` — tests `checkCredito()` with mocked Prisma
- Location: `src/__tests__/`

**E2E Tests:**
- NOT currently implemented
- Would test full user flows in browser

**Async Testing Pattern:**
```typescript
// Simple async function
it("retorna true para admin", async () => {
  mockGetSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
  expect(await requireAdmin()).toBe(true);
});

// Promise rejection testing
it("lanca erro para vendedor", async () => {
  mockGetSession.mockResolvedValue({ id: 2, username: "user", role: "vendedor" });
  await expect(requireAdminOrThrow()).rejects.toThrow("Acesso negado");
});
```

## Common Patterns

**Async Testing:**
```typescript
// Testing async functions
it("retorna config com sandbox como default", async () => {
  const result = getAsaasConfig({ asaasApiKey: "test-key-123", asaasEnv: null });
  expect(result).not.toBeNull();
  expect(result!.apiKey).toBe("test-key-123");
});

// Testing promise rejection
it("lanca erro quando DATABASE_URL ausente", async () => {
  delete (process.env as MutableEnv).DATABASE_URL;
  (process.env as MutableEnv).SKIP_ENV_VALIDATION = "false";
  await expect(import("@/env")).rejects.toThrow("Env vars invalidas");
});
```

**Error Testing:**
```typescript
// Testing error conditions
it("rejeita quando subtotal nao bate", () => {
  const erro = validarItensContraCatalogo(
    [item({ quantidade: 5, valorVenda: 1000, subtotal: 1 })],
    []
  );
  expect(erro).not.toBeNull();
  expect(erro).toMatch(/subtotal/i);
});

// Testing rejection with specific message
it("lanca erro para vendedor", async () => {
  mockGetSession.mockResolvedValue({ id: 2, username: "user", role: "vendedor" });
  await expect(requireAdminOrThrow()).rejects.toThrow("Acesso negado");
});
```

**Module Isolation (vi.resetModules):**
```typescript
// For testing module-level side effects
beforeEach(() => {
  vi.resetModules(); // Clear require cache for fresh import
});

it("validateEnv() aceita env com DATABASE_URL", async () => {
  (process.env as MutableEnv).DATABASE_URL = "postgresql://localhost/test";
  const { validateEnv } = await import("@/env");
  const result = validateEnv();
  expect(result.DATABASE_URL).toBe("postgresql://localhost/test");
});
```

## Coverage Gaps

**Currently NOT Tested:**

**Server Actions (HIGH PRIORITY):**
- Files: `src/app/*/actions.ts` (criarVenda, criarVendaV2, updateVenda, deleteVenda, etc.)
- What's not tested: Full action flow, error handling, database transactions, side effects
- Risk: Business logic bugs, integration failures go undetected
- Reference for testing: Would follow pattern in `venda-item-validation.test.ts` with mocked Prisma

**API Routes (HIGH PRIORITY):**
- Files: `src/app/api/**/route.ts`
- What's not tested: Auth checks, response formatting, error responses
- Risk: API contract violations, security bypasses

**Components (MEDIUM PRIORITY):**
- Files: `src/components/*-client.tsx`, `src/components/*-form.tsx`
- What's not tested: User interactions, form submissions, state management
- Risk: UI flows broken at runtime

**Validation Schemas (MEDIUM PRIORITY):**
- Files: `src/lib/validations/*.ts` (venda.ts, cliente.ts, produto.ts)
- What's not tested: Edge cases, type inference
- Risk: Invalid data accepted

**External Integrations (HIGH PRIORITY):**
- Asaas (boletos): Can test config with mocked HTTP
- WhatsApp (Evolution): Can test API call building with mocks
- MinIO (file upload): Can test client initialization

## Test Conventions (from CLAUDE.md Workflow)

**When writing tests for a feature or bug fix:**

1. **Spec phase (before test):** Document expected behavior, edge cases, error conditions
2. **TDD phase:** Write the failing test first using vitest
3. **Implementation phase:** Write minimal code to make test pass
4. **Review phase:** Dispatch subagent review (Agent tool) before commit

**Test File Template:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Step 1: Mock external dependencies if needed
vi.mock("@/lib/db", () => ({
  prisma: {
    // mocked methods
  },
}));

// Step 2: Import the code to test
import { functionToTest } from "@/lib/module";
import { prisma } from "@/lib/db";

// Step 3: Set up mocks
const mockMethod = vi.mocked(prisma.table.method);

// Step 4: Define test suite
describe("functionToTest", () => {
  // Step 5: Reset mocks before each test
  beforeEach(() => {
    mockMethod.mockReset();
  });

  // Step 6: Write test cases
  it("should do something when condition X", () => {
    mockMethod.mockResolvedValue(testData);
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });

  it("should handle error when Y", () => {
    mockMethod.mockRejectedValue(new Error("DB error"));
    expect(() => functionToTest(input)).toThrow();
  });
});
```

---

*Testing analysis: 2026-08-03*
