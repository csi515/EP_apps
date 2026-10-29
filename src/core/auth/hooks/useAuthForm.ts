import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import * as authService from '../services/authService';
import { consumeOAuthCallbackError } from '../oauthCallbackError';
import { saveOAuthSignupIntent } from '../utils/oauthSignupIntent';

export type AuthMode = 'login' | 'signup' | 'forgot';

function resolveInitialMode(pathname: string, search: string): AuthMode {
  const params = new URLSearchParams(search);
  const queryMode = params.get('mode');
  if (queryMode === 'forgot') return 'forgot';
  if (queryMode === 'signup') return 'signup';
  if (queryMode === 'login') return 'login';
  if (pathname.endsWith('/signup')) return 'signup';
  return 'login';
}

export function useAuthForm() {
  const { signIn, signInWithNaver } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(() =>
    resolveInitialMode(location.pathname, location.search)
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setMode(resolveInitialMode(location.pathname, location.search));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const oauthError = consumeOAuthCallbackError();
    if (!oauthError) return;
    setError(oauthError);
  }, []);

  const switchMode = useCallback((next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  }, []);

  const handleNaver = async () => {
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signup') {
        throw new Error('회원가입은 지원하지 않습니다. 관리자에게 계정 발급을 요청해 주세요.');
      }
      if (mode === 'forgot') {
        throw new Error('비밀번호 찾기는 이메일로 진행해 주세요.');
      }
      saveOAuthSignupIntent({ mode: 'login' });

      setLoading(true);
      await signInWithNaver();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '네이버 로그인 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      // OAuth 리다이렉트가 실패·차단되면 버튼을 다시 활성화
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await authService.resetPassword(email);
        setInfo('비밀번호 재설정 링크를 이메일로 보냈습니다. 받은편지함을 확인해 주세요.');
        return;
      }

      if (mode === 'login') {
        await signIn(email.trim(), password);
        return;
      }

      throw new Error('회원가입은 지원하지 않습니다. 관리자에게 계정 발급을 요청해 주세요.');
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
      const message = /already registered|already been registered|User already exists/i.test(
        raw
      )
        ? '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 수단으로 로그인해 주세요.'
        : raw;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    showPassword,
    setShowPassword,
    agreedToTerms,
    setAgreedToTerms,
    loading,
    error,
    info,
    switchMode,
    handleSubmit,
    handleNaver,
  };
}
