/**
 * 회원가입 및 약관 동의 유효성 검증 테스트
 * 실행: npx tsx src/core/auth/authSignupValidation.test.ts
 */
import assert from 'node:assert/strict';

interface SignupValidationInput {
  email: string;
  password: string;
  fullName: string;
  agreedToTerms: boolean;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: {
    email: string;
    password: string;
    fullName: string;
  };
}

/**
 * useAuthForm의 회원가입 비즈니스 불변성 유효성 검증 엔진
 */
function validateSignupInput(input: SignupValidationInput): ValidationResult {
  const trimmedName = input.fullName.trim();
  const trimmedEmail = input.email.trim();

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { isValid: false, error: '올바른 이메일 형식을 입력해 주세요.' };
  }

  if (!trimmedName) {
    return { isValid: false, error: '이름을 입력해 주세요.' };
  }

  if (input.password.length < 6) {
    return { isValid: false, error: '비밀번호는 6자 이상이어야 합니다.' };
  }

  if (!input.agreedToTerms) {
    return { isValid: false, error: '이용약관 및 개인정보처리방침에 동의해 주세요.' };
  }

  return {
    isValid: true,
    normalized: {
      email: trimmedEmail,
      password: input.password,
      fullName: trimmedName,
    },
  };
}

/**
 * Supabase 인증 오류 메시지 사용자 친화적 변환 엔진
 */
function normalizeAuthErrorMessage(rawMessage: string): string {
  if (/already registered|already been registered|User already exists/i.test(rawMessage)) {
    return '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 수단으로 로그인해 주세요.';
  }
  if (/invalid login credentials|invalid credentials/i.test(rawMessage)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  return rawMessage;
}

console.log('[test:auth-signup] Starting Auth Signup & Legal Invariants Suite...');

// 1. 이름 누락 검증
{
  const res = validateSignupInput({
    email: 'user@example.com',
    password: 'password123',
    fullName: '   ',
    agreedToTerms: true,
  });
  assert.equal(res.isValid, false);
  assert.equal(res.error, '이름을 입력해 주세요.');
}

// 2. 비밀번호 6자 미만 검증
{
  const res = validateSignupInput({
    email: 'user@example.com',
    password: '12345',
    fullName: '홍길동',
    agreedToTerms: true,
  });
  assert.equal(res.isValid, false);
  assert.equal(res.error, '비밀번호는 6자 이상이어야 합니다.');
}

// 3. 약관 미동의 시 차단 검증
{
  const res = validateSignupInput({
    email: 'user@example.com',
    password: 'password123',
    fullName: '홍길동',
    agreedToTerms: false,
  });
  assert.equal(res.isValid, false);
  assert.equal(res.error, '이용약관 및 개인정보처리방침에 동의해 주세요.');
}

// 4. 이메일 형식 유효성 검증
{
  const res = validateSignupInput({
    email: 'not-an-email',
    password: 'password123',
    fullName: '홍길동',
    agreedToTerms: true,
  });
  assert.equal(res.isValid, false);
  assert.equal(res.error, '올바른 이메일 형식을 입력해 주세요.');
}

// 5. 모든 조건 충족 시 정규화(트림)된 데이터 반환
{
  const res = validateSignupInput({
    email: '  test.user@example.com  ',
    password: 'securePassword1!',
    fullName: '  김철수  ',
    agreedToTerms: true,
  });
  assert.equal(res.isValid, true);
  assert.equal(res.normalized?.email, 'test.user@example.com');
  assert.equal(res.normalized?.fullName, '김철수');
}

// 6. 에러 메시지 현지화 및 보안 변환 검증
{
  assert.equal(
    normalizeAuthErrorMessage('User already registered'),
    '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 수단으로 로그인해 주세요.'
  );
  assert.equal(
    normalizeAuthErrorMessage('Invalid login credentials'),
    '이메일 또는 비밀번호가 올바르지 않습니다.'
  );
}

console.log('authSignupValidation.test.ts: ok');
