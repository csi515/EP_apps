import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import { Modal } from '@/shared/components/ui/Modal';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import { memberDisplayName } from './memberFeaturePermissionShared';

type Props = {
  member: DynamicMemberRow | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function MemberRoleRevokeConfirmModal({
  member,
  submitting,
  onClose,
  onConfirm,
}: Props): React.JSX.Element {
  const translate = useTranslate();

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      title={translate('ep.members.roleRevoke.title')}
      maxWidth="md"
      intent="form"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            {translate('buttons.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
          >
            {submitting ? '회수 처리 중...' : '권한 회수 및 세션 즉시 파기'}
          </button>
        </div>
      }
    >
      {member ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">권한 회수 (기본 사원으로 강등)</p>
              <p className="text-xs text-slate-500 font-mono">대상: {memberDisplayName(member)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            권한을 회수하면 해당 직원의 세션이 즉시 만료되며 기본 사원 권한으로 전환됩니다.
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            DB 레벨에서 <code className="font-bold text-slate-700">token_version</code>이 즉시
            증가하여, 해당 직원이 보유 중이던 기존 JWT 토큰은 즉각 무효화(403 차단)됩니다.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
