import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/e2e/**/*.spec.ts'],
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // 스펙 0개면 실패 — passWithNoTests 사용 금지
  passWithNoTests: false,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ...process.env,
      VITE_E2E: '1',
      VITE_LOCAL_AUTH: 'true',
      VITE_CORP_DOMAIN: 'true',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:3001',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'ep-anon',
      VITE_AUTH_API_BASE: process.env.VITE_AUTH_API_BASE || '/api/local-auth',
      // PostgREST(PGRST_JWT_SECRET)와 Auth API 서명을 동일 시크릿으로 맞춤 (32자+)
      EP_JWT_SECRET:
        process.env.EP_JWT_SECRET || 'ep-local-dev-jwt-secret-change-me',
    },
  },
});
