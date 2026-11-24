import { type Page, expect } from '@playwright/test';

/** 로컬 기본 owner = 김대표(rndceo). 스테이징은 env로 덮어쓴다. */
export const E2E_EMAIL = process.env.EP_STAGING_EMAIL || 'rndceo';
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
