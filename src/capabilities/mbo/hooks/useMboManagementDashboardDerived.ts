import { useMemo, useCallback } from 'react';
import { validateMboObjectiveWeights } from '../domain/mboEngine';
import {
  buildTeamMemberChips,
  computeManagerKpis,
  listRiskProjectIds,
} from '../domain/mboManagerDashboardEngine';
import { buildHierarchyGanttRows } from '../domain/mboGanttHierarchyEngine';
import {
  canManagerOverrideCycleGoalLock,
  countPendingGoalApprovals,
} from '../domain/mboTwoTierLockEngine';
import { buildPersonObjectiveBuckets } from '../domain/mboTeamBoardEngine';
import {
  buildOrgAlignedObjectiveTree,
  listUpstreamVisibleGoals,
  resolveAlignmentContext,
  type OrgAlignedObjective,
} from '../domain/mboOrgAlignedTreeEngine';
import { canManageObjectiveOwner } from '../services/mboOrgScopeService';
import {
  filterObjectivesForViewer,
} from '../domain/mboVisibilityEngine';
import type { MboManagementWorkspaceState } from './useMboManagementWorkspaceState';
import type { MboManagementObjectivesDerived } from './useMboManagementObjectivesDerived';

function toAligned(o: {
  id: string;
  parentId: string | null;
  level: OrgAlignedObjective['level'];
  title: string;
  ownerId?: string | null;
  ownerName: string;
  departmentName?: string | null;
  departmentId?: string | null;
  progressRate: number;
  weight: number;
  status: string;
}): OrgAlignedObjective {
  return {
    id: o.id,
    parentId: o.parentId,
    level: o.level,
    title: o.title,
    ownerId: o.ownerId ?? null,
    ownerName: o.ownerName,
    departmentName: o.departmentName,
    departmentId: o.departmentId,
    progressRate: o.progressRate,
    weight: o.weight,
    status: o.status,
  };
}

