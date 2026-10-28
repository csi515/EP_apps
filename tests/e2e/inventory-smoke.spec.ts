import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('inventory-smoke', () => {
  test('owner reaches inventory workspace', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/workspace/inventory');
    await expect(page).toHaveURL(/\/workspace\/inventory/);
    await expect(page.locator('body')).toContainText(/재고|상품|inventory|품목|수량/i, {
      timeout: 45000,
    });
  });
});
