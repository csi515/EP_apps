import { useState, useMemo, useCallback, useEffect, useRef, type FormEvent } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  canTransitionMboStatus,
  validateMboObjectiveWeights,
  type MboStatus,
  type MboLevel,
} from '../domain/mboEngine';
import {
  DEFAULT_MBO_CYCLE,
  areGoalsLocked,
  type MboCycleSettings,
} from '../domain/mboCycle';
import { showToast } from '@/shared/feedback/uiFeedback';
import type { ObjectiveNode } from '../ui/MboObjectiveTreeViewer';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { MboService } from '../services/mboService';
import {
  canManageObjectiveOwner,
  loadMboOrgDirectory,
  loadMboViewerOrgScope,
  type MboPickerDepartment,
  type MboPickerMember,
  type MboViewerOrgScope,
} from '../services/mboOrgScopeService';
import { readMboRequirePlanApproval } from '../domain/mboPlanApproval';
import { formatPeriodYm, listMissingMonthlyCheckins } from '../domain/mboMonthlyCheckin';
import {
  filterObjectivesForViewer,
  memberMatchesQuery,
  type MboListScope,
  type MboVisibilityType,
} from '../domain/mboVisibilityEngine';
import {
  listCreatableLevels,
  listEligibleParentGoals,
  resolveMaxCreatableLevel,
  validateGoalCreation,
  type ExistingGoalRef,
} from '../domain/mboGoalHierarchy';
import {
  buildTeamMemberChips,
  computeManagerKpis,
  type MboDashboardView,
} from '../domain/mboManagerDashboardEngine';

import { buildHierarchyGanttRows } from '../domain/mboGanttHierarchyEngine';

export type MboContentPanel = 'schedule' | 'goals';
export type MboScheduleViewMode = 'table' | 'gantt';
import {
  canManagerOverrideCycleGoalLock,
  countPendingGoalApprovals,
} from '../domain/mboTwoTierLockEngine';
import { buildPersonObjectiveBuckets } from '../domain/mboTeamBoardEngine';
import { useActiveUser } from '@/shared/session/useActiveUser';
import {
  ensureDefaultProjectCategories,
  listProjectCategories,
} from '../services/projectCategoryService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { useAuth } from '@/core/auth/AuthProvider';

