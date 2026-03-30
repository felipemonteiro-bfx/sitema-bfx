# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Runner:**
- Playwright (`@playwright/test`)
- Single test file found: `tests/venda-rapida-dropdown.spec.ts`
- No unit/integration test framework detected (Jest, Vitest not installed)

**Assertion Library:**
- Playwright assertions (`expect()` from `@playwright/test`)

**Run Commands:**
- No test scripts defined in `package.json`
- Tests are E2E only, run manually via `npx playwright test`

## Test File Organization

**Location:**
- E2E tests: `tests/` directory at project root
- Pattern: `*.spec.ts` for Playwright tests

**Naming:**
- Playwright spec pattern: `tests/[feature]-[aspect].spec.ts`
- Example: `tests/venda-rapida-dropdown.spec.ts`

**Structure:**
```
tests/
├── venda-rapida-dropdown.spec.ts  # Z-index/dropdown tests
└── screenshots/                    # Generated during test runs
```

## Test Structure

**Suite Organization:**
```typescript
// tests/venda-rapida-dropdown.spec.ts (full file shown below)
import { test, expect } from '@playwright/test';

test.describe('Terminal de Vendas - Dropdown Z-Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008/venda-rapida');
    await page.waitForLoadState('networkidle');
  });

  test('Cliente dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    const clienteInput = page.locator('input[placeholder*="nome ou CPF"]');
    await clienteInput.fill('Maria');
    await page.waitForTimeout(500); // Aguardar debounce
    const dropdown = page.locator('div.absolute.z-\\[9999\\]').first();
    await expect(dropdown).toBeVisible();
  });
});
```

**Patterns:**

1. **Setup Pattern:**
   - `test.beforeEach()` for common setup (navigation, waitForLoadState)
   - Waits for `networkidle` before running tests

2. **Interaction Pattern:**
   - `page.locator()` for element selection (CSS selectors, placeholders)
   - `.fill()` for input
   - `.scrollIntoViewIfNeeded()` for scrolling to element
   - `.evaluate()` for executing JavaScript in browser context

3. **Assertion Pattern:**
   - `expect(element).toBeVisible()` for visibility checks
   - `expect(parseInt(zIndex)).toBeGreaterThan(1000)` for computed values
   - Screenshots for debugging: `page.screenshot({ path: 'tests/screenshots/...' })`

4. **Debugging/Verification Pattern:**
   - `console.log()` for test output
   - Browser API access: `window.getComputedStyle(el).zIndex`
   - Screenshot generation for visual verification

## Mocking

**Framework:** None detected; tests are fully integrated E2E tests

**Patterns:**
- No mocking service - tests hit real application instance
- API endpoints tested via real HTTP requests to `http://localhost:3008`

**What to Mock:**
- External services (Asaas, WhatsApp, Evolution) - not tested in current suite
- Database - not tested in current suite (would need separate unit test setup)

**What NOT to Mock:**
- UI rendering (Playwright tests real DOM)
- DOM interactions
- Navigation and routing
- Local application state

## Fixtures and Factories

**Test Data:**
- Not found in codebase
- E2E tests use real data from running application

**Location:**
- Fixtures would go in `tests/fixtures/` if created
- Factory functions would go in `tests/factories/` if created

**Current approach:**
- Tests work with existing database data
- Search by real user input ("Maria" for cliente, "Shampoo" for produto)
- No setup/teardown of test-specific data detected

## Coverage

**Requirements:** No coverage configuration detected

**View Coverage:**
- No coverage tool configured
- Would require adding Jest/Vitest and coverage collection

## Test Types

**Unit Tests:**
- Not present in codebase
- Would test: validation schemas (Zod), utility functions (`formatBRL`, `maskCpf`), calculations

**Integration Tests:**
- Not present in codebase
- Would test: Server Actions with database, API routes with auth, form submission workflows

**E2E Tests:**
- Framework: Playwright
- File: `tests/venda-rapida-dropdown.spec.ts`
- Scope: Browser-level UI interactions
- Focus: Z-index stacking (dropdowns appearing above cards)

