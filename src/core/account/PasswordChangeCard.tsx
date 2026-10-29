import React, { useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { changePassword } from '@/core/auth/services/authService';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { FORM_CONTROL_CLASS, FormField, SettingsCard } from '@/shared/components/ui';

/** 로그인 사용자 비밀번호 변경 */
export const PasswordChangeCard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호 확인이 일치하지 않습니다.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('비밀번호가 변경되었습니다.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title="비밀번호 변경" icon={<KeyRound className="w-4 h-4 text-indigo-600" />}>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 break-all">
        로그인 계정: <span className="font-mono text-slate-700">{user.email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="현재 비밀번호">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={FORM_CONTROL_CLASS}
          />
        </FormField>
        <FormField label="새 비밀번호 (8자 이상)">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={FORM_CONTROL_CLASS}
          />
        </FormField>
        <FormField label="새 비밀번호 확인">
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={FORM_CONTROL_CLASS}
          />
        </FormField>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 min-h-[44px] rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {saving ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </SettingsCard>
  );
};
