import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronsDownUp, ChevronsUpDown, MapPin, Network, Plus } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { listDynamicRoles, type DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { canManageOrgStructure } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { DepartmentTreeView } from './DepartmentTreeView';
import { OrganizationCreateDepartmentModal } from './OrganizationCreateDepartmentModal';
import { OrganizationDepartmentDetailPanel } from './OrganizationDepartmentDetailPanel';
import { useOrganizationTree } from './useOrganizationTree';
import {
  listAncestorDepartmentIds,
  listDepartmentsMissingLeaders,
  listParentDepartmentIds,
  resolvePrimaryDepartmentIdForUser,
} from './orgChartNavHelpers';
import { ORG_CHART_COPY } from './orgChartCopy';
import { showToast } from '@/shared/feedback/uiFeedback';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { PageHeader } from '@/shared/components/ui/PageHeader';

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
  } = useOrganizationTree(orgId);

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [scrollToDepartmentId, setScrollToDepartmentId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);
  const [seedingBusy, setSeedingBusy] = useState(false);
  const sessionUser = useActiveUser();

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
  const selectedNode = sortedNodes.find((n) => n.id === selectedDeptId) ?? null;
  const missingLeaders = useMemo(
    () => listDepartmentsMissingLeaders(sortedNodes, departmentMembers),
    [sortedNodes, departmentMembers],
  );
  const myDepartmentId = useMemo(
    () =>
      resolvePrimaryDepartmentIdForUser(
        sessionUser?.id ?? activeUser?.id ?? null,
        members,
        departmentMembers,
      ),
    [sessionUser?.id, activeUser?.id, members, departmentMembers],
  );

  const focusDepartment = useCallback(
    (departmentId: string) => {
      const ancestors = listAncestorDepartmentIds(departmentId, sortedNodes);
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        for (const id of ancestors) next.delete(id);
        next.delete(departmentId);
        return next;
      });
      setSelectedDeptId(departmentId);
      // 같은 id 재클릭 시에도 스크롤 effect가 다시 돌도록 한 프레임 리셋
      setScrollToDepartmentId(null);
      requestAnimationFrame(() => setScrollToDepartmentId(departmentId));
    },
    [sortedNodes],
  );

  const handleToggleCollapse = useCallback((departmentId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(departmentId)) next.delete(departmentId);
      else next.add(departmentId);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const handleCollapseAll = useCallback(() => {
    setCollapsedIds(new Set(listParentDepartmentIds(sortedNodes)));
  }, [sortedNodes]);

  const handleGoMyDepartment = useCallback(() => {
    if (!myDepartmentId) {
      showToast(ORG_CHART_COPY.goMyDepartmentMissing, 'info');
      return;
    }
    setSearchQuery('');
    focusDepartment(myDepartmentId);
  }, [myDepartmentId, focusDepartment]);

  const handleSeedChip = useCallback(
    async (name: string) => {
      setSeedingBusy(true);
      setLocalError(null);
      try {
        await createDepartment(name, null);
        showToast(ORG_CHART_COPY.seedChip(name), 'success');
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '조직 추가에 실패했습니다.';
        setLocalError(message);
        showToast(message, 'error');
      } finally {
        setSeedingBusy(false);
      }
    },
    [createDepartment],
  );

  const handleSeedAll = useCallback(async () => {
    setSeedingBusy(true);
    setLocalError(null);
    try {
      for (const name of ORG_CHART_COPY.chips) {
        await createDepartment(name, null);
      }
      showToast(ORG_CHART_COPY.seedAllDone, 'success');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '추천 구조 생성에 실패했습니다.';
      setLocalError(message);
      showToast(message, 'error');
    } finally {
      setSeedingBusy(false);
    }
  }, [createDepartment]);

  if (!enabled) {
    return (
      <WorkPageFrame width="form" as="main">
        <p className="text-sm text-slate-600">{ORG_CHART_COPY.hiddenHint}</p>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame width="hub" as="main">
      <PageHeader
        icon={<Network className="h-5 w-5" />}
        title={ORG_CHART_COPY.title}
        description={ORG_CHART_COPY.subtitle}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`min-h-12 rounded-xl border px-3 text-xs font-bold ${
                  editMode
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
                onClick={() => setEditMode((v) => !v)}
              >
                {editMode ? ORG_CHART_COPY.viewMode : ORG_CHART_COPY.editMode}
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"
                onClick={() => setCreateOpen(true)}
                data-testid="org-create-department-open"
              >
                <Plus className="h-4 w-4" />
                {ORG_CHART_COPY.create}
              </button>
            </div>
          ) : null
        }
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="org-chart-search">
          {ORG_CHART_COPY.searchPlaceholder}
        </label>
        <input
          id="org-chart-search"
          className="min-h-12 w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
          placeholder={ORG_CHART_COPY.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
            onClick={handleExpandAll}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {ORG_CHART_COPY.expandAll}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
            onClick={handleCollapseAll}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            {ORG_CHART_COPY.collapseAll}
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800"
            onClick={handleGoMyDepartment}
            data-testid="org-go-my-department"
          >
            <MapPin className="h-3.5 w-3.5" />
            {ORG_CHART_COPY.goMyDepartment}
          </button>
        </div>
      </div>

      {missingLeaders.length > 0 ? (
        <div
          className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
          data-testid="org-missing-leaders"
        >
          <p className="text-xs font-bold text-amber-950">
            {ORG_CHART_COPY.missingLeadersTitle}
            <span className="ml-2 font-semibold text-amber-800">
              {ORG_CHART_COPY.missingLeadersHint(missingLeaders.length)}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingLeaders.slice(0, 12).map((node) => (
              <button
                key={node.id}
                type="button"
                className="min-h-9 rounded-lg border border-amber-200 bg-white px-2.5 text-[11px] font-bold text-amber-900"
                onClick={() => focusDepartment(node.id)}
              >
                {node.unitKind ? `${node.unitKind} · ` : ''}
                {node.name}
              </button>
            ))}
            {missingLeaders.length > 12 ? (
              <span className="self-center text-[11px] font-semibold text-amber-800">
                +{missingLeaders.length - 12}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? <p className="mt-3 text-sm text-slate-500">불러오는 중…</p> : null}
      {error || localError ? (
        <p className="mt-3 text-sm font-semibold text-rose-600">{error || localError}</p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <DepartmentTreeView
          nodes={sortedNodes}
          selectedId={selectedDeptId}
          onSelect={setSelectedDeptId}
          canManage={canManage}
          editMode={editMode}
          searchQuery={searchQuery}
          collapsedIds={collapsedIds}
          onToggleCollapse={handleToggleCollapse}
          scrollToDepartmentId={scrollToDepartmentId}
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

        <OrganizationDepartmentDetailPanel
          node={selectedNode}
          canManage={canManage}
          departmentMembers={departmentMembers}
          members={members}
          roles={roles}
          nodes={sortedNodes}
          onRename={async (id, name, unitKind) => {
            await renameDepartment(id, name, unitKind);
            showToast('조직 정보가 저장되었습니다.', 'success');
          }}
          onDelete={async (id) => {
            await deleteDepartment(id);
            setSelectedDeptId(null);
            showToast('조직을 삭제했습니다.', 'success');
          }}
          onAssignScope={assignScope}
          onRevokeRole={revokeMemberRole}
        />
      </div>

      {canManage ? (
        <OrganizationCreateDepartmentModal
          open={createOpen}
          nodes={sortedNodes}
          defaultParentId={selectedDeptId}
          onClose={() => setCreateOpen(false)}
          onCreate={async ({ name, parentId, unitKind }) => {
            await createDepartment(name, parentId, unitKind);
            showToast('조직을 추가했습니다.', 'success');
          }}
        />
      ) : null}
    </WorkPageFrame>
  );
};