**Existing E2E Test Details:**
```typescript
// tests/venda-rapida-dropdown.spec.ts (lines 1-79)
import { test, expect } from '@playwright/test';

test.describe('Terminal de Vendas - Dropdown Z-Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008/venda-rapida');
    await page.waitForLoadState('networkidle');
  });

  test('Cliente dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    // 1. Fill cliente input to trigger dropdown
    const clienteInput = page.locator('input[placeholder*="nome ou CPF"]');
    await clienteInput.fill('Maria');
    await page.waitForTimeout(500); // Debounce wait

    // 2. Verify dropdown is visible
    const dropdown = page.locator('div.absolute.z-\\[9999\\]').first();
    await expect(dropdown).toBeVisible();

    // 3. Check computed z-index value
    const zIndex = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    console.log('Cliente dropdown z-index:', zIndex);
    expect(parseInt(zIndex)).toBeGreaterThan(1000);

    // 4. Take screenshot for debugging
    await page.screenshot({
      path: 'tests/screenshots/cliente-dropdown.png',
      fullPage: true
    });
  });

  test('Produto dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    const produtoInput = page.locator('input[placeholder*="produto por nome"]');
    await produtoInput.scrollIntoViewIfNeeded();
    await produtoInput.fill('Shampoo');
    await page.waitForTimeout(500);

    const dropdown = page.locator('div.absolute.z-\\[9999\\]').nth(1);
    await expect(dropdown).toBeVisible();

    const zIndex = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    console.log('Produto dropdown z-index:', zIndex);

    await page.screenshot({
      path: 'tests/screenshots/produto-dropdown.png',
      fullPage: true
    });
  });

  test('Verificar stack context dos cards', async ({ page }) => {
    const cards = page.locator('div[class*="Card"]');
    const count = await cards.count();

    console.log(`Total de cards encontrados: ${count}`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const card = cards.nth(i);
      const zIndex = await card.evaluate((el) => {
        return window.getComputedStyle(el).zIndex;
      });
      console.log(`Card ${i} z-index:`, zIndex);
    }

    await page.screenshot({
      path: 'tests/screenshots/cards-stack.png',
      fullPage: true
    });
  });
});
```

## Common Patterns

**Async Testing:**
```typescript
// Playwright tests are async by default
test('test name', async ({ page }) => {
  await page.goto('...');
  await page.fill('...', 'value');
  await expect(element).toBeVisible();
});

// Wait patterns
await page.waitForLoadState('networkidle'); // Network idle
await page.waitForTimeout(500);              // Fixed delay (for debounce)
await element.scrollIntoViewIfNeeded();      // Scroll before interaction
```

**Browser Evaluation:**
```typescript
// Execute JavaScript in browser context
const zIndex = await dropdown.evaluate((el) => {
  return window.getComputedStyle(el).zIndex;
});

// Count elements
const count = await cards.count();

// Iterate over matching elements
for (let i = 0; i < count; i++) {
  const card = cards.nth(i);
  // Test each card
}
```

**Screenshot/Debug Pattern:**
```typescript
await page.screenshot({
  path: 'tests/screenshots/feature-name.png',
  fullPage: true
});
```

## Coverage Gaps

**Untested Areas:**

**Server Actions:**
- Files: `src/app/*/actions.ts` (criarVenda, criarVendaV2, updateVenda, etc.)
- What's not tested: Validation logic, error handling, database transactions, Asaas/WhatsApp integrations
- Risk: Schema changes, business logic bugs, integration failures go undetected
- Priority: HIGH - Most critical business logic

**API Routes:**
- Files: `src/app/api/**/route.ts`
- What's not tested: Authentication guards, response formats, error responses, WebHook handling
- Risk: API contract violations, security bypasses
- Priority: HIGH

**Utility Functions:**
- Files: `src/lib/utils.ts`, `src/lib/validations/*`
- What's not tested: Mask functions (maskCpf, maskTel), validation schemas, date calculations
- Risk: Data formatting errors, validation bypasses
- Priority: MEDIUM

**Component Integration:**
- Files: `src/components/*-client.tsx`, `src/components/*-form.tsx`
- What's not tested: Form submissions, error display, toast notifications, loading states
- Risk: UI flows broken, error messages not shown to users
- Priority: MEDIUM

