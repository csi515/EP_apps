import React, { useState } from 'react';
import type { DepartmentScopeType } from '@/core/organizations/departmentScope';
import type { DynamicMemberRow, DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import type { DepartmentMemberRow, OrgNode } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

const SCOPE_OPTIONS: DepartmentScopeType[] = ['SELF_ONLY', 'DESCENDANTS', 'GLOBAL'];

export const SCOPE_LABELS: Record<DepartmentScopeType, { title: string; hint: string }> = {
  SELF_ONLY: {
    title: ORG_CHART_COPY.scopeMember,
    hint: '이 조직의 구성원으로 배치됩니다. MBO는 본인 목표 중심입니다.',
  },
  DESCENDANTS: {
    title: ORG_CHART_COPY.scopeLeader,
    hint: '이 조직과 하위 조직의 인원·목표를 관리합니다 (팀장·그룹장 등).',
  },
  GLOBAL: {
    title: ORG_CHART_COPY.scopeGlobal,
    hint: '조직도 전체 데이터를 열람합니다. 운영 전권과는 별개입니다.',
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
  /** 상세 패널 안에 넣을 때 제목·회수 블록을 줄임 */
  compact?: boolean;
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
  departmentMembers: _departmentMembers,
  roles,
  selectedDepartmentId,
  compact = false,
  onAssignScope,
  onRevokeRole,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [customRoleId, setCustomRoleId] = useState('');
  const [scopeType, setScopeType] = useState<DepartmentScopeType>('SELF_ONLY');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showRevoke, setShowRevoke] = useState(false);

  React.useEffect(() => {
    if (selectedDepartmentId) setDepartmentId(selectedDepartmentId);
  }, [selectedDepartmentId]);

  const staffMembers = members.filter((member) => member.role !== 'owner');

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(ORG_CHART_COPY.placeSaved);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;

  return (
    <section
      className={compact ? 'space-y-3' : 'space-y-6 rounded-2xl border border-slate-200 bg-white p-4'}
      aria-label={ORG_CHART_COPY.placePeople}
    >
      {message ? <p className="text-xs font-medium text-slate-600">{message}</p> : null}

      <div className={compact ? 'space-y-3' : 'space-y-3 rounded-2xl border border-slate-200 p-4'}>
        {!compact ? (
          <h2 className="text-sm font-semibold text-slate-900">{ORG_CHART_COPY.placePeople}</h2>
        ) : null}
        {!compact || !selectedDepartmentId ? (
          <label className="block text-xs font-bold text-slate-700">
            조직
            <select
              className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
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
        ) : null}
        <label className="block text-xs font-bold text-slate-700">
          직원
          <select
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
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
        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.roleLabel}
          <select
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={customRoleId}
            onChange={(event) => setCustomRoleId(event.target.value)}
          >
            <option value="">{ORG_CHART_COPY.roleUnchanged}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          {ORG_CHART_COPY.scope}
          <select
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={scopeType}
            onChange={(event) => setScopeType(event.target.value as DepartmentScopeType)}
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SCOPE_LABELS[option].title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] font-medium text-slate-500">{SCOPE_LABELS[scopeType].hint}</p>
        </label>
        <button
          type="button"
          disabled={busy || !departmentId || !memberId}
          className="min-h-12 w-full rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-40"
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
          {ORG_CHART_COPY.placeSave}
        </button>
      </div>

      <div className={compact ? 'space-y-2' : 'space-y-3 rounded-2xl border border-slate-200 p-4'}>
        <button
          type="button"
          className="text-xs font-bold text-slate-600 underline"
          onClick={() => setShowRevoke((v) => !v)}
        >
          {showRevoke ? '직급 회수 닫기' : ORG_CHART_COPY.revokeTitle}
        </button>
        {showRevoke ? (
          <>
            <p className="text-xs text-amber-800">{ORG_CHART_COPY.revokeWarn}</p>
            <ul className="space-y-2">
              {staffMembers.map((member) => (
                <li key={member.id} className="flex min-h-11 items-center justify-between gap-2">
                  <span className="text-sm">{memberLabel(member)}</span>
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700"
                    disabled={busy}
                    onClick={() => setRevokeTarget(member.id)}
                  >
                    {ORG_CHART_COPY.revokeAction}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {revokeTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <p className="text-sm text-slate-800">{ORG_CHART_COPY.revokeWarn}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="min-h-11 px-4" onClick={() => setRevokeTarget(null)}>
                {ORG_CHART_COPY.cancel}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white"
                disabled={busy}
                onClick={() => {
                  const target = revokeTarget;
                  setRevokeTarget(null);
                  void run(() => onRevokeRole(target));
                }}
              >
                {ORG_CHART_COPY.revokeConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
