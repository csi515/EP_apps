import React from 'react';
import { KeyRound } from 'lucide-react';
import { useTranslate } from '@refinedev/core';
import { Modal } from '@/shared/components/ui/Modal';
import { listEnabledPermissionLabels } from '@/domain/permissionCatalog';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { memberDisplayName } from './memberFeaturePermissionShared';

type Props = {
  member: DynamicMemberRow | null;
  roles: DynamicRoleRow[];
  selectedRoleId: string;
  assignReason: string;
  submitting: boolean;
  scopedCapIds: string[] | null;
  onSelectedRoleIdChange: (id: string) => void;
  onAssignReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MemberRoleAssignModal({
  member,
  roles,
  selectedRoleId,
  assignReason,
  submitting,
  scopedCapIds,
  onSelectedRoleIdChange,
  onAssignReasonChange,
  onClose,
  onSubmit,
}: Props): React.JSX.Element {
  const translate = useTranslate();
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      title={translate('ep.members.roleAssign.title')}
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
            onClick={onSubmit}
            disabled={submitting}
            className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '직급 부여 완료'}
          </button>
        </div>
      }
    >
      {member ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600">
            <KeyRound className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">직급 위임</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-800">대상 직원:</strong> {memberDisplayName(member)}
            </p>
            <p className="font-mono text-[11px] text-slate-400">User ID: {member.user_id}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">부여할 직급 선택</label>
            <select
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              value={selectedRoleId}
              onChange={(e) => onSelectedRoleIdChange(e.target.value)}
            >
              <option value="">-- 직급 선택 (미배정 해제) --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} {role.description ? `(${role.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedRole ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs space-y-2">
              <p className="font-bold text-indigo-900">포함된 세부 권한:</p>
              <div className="flex flex-wrap gap-1">
                {listEnabledPermissionLabels(selectedRole.permissions, scopedCapIds).map((item) => (
                  <span
                    key={item.key}
                    title={item.key}
                    className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-800"
                  >
                    ✓ {item.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-bold text-slate-700">
              위임 및 부여 사유 (감사 로그용)
            </label>
            <input
              type="text"
              value={assignReason}
              onChange={(e) => onAssignReasonChange(e.target.value)}
              placeholder="예: 2026 하반기 기업 총무팀 위임 관리자 지정"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
