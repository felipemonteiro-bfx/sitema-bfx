# Testing Patterns

**Analysis Date:** 2026-02-05

## Test Framework

**Status:** No testing framework configured

**Finding:**
- No test files detected (no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files found in codebase)
- No Jest, Vitest, or other test runner config files present
- No test dependencies in `package.json`
- This codebase does not currently have automated tests

**Current State:**
- Development and production validation rely on runtime checks
- Error handling uses try-catch and console logging for debugging
- Manual testing is likely the primary validation method

## Test Structure (If Implemented)

**Recommended Approach:**
Based on the codebase architecture, when tests are added:

**Location Pattern:**
- Co-locate test files: `src/lib/__tests__/`, `src/components/__tests__/`
- Or parallel structure: `tests/unit/`, `tests/integration/`

**Naming Convention:**
- `*.test.ts` for unit tests
- `*.test.tsx` for component tests
- `*.integration.test.ts` for integration tests

**Structure (Template):**
```typescript
// src/lib/__tests__/utils.test.ts
describe('utils', () => {
  describe('formatBRL', () => {
    it('should format number as BRL currency', () => {
      // Test implementation
    });
  });

  describe('maskCpf', () => {
    it('should mask CPF correctly', () => {
      // Test implementation
    });
  });
});
```

## Mocking Patterns

**Current Mocking Strategy (No Test Framework):**
Inference from production code:

**Database Mocking:**
- Uses real Prisma client in development/production
- No mock database layer detected
- Would need to mock Prisma calls in tests if implemented

**Module Mocking Pattern (If Using Jest):**
```typescript
// Example pattern for mocking @/lib/db
jest.mock('@/lib/db', () => ({
  prisma: {
    usuario: { findUnique: jest.fn() },
    venda: { findMany: jest.fn() },
  },
}));
```

**AI Service Mocking:**
- `@/lib/ai.ts` calls external LLM APIs (OpenAI, Gemini)
- Would need HTTP mocking (MSW, nock) or function mocks for tests
- Mock data should return consistent responses for reliability

**Session/Auth Mocking:**
- `getSession()` from `@/lib/session.ts` retrieves JWT from cookies
- Tests would need to mock `jose` library and cookie handling
- Example pattern:
  ```typescript
  jest.mock('@/lib/session', () => ({
    getSession: jest.fn().mockResolvedValue({
      id: 1,
      username: 'test',
      role: 'admin',
    }),
  }));
  ```

## What to Mock

**External Services:**
- OpenAI API calls
- Google Gemini API calls
- Database operations (Prisma)
- File uploads/downloads
- JWT token creation/verification

**Should NOT Mock (Test Integration):**
- Utility functions (`formatBRL`, `maskCpf`, etc.)
- Local business logic (`calcularDre`, `calcularFluxoCaixa`)
- Error handling flows
- Validation logic (Zod schemas)

## Fixtures and Factories

**Current Pattern (No Test Framework):**
No test fixtures or factories exist.

**Recommended Implementation:**
```typescript
// tests/factories/usuario.factory.ts
export function createUsuario(overrides = {}) {
  return {
    id: 1,
    username: 'vendedor',
    password: 'password123',
    role: 'vendedor',
    nomeExibicao: 'João Silva',
    metaMensal: 50000,
    comissaoPct: 2,
    ...overrides,
  };
}

// tests/factories/venda.factory.ts
export function createVenda(overrides = {}) {
  return {
    id: 1,
    uuid: 'uuid-xxx',
    dataVenda: new Date('2026-01-15'),
    vendedor: 'João Silva',
    clienteId: 1,
    produtoNome: 'iPhone 15',
    custoProduto: 2000,
    valorVenda: 3500,
    valorFrete: 50,
    custoEnvio: 30,
    parcelas: 3,
    valorParcela: 1166.67,
    antecipada: 1,
    ...overrides,
  };
}

// tests/factories/config.factory.ts
export function createConfig(overrides = {}) {
  return {
    id: 1,
    openaiKey: 'sk-test-key',
    geminiKey: 'test-gemini-key',
    ...overrides,
  };
}
```

**Test Data Location:**
- `tests/fixtures/` for static test data (JSON)
- `tests/factories/` for dynamic test data generators
- `tests/mocks/` for mock implementations

## Coverage

**Current Status:** Not tracked

**Recommended Requirements (When Implemented):**
- Utility functions: 100% coverage required (`@/lib/utils.ts`)
- Business logic: 80%+ coverage (`@/lib/finance.ts`, `@/lib/ai.ts`)
- API routes: 80%+ coverage
- Component rendering: 60%+ coverage
- Overall target: 75%+

