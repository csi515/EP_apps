/**
 * Supabase/Refine 로그인 실패 메시지를 사용자용 한글 안내로 변환한다.
 */
export function mapLoginErrorMessage(raw?: string | null): string {
  const fallback =
    '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 회원가입을 진행해 주세요.';
  if (!raw?.trim()) return fallback;

  if (/invalid login credentials|invalid_credentials|email not confirmed/i.test(raw)) {
    return fallback;
  }
  if (/user not found|no user found/i.test(raw)) {
    return '등록되지 않은 계정입니다. 회원가입 후 다시 로그인해 주세요.';
  }
  if (/too many requests|rate limit/i.test(raw)) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  return raw;
}
