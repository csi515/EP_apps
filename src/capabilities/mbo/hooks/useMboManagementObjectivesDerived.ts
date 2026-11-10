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
import { MboService } from '../services/mboService';
import type { MboManagementWorkspaceState } from './useMboManagementWorkspaceState';


export function useMboManagementObjectivesDerived(state: MboManagementWorkspaceState) {
  const {
    orgMembers,
    newOwnerMemberId,
    refineObjectives,
    localObjectives,
    sharesByObjective,
    listScope,
    viewerUserId,
    viewerMemberId,
    orgScope,
    isOrgAdmin,
    ownerFilterId,
    personQuery,
    selectedMemberUserIds,
    newLevel,
    newParentId,
    newDepartmentId,
    newDept,
    orgDepartments,
    refineLogs,
    projectCategories,
    refineProjects,
    projectSheetId,
    monthlyCheckProjectId,
    selectedObjectiveId,
    selectedProjectId,
    projectQuery,
    orgId,
    objQuery,
    setSelectedProjectId,
    setSelectedObjectiveId,
  } = state;
  const rawObjectiveRows: ObjectiveNode[] = useMemo(() => {
    const mapRow = (row: any): ObjectiveNode => ({
      id: row.id,
      parentId: row.parent_id,
      level: row.level as MboLevel,
      departmentName: row.department_name || '부서',
      ownerName: row.owner_name || '담당자',
      title: row.title,
      description: row.description || '',
      successCriteria: row.success_criteria || '',
      status: (row.status || 'draft') as MboStatus,
      startDate: row.start_date || '2026-01-01',
      targetDate: row.target_date || '2026-12-31',
      weight: row.weight ?? 100,
      progressRate: row.progress_rate ?? 0,
      revision: row.revision_count ?? row.revision ?? 1,
      isRevised: Boolean(row.is_revised),
      revisionCount: row.revision_count ?? row.revision ?? 1,
      targetValue: row.target_value ?? row.weight ?? null,
      rejectionReason: row.rejection_reason,
      ownerId: row.owner_id ?? null,
      visibilityType: (row.visibility_type || 'PRIVATE') as MboVisibilityType,
      sharedMemberIds: sharesByObjective.get(row.id) ?? [],
      deletedAt: row.deleted_at ?? null,
    });
    if (refineObjectives && refineObjectives.length > 0) {
      return refineObjectives.map(mapRow);
    }
    return localObjectives.map((obj) => ({
      ...obj,
      isRevised: obj.revision > 1,
      revisionCount: obj.revision,
      targetValue: obj.weight,
      ownerId: obj.ownerId ?? null,
      visibilityType: obj.visibilityType ?? ('PRIVATE' as MboVisibilityType),
      sharedMemberIds: obj.sharedMemberIds ?? [],
      deletedAt: obj.deletedAt ?? null,
    }));
  }, [refineObjectives, localObjectives, sharesByObjective]);

  const objectives: ObjectiveNode[] = useMemo(() => {
    let filtered = filterObjectivesForViewer(rawObjectiveRows, {
      scope: listScope,
      currentUserId: viewerUserId,
      currentMemberId: viewerMemberId ?? orgScope?.viewerMemberId,
      isOwnerOrAdmin: isOrgAdmin,
      managedUserIds: orgScope?.managedUserIds,
      viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
      ownerFilterId: ownerFilterId || null,
    });
    const q = personQuery.trim();
    if (q) {
      filtered = filtered.filter((row) => memberMatchesQuery(row.ownerName, q));
    }
    if (selectedMemberUserIds.length > 0) {
      const pick = new Set(selectedMemberUserIds);
      filtered = filtered.filter((row) => row.ownerId && pick.has(row.ownerId));
    }
    return filtered;
  }, [
    rawObjectiveRows,
    listScope,
    viewerUserId,
    viewerMemberId,
    orgScope,
    isOrgAdmin,
    ownerFilterId,
    personQuery,
    selectedMemberUserIds,
  ]);

  const teamObjectivesForManager = useMemo(
    () =>
      filterObjectivesForViewer(rawObjectiveRows, {
        scope: 'team',
        currentUserId: viewerUserId,
        currentMemberId: viewerMemberId ?? orgScope?.viewerMemberId,
        isOwnerOrAdmin: isOrgAdmin,
        managedUserIds: orgScope?.managedUserIds,
        viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
        ownerFilterId: null,
      }),
    [rawObjectiveRows, viewerUserId, viewerMemberId, orgScope, isOrgAdmin],
  );

  const personFilterOptions = useMemo(() => {
    const q = personQuery.trim();
    return orgMembers.filter((m) => !q || memberMatchesQuery(m.displayName, q));
  }, [orgMembers, personQuery]);

  const goalActor = useMemo(
    () =>
      orgScope?.goalActor ?? {
        isTopExecutive: false,
        isUnitLeader: false,
        ledDepartmentIds: [] as string[],
        rankOrder: null,
        roleName: null,
      },
    [orgScope?.goalActor]
  );

  const existingGoalRefs: ExistingGoalRef[] = useMemo(
    () =>
      objectives.map((o) => ({
        id: o.id,
        level: o.level,
        parentId: o.parentId,
        deletedAt: o.deletedAt ?? null,
        departmentName: o.departmentName,
      })),
    [objectives]
  );

  const creatableLevels = useMemo(() => listCreatableLevels(goalActor), [goalActor]);
  const maxCreatableLevel = useMemo(
    () => resolveMaxCreatableLevel(goalActor),
    [goalActor]
  );

  const ledDepartments = useMemo(() => {
    const ids = new Set(goalActor.ledDepartmentIds);
    return orgDepartments.filter((d) => ids.has(d.id));
  }, [goalActor.ledDepartmentIds, orgDepartments]);

  const eligibleParents = useMemo(
    () => listEligibleParentGoals(newLevel, existingGoalRefs),
    [newLevel, existingGoalRefs]
  );

  const createGate = useMemo(
    () =>
      validateGoalCreation({
        actor: goalActor,
        request: {
          level: newLevel,
          parentId: newLevel === 'company' ? null : newParentId || null,
          departmentId: newDepartmentId || null,
          departmentName: newDept.trim() || null,
        },
        existing: existingGoalRefs,
      }),
    [goalActor, newLevel, newParentId, newDepartmentId, newDept, existingGoalRefs]
  );

  const logs: ProgressLogItem[] = useMemo(() => {
    if (refineLogs && refineLogs.length > 0) {
      return refineLogs.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        authorName: row.author_name || '작성자',
        logDate: row.log_date || row.created_at?.slice(0, 10),
        progressRate: row.progress_rate ?? 0,
        achievements: row.achievements || '',
        issuesAndActions: row.issues_and_actions,
        nextSteps: row.next_steps,
        periodYm: row.period_ym || undefined,
      }));
    }
    return [];
  }, [refineLogs]);

  const categoryById = useMemo(() => {
    const map = new Map<string, ProjectCategory>();
    for (const c of projectCategories) map.set(c.id, c);
    return map;
  }, [projectCategories]);

  const portfolioProjects: PortfolioProject[] = useMemo(() => {
    if (refineProjects && refineProjects.length > 0) {
      const mapped = refineProjects.map((row: any) => {
        const cat = row.category_id ? categoryById.get(row.category_id) : undefined;
        return {
          id: row.id,
          title: row.title,
          ownerId: row.owner_id ?? null,
          ownerName: row.owner_name || '미지정',
          status: (row.status || 'draft') as MboStatus,
          startDate: row.start_date || '2026-01-01',
          targetDate: row.target_date || '2026-12-31',
          progressRate: row.progress_rate ?? 0,
          objectiveId: row.objective_id,
          evaluationPeriod: row.evaluation_period,
          description: row.description,
          categoryId: row.category_id ?? null,
          categoryLabel: cat?.label ?? null,
          categoryColor: cat?.color ?? null,
        };
      });
      if (isOrgAdmin || !orgScope) return mapped;
      return mapped.filter((proj) =>
        canManageObjectiveOwner(orgScope, proj.ownerId, viewerUserId, isOrgAdmin),
      );
    }
    return [];
  }, [refineProjects, categoryById, orgScope, isOrgAdmin, viewerUserId]);

  const currentPeriodYm = formatPeriodYm();
  const missingMonthlyProjectIds = useMemo(
    () =>
      listMissingMonthlyCheckins(
        portfolioProjects.map((p) => p.id),
        logs.map((l) => ({ projectId: l.projectId, periodYm: l.periodYm })),
        currentPeriodYm
      ),
    [portfolioProjects, logs, currentPeriodYm]
  );

  const sheetProject = useMemo(
    () => portfolioProjects.find((p) => p.id === projectSheetId) ?? null,
    [portfolioProjects, projectSheetId],
  );

  const monthlyCheckProject = useMemo(
    () => portfolioProjects.find((p) => p.id === monthlyCheckProjectId) ?? null,
    [portfolioProjects, monthlyCheckProjectId],
  );

  const linkProjectToObjective = useCallback(
    (id: string) => {
      setSelectedProjectId(id);
      const proj = portfolioProjects.find((p) => p.id === id);
      if (proj?.objectiveId) setSelectedObjectiveId(proj.objectiveId);
    },
    [portfolioProjects],
  );

  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) || objectives[0];
  const selectedPortfolioProject =
    portfolioProjects.find((p) => p.id === selectedProjectId) || portfolioProjects[0] || null;

  // ?좏깮 紐⑺몴???꾨줈?앺듃媛 ?놁쑝硫?湲곕낯 ?꾨줈?앺듃 ?뺣낫
  useEffect(() => {
    if (!orgId || !selectedObjective?.id) return;
    const hasProject = portfolioProjects.some((p) => p.objectiveId === selectedObjective.id);
    if (hasProject) return;
    let cancelled = false;
    void MboService.ensureDefaultProject(orgId, {
      id: selectedObjective.id,
      title: selectedObjective.title,
      owner_id: selectedObjective.ownerId ?? null,
      owner_name: selectedObjective.ownerName,
      start_date: selectedObjective.startDate,
      target_date: selectedObjective.targetDate,
    })
      .then((project) => {
        if (cancelled) return;
        setSelectedProjectId(project.id);
        void projectQuery?.refetch?.();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [orgId, selectedObjective?.id, selectedObjective?.title, selectedObjective?.ownerName, selectedObjective?.startDate, selectedObjective?.targetDate, portfolioProjects, projectQuery]);

  return {
    rawObjectiveRows,
    objectives,
    teamObjectivesForManager,
    goalActor,
    existingGoalRefs,
    creatableLevels,
    maxCreatableLevel,
    ledDepartments,
    eligibleParents,
    createGate,
    logs,
    categoryById,
    portfolioProjects,
    currentPeriodYm,
    missingMonthlyProjectIds,
    sheetProject,
    monthlyCheckProject,
    linkProjectToObjective,
    personFilterOptions,
  };
}

export type MboManagementObjectivesDerived = ReturnType<typeof useMboManagementObjectivesDerived>;
