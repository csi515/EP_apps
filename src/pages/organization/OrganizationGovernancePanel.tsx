import React, { useState } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

const SCOPE_OPTIONS: DepartmentScopeType[] = ['SELF_ONLY', 'DESCENDANTS', 'GLOBAL'];

export const SCOPE_LABELS: Record<DepartmentScopeType, { title: string; hint: string }> = {
  SELF_ONLY: {
    title: '구성원 (해당 조직만)',
    hint: '소속 조직의 구성원으로 배치됩니다. MBO는 본인 목표 중심입니다.',
  },
  DESCENDANTS: {
    title: '조직 리더 (하위 조직 포함)',
    hint: '이 조직과 모든 하위 조직의 인원·MBO를 별도 위임 없이 관리합니다 (팀장·그룹장 등).',
  },
  GLOBAL: {
    title: '전사 스코프 (임원)',
    hint: '조직도 전체 데이터를 포괄합니다. 전사 운영과 별개로 데이터 범위만 넓힙니다.',
  },
};

function memberLabel(member: DynamicMemberRow): string {
  if (member.name?.trim()) return member.name.trim();
  if (member.email?.trim()) return member.email.trim();
  return `${member.user_id.slice(0, 8)}…`;
}

interface Props {
  canManage: boolean;
  nodes: OrgNode[];
  members: DynamicMemberRow[];
  departmentMembers: DepartmentMemberRow[];
  roles: DynamicRoleRow[];
  selectedDepartmentId?: string | null;
  onAssignScope: (input: {
    departmentId: string;
    memberId: string;
    scopeType: DepartmentScopeType;
    customRoleId?: string | null;
  }) => Promise<void>;
  onRevokeRole: (memberId: string) => Promise<void>;
}

export const OrganizationGovernancePanel: React.FC<Props> = ({
  canManage,
  nodes,
  members,
  departmentMembers,
  roles,
  selectedDepartmentId,
  onAssignScope,
  onRevokeRole,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [customRoleId, setCustomRoleId] = useState('');
  const [scopeType, setScopeType] = useState<DepartmentScopeType>('SELF_ONLY');

  React.useEffect(() => {
    if (selectedDepartmentId) setDepartmentId(selectedDepartmentId);
  }, [selectedDepartmentId]);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const staffMembers = members.filter((member) => member.role !== 'owner');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('저장되었습니다. 권한 변경 시 재로그인이 필요할 수 있습니다.');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const deptMemberRows = departmentId
    ? departmentMembers.filter((row) => row.department_id === departmentId)
    : departmentMembers;

  if (!canManage) return null;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 lg:mt-0" aria-label="조직 권한 관리">
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">부서원 · 직급 · 스코프</h2>
        <label className="block text-sm">
          부서
          <select
            className="mt-1 min-h-11 w-full rounded-lg border px-3"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">선택</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
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
              <option key={member.id} value={member.id}>
                {memberLabel(member)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          직급 (organization_roles)
          <select
            className="mt-1 min-h-12 w-full rounded-lg border px-3"
            value={customRoleId}
            onChange={(event) => setCustomRoleId(event.target.value)}
          >
            <option value="">변경 없음</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">{ORG_CHART_COPY.scope}</span>
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none"
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as DepartmentScopeType)}
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SCOPE_LABELS[option].title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-indigo-600">※ {SCOPE_LABELS[scopeType].hint}</p>
        </label>
        <button
          type="button"
          disabled={busy || !departmentId || !memberId}
          className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm text-white disabled:opacity-40"
          onClick={() =>
            void run(() =>
              onAssignScope({
                departmentId,
                memberId,
                scopeType,
                customRoleId: customRoleId || null,
              }),
            )
          }
        >
          배정 (세션 갱신)
        </button>
        <ul className="space-y-2 text-xs text-slate-600">
          {deptMemberRows.map((row) => {
            const member = members.find((m) => m.id === row.member_id);
            const roleName = roles.find((r) => r.id === row.custom_role_id)?.name;
            return (
              <li key={row.id} className="min-h-10 rounded-lg bg-slate-50 px-2 py-2">
                {member ? memberLabel(member) : row.member_id.slice(0, 8)} ·{' '}
                {SCOPE_LABELS[row.scope_type]?.title ?? row.scope_type}
                {roleName ? ` · ${roleName}` : ''}
              </li>
            );
          })}
          {deptMemberRows.length === 0 ? (
            <li className="text-slate-400">선택한 부서에 배정된 구성원이 없습니다.</li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">직급 회수</h2>
        <p className="text-xs text-amber-700">{ORG_CHART_COPY.revokeWarn}</p>
        <ul className="space-y-2">
          {staffMembers.map((member) => (
            <li key={member.id} className="flex min-h-11 items-center justify-between gap-2">
              <span className="text-sm">{memberLabel(member)}</span>
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
