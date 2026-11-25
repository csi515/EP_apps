import { useMemo, useCallback, useEffect } from 'react';
import {
  validateMboObjectiveWeights,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
import {
  buildTeamMemberChips,
  computeManagerKpis,
} from '../domain/mboManagerDashboardEngine';
import { buildHierarchyGanttRows } from '../domain/mboGanttHierarchyEngine';
import {
  canManagerOverrideCycleGoalLock,
  countPendingGoalApprovals,
} from '../domain/mboTwoTierLockEngine';
import { buildPersonObjectiveBuckets } from '../domain/mboTeamBoardEngine';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { formatPeriodYm, listMissingMonthlyCheckins } from '../domain/mboMonthlyCheckin';
import {
  canViewMboGoal,
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
import type { ObjectiveNode } from '../domain/mboObjectiveNode';
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
      departmentId: row.department_id ?? null,
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
      targetValue:
        row.target_value == null || row.target_value === ''
          ? row.weight != null
            ? String(row.weight)
            : null
          : String(row.target_value),
      rejectionReason: row.rejection_reason,
      evaluatorId: row.evaluator_id ?? null,
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
      targetValue: obj.weight != null ? String(obj.weight) : null,
      ownerId: obj.ownerId ?? null,
      visibilityType: obj.visibilityType ?? ('PRIVATE' as MboVisibilityType),
      sharedMemberIds: obj.sharedMemberIds ?? [],
      deletedAt: obj.deletedAt ?? null,
    }));
  }, [refineObjectives, localObjectives, sharesByObjective]);

  const authorDepartmentPathByOwnerId = useCallback(
    (ownerId: string | null | undefined): string | null => {
      if (!ownerId) return null;
      return orgMembers.find((m) => m.userId === ownerId)?.departmentPath ?? null;
    },
    [orgMembers],
  );

  const objectives: ObjectiveNode[] = useMemo(() => {
    let filtered = filterObjectivesForViewer(rawObjectiveRows, {
      scope: listScope,
      currentUserId: viewerUserId,
      currentMemberId: viewerMemberId ?? orgScope?.viewerMemberId,
      isOwnerOrAdmin: isOrgAdmin,
      managedUserIds: orgScope?.managedUserIds,
      viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
      authorDepartmentPathByOwnerId,
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
    authorDepartmentPathByOwnerId,
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
        authorDepartmentPathByOwnerId,
        ownerFilterId: null,
      }),
    [rawObjectiveRows, viewerUserId, viewerMemberId, orgScope, isOrgAdmin, authorDepartmentPathByOwnerId],
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

  // 상위 목표 refs는 필터된 목록이 아니라 raw 전체 기준 (스코프 밖 전사 목표 포함)
  const existingGoalRefs: ExistingGoalRef[] = useMemo(
    () =>
      rawObjectiveRows.map((o) => ({
        id: o.id,
        level: o.level,
        parentId: o.parentId,
        deletedAt: o.deletedAt ?? null,
        departmentId: o.departmentId ?? null,
        departmentName: o.departmentName,
      })),
    [rawObjectiveRows]
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

  /** 조직단위 목표용 선택 목록 — 리더는 맡은 조직, 대표는 전체 */
  const departmentOptionsForCreate = useMemo(() => {
    if (goalActor.isTopExecutive) return orgDepartments;
    if (ledDepartments.length > 0) return ledDepartments;
    return orgDepartments;
  }, [goalActor.isTopExecutive, ledDepartments, orgDepartments]);

  const eligibleParents = useMemo(
    () => listEligibleParentGoals(newLevel, existingGoalRefs),
    [newLevel, existingGoalRefs]
  );

  const createOwnerMember = useMemo(
    () => orgMembers.find((m) => m.id === newOwnerMemberId) ?? null,
    [orgMembers, newOwnerMemberId]
  );

  const createGate = useMemo(
    () =>
      validateGoalCreation({
        actor: goalActor,
        request: {
          level: newLevel,
          parentId: newLevel === 'company' ? null : newParentId || null,
          departmentId:
            createOwnerMember?.departmentId || newDepartmentId || null,
          departmentName:
            createOwnerMember?.departmentName?.trim() || newDept.trim() || null,
        },
        existing: existingGoalRefs,
      }),
    [
      goalActor,
      newLevel,
      newParentId,
      newDepartmentId,
      newDept,
      existingGoalRefs,
      createOwnerMember,
    ]
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
          baselineStartDate: row.baseline_start_date || row.start_date || '2026-01-01',
          baselineTargetDate: row.baseline_target_date || row.target_date || '2026-12-31',
          progressRate: row.progress_rate ?? 0,
          ownerMemo: row.owner_memo ?? null,
          objectiveId: row.objective_id,
          evaluationPeriod: row.evaluation_period,
          description: row.description,
          categoryId: row.category_id ?? null,
          categoryLabel: cat?.label ?? null,
          categoryColor: cat?.color ?? null,
        };
      });
      // 목표 열람 가능하면 연결된 실행 프로젝트도 일정표에 표시 (가시성 정합)
      if (isOrgAdmin) return mapped;
      const objById = new Map(rawObjectiveRows.map((o) => [o.id, o]));
      return mapped.filter((proj) => {
        if (!proj.objectiveId) {
          return proj.ownerId === viewerUserId;
        }
        const obj = objById.get(proj.objectiveId);
        if (!obj) return proj.ownerId === viewerUserId;
        return canViewMboGoal(
          {
            authorId: obj.ownerId || '',
            evaluatorId: obj.evaluatorId ?? null,
            visibilityType: obj.visibilityType ?? 'PRIVATE',
            sharedMemberIds: obj.sharedMemberIds,
            authorDepartmentPath: authorDepartmentPathByOwnerId(obj.ownerId),
          },
          viewerMemberId ?? orgScope?.viewerMemberId,
          viewerUserId,
          {
            isOwnerOrAdmin: isOrgAdmin,
            viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
          }
        );
      });
    }
    return [];
  }, [
    refineProjects,
    categoryById,
    orgScope,
    isOrgAdmin,
    viewerUserId,
    viewerMemberId,
    rawObjectiveRows,
    authorDepartmentPathByOwnerId,
  ]);

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
  const myMissingMonthlyProjectIds = useMemo(
    () =>
      missingMonthlyProjectIds.filter((id) => {
        const p = portfolioProjects.find((row) => row.id === id);
        return Boolean(p?.ownerId && viewerUserId && p.ownerId === viewerUserId);
      }),
    [missingMonthlyProjectIds, portfolioProjects, viewerUserId]
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
    departmentOptionsForCreate,
    eligibleParents,
    createGate,
    logs,
    categoryById,
    portfolioProjects,
    currentPeriodYm,
    missingMonthlyProjectIds,
    myMissingMonthlyProjectIds,
    sheetProject,
    monthlyCheckProject,
    linkProjectToObjective,
    personFilterOptions,
  };
}

export type MboManagementObjectivesDerived = ReturnType<typeof useMboManagementObjectivesDerived>;