**View Coverage (When Implemented):**
```bash
# After Jest/Vitest setup
npm run test:coverage
# or
yarn test --coverage
```

## Test Types Observed in Code

### Unit Tests (Should Implement)

**Utilities Testing:**
- `maskCpf()`, `maskCnpj()`, `maskTel()`, `maskCep()`
  ```typescript
  describe('maskCpf', () => {
    it('should format valid CPF', () => {
      expect(maskCpf('12345678900')).toBe('123.456.789-00');
    });
    it('should return original if invalid length', () => {
      expect(maskCpf('123')).toBe('123');
    });
  });
  ```

- `formatBRL()` for currency formatting
- `cleanStr()` for string sanitization

**Validation Testing:**
- Zod schemas from `ai-actions.ts`:
  ```typescript
  describe('actionParamSchemas', () => {
    it('should validate listar_vendas params', () => {
      const schema = actionParamSchemas.listar_vendas;
      expect(() => schema.parse({ limit: 'invalid' })).toThrow();
      expect(schema.parse({ limit: 10 })).toEqual({ limit: 10 });
    });
  });
  ```

**Business Logic Testing:**
- `calcularDre()` with mock data
- `calcularFluxoCaixa()` with known date ranges
- `calcularTaxaPercent()`, `calcularPrazoMedioDias()` (private helpers)

### Integration Tests (Should Implement)

**API Route Testing:**
```typescript
describe('POST /api/auth/login', () => {
  it('should return error for missing credentials', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should create session token on valid login', async () => {
    // Mock Prisma user lookup
    // Verify session cookie is set
  });
});
```

**Database Operations:**
- Test Prisma queries with test database
- Verify transactions work correctly
- Test error handling for database failures

### E2E Tests

**Status:** Not used

**Would test (if implemented):**
- Complete user workflows (login → create venda → view relatório)
- Form submissions and validation
- AI chat interactions
- Report generation (PDF/CSV)

## Error Handling in Tests (Patterns)

**Current Code Pattern (No Tests):**
Errors are handled at runtime with try-catch:

```typescript
// From logo-upload-form.tsx
try {
  const response = await fetch("/api/upload-logo", {
    method: "POST",
    body: formData,
  });
  if (response.ok) {
    alert("Logo enviada com sucesso!");
  } else {
    const errorData = await response.json();
    alert(`Falha ao enviar logo: ${errorData.error}`);
  }
} catch (error) {
  console.error("Erro ao enviar logo:", error);
  alert("Erro de rede ou servidor ao enviar logo.");
}
```

**Test Pattern (When Implemented):**
```typescript
it('should handle API errors gracefully', async () => {
  const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
  global.fetch = mockFetch;

  // Test component/function behavior
  // Verify error message is displayed
  expect(mockFetch).toHaveBeenCalled();
});
```

## Async Testing Pattern (Inference)

**Code Using Async/Await (Current):**
```typescript
// From antecipacao-client.tsx
const handleAction = async (formData: FormData) => {
  const idsParam = selectedIds.join(',');
  try {
    const result = await onSubmit(formData, idsParam);
    // Handle result
  } catch (error) {
    console.error("Erro na antecipação:", error);
  }
};
```

**Test Pattern (When Implemented with Jest/Vitest):**
```typescript
it('should handle async submission', async () => {
  const mockSubmit = jest.fn().mockResolvedValue({ success: true });

  // Render component or call function
  // Trigger async operation

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalled();
  });
});
```

## Test Commands (Recommended Setup)

```bash
# When test framework is added to package.json
yarn test                    # Run all tests
yarn test --watch           # Watch mode
yarn test --coverage        # Coverage report
yarn test src/lib/utils     # Test specific file

# By test type
yarn test --testNamePattern="unit"
yarn test --testNamePattern="integration"
```

## Recommended Testing Stack

**Based on codebase analysis:**

1. **Test Runner:** Vitest (faster for TypeScript/React, ESM-first)
   - Or Jest with ts-jest preset

2. **React Component Testing:** React Testing Library
   - Already pattern-consistent with component design

3. **HTTP Mocking:** MSW (Mock Service Worker)
   - For API route testing and external service calls

4. **Database Testing:** Test database (SQLite/PostgreSQL test instance)
   - Or Prisma mock adapter when available

5. **Coverage:** Built-in coverage tools

**Setup priority:**
1. Unit tests for `src/lib/` utilities and business logic
2. API route tests for `src/app/api/`
3. Component tests for `src/components/` (high-complexity components)
4. Integration tests for workflows

---

*Testing analysis: 2026-02-05*
