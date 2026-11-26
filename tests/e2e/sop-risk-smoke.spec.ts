/** R3 제품 성숙도: SOP·위험성평가 초안 UI 스모크. 로컬 스택 healthy 시만 초안 생성까지 수행. */
// npm run test:e2e:maturity-smoke
import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

async function isLocalStackHealthy(): Promise<boolean> {
  try {
    const [auth, pgrst] = await Promise.all([
      fetch('http://127.0.0.1:3000/api/local-auth/health').catch(() =>
        fetch('http://127.0.0.1:8787/api/local-auth/health'),
      ),
      fetch('http://127.0.0.1:3001/'),
    ]);
    if (!auth.ok || !pgrst.ok) return false;
    const body = (await auth.json().catch(() => null)) as { ok?: boolean; driver?: string } | null;
    return Boolean(body?.ok && body.driver === 'postgres');
  } catch {
    return false;
  }
}

test.describe('sop-risk-smoke', () => {
  test('owner opens matrix and creates a draft SOP document', async ({ page }) => {
    const stackOk = await isLocalStackHealthy();

    await loginAsOwner(page);
    await page.goto('/workspace/sop-risk');
    await expect(page).toHaveURL(/\/workspace\/sop-risk/);
    await expect(page.getByTestId('desktop-sop-risk-matrix')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('body')).toContainText(/작업표준|위험성평가|검토|SOP/i, {
      timeout: 45000,
    });

    const createOpen = page.getByTestId('sop-risk-create-open');
    const createCount = await createOpen.count();
    if (!createCount) {
      if (stackOk) {
        throw new Error('Postgres+PostgREST healthy but SOP create control missing (safety:manage?)');
      }
      test.skip(true, 'SOP create control not available in this stack');
      return;
    }

    const processName = `e2e-sop-${Date.now()}`;
    try {
      await createOpen.first().click({ timeout: 10000 });
      await expect(page.getByTestId('sop-risk-create-dialog')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('sop-risk-create-process-name').fill(processName);
      await page.getByTestId('sop-risk-create-submit').click();
      await expect(page.getByText(processName).first()).toBeVisible({ timeout: 20000 });
    } catch (err) {
      if (stackOk) throw err;
      test.skip(true, 'SOP create flow unavailable (UI or PostgREST)');
    }
  });
});