export function useMboManagementDashboardDerived(
  state: MboManagementWorkspaceState,
  obj: MboManagementObjectivesDerived,
) {
  const objectives = obj.objectives;
  const teamObjectivesForManager = obj.teamObjectivesForManager;
  const portfolioProjects = obj.portfolioProjects;
  const missingMonthlyProjectIds = obj.missingMonthlyProjectIds;
  const {
    goalsLocked,
    orgScope,
    isOrgAdmin,
    isManager,
    viewerUserId,
    viewerMemberId,
    ownerFilterId,
    selectedMemberUserIds,
    ganttRiskOnly,
    ganttCheckinOnly,
    orgMembers,
  } = state;
  const rawObjectiveRows = obj.rawObjectiveRows;
  const teamBoardBuckets = useMemo(
    () =>
      buildPersonObjectiveBuckets(
        objectives.map((o) => ({
          id: o.id,
          parentId: o.parentId,
          level: o.level,
          ownerId: o.ownerId ?? null,
          ownerName: o.ownerName,
          title: o.title,
          status: o.status,
          startDate: o.startDate,
          targetDate: o.targetDate,
          weight: o.weight,
          progressRate: o.progressRate,
          departmentName: o.departmentName,
        })),
        {
          viewerUserId,
          ownerFilterUserId: ownerFilterId || null,
        },
      ),
    [objectives, viewerUserId, ownerFilterId],
  );

  const hubSummary = useMemo(() => {
    const mine = objectives.filter((o) => o.ownerId === viewerUserId);
    const team = objectives.filter((o) => o.ownerId !== viewerUserId);
    const teamAvg =
      team.length === 0
        ? 0
        : Math.round(team.reduce((s, o) => s + o.progressRate, 0) / team.length);
    const mineAvg =
      mine.length === 0
        ? 0
        : Math.round(mine.reduce((s, o) => s + o.progressRate, 0) / mine.length);
    return {
      mineCount: mine.length,
      teamCount: team.length,
      mineAvg,
      teamAvg,
      missingMonthly: missingMonthlyProjectIds.length,
    };
  }, [objectives, viewerUserId, missingMonthlyProjectIds.length]);

  const teamUserIds = useMemo(() => {
    const ids = new Set<string>();
    (orgScope?.managedUserIds ?? []).forEach((id) => {
      if (id) ids.add(id);
    });
    if (ids.size === 0 && isManager) {
      teamObjectivesForManager.forEach((o) => {
        if (o.ownerId) ids.add(o.ownerId);
      });
    }
    return [...ids];
  }, [orgScope?.managedUserIds, isManager, teamObjectivesForManager]);

  const managerObjectiveRefs = useMemo(
    () =>
      teamObjectivesForManager.map((o) => ({
        id: o.id,
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        title: o.title,
        status: o.status,
        weight: o.weight,
        progressRate: o.progressRate,
        startDate: o.startDate,
        targetDate: o.targetDate,
      })),
    [teamObjectivesForManager],
  );

  const managerKpis = useMemo(
    () =>
      computeManagerKpis(managerObjectiveRefs, portfolioProjects, {
        viewerUserId,
        teamUserIds,
        missingMonthlyProjectIds,
      }),
    [managerObjectiveRefs, portfolioProjects, viewerUserId, teamUserIds, missingMonthlyProjectIds],
  );

  const teamMemberChips = useMemo(
    () =>
      buildTeamMemberChips(
        managerObjectiveRefs,
        portfolioProjects,
        orgMembers.map((m) => ({ userId: m.userId, displayName: m.displayName })),
        { viewerUserId, teamUserIds, missingMonthlyProjectIds },
      ),
    [managerObjectiveRefs, portfolioProjects, orgMembers, viewerUserId, teamUserIds, missingMonthlyProjectIds],
  );

  const riskProjectIds = useMemo(() => listRiskProjectIds(portfolioProjects), [portfolioProjects]);

  const canOverrideGoalLockForOwner = useCallback(
    (ownerId: string | null | undefined) => {
      if (!orgScope) return isOrgAdmin && goalsLocked;
      const canManage = canManageObjectiveOwner(orgScope, ownerId, viewerUserId, isOrgAdmin);
      return canManagerOverrideCycleGoalLock(goalsLocked, canManage);
    },
    [orgScope, viewerUserId, isOrgAdmin, goalsLocked],
  );

  const canManagerCreateWhileLocked = isManager && (isOrgAdmin || orgScope?.isSubtreeManager === true);

  const hierarchyGanttRows = useMemo(() => {
    let rows = buildHierarchyGanttRows(
      objectives.map((o) => ({
        id: o.id,
        title: o.title,
        ownerId: o.ownerId,
        ownerName: o.ownerName,
        status: o.status,
        startDate: o.startDate,
        targetDate: o.targetDate,
        progressRate: o.progressRate,
        weight: o.weight,
      })),
      portfolioProjects,
      {
        ownerUserIds: selectedMemberUserIds.length > 0 ? selectedMemberUserIds : undefined,
        riskOnly: ganttRiskOnly,
        riskProjectIds,
      },
    );
    if (ganttCheckinOnly) {
      const missing = new Set(missingMonthlyProjectIds);
      rows = rows.filter((r) => r.kind === 'objective' || missing.has(r.id));
    }
    return rows;
  }, [
    objectives,
    portfolioProjects,
    selectedMemberUserIds,
    ganttRiskOnly,
    riskProjectIds,
    ganttCheckinOnly,
    missingMonthlyProjectIds,
  ]);

  const pendingChangeApprovals = useMemo(
    () =>
      countPendingGoalApprovals(
        teamObjectivesForManager.map((o) => ({ status: o.status, ownerId: o.ownerId ?? null })),
        teamUserIds,
      ),
    [teamObjectivesForManager, teamUserIds],
  );

  const weightValidation = useMemo(() => {
    const subset = ownerFilterId
      ? objectives.filter((o) => o.ownerId === ownerFilterId)
      : objectives.filter((o) => o.ownerId === viewerUserId);
    return validateMboObjectiveWeights(subset);
  }, [objectives, ownerFilterId, viewerUserId]);

  const viewerMember = useMemo(
    () => orgMembers.find((m) => m.userId === viewerUserId) ?? null,
    [orgMembers, viewerUserId]
  );

  /** 열람 가능(visible) 전체 — 정렬 스트립·상위 블록용 */
  const visibleAlignedObjectives = useMemo(() => {
    const rows = filterObjectivesForViewer(rawObjectiveRows, {
      scope: 'visible',
      currentUserId: viewerUserId,
      currentMemberId: viewerMemberId ?? orgScope?.viewerMemberId,
      isOwnerOrAdmin: isOrgAdmin,
      managedUserIds: orgScope?.managedUserIds,
      viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
      authorDepartmentPathByOwnerId: (ownerId) =>
        orgMembers.find((m) => m.userId === ownerId)?.departmentPath ?? null,
      ownerFilterId: null,
    });
    return rows.map(toAligned);
  }, [
    rawObjectiveRows,
    viewerUserId,
    viewerMemberId,
    orgScope,
    isOrgAdmin,
    orgMembers,
  ]);

  const alignmentContext = useMemo(
    () =>
      resolveAlignmentContext({
        visibleObjectives: visibleAlignedObjectives,
        viewerUserId,
        viewerDepartmentId: viewerMember?.departmentId ?? null,
        viewerDepartmentName: viewerMember?.departmentName ?? null,
      }),
    [visibleAlignedObjectives, viewerUserId, viewerMember]
  );

  const orgAlignedRows = useMemo(
    () => buildOrgAlignedObjectiveTree(objectives.map(toAligned)),
    [objectives]
  );

  const upstreamGoals = useMemo(
    () =>
      listUpstreamVisibleGoals({
        visibleObjectives: visibleAlignedObjectives,
        managedUserIds: [...(orgScope?.managedUserIds ?? [])],
        viewerUserId,
      }),
    [visibleAlignedObjectives, orgScope?.managedUserIds, viewerUserId]
  );

  const hasUpstreamPublicGoals = useMemo(
    () =>
      visibleAlignedObjectives.some(
        (o) => o.level === 'company' || o.level === 'department'
      ),
    [visibleAlignedObjectives]
  );

  return {
    teamBoardBuckets,
    teamUserIds,
    managerObjectiveRefs,
    managerKpis,
    teamMemberChips,
    riskProjectIds,
    canOverrideGoalLockForOwner,
    canManagerCreateWhileLocked,
    hierarchyGanttRows,
    pendingChangeApprovals,
    hubSummary,
    weightValidation,
    alignmentContext,
    orgAlignedRows,
    upstreamGoals,
    hasUpstreamPublicGoals,
  };
}

export type MboManagementDashboardDerived = ReturnType<typeof useMboManagementDashboardDerived>;
