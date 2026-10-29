import React, { useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { listDynamicRoles, type DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { canManageOrgStructure } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { DEPARTMENT_UNIT_KIND_SUGGESTIONS } from '@/core/organizations/services/organizationTreeService';
import { OrganizationGovernancePanel } from './OrganizationGovernancePanel';
import { DepartmentTreeView } from './DepartmentTreeView';
import { useOrganizationTree } from './useOrganizationTree';
import { ORG_CHART_COPY } from './orgChartCopy';
import { showToast } from '@/shared/feedback/uiFeedback';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';

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
    renameDepartment,
    deleteDepartment,
    moveDepartment,
    assignScope,
    reassignMember,
    revokeMemberRole,
    transferOwnership,
  } = useOrganizationTree(orgId);

  const [name, setName] = useState('');
  const [unitKind, setUnitKind] = useState('');
  const [parentId, setParentId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnitKind, setEditUnitKind] = useState('');
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

  useEffect(() => {
    const selected = nodes.find((n) => n.id === selectedDeptId);
    setEditName(selected?.name ?? '');
    setEditUnitKind(selected?.unitKind ?? '');
  }, [selectedDeptId, nodes]);

  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const enabled = isOrgChartEnabled(currentOrganization?.industry_type, settings, nodes.length > 0);
  const isOwner = role === 'owner';
  const activeUser = StorageService.getActiveUser();
  const canManage = canManageOrgStructure({
    role,
    permissions: activeUser?.permissions ?? null,
    customRole: activeUser?.customRole ?? null,
  });

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.path.localeCompare(b.path)),
    [nodes],
  );

  if (!enabled) {
    return (
      <WorkPageFrame width="form" as="main">
        <p className="text-sm text-slate-600">{ORG_CHART_COPY.hiddenHint}</p>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame width="hub" as="main">
      <div className="flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{ORG_CHART_COPY.title}</h1>
      </div>

      {loading ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}
      {error || localError ? (
        <p className="text-sm text-rose-600">{error || localError}</p>
      ) : null}

      <div className={`grid gap-6 ${canManage ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <section className="space-y-4">
          {canManage ? (
            <form
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                setLocalError(null);
                void createDepartment(name, parentId || null, unitKind || null)
                  .then(() => {
                    setName('');
                    setUnitKind('');
                  })
                  .catch((cause) => {
                    setLocalError(cause instanceof Error ? cause.message : '조직 생성에 실패했습니다.');
                  });
              }}
            >
              <h2 className="text-sm font-semibold text-slate-900">하위 조직 추가</h2>
              <label className="block text-sm">
                {ORG_CHART_COPY.name}
                <input
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                조직 종류 (선택)
                <input
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  list="dept-unit-kind-suggestions"
                  placeholder="실, 그룹, 부, 센터…"
                  value={unitKind}
                  onChange={(event) => setUnitKind(event.target.value)}
                />
                <datalist id="dept-unit-kind-suggestions">
                  {DEPARTMENT_UNIT_KIND_SUGGESTIONS.map((kind) => (
                    <option key={kind} value={kind} />
                  ))}
                </datalist>
              </label>
              <label className="block text-sm">
                상위 조직
                <select
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  value={parentId}
                  onChange={(event) => setParentId(event.target.value)}
                >
                  <option value="">최상위</option>
                  {sortedNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.unitKind ? `[${node.unitKind}] ` : ''}
                      {node.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="min-h-12 w-full rounded-xl bg-slate-900 text-sm text-white">
                {ORG_CHART_COPY.create}
              </button>
            </form>
          ) : null}

          {canManage && selectedDeptId ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">선택 조직 편집</h2>
              <label className="block text-sm">
                이름
                <input
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </label>
              <label className="block text-sm">
                조직 종류
                <input
                  className="mt-1 min-h-12 w-full rounded-xl border px-3"
                  list="dept-unit-kind-edit"
                  value={editUnitKind}
                  onChange={(event) => setEditUnitKind(event.target.value)}
                />
                <datalist id="dept-unit-kind-edit">
                  {DEPARTMENT_UNIT_KIND_SUGGESTIONS.map((kind) => (
                    <option key={kind} value={kind} />
                  ))}
                </datalist>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-12 flex-1 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                  onClick={() => {
                    setLocalError(null);
                    void renameDepartment(selectedDeptId, editName, editUnitKind || null).catch((cause) => {
                      setLocalError(cause instanceof Error ? cause.message : '이름 변경 실패');
                    });
                  }}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="min-h-12 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700"
                  onClick={() => {
                    setLocalError(null);
                    void deleteDepartment(selectedDeptId)
                      .then(() => setSelectedDeptId(null))
                      .catch((cause) => {
                        setLocalError(cause instanceof Error ? cause.message : '삭제 실패');
                      });
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          ) : null}

          <DepartmentTreeView
            nodes={sortedNodes}
            selectedId={selectedDeptId}
            onSelect={setSelectedDeptId}
            canManage={canManage}
            departmentMembers={departmentMembers}
            members={members}
            roles={roles}
            onMove={(departmentId, newParentId) => {
              setLocalError(null);
              void moveDepartment(departmentId, newParentId)
                .then(() => showToast('조직 위치가 변경되었습니다.', 'success'))
                .catch((cause) => {
                  const message = cause instanceof Error ? cause.message : '조직 이동에 실패했습니다.';
                  setLocalError(message);
                  showToast(message, 'error');
                });
            }}
            onReassignMember={(memberId, departmentId) => {
              setLocalError(null);
              void reassignMember(memberId, departmentId)
                .then(() => showToast('인원을 재배치했습니다.', 'success'))
                .catch((cause) => {
                  const message = cause instanceof Error ? cause.message : '인원 배치에 실패했습니다.';
                  setLocalError(message);
                  showToast(message, 'error');
                });
            }}
          />
        </section>

        {canManage ? (
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
        ) : null}
      </div>
    </WorkPageFrame>
  );
};
