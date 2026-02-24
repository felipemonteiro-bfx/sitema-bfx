# Testing Patterns

**Analysis Date:** 2026-02-19

## Test Framework

**Runner:**
- Playwright v1+ (inferred from test file syntax)
- Location: `tests/` directory at project root
- Config: Not explicitly configured (using Playwright defaults)

**Assertion Library:**
- Playwright built-in expect() assertions: `expect(element).toBeVisible()`

**Run Commands:**
```bash
npx playwright test                    # Run all tests
npx playwright test --headed           # Run with UI visible
npx playwright test --debug            # Debug mode
npx playwright test --grep "pattern"   # Run matching tests
```

## Test File Organization

**Location:**
- Separate test directory: `tests/` at project root (not co-located)
- Test files not in `src/` directory structure

**Naming:**
- Pattern: `feature-name.spec.ts`
- Example: `venda-rapida-dropdown.spec.ts`
- Extension: `.spec.ts` (not `.test.ts`)

**Structure:**
```
tests/
├── venda-rapida-dropdown.spec.ts
└── screenshots/              # Generated during test run
```

## Test Structure

**Suite Organization:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Terminal de Vendas - Dropdown Z-Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/venda-rapida');
    await page.waitForLoadState('networkidle');
  });

  test('Client dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    // Test implementation
  });

  test('Produto dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    // Test implementation
  });
});
```

**Patterns:**
- `test.describe()` groups related tests by feature
- `test.beforeEach()` runs setup before each test (navigation, page load)
- `test()` function defines individual test case
- Tests are async and use `await` for all page interactions

## Test Types Present

**E2E Tests:**
- Framework: Playwright
- Scope: User interactions and UI behavior (not unit tests)
- Approach: Navigate to page → perform action → assert result
- Example test checks z-index of dropdown elements

**Example E2E Test:**
```typescript
test('Cliente dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
  // 1. Find and interact with element
  const clienteInput = page.locator('input[placeholder*="nome ou CPF"]');
  await clienteInput.fill('Maria');
  await page.waitForTimeout(500); // Aguardar debounce

  // 2. Verify visibility
  const dropdown = page.locator('div.absolute.z-\\[9999\\]').first();
  await expect(dropdown).toBeVisible();

  // 3. Check computed styles
  const zIndex = await dropdown.evaluate((el) => {
    return window.getComputedStyle(el).zIndex;
  });
  expect(parseInt(zIndex)).toBeGreaterThan(1000);

  // 4. Screenshot for debugging
  await page.screenshot({
    path: 'tests/screenshots/cliente-dropdown.png',
    fullPage: true
  });
});
```

## Selectors

**Patterns:**
- Attribute selectors: `input[placeholder*="nome ou CPF"]`
- CSS classes: `div.absolute.z-\\[9999\\]`
- nth-child navigation: `.nth(1)` for multiple matching elements
- Custom roles: `page.locator('div.Card')`

**Best Practices:**
- Use semantic attributes (placeholder) when available
- Escape square brackets in Tailwind classes: `z-\\[9999\\]`
- Use `.first()` or `.nth(n)` for multiple matches

## Page Interactions

**Navigation:**
```typescript
await page.goto('http://localhost:3000/venda-rapida');
await page.waitForLoadState('networkidle');  // Wait for network idle
```

**User Input:**
```typescript
const input = page.locator('input[placeholder*="nome ou CPF"]');
await input.fill('Maria');
await page.waitForTimeout(500);  // Wait for debounce
```

**Assertions:**
```typescript
await expect(element).toBeVisible();
const zIndex = await element.evaluate((el) => window.getComputedStyle(el).zIndex);
expect(parseInt(zIndex)).toBeGreaterThan(1000);
```

**Screenshots:**
```typescript
await page.screenshot({
  path: 'tests/screenshots/elemento.png',
  fullPage: true
});
```

## Test Data & Fixtures

**No Explicit Fixtures:** Tests use live application state
- Navigate to running application (http://localhost:3000)
- Interact with actual database/form fields
- No mock data or factories observed

**Test Setup:**
- `beforeEach()` used for common setup (navigation)
- Each test creates its own state by user interaction
- No cleanup hooks observed (tests appear independent)

## Coverage

**Requirements:** Not enforced (no coverage config found)

**Current Status:**
- Only 1 test file present: `venda-rapida-dropdown.spec.ts`
- Tests are E2E/integration only (no unit test suite)
- No coverage reports generated

## Debugging Tools

**Screenshots:**
- Generated during test run with `page.screenshot()`
- Saved to `tests/screenshots/` directory
- Full page captures for visual debugging

**Console Output:**
```typescript
console.log('Cliente dropdown z-index:', zIndex);
console.log(`Total de cards encontrados: ${count}`);
```

**Playwright Inspector:**
```bash
npx playwright test --debug  # Opens inspector
```

## Test Isolation

**Page Context:**
- Each test runs with its own browser page
- No shared state between tests (new page instance per test)
- `beforeEach()` ensures consistent starting state

**Server State:**
- Tests hit live application state
- Database changes may persist (no automatic rollback)
- Tests should be independent and not rely on execution order

## Known Gaps

**Not Tested:**
- Unit tests: No test framework for individual functions (validations, utilities)
- Component testing: No component test suite (Jest, Vitest, React Testing Library)
- API endpoint testing: No direct API route tests
- Form validation: No specific tests for Zod schema validation
- Error scenarios: No tests for error states or edge cases

**To Add (Future):**
- Unit tests for: `finance.ts`, `ai-actions.ts`, `utils.ts` functions
- Component tests for form interactions
- Error boundary and error state testing
- Accessibility tests (a11y)
- Performance testing (Lighthouse integration)

## Running Tests

**Prerequisites:**
- Application running on http://localhost:3000
- Test environment variables configured
- Playwright browsers installed

**Execute:**
```bash
# Start dev server first
npm run dev

# In another terminal
npx playwright test
```

**Parallel Execution:**
- Playwright runs tests in parallel by default
- Can configure workers via `playwright.config.ts` (not present)

## CI/CD Integration

**Current Setup:** Not detected

**To Implement:**
- GitHub Actions workflow to run Playwright tests
- Run tests on PR/push to ensure no regressions
- Generate test reports and upload artifacts

---

*Testing analysis: 2026-02-19*
