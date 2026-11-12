import React, { useState, type FormEvent, type ReactNode } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { changePassword } from '@/core/auth/services/authService';
import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui/Button';

function readMustChangePassword(user: { user_metadata?: Record<string, unknown> } | null): boolean {
  if (!user?.user_metadata) return false;
  return Boolean(user.user_metadata.must_change_password);
}

/** 관리자 발급 계정 최초 로그인 시 비밀번호 변경 강제 */
export function MustChangePasswordGate({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [required, setRequired] = useState(() =>
    isLocalAuthEnabled() ? readMustChangePassword(user) : false
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isLocalAuthEnabled()) {
      setRequired(false);
      return;
    }
    setRequired(readMustChangePassword(user));
  }, [user, session]);

  if (!required) return <>{children}</>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50 p-4"
      data-testid="must-change-password-gate"
    >
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">비밀번호를 변경해 주세요</h1>
            <p className="text-xs text-slate-500">
              관리자가 발급한 초기 비밀번호입니다. 새 비밀번호로 변경한 뒤 업무 앱을 사용할 수 있습니다.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <FormField label="현재(초기) 비밀번호">
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="새 비밀번호" hint="8자 이상">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          <FormField label="새 비밀번호 확인">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={FORM_CONTROL_CLASS}
            />
          </FormField>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" isLoading={saving} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                변경 중
              </>
            ) : (
              '비밀번호 변경 후 계속'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
