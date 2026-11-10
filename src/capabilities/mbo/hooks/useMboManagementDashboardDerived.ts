import { useMemo, useCallback, useEffect } from 'react';
import {
  validateMboObjectiveWeights,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
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
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { canManageObjectiveOwner } from '../services/mboOrgScopeService';
import { formatPeriodYm, listMissingMonthlyCheckins } from '../domain/mboMonthlyCheckin';
import {
  filterObjectivesForViewer,
  memberMatchesQuery,
  type MboVisibilityType,
} from '../domain/mboVisibilityEngine';
import {
  listCreatableLevels,
  listEligibleParentGoals,
  resolveMaxCreatableLevel,
  validateGoalCreation,
  type ExistingGoalRef,
} from '../domain/mboGoalHierarchy';
import type { ProgressLogItem } from '../ui/MboQuarterlyReviewForm';
import type { ObjectiveNode } from '../ui/MboObjectiveTreeViewer';
import type { MboManagementWorkspaceState } from './useMboManagementWorkspaceState';

import type { MboManagementObjectivesDerived } from './useMboManagementObjectivesDerived';

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
    ownerFilterId,
    selectedMemberUserIds,
    ganttRiskOnly,
    setGanttRiskOnly,
    ganttCheckinOnly,
    setGanttCheckinOnly,
    orgMembers,
    ganttSectionRef,
  } = state;
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
  };
}

export type MboManagementDashboardDerived = ReturnType<typeof useMboManagementDashboardDerived>;
