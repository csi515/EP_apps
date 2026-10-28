import { type Page, expect } from '@playwright/test';

export const E2E_EMAIL = process.env.EP_STAGING_EMAIL || 'owner@ep.local';
export const E2E_PASSWORD = process.env.EP_STAGING_PASSWORD || 'EpTest123!';

/** 로그인 폼 제출 후 보호 경로로 이동할 때까지 대기 */
export async function loginAsOwner(page: Page) {
  await page.goto('/login');
  await expect(page.getByTestId('login-container')).toBeVisible({ timeout: 30000 });
  await page.getByTestId('input-email').fill(E2E_EMAIL);
  await page.getByTestId('input-password').fill(E2E_PASSWORD);
  await page.getByTestId('btn-email-submit').click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 45000 });
}
