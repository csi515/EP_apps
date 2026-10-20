import React, { useState } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

const SCOPE_OPTIONS: DepartmentScopeType[] = ['SELF_ONLY', 'DESCENDANTS', 'GLOBAL'];

interface Props {
  isOwner: boolean;
  canManage: boolean;
  nodes: OrgNode[];
  members: DynamicMemberRow[];
  departmentMembers: DepartmentMemberRow[];
  onAssignScope: (input: {
    departmentId: string;
    memberId: string;
    scopeType: DepartmentScopeType;
  }) => Promise<void>;
  onRevokeRole: (memberId: string) => Promise<void>;
  onTransferOwnership: (nextOwnerMemberId: string, reason: string) => Promise<void>;
}

export const OrganizationGovernancePanel: React.FC<Props> = ({
  isOwner,
  canManage,
  nodes,
  members,
  departmentMembers,
  onAssignScope,
  onRevokeRole,
  onTransferOwnership,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [scopeType, setScopeType] = useState<DepartmentScopeType>('SELF_ONLY');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const staffMembers = members.filter((member) => member.role !== 'owner');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('저장되었습니다.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (!canManage && !isOwner) return null;

  return (
    <section className="mt-8 space-y-6 border-t border-slate-200 pt-6" aria-label="조직 권한 관리">
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      {canManage ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">{ORG_CHART_COPY.scope}</h2>
          <label className="block text-sm">
            부서
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">선택</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            직원
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
            >
              <option value="">선택</option>
              {staffMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.user_id}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {ORG_CHART_COPY.scope}
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={scopeType}
              onChange={(event) => setScopeType(event.target.value as DepartmentScopeType)}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !departmentId || !memberId}
            className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm text-white disabled:opacity-40"
            onClick={() => void run(() => onAssignScope({ departmentId, memberId, scopeType }))}
          >
            스코프 배정
          </button>
          <ul className="space-y-1 text-xs text-slate-600">
            {departmentMembers.map((row) => (
              <li key={row.id}>{row.member_id.slice(0, 8)}… · {row.scope_type}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManage ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">직급 회수</h2>
          <p className="text-xs text-amber-700">{ORG_CHART_COPY.revokeWarn}</p>
          <ul className="space-y-2">
            {staffMembers.map((member) => (
              <li key={member.id} className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-sm">{member.user_id}</span>
                <button
                  type="button"
                  className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm text-rose-700"
                  disabled={busy}
                  onClick={() => setRevokeTarget(member.id)}
                >
                  권한 회수
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isOwner ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">{ORG_CHART_COPY.transferTitle}</h2>
          <label className="block text-sm">
            신임 사업자
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={transferTarget}
              onChange={(event) => setTransferTarget(event.target.value)}
            >
              <option value="">선택</option>
              {staffMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.user_id}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {ORG_CHART_COPY.reason}
            <input
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
            />
          </label>
          <label className="block text-sm">
            확인 문구 ({ORG_CHART_COPY.transferConfirm})
            <input
              className="mt-1 min-h-11 w-full rounded-lg border px-3"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              aria-label="소유권 이전 확인"
            />
          </label>
          <button
            type="button"
            disabled={
              busy ||
              !transferTarget ||
              !transferReason.trim() ||
              confirmText !== ORG_CHART_COPY.transferConfirm
            }
            className="min-h-11 rounded-lg bg-rose-700 px-4 text-sm text-white disabled:opacity-40"
            onClick={() => void run(() => onTransferOwnership(transferTarget, transferReason.trim()))}
          >
            {ORG_CHART_COPY.transferTitle}
          </button>
        </div>
      ) : null}

      {revokeTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <p className="text-sm text-slate-800">{ORG_CHART_COPY.revokeWarn}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="min-h-11 px-4" onClick={() => setRevokeTarget(null)}>
                취소
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg bg-rose-700 px-4 text-white"
                disabled={busy}
                onClick={() => {
                  const target = revokeTarget;
                  setRevokeTarget(null);
                  void run(() => onRevokeRole(target));
                }}
              >
                회수 실행
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
