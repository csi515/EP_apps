import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

async function runTests() {
  console.log('Running MobileLoginForm verification tests...');

  const componentPath = join(root, 'src/components/auth/MobileLoginForm.tsx');
  assert.ok(existsSync(componentPath), 'MobileLoginForm.tsx must exist');
  const code = readFileSync(componentPath, 'utf8');

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

  assert.doesNotMatch(code, /btn-google-login/, 'Google login button must be removed');
  assert.doesNotMatch(code, /SNS_LOGIN_ENABLED/, 'SNS_LOGIN_ENABLED flag must be removed');
  assert.doesNotMatch(code, /간편 로그인/, '간편 로그인 copy must be removed from login form');
  assert.doesNotMatch(code, /link-signup|회원가입|초대 코드|invite\/accept/, 'Signup and invite entry must be removed');
  assert.doesNotMatch(code, /공용 기기/, 'Shared-device caution copy must be removed');
  assert.doesNotMatch(
    loginPageCode,
    /onGoogleLogin|signInWithGoogle|signInWithApple|signInWithKakao|signInWithNaver/,
    'LoginPage must not wire social OAuth handlers'
  );

  assert.ok(code.includes('data-testid="btn-email-submit"'), 'Email submit button must exist');
  assert.match(
    code,
    /data-testid=["']link-forgot-password["']/,
    'MobileLoginForm must expose a forgot-password link'
  );
  assert.match(
    code,
    /to=["']\/signup\?mode=forgot["']/,
    'Forgot-password link must navigate to /signup?mode=forgot'
  );

  assert.match(
    loginPageCode,
    /!data\?\.success/,
    'LoginPage must check data.success before navigating after login'
  );
  assert.match(
    loginPageCode,
    /mapLoginErrorMessage/,
    'LoginPage must map login errors for Korean user feedback'
  );
  assert.doesNotMatch(
    loginPageCode,
    /Project Moa v2/,
    'LoginPage must not show Project Moa v2 branding'
  );

  assert.match(
    loginPageCode,
    /<MobileLoginForm/,
    'LoginPage.tsx must mount MobileLoginForm component'
  );
  assert.match(
    loginPageCode,
    /rememberMe=\{rememberMe\}/,
    'LoginPage.tsx must bind rememberMe state to MobileLoginForm'
  );
  assert.match(
    loginPageCode,
    /onRememberMeChange=\{setRememberMe\}/,
    'LoginPage.tsx must bind onRememberMeChange to MobileLoginForm'
  );
  assert.match(
    loginPageCode,
    /login\(\s*\{\s*email,\s*password,\s*rememberMe\s*\}/,
    'LoginPage.tsx must pass rememberMe in login payload'
  );

  const landingCopy = readFileSync(join(root, 'src/pages/auth/loginLandingCopy.ts'), 'utf8');
  assert.doesNotMatch(landingCopy, /invitePrompt|inviteLink|초대 코드/, 'Landing copy must not mention invite codes');
  assert.match(landingCopy, /LoginLocale|'ko'\s*\|\s*'ja'/, 'Login locale must be ko|ja');
  assert.doesNotMatch(code, /\bEN\b|language === 'en'/, 'English locale toggle must be removed');
  assert.match(code, /onLanguageChange\('ja'\)|LoginLocale/, 'Japanese locale switch must exist');

  const authServicePath = join(root, 'src/core/auth/services/authService.ts');
  const authServiceCode = readFileSync(authServicePath, 'utf8');
  assert.match(
    authServiceCode,
    /rememberMe\?: boolean/,
    'authService.SignInParams must support rememberMe optional flag'
  );
  assert.match(
    authServiceCode,
    /setAuthStoragePreference\(rememberMe\)/,
    'authService.signIn must apply setAuthStoragePreference when rememberMe is provided'
  );

  const authStoragePath = join(root, 'src/core/auth/services/authStorage.ts');
  assert.ok(existsSync(authStoragePath), 'authStorage.ts must exist');
  const authStorageCode = readFileSync(authStoragePath, 'utf8');
  assert.match(
    authStorageCode,
    /export const dynamicAuthStorage/,
    'authStorage.ts must export dynamicAuthStorage adapter'
  );
  assert.match(
    authStorageCode,
    /sessionStorage/,
    'dynamicAuthStorage must leverage sessionStorage for shared kiosk partitioning'
  );

  console.log('MobileLoginForm tests passed successfully!');
}

void runTests();
