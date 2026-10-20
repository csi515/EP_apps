import React, { useMemo, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { OrganizationGovernancePanel } from './OrganizationGovernancePanel';
import { useOrganizationTree } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';

function isOrgChartEnabled(
  industryType: string | null | undefined,
  settings: Record<string, unknown> | null | undefined,
  hasDepartments: boolean,
): boolean {
  const preset = industryType ? getIndustryPreset(industryType) : null;
  if (shouldAskDepartmentSetup(industryType, preset?.category ?? null)) return true;
  if (settings?.org_chart_enabled === true) return true;
  return hasDepartments;
}

export const OrganizationTreePage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { role } = useAuthorization();
  const orgId = currentOrganization?.id ?? null;
  const {
    nodes,
    members,
    departmentMembers,
    loading,
    error,
    createDepartment,
    moveDepartment,
    assignScope,
    revokeMemberRole,
    transferOwnership,
  } = useOrganizationTree(orgId);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [moveParentId, setMoveParentId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const enabled = isOrgChartEnabled(currentOrganization?.industry_type, settings, nodes.length > 0);
  const isOwner = role === 'owner';
  const canManage = isOwner || role === 'manager';

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.path.localeCompare(b.path)),
    [nodes],
  );

  if (!enabled) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <p className="text-sm text-slate-600">{ORG_CHART_COPY.hiddenHint}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="text-lg font-semibold">{ORG_CHART_COPY.title}</h1>
      {loading ? <p className="mt-2 text-sm text-slate-500">불러오는 중…</p> : null}
      {error || localError ? (
        <p className="mt-2 text-sm text-rose-600">{error || localError}</p>
      ) : null}

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setLocalError(null);
          void createDepartment(name, parentId || null)
            .then(() => setName(''))
            .catch((cause) => {
              setLocalError(cause instanceof Error ? cause.message : '부서 생성에 실패했습니다.');
            });
        }}
      >
        <label className="block text-sm">
          {ORG_CHART_COPY.name}
          <input
            className="mt-1 min-h-11 w-full rounded-lg border px-3"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          상위 부서
          <select
            className="mt-1 min-h-11 w-full rounded-lg border px-3"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">최상위</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id}>{node.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm text-white">
          {ORG_CHART_COPY.create}
        </button>
      </form>

      <div className="mt-4">
        <label className="block text-sm">
          {ORG_CHART_COPY.move}
          <select
            className="mt-1 min-h-11 w-full rounded-lg border px-3"
            value={moveParentId}
            onChange={(event) => setMoveParentId(event.target.value)}
          >
            <option value="">최상위</option>
            {sortedNodes.map((node) => (
              <option key={node.id} value={node.id}>{node.name}</option>
            ))}
          </select>
        </label>
      </div>

      <ul className="mt-6 space-y-2">
        {sortedNodes.map((node) => (
          <li key={node.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span style={{ paddingLeft: `${Math.max(0, node.path.split('/').filter(Boolean).length - 1) * 12}px` }}>
              {node.name}
            </span>
            <button
              type="button"
              className="min-h-11 px-2"
              onClick={() => {
                setLocalError(null);
                void moveDepartment(node.id, moveParentId || null).catch((cause) => {
                  setLocalError(cause instanceof Error ? cause.message : '부서 이동에 실패했습니다.');
                });
              }}
            >
              {ORG_CHART_COPY.move}
            </button>
          </li>
        ))}
      </ul>

      <OrganizationGovernancePanel
        isOwner={isOwner}
        canManage={canManage}
        nodes={sortedNodes}
        members={members}
        departmentMembers={departmentMembers}
        onAssignScope={assignScope}
        onRevokeRole={revokeMemberRole}
        onTransferOwnership={transferOwnership}
      />
    </main>
  );
};