export function useMboManagementWorkspaceState() {
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [cycleSettings, setCycleSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const goalsLocked = areGoalsLocked(cycleSettings, new Date());

  const [localObjectives, setLocalObjectives] = useState<ObjectiveNode[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

  const [orgMembers, setOrgMembers] = useState<MboPickerMember[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<MboPickerDepartment[]>([]);
  const [viewerMemberId, setViewerMemberId] = useState<string | null>(null);
  const [sharesByObjective, setSharesByObjective] = useState<Map<string, string[]>>(new Map());
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [sharePickerObjectiveId, setSharePickerObjectiveId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState<MboLevel>('individual');
  const [newParentId, setNewParentId] = useState<string>('');
  const [newOwnerMemberId, setNewOwnerMemberId] = useState<string>('');
  const [newDept, setNewDept] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState<string>('');
  const [newCriteria, setNewCriteria] = useState('');
  const [newVisibility, setNewVisibility] = useState<MboVisibilityType>('PRIVATE');
  const [newShareMemberIds, setNewShareMemberIds] = useState<string[]>([]);
  const [newStartDate, setNewStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTargetDate, setNewTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [newWeight, setNewWeight] = useState(100);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [reviseGoalId, setReviseGoalId] = useState<string | null>(null);
  const [planApprovalObjectiveId, setPlanApprovalObjectiveId] = useState<string | null>(null);
  /** 직원 기본: 회사·팀 목표(visible) — 스트립·조직 트리와 동일 데이터 */
  const [listScope, setListScope] = useState<MboListScope>('visible');
  const [dashboardView, setDashboardView] = useState<MboDashboardView>('mine');
  const [contentPanel, setContentPanel] = useState<MboContentPanel>('goals');
  /** 실행 과제: 표(기본) | 간트(조회) */
  const [scheduleViewMode, setScheduleViewMode] = useState<MboScheduleViewMode>('table');
  /** 목표 목록: 사람별 | 목표 트리(parent_id) — 기본 조직 정렬 */
  const [goalViewMode, setGoalViewMode] = useState<'person' | 'org'>('org');
  const [ownerFilterId, setOwnerFilterId] = useState<string>('');
  const [selectedMemberUserIds, setSelectedMemberUserIds] = useState<string[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [ganttCheckinOnly, setGanttCheckinOnly] = useState(false);
  const [detailObjectiveId, setDetailObjectiveId] = useState<string | null>(null);
  const [pendingApprovalsOpen, setPendingApprovalsOpen] = useState(false);
  const [projectSheetId, setProjectSheetId] = useState<string | null>(null);
  const [monthlyCheckProjectId, setMonthlyCheckProjectId] = useState<string | null>(null);
  const [monthlyCheckAutoWrite, setMonthlyCheckAutoWrite] = useState(false);
  const [changeRequestObjectiveId, setChangeRequestObjectiveId] = useState<string | null>(null);
  const [changeRequestBusy, setChangeRequestBusy] = useState(false);
  const managerScopeSyncedRef = useRef(false);
  const ganttSectionRef = useRef<HTMLElement | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const { currentOrganization, activeCapabilities = [] } = useOrganization();
  const { user: authUser } = useAuth();
  const activeUser = useActiveUser();
  const { isAdmin, isOwner } = usePermissions();
  const orgId = currentOrganization?.id ?? null;
  const isOrgAdmin = isAdmin || isOwner;
  const [orgScope, setOrgScope] = useState<MboViewerOrgScope | null>(null);
  const isSubtreeManager = orgScope?.isSubtreeManager === true;
  const isManager = isOrgAdmin || isSubtreeManager;

  const immediateSuperior = orgScope?.immediateSuperior ?? null;

  useEffect(() => {
    if (isManager && !managerScopeSyncedRef.current) {
      setListScope('team');
      setDashboardView('team_overview');
      setContentPanel('goals');
      setGoalViewMode('org');
      managerScopeSyncedRef.current = true;
    }
  }, [isManager]);

  useEffect(() => {
    if (dashboardView === 'mine') {
      setListScope('mine');
      setSelectedMemberUserIds([]);
      setOwnerFilterId('');
      setContentPanel('goals');
      setGoalViewMode('org');
    } else if (dashboardView === 'team_overview') {
      setListScope('team');
      setOwnerFilterId('');
      // 팀 운영에서도 목표 목록·조직 정렬을 유지 (일정표로 강제하지 않음)
    } else {
      setListScope('team');
    }
  }, [dashboardView]);
  const requirePlanApproval = readMboRequirePlanApproval(
    (currentOrganization?.settings ?? null) as Record<string, unknown> | null
  );

  useEffect(() => {
    const userId = authUser?.id || activeUser?.id || '';
    if (!orgId || !userId) {
      setOrgScope(null);
      setOrgMembers([]);
      setOrgDepartments([]);
      setViewerMemberId(null);
      setSharesByObjective(new Map());
      return;
    }
    let cancelled = false;
    void Promise.all([
      loadMboViewerOrgScope(orgId, userId),
      loadMboOrgDirectory(orgId, userId),
      MboService.listObjectiveSharesByOrg(orgId).catch(() => new Map<string, string[]>()),
    ]).then(([scope, directory, shares]) => {
      if (cancelled) return;
      setOrgScope(scope);
      setOrgMembers(directory.members);
      setOrgDepartments(directory.departments);
      setViewerMemberId(directory.viewerMemberId);
      setSharesByObjective(shares);
      if (!newOwnerMemberId && directory.viewerMemberId) {
        setNewOwnerMemberId(directory.viewerMemberId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orgId, authUser?.id, activeUser?.id]);
  const hasApprovalWorkflow = useMemo(() => {
    const preset = getIndustryPreset(currentOrganization?.industry_type ?? '');
    const caps = new Set([...(preset?.capabilities ?? []), ...activeCapabilities]);
    return caps.has('approval_workflow');
  }, [currentOrganization?.industry_type, activeCapabilities]);

  const reloadProjectCategories = useCallback(async () => {
    if (!orgId) {
      setProjectCategories([]);
      return;
    }
    try {
      await ensureDefaultProjectCategories(orgId);
      const rows = await listProjectCategories(orgId, { includeArchived: true });
      setProjectCategories(rows);
    } catch {
      setProjectCategories([]);
    }
  }, [orgId]);

  useEffect(() => {
    void reloadProjectCategories();
  }, [reloadProjectCategories]);

  const { query: objQuery } = useList<any>({
    resource: 'mbo_objectives',
    pagination: { mode: 'off' },
  });
  const { query: logQuery } = useList<any>({
    resource: 'mbo_progress_logs',
    pagination: { mode: 'off' },
  });
  const { query: projectQuery } = useList<any>({
    resource: 'mbo_projects',
    pagination: { mode: 'off' },
  });

  const { mutate: mutateCreate } = useCreate();
  const { mutate: mutateUpdate } = useUpdate();

  const refineObjectives = objQuery?.data?.data;
  const refineLogs = logQuery?.data?.data;
  const refineProjects = projectQuery?.data?.data;

  const viewerUserId = authUser?.id || activeUser?.id || '';

  const selectedOwnerMember = useMemo(
    () => orgMembers.find((m) => m.id === newOwnerMemberId) ?? null,
    [orgMembers, newOwnerMemberId]
  );

  return {
    detailObjectiveId, setDetailObjectiveId,
    pendingApprovalsOpen, setPendingApprovalsOpen,
    projectSheetId, setProjectSheetId,
    monthlyCheckProjectId, setMonthlyCheckProjectId,
    monthlyCheckAutoWrite, setMonthlyCheckAutoWrite,
    managerScopeSyncedRef,
    ganttSectionRef,
    selectedObjectiveId, setSelectedObjectiveId,
    selectedProjectId, setSelectedProjectId,
    projectCategories, setProjectCategories,
    cycleSettings, setCycleSettings,
    goalsLocked,
    localObjectives, setLocalObjectives,
    showCreateModal, setShowCreateModal,
    showRejectModal, setShowRejectModal,
    rejectionInput, setRejectionInput,
    newTitle, setNewTitle,
    newLevel, setNewLevel,
    newParentId, setNewParentId,
    newOwnerMemberId, setNewOwnerMemberId,
    newDept, setNewDept,
    newDepartmentId, setNewDepartmentId,
    newCriteria, setNewCriteria,
    newVisibility, setNewVisibility,
    newShareMemberIds, setNewShareMemberIds,
    newStartDate, setNewStartDate,
    newTargetDate, setNewTargetDate,
    newWeight, setNewWeight,
    historyGoalId, setHistoryGoalId,
    reviseGoalId, setReviseGoalId,
    planApprovalObjectiveId, setPlanApprovalObjectiveId,
    listScope, setListScope,
    dashboardView, setDashboardView,
    contentPanel, setContentPanel,
    scheduleViewMode, setScheduleViewMode,
    goalViewMode, setGoalViewMode,
    ownerFilterId, setOwnerFilterId,
    selectedMemberUserIds, setSelectedMemberUserIds,
    ganttCheckinOnly, setGanttCheckinOnly,
    changeRequestObjectiveId, setChangeRequestObjectiveId,
    changeRequestBusy, setChangeRequestBusy,
    personQuery, setPersonQuery,
    orgMembers, setOrgMembers,
    orgDepartments, setOrgDepartments,
    viewerMemberId, setViewerMemberId,
    sharesByObjective, setSharesByObjective,
    ownerPickerOpen, setOwnerPickerOpen,
    sharePickerOpen, setSharePickerOpen,
    sharePickerObjectiveId, setSharePickerObjectiveId,
    deleteGoalId, setDeleteGoalId,
    deleteReason, setDeleteReason,
    orgId,
    isOrgAdmin,
    isSubtreeManager,
    isManager,
    orgScope,
    requirePlanApproval,
    hasApprovalWorkflow,
    authUser,
    activeUser,
    reloadProjectCategories,
    objQuery,
    logQuery,
    projectQuery,
    mutateCreate,
    mutateUpdate,
    refineObjectives,
    refineLogs,
    refineProjects,
    viewerUserId,
    immediateSuperior,
    selectedOwnerMember,
  };
}

export type MboManagementWorkspaceState = ReturnType<typeof useMboManagementWorkspaceState>;
