import { test, expect } from '@playwright/test';

test.describe('Terminal de Vendas - Dropdown Z-Index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/venda-rapida');
    await page.waitForLoadState('networkidle');
  });

  test('Cliente dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    // Digitar no campo de cliente para abrir dropdown
    const clienteInput = page.locator('input[placeholder*="nome ou CPF"]');
    await clienteInput.fill('Maria');
    await page.waitForTimeout(500); // Aguardar debounce

    // Verificar se dropdown está visível
    const dropdown = page.locator('div.absolute.z-\\[9999\\]').first();
    await expect(dropdown).toBeVisible();

    // Verificar z-index computado
    const zIndex = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    console.log('Cliente dropdown z-index:', zIndex);
    expect(parseInt(zIndex)).toBeGreaterThan(1000);

    // Screenshot para debug
    await page.screenshot({
      path: 'tests/screenshots/cliente-dropdown.png',
      fullPage: true
    });
  });

  test('Produto dropdown deve aparecer acima de todos os elementos', async ({ page }) => {
    // Rolar até o campo de produto
    const produtoInput = page.locator('input[placeholder*="produto por nome"]');
    await produtoInput.scrollIntoViewIfNeeded();

    // Digitar para abrir dropdown
    await produtoInput.fill('Shampoo');
    await page.waitForTimeout(500);

    // Verificar dropdown
    const dropdown = page.locator('div.absolute.z-\\[9999\\]').nth(1);
    await expect(dropdown).toBeVisible();

    const zIndex = await dropdown.evaluate((el) => {
      return window.getComputedStyle(el).zIndex;
    });
    console.log('Produto dropdown z-index:', zIndex);

    // Screenshot
    await page.screenshot({
      path: 'tests/screenshots/produto-dropdown.png',
      fullPage: true
    });
  });

  test('Verificar stack context dos cards', async ({ page }) => {
    // Verificar z-index dos cards que podem estar sobrepondo
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

    // Screenshot do estado completo
    await page.screenshot({
      path: 'tests/screenshots/cards-stack.png',
      fullPage: true
    });
  });
});
