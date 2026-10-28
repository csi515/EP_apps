import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('auth-login', () => {
  test('owner can sign in and leave login page', async ({ page }) => {
    await loginAsOwner(page);
    await expect(page.getByTestId('login-container')).toHaveCount(0);
  });
});
