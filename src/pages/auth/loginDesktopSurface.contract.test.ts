/**
 * 로그인 데스크톱 표면 계약 — 모바일 전용 학원/중복 안내 제거
 * 실행: npm run test:login-desktop-surface
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

console.log('[test:login-desktop-surface] start');

const loginPath = join(root, 'src/pages/auth/LoginPage.tsx');
const copyPath = join(root, 'src/pages/auth/loginLandingCopy.ts');
assert.ok(existsSync(loginPath));
assert.ok(existsSync(copyPath));

const login = readFileSync(loginPath, 'utf8');
const copy = readFileSync(copyPath, 'utf8');

// 데스크톱 브랜드 패널 유지
assert.match(login, /data-testid=["']desktop-brand-panel["']/);
assert.match(login, /hidden\s+lg:flex/);
assert.match(login, /flex-col\s+lg:flex-row/);

// 모바일 전용 중복 헤더/안내 제거
assert.doesNotMatch(login, /data-testid=["']extra-login-notice-mobile["']/);
assert.doesNotMatch(login, /lg:hidden text-center mb-6/);
assert.doesNotMatch(login, /mobileSubtitle/);

// 우측 폼 타이틀은 항상 표시 (hidden lg:block 제거)
assert.doesNotMatch(
  login,
  /hidden lg:block mb-6[\s\S]{0,40}formTitle/,
  'form title must not be desktop-only hidden block'
);
assert.match(login, /loginLandingCopy\.formTitle/);

// 랜딩 카피가 학원 용어가 아닌지
assert.doesNotMatch(copy, /학원|원생|수강|학부모|출결 패드/);
assert.match(copy, /결재/);
assert.match(copy, /현장/);
assert.match(copy, /임직원 로그인/);

// 소셜/이메일 폼은 유지
assert.match(login, /<MobileLoginForm/);
assert.match(login, /rememberMe=\{rememberMe\}/);

console.log('loginDesktopSurface.contract.test.ts: ok');
