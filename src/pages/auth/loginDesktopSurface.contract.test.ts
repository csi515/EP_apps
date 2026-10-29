/**
 * 로그인 데스크톱 표면 계약 — 데스크톱 전용 2열 고정
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
const formPath = join(root, 'src/components/auth/LoginForm.tsx');
assert.ok(existsSync(loginPath));
assert.ok(existsSync(copyPath));
assert.ok(existsSync(formPath));

const login = readFileSync(loginPath, 'utf8');
const copy = readFileSync(copyPath, 'utf8');

// 데스크톱 브랜드 패널 항상 표시 (lg:hidden 분기 금지)
assert.match(login, /data-testid=["']desktop-brand-panel["']/);
assert.match(login, /flex flex-row/);
assert.doesNotMatch(login, /hidden\s+lg:flex/);
assert.doesNotMatch(login, /flex-col\s+lg:flex-row/);
assert.doesNotMatch(login, /\blg:hidden\b|\bmd:hidden\b|\bsm:hidden\b/);

// 모바일 전용 중복 헤더/안내 제거
assert.doesNotMatch(login, /data-testid=["']extra-login-notice-mobile["']/);
assert.doesNotMatch(login, /mobileSubtitle/);

assert.match(login, /copy\.formTitle|getLoginLandingCopy/);
assert.match(copy, /LoginLocale|'ko'\s*\|\s*'ja'|getLoginLandingCopy/);
assert.doesNotMatch(copy, /emailLabelEn|submitLabelEn|Company email|Sign in/);

// 랜딩 카피가 학원 용어가 아닌지
assert.doesNotMatch(copy, /학원|원생|수강|학부모|출결 패드/);
assert.match(copy, /결재/);
assert.match(copy, /현장/);
assert.match(copy, /임직원 로그인/);

// 로그인 폼
assert.match(login, /<LoginForm/);
assert.match(login, /rememberMe=\{rememberMe\}/);
assert.doesNotMatch(login, /MobileLoginForm/);

console.log('loginDesktopSurface.contract.test.ts: ok');
