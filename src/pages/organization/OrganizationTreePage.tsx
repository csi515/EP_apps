import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { listDynamicRoles, type DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { OrganizationGovernancePanel } from './OrganizationGovernancePanel';
import { DepartmentTreeView } from './DepartmentTreeView';
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
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);

  useEffect(() => {
    if (!orgId) {
      setRoles([]);
      return;
    }
    void listDynamicRoles(orgId)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [orgId]);

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
    <main className="mx-auto max-w-6xl p-4 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">{ORG_CHART_COPY.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/workspace/intranet" className="min-h-12 rounded-xl border border-slate-200 px-4 py-3">
            사내 업무 허브
          </Link>
          <Link to="/workspace/settings/roles" className="min-h-12 rounded-xl border border-slate-200 px-4 py-3">
            직급·권한 매트릭스
          </Link>
          <Link to="/workspace/resources" className="min-h-12 rounded-xl border border-slate-200 px-4 py-3">
            공용자원
          </Link>
        </div>
      </div>

      {loading ? <p className="mt-2 text-sm text-slate-500">불러오는 중…</p> : null}
      {error || localError ? (
        <p className="mt-2 text-sm text-rose-600">{error || localError}</p>
      ) : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {canManage ? (
            <form
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
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
              <h2 className="text-sm font-semibold text-slate-900">하위 부서 추가</h2>
              <label className="block text-sm">
                {ORG_CHART_COPY.name}
                <input
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                상위 부서
                <select
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                >
                  <option value="">최상위</option>
                  {sortedNodes.map((node) => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="min-h-12 w-full rounded-xl bg-slate-900 text-sm text-white">
                {ORG_CHART_COPY.create}
              </button>
            </form>
          ) : null}

          <DepartmentTreeView
            nodes={sortedNodes}
            selectedId={selectedDeptId}
            onSelect={setSelectedDeptId}
            canManage={canManage}
            onMove={(departmentId, newParentId) => {
              setLocalError(null);
              void moveDepartment(departmentId, newParentId).catch((cause) => {
                setLocalError(cause instanceof Error ? cause.message : '부서 이동에 실패했습니다.');
              });
            }}
          />
        </section>

        <section>
          <OrganizationGovernancePanel
            isOwner={isOwner}
            canManage={canManage}
            nodes={sortedNodes}
            members={members}
            departmentMembers={departmentMembers}
            roles={roles}
            selectedDepartmentId={selectedDeptId}
            onAssignScope={assignScope}
            onRevokeRole={revokeMemberRole}
            onTransferOwnership={transferOwnership}
          />
        </section>
      </div>
    </main>
  );
};
