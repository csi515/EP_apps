/**
 * OrganizationTreePage URL/모드 상태·핸들러
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuthorization } from '@/hooks/useAuthorization';
import {
  shouldAskDepartmentSetup,
  type DepartmentScopeType,
} from '@/core/organizations/departmentScope';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { listDynamicRoles, type DynamicRoleRow } from '@/core/organizations/services/dynamicRoleService';
import { canManageOrgStructure } from '@/domain/permissions';
import { StorageService } from '@/services/storage';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { useOrganizationTree } from './useOrganizationTree';
import {
  listAncestorDepartmentIds,
  listDepartmentsMissingLeaders,
  listParentDepartmentIds,
  resolvePrimaryDepartmentIdForUser,
} from './orgChartNavHelpers';
import { ORG_CHART_COPY } from './orgChartCopy';
import { showToast } from '@/shared/feedback/uiFeedback';

export type PageMode = 'workspace' | 'roster';
export type CenterView = 'board' | 'diagram';

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

export function useOrganizationTreePageController() {
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
    bulkMoveMembers,
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
        const message = cause instanceof Error ? cause.message : ORG_CHART_COPY.placeFailed;
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
      showToast(cause instanceof Error ? cause.message : ORG_CHART_COPY.undoFailed, 'error');
    }
  }, [undo, moveMember, unassignFromDepartment]);

  const expandAll = useCallback(() => setCollapsedIds(new Set()), []);
  const collapseAll = useCallback(
    () => setCollapsedIds(new Set(listParentDepartmentIds(sortedNodes))),
    [sortedNodes],
  );

  const goMyDepartment = useCallback(() => {
    if (!myDepartmentId) {
      showToast(ORG_CHART_COPY.goMyDepartmentMissing, 'info');
      return;
    }
    focusDepartment(myDepartmentId);
  }, [myDepartmentId, focusDepartment]);

  const openCreate = useCallback((parentId: string | null) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }, []);

  const toggleMemberSelect = useCallback((id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearMemberSelection = useCallback(() => setSelectedMemberIds(new Set()), []);

  const handleMoveDepartment = useCallback(
    (departmentId: string, newParentId: string | null) => {
      setLocalError(null);
      void moveDepartment(departmentId, newParentId)
        .then(() => showToast(ORG_CHART_COPY.moveDone, 'success'))
        .catch((cause) => {
          const message =
            cause instanceof Error ? cause.message : ORG_CHART_COPY.moveFailed;
          setLocalError(message);
          showToast(message, 'error');
        });
    },
    [moveDepartment],
  );

  const handleRenameDepartment = useCallback(
    async (departmentId: string, name: string) => {
      try {
        await renameDepartment(departmentId, name);
        showToast(ORG_CHART_COPY.renameDone, 'success');
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : ORG_CHART_COPY.renameFailed, 'error');
      }
    },
    [renameDepartment],
  );

  const handleCreateDepartment = useCallback(
    async ({
      name,
      parentId,
      unitKind,
    }: {
      name: string;
      parentId: string | null;
      unitKind?: string | null;
    }) => {
      await createDepartment(name, parentId, unitKind);
      showToast(ORG_CHART_COPY.createDone, 'success');
    },
    [createDepartment],
  );

  const handleScopeChange = useCallback(
    async (
      memberId: string,
      departmentId: string,
      scope: DepartmentScopeType,
      roleId: string | null,
    ) => {
      try {
        await assignScope({
          departmentId,
          memberId,
          scopeType: scope,
          customRoleId: roleId,
        });
        showToast(ORG_CHART_COPY.placeSaved, 'success');
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : ORG_CHART_COPY.saveFailed, 'error');
      }
    },
    [assignScope],
  );

  const handleConfirmDelete = useCallback(
    async ({
      memberAction,
      targetParentId,
    }: {
      memberAction: 'reassign' | 'unassign';
      targetParentId: string | null;
    }) => {
      if (!selectedDeptId) return;
      try {
        await deleteDepartmentWithReassign({
          departmentId: selectedDeptId,
          memberAction: selectedDeptMemberCount > 0 ? memberAction : 'unassign',
          targetParentId,
        });
        setDeleteOpen(false);
        setSelectedDeptId(null);
        showToast(ORG_CHART_COPY.deleteDone, 'success');
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : ORG_CHART_COPY.deleteFailed, 'error');
      }
    },
    [selectedDeptId, selectedDeptMemberCount, deleteDepartmentWithReassign],
  );

  return {
    orgId,
    enabled,
    canManage,
    pageMode,
    setPageMode,
    centerView,
    setCenterView,
    editMode,
    setEditMode,
    sortedNodes,
    selectedDeptId,
    setSelectedDeptId,
    selectedNode,
    missingLeaders,
    collapsedIds,
    scrollToDepartmentId,
    departmentMembers,
    members,
    unassignedMembers,
    roles,
    loading,
    error,
    localError,
    undo,
    selectedMemberIds,
    unassignedOpen,
    setUnassignedOpen,
    createOpen,
    setCreateOpen,
    createParentId,
    deleteOpen,
    setDeleteOpen,
    selectedDeptMemberCount,
    selectedDeptChildCount,
    focusDepartment,
    handleToggleCollapse,
    applyMoveWithUndo,
    handleUndo,
    expandAll,
    collapseAll,
    goMyDepartment,
    openCreate,
    toggleMemberSelect,
    clearMemberSelection,
    handleMoveDepartment,
    handleRenameDepartment,
    handleCreateDepartment,
    handleScopeChange,
    handleConfirmDelete,
    moveMember,
    bulkMoveMembers,
    unassignFromDepartment,
    reload,
  };
}
