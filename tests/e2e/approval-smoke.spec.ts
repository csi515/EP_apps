import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('approval-smoke', () => {
  test('owner reaches approvals workspace', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/workspace/approvals');
    await expect(page).toHaveURL(/\/workspace\/approvals/);
    // 결재 셸 또는 런처/본문이 렌더되면 통과 (빈 stub 금지)
    await expect(page.locator('body')).toContainText(/결재|승인|상신|Approval|draft|전자/i, {
      timeout: 45000,
    });
  });
});
