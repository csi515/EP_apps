import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

async function isLocalStackHealthy(): Promise<boolean> {
  try {
    const [auth, pgrst] = await Promise.all([
      fetch('http://127.0.0.1:3000/api/local-auth/health'),
      fetch('http://127.0.0.1:3001/'),
    ]);
    if (!auth.ok || !pgrst.ok) return false;
    const body = (await auth.json().catch(() => null)) as { ok?: boolean; driver?: string } | null;
    return Boolean(body?.ok && body.driver === 'postgres');
  } catch {
    return false;
  }
}

test.describe('mbo-monthly-smoke', () => {
  test('owner creates objective then opens monthly check from project sheet', async ({ page }) => {
    const stackOk = await isLocalStackHealthy();

    await loginAsOwner(page);
    await page.goto('/workspace/mbo');
    await expect(page).toHaveURL(/\/workspace\/mbo/);
    await expect(page.locator('body')).toContainText(/목표|MBO|월별|체크|진척/i, {
      timeout: 45000,
    });

    const createOpen = page.getByTestId('mbo-create-objective-open');
    const createCount = await createOpen.count();
    if (!createCount) {
      if (stackOk) {
        throw new Error('Postgres+PostgREST stack healthy but MBO create control missing');
      }
      test.skip(true, 'MBO create control not available in this stack');
      return;
    }

    const title = `e2e-mbo-${Date.now()}`;
    try {
      await createOpen.first().click({ timeout: 10000 });
      await expect(page.getByTestId('mbo-create-objective-form')).toBeVisible({ timeout: 10000 });
      await page.getByTestId('mbo-create-objective-title').fill(title);
      await page.getByTestId('mbo-create-objective-criteria').fill('e2e KPI');
      await page.getByTestId('mbo-create-objective-submit').click();
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 20000 });
    } catch (err) {
      if (stackOk) throw err;
      test.skip(true, 'MBO create flow unavailable (UI or PostgREST)');
      return;
    }

    // 허브 간트: 자동 생성된 실행 프로젝트 행을 열어 월별 체크인으로 진입
    const projectRow = page
      .locator('[data-testid="mbo-hierarchy-gantt"] button')
      .filter({ hasText: title })
      .last();
    await expect(projectRow).toBeVisible({ timeout: 20000 });
    await projectRow.click();

    await expect(page.getByTestId('mbo-project-sheet')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('mbo-project-sheet-monthly-open').click();
    await expect(page.getByTestId('mbo-monthly-project-title')).toContainText(title, {
      timeout: 20000,
    });
    await expect(page.getByTestId('mbo-monthly-checkin-open')).toBeVisible();
  });
});
