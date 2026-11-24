import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronsDownUp, ChevronsUpDown, MapPin, Network, Plus, UserRoundX } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import { shouldAskDepartmentSetup } from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { listDynamicRoles, type DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { canManageOrgStructure } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { DepartmentTreeView } from './DepartmentTreeView';
import { OrganizationDiagramView } from './OrganizationDiagramView';
import { OrganizationCreateDepartmentModal } from './OrganizationCreateDepartmentModal';
import { OrgWorkspaceLayout } from './OrgWorkspaceLayout';
import { OrgDepartmentBoard } from './OrgDepartmentBoard';
import { OrgUnassignedDrawer } from './OrgUnassignedDrawer';
import { OrgDeleteDepartmentDialog } from './OrgDeleteDepartmentDialog';
import { OrgRosterTable } from './OrgRosterTable';
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
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { Button } from '@/shared/components/ui/Button';

type PageMode = 'workspace' | 'roster';
type CenterView = 'board' | 'diagram';

type UndoMove = {
  memberIds: string[];
  targetDepartmentId: string;
  /** 이전 department_id 또는 null(미배치) */
  previous: Array<{ memberId: string; departmentId: string | null }>;
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentOrganization } = useOrganization();
  const { role } = useAuthorization();
  const orgId = currentOrganization?.id ?? null;
  const {
    nodes,
    members,
    departmentMembers,
    unassignedMembers,
    loading,
    error,
    createDepartment,
    renameDepartment,
    deleteDepartmentWithReassign,
    moveDepartment,
    assignScope,
    moveMember,
    unassignFromDepartment,
    reload,
  } = useOrganizationTree(orgId);

  const [pageMode, setPageMode] = useState<PageMode>('workspace');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [centerView, setCenterView] = useState<CenterView>('board');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [scrollToDepartmentId, setScrollToDepartmentId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [roles, setRoles] = useState<DynamicRoleRow[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => new Set());
  const [unassignedOpen, setUnassignedOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [undo, setUndo] = useState<UndoMove | null>(null);
  const sessionUser = useActiveUser();

  useEffect(() => {
    if (searchParams.get('unassigned') === '1') {
      setUnassignedOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('unassigned');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

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

  const selectedDeptMemberCount = useMemo(
    () =>
      selectedDeptId
        ? departmentMembers.filter((dm) => dm.department_id === selectedDeptId).length
        : 0,
    [selectedDeptId, departmentMembers],
  );
  const selectedDeptChildCount = useMemo(
    () => (selectedDeptId ? sortedNodes.filter((n) => n.parentId === selectedDeptId).length : 0),
    [selectedDeptId, sortedNodes],
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

  const snapshotPlacements = useCallback(
    (memberIds: string[]) =>
      memberIds.map((memberId) => {
        const row = departmentMembers.find((dm) => dm.member_id === memberId);
        return { memberId, departmentId: row?.department_id ?? null };
      }),
    [departmentMembers],
  );

  const applyMoveWithUndo = useCallback(
    async (memberIds: string[], departmentId: string) => {
      const previous = snapshotPlacements(memberIds);
      setLocalError(null);
      try {
        for (const id of memberIds) {
          await moveMember(id, departmentId);
        }
        setUndo({ memberIds, targetDepartmentId: departmentId, previous });
        setSelectedMemberIds(new Set());
        showToast(ORG_CHART_COPY.memberMoved, 'success');
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '배치에 실패했습니다.';
        setLocalError(message);
        showToast(message, 'error');
      }
    },
    [moveMember, snapshotPlacements],
  );

  const handleUndo = useCallback(async () => {
    if (!undo) return;
    try {
      for (const row of undo.previous) {
        if (row.departmentId) await moveMember(row.memberId, row.departmentId);
        else await unassignFromDepartment(row.memberId, undo.targetDepartmentId);
      }
      setUndo(null);
      showToast(ORG_CHART_COPY.memberMovedUndo, 'info');
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '실행 취소 실패', 'error');
    }
  }, [undo, moveMember, unassignFromDepartment]);

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
              <Button
                type="button"
                variant={editMode ? 'secondary' : 'outline'}
                onClick={() => setEditMode((v) => !v)}
              >
                {editMode ? ORG_CHART_COPY.viewMode : ORG_CHART_COPY.editMode}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setCreateParentId(selectedDeptId);
                  setCreateOpen(true);
                }}
                data-testid="org-create-department-open"
              >
                <Plus className="h-4 w-4" />
                {ORG_CHART_COPY.create}
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mt-4">
        <SegmentedControl
          aria-label={ORG_CHART_COPY.pageModeLabel}
          value={pageMode}
          onChange={(v) => setPageMode(v)}
          activeClassName="bg-slate-800 text-white shadow-none"
          options={[
            { value: 'workspace', label: ORG_CHART_COPY.viewWorkspace },
            { value: 'roster', label: ORG_CHART_COPY.viewRoster },
          ]}
        />
      </div>

      {pageMode === 'roster' ? (
        orgId ? (
          <OrgRosterTable
            organizationId={orgId}
            members={members}
            nodes={sortedNodes}
            departmentMembers={departmentMembers}
            roles={roles}
            canEdit={canManage}
            moveMember={moveMember}
            unassignFromDepartment={unassignFromDepartment}
            reload={reload}
          />
        ) : null
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SegmentedControl
              aria-label={ORG_CHART_COPY.viewModeLabel}
              value={centerView}
              onChange={(v) => setCenterView(v)}
              activeClassName="bg-slate-800 text-white shadow-none"
              options={[
                { value: 'board', label: ORG_CHART_COPY.viewBoard },
                { value: 'diagram', label: ORG_CHART_COPY.viewDiagram },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnassignedOpen(true)}
                data-testid="org-open-unassigned"
              >
                <UserRoundX className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.unassignedCount(unassignedMembers.length)}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCollapsedIds(new Set())}>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.expandAll}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCollapsedIds(new Set(listParentDepartmentIds(sortedNodes)))}
              >
                <ChevronsDownUp className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.collapseAll}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!myDepartmentId) {
                    showToast(ORG_CHART_COPY.goMyDepartmentMissing, 'info');
                    return;
                  }
                  focusDepartment(myDepartmentId);
                }}
                data-testid="org-go-my-department"
              >
                <MapPin className="h-3.5 w-3.5" />
                {ORG_CHART_COPY.goMyDepartment}
              </Button>
            </div>
          </div>

          {centerView === 'diagram' && editMode ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {ORG_CHART_COPY.diagramEditHint}
            </p>
          ) : null}

          {undo ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <span className="font-medium text-slate-700">{ORG_CHART_COPY.memberMoved}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => void handleUndo()}>
                {ORG_CHART_COPY.memberMovedUndo}
              </Button>
            </div>
          ) : null}

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
              </div>
            </div>
          ) : null}

          {loading ? <p className="mt-3 text-sm text-slate-500">불러오는 중…</p> : null}
          {error || localError ? (
            <p className="mt-3 text-sm font-semibold text-rose-600">{error || localError}</p>
          ) : null}

          <OrgWorkspaceLayout
            tree={
              <DepartmentTreeView
                nodes={sortedNodes}
                selectedId={selectedDeptId}
                onSelect={setSelectedDeptId}
                canManage={canManage}
                editMode={editMode}
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
                      const message =
                        cause instanceof Error ? cause.message : '조직 이동에 실패했습니다.';
                      setLocalError(message);
                      showToast(message, 'error');
                    });
                }}
                onMemberDrop={(memberId, departmentId) => {
                  void applyMoveWithUndo([memberId], departmentId);
                }}
                onAddChild={(parentId) => {
                  setCreateParentId(parentId);
                  setCreateOpen(true);
                }}
                onRename={async (departmentId, name) => {
                  try {
                    await renameDepartment(departmentId, name);
                    showToast('조직 이름을 변경했습니다.', 'success');
                  } catch (cause) {
                    showToast(
                      cause instanceof Error ? cause.message : '이름 변경 실패',
                      'error',
                    );
                  }
                }}
              />
            }
            main={
              centerView === 'board' ? (
                <OrgDepartmentBoard
                  node={selectedNode}
                  nodes={sortedNodes}
                  members={members}
                  departmentMembers={departmentMembers}
                  roles={roles}
                  canEdit={canManage}
                  selectedMemberIds={selectedMemberIds}
                  onToggleSelect={(id) => {
                    setSelectedMemberIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  }}
                  onClearSelection={() => setSelectedMemberIds(new Set())}
                  onSelectDepartment={focusDepartment}
                  onBulkMove={(departmentId) =>
                    applyMoveWithUndo(Array.from(selectedMemberIds), departmentId)
                  }
                  onScopeChange={async (memberId, departmentId, scope, roleId) => {
                    try {
                      await assignScope({
                        departmentId,
                        memberId,
                        scopeType: scope,
                        customRoleId: roleId,
                      });
                      showToast(ORG_CHART_COPY.placeSaved, 'success');
                    } catch (cause) {
                      showToast(cause instanceof Error ? cause.message : '저장 실패', 'error');
                    }
                  }}
                  onRequestDelete={
                    canManage && selectedNode ? () => setDeleteOpen(true) : undefined
                  }
                />
              ) : (
                <OrganizationDiagramView
                  nodes={sortedNodes}
                  selectedId={selectedDeptId}
                  onSelect={setSelectedDeptId}
                  collapsedIds={collapsedIds}
                  onToggleCollapse={handleToggleCollapse}
                  scrollToDepartmentId={scrollToDepartmentId}
                  departmentMembers={departmentMembers}
                  members={members}
                  roles={roles}
                />
              )
            }
            drawer={
              <OrgUnassignedDrawer
                open={unassignedOpen}
                members={unassignedMembers}
                canEdit={canManage}
                selectedMemberIds={selectedMemberIds}
                onClose={() => setUnassignedOpen(false)}
                onToggleSelect={(id) => {
                  setSelectedMemberIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            }
          />

          {canManage ? (
            <OrganizationCreateDepartmentModal
              open={createOpen}
              nodes={sortedNodes}
              defaultParentId={createParentId}
              onClose={() => setCreateOpen(false)}
              onCreate={async ({ name, parentId, unitKind }) => {
                await createDepartment(name, parentId, unitKind);
                showToast('조직을 추가했습니다.', 'success');
              }}
            />
          ) : null}

          <OrgDeleteDepartmentDialog
            open={deleteOpen}
            node={selectedNode}
            nodes={sortedNodes}
            memberCount={selectedDeptMemberCount}
            childCount={selectedDeptChildCount}
            onClose={() => setDeleteOpen(false)}
            onConfirm={async ({ memberAction, targetParentId }) => {
              if (!selectedDeptId) return;
              try {
                await deleteDepartmentWithReassign({
                  departmentId: selectedDeptId,
                  memberAction:
                    selectedDeptMemberCount > 0 ? memberAction : 'unassign',
                  targetParentId,
                });
                setDeleteOpen(false);
                setSelectedDeptId(null);
                showToast(ORG_CHART_COPY.deleteDone, 'success');
              } catch (cause) {
                showToast(cause instanceof Error ? cause.message : '삭제 실패', 'error');
              }
            }}
          />
        </>
      )}
    </WorkPageFrame>
  );
};