**Database Queries:**
- Pattern: Prisma queries in Server Actions and lib files
- What's not tested: Transaction rollbacks, constraint violations, query performance
- Risk: Silent data corruption, slow operations not detected
- Priority: MEDIUM

**Validation Schemas:**
- Files: `src/lib/validations/*.ts` (venda.ts, cliente.ts, produto.ts)
- What's not tested: Zod schema validation, edge cases (negative numbers, invalid dates)
- Risk: Invalid data accepted, type errors at runtime
- Priority: MEDIUM

**Authentication/Authorization:**
- Pattern: `requireAdmin()` guard in API routes
- What's not tested: Session handling, role-based access, token validation
- Risk: Unauthorized access possible
- Priority: HIGH

**External Integrations:**
- Asaas (boletos): NOT TESTED - real API calls only, no mock
- WhatsApp (Evolution): NOT TESTED - real API calls only, no mock
- MinIO (file upload): NOT TESTED
- Risk: Integration failures discovered in production only
- Priority: HIGH

## Test Patterns to Follow When Adding Tests

**Unit Tests for Utilities:**
```typescript
// Example structure for src/lib/utils.ts tests
import { formatBRL, maskCpf } from '@/lib/utils';

describe('formatBRL', () => {
  it('should format number as BRL currency', () => {
    expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
  });

  it('should handle null/undefined', () => {
    expect(formatBRL(null)).toBe('R$ 0,00');
    expect(formatBRL(undefined)).toBe('R$ 0,00');
  });
});

describe('maskCpf', () => {
  it('should format 11-digit string as CPF', () => {
    expect(maskCpf('12345678901')).toBe('123.456.789-01');
  });

  it('should return original value if wrong length', () => {
    expect(maskCpf('123')).toBe('123');
  });
});
```

**Schema Validation Tests:**
```typescript
// Example for src/lib/validations/venda.ts tests
import { vendaV2Schema } from '@/lib/validations/venda';

describe('vendaV2Schema', () => {
  it('should validate correct venda data', () => {
    const data = {
      data: '2026-03-30',
      vendedor: 'João',
      clienteId: 1,
      frete: 10,
      envio: 5,
      parcelas: 3,
      temNota: false,
      taxaNota: 5.97,
      produtos: [{ produtoNome: 'Item', custoProduto: 10, valorVenda: 20, quantidade: 1, subtotal: 20 }],
    };
    const result = vendaV2Schema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const data = { vendedor: 'João' };
    const result = vendaV2Schema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

**Server Action Tests:**
```typescript
// Example structure (would require Node test runner or Jest setup)
import { criarVendaV2 } from '@/app/(app)/venda-rapida/actions';

describe('criarVendaV2', () => {
  it('should create venda with valid data', async () => {
    const formData = new FormData();
    formData.set('data', '2026-03-30');
    // ... set other fields

    const result = await criarVendaV2(formData);
    expect(result.success).toBe(true);
    expect(result.data?.vendaId).toBeGreaterThan(0);
  });

  it('should return error for invalid data', async () => {
    const formData = new FormData();
    // Missing required fields

    const result = await criarVendaV2(formData);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    // Mock Prisma to throw error
    const formData = new FormData();
    // ... set fields

    const result = await criarVendaV2(formData);
    expect(result.success).toBe(false);
  });
});
```

**E2E Test Pattern for New Features:**
```typescript
// Example for new feature test
import { test, expect } from '@playwright/test';

test.describe('Nova Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3008/nova-feature');
    await page.waitForLoadState('networkidle');
  });

  test('should display form elements', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();

    const input = page.locator('input[name="fieldName"]');
    await expect(input).toBeVisible();
  });

  test('should submit form and show success', async ({ page }) => {
    const input = page.locator('input[name="fieldName"]');
    await input.fill('test value');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const success = page.locator('text=Success');
    await expect(success).toBeVisible();
  });

  test('should show error for invalid input', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    const error = page.locator('text=Error');
    await expect(error).toBeVisible();
  });
});
```

---

*Testing analysis: 2026-03-30*
