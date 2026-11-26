import React, { useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  generateInitialPassword,
  resetMemberPassword,
} from '@/core/organizations/services/orgMemberAdminService';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import { memberDisplayLabel } from '@/core/organizations/orgChartPrimitives';

type Props = {
  member: DynamicMemberRow | null;
  organizationId: string;
  onClose: () => void;
  onReset: () => void;
};

export function MemberPasswordResetModal({
  member,
  organizationId,
  onClose,
  onReset,
}: Props): React.JSX.Element {
  const [password, setPassword] = useState(() => generateInitialPassword());
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<{ loginId: string; password: string } | null>(null);

  useEffect(() => {
    if (!member) return;
    setPassword(generateInitialPassword());
    setIssued(null);
  }, [member]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (password.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await resetMemberPassword(organizationId, member.id, password);
      const loginId = member.login_id || member.email || member.user_id;
      setIssued({ loginId, password });
      onReset();
      showToast('임시 비밀번호가 설정되었습니다. 직원에게 안전하게 전달해 주세요.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '비밀번호 재설정에 실패했습니다.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!issued) return;
    const text = `아이디: ${issued.loginId}\n임시 비밀번호: ${issued.password}\n※ 다음 로그인 시 비밀번호 변경이 필요합니다.`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('아이디·임시 비밀번호를 복사했습니다.', 'success');
    } catch {
      showToast('복사에 실패했습니다. 화면에 표시된 값을 직접 전달하세요.', 'warning');
    }
  }

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      title="비밀번호 재설정"
      description="관리자가 임시 비밀번호를 설정합니다. 직원은 다음 로그인 시 새 비밀번호로 변경해야 합니다."
      maxWidth="md"
      intent="form"
      footer={
        issued ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
              <Copy className="mr-1.5 h-4 w-4" />
              복사
            </Button>
            <Button type="button" onClick={onClose}>
              완료
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button
              type="submit"
              form="member-password-reset-form"
              isLoading={submitting}
              disabled={submitting || !member}
            >
              임시 비밀번호 적용
            </Button>
          </div>
        )
      }
    >
      {member ? (
        issued ? (
          <div
            className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4"
            data-testid="member-password-reset-issued"
          >
            <p className="text-sm font-bold text-amber-900">
              재설정 완료 — 이 화면에서만 임시 비밀번호를 확인할 수 있습니다.
            </p>
            <p className="text-sm text-amber-900">
              대상: <span className="font-semibold">{memberDisplayLabel(member)}</span>
            </p>
            <p className="text-sm text-amber-900">
              아이디: <span className="font-mono font-bold">{issued.loginId}</span>
            </p>
            <p className="text-sm text-amber-900">
              임시 비밀번호: <span className="font-mono font-bold">{issued.password}</span>
            </p>
            <p className="text-xs text-amber-800">다음 로그인 시 비밀번호 변경이 강제됩니다.</p>
          </div>
        ) : (
          <form
            id="member-password-reset-form"
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-3"
            data-testid="member-password-reset-form"
          >
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{memberDisplayLabel(member)}</p>
                <p className="font-mono text-[11px] text-slate-500">
                  {member.login_id || member.email || member.user_id}
                </p>
              </div>
            </div>
            <FormField
              label="임시 비밀번호 *"
              hint="8자 이상 · 적용 후 직원은 첫 로그인에서 변경해야 합니다"
            >
              <div className="flex gap-2">
                <input
                  className={FORM_CONTROL_CLASS}
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generateInitialPassword())}
                  aria-label="비밀번호 다시 생성"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </FormField>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              기존 세션이 있다면 재설정 후에도 유지될 수 있습니다. 보안이 필요하면 별도로 계정 비활성화를
              검토하세요.
            </p>
          </form>
        )
      ) : null}
    </Modal>
  );
}