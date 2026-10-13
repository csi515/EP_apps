import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

async function runTests() {
  console.log('Running MobileLoginForm & Social Auth verification tests...');

  // 1. MobileLoginForm.tsx exists
  const componentPath = join(root, 'src/components/auth/MobileLoginForm.tsx');
  assert.ok(existsSync(componentPath), 'MobileLoginForm.tsx must exist');
  const code = readFileSync(componentPath, 'utf8');

  // 2. Desktop 2-column <-> Mobile single card responsive layout (verified via LoginPage container)
  const loginPagePath = join(root, 'src/pages/auth/LoginPage.tsx');
  assert.ok(existsSync(loginPagePath), 'LoginPage.tsx must exist');
  const loginPageCode = readFileSync(loginPagePath, 'utf8');

  assert.match(
    loginPageCode,
    /flex-col\s+lg:flex-row/,
    'LoginPage must support mobile single card (flex-col) to desktop 2-column (lg:flex-row)'
  );
  assert.match(
    loginPageCode,
    /hidden\s+lg:flex/,
    'Desktop branding panel must be hidden on mobile and flex on lg screens'
  );
  assert.match(
    loginPageCode,
    /data-testid=["']desktop-brand-panel["']/,
    'Desktop brand panel test ID must exist'
  );

  // 3. Global social login order verification
  // 1) Google (top, full width)
  // 2) Apple (iOS App Store review standard, full width)
  // 3) Kakao & Naver (2 columns grid)
  // 4) Email form
  const googleIndex = code.indexOf('data-testid="btn-google-login"');
  const appleIndex = code.indexOf('data-testid="btn-apple-login"');
  const kakaoIndex = code.indexOf('data-testid="btn-kakao-login"');
  const naverIndex = code.indexOf('data-testid="btn-naver-login"');
  const emailFormIndex = code.indexOf('data-testid="btn-email-submit"');

  assert.ok(googleIndex >= 0, 'Google login button must exist');
  assert.ok(appleIndex >= 0, 'Apple login button must exist');
  assert.ok(kakaoIndex >= 0, 'Kakao login button must exist');
  assert.ok(naverIndex >= 0, 'Naver login button must exist');
  assert.ok(emailFormIndex >= 0, 'Email submit button must exist');

  // Verify exact order
  assert.ok(
    googleIndex < appleIndex,
    'Google login button must appear BEFORE Apple login button'
  );
  assert.ok(
    appleIndex < kakaoIndex,
    'Apple login button must appear BEFORE Kakao login button'
  );
  assert.ok(
    kakaoIndex < emailFormIndex && naverIndex < emailFormIndex,
    'Kakao & Naver buttons must appear BEFORE email form'
  );

  // Kakao & Naver must be in 2-column grid
  assert.match(
    code,
    /grid\s+grid-cols-2\s+gap-(?:2\.5|3)/,
    'Kakao and Naver must be arranged in a 2-column grid'
  );

  // 4. Apple guideline compliance check
  assert.match(
    code,
    /Apple로 계속하기|Sign in with Apple/,
    'Apple button must display standard Apple Sign In text'
  );
  assert.match(
    code,
    /bg-black/,
    'Apple button must conform to Apple design guidelines (black background)'
  );

  // 5. LoginPage integration check
  assert.match(
    loginPageCode,
    /<MobileLoginForm/,
    'LoginPage.tsx must mount MobileLoginForm component'
  );

  // 6. authService support for Google and Apple OAuth
  const authServicePath = join(root, 'src/core/auth/services/authService.ts');
  const authServiceCode = readFileSync(authServicePath, 'utf8');
  assert.match(
    authServiceCode,
    /export async function signInWithGoogle/,
    'authService must export signInWithGoogle'
  );
  assert.match(
    authServiceCode,
    /export async function signInWithApple/,
    'authService must export signInWithApple'
  );

  console.log('MobileLoginForm & Social Auth tests passed successfully!');
}

void runTests();
