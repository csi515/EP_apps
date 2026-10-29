import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Target,
  FolderKanban,
  X,
} from 'lucide-react';
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
import { MboObjectiveTreeViewer, type ObjectiveNode } from './MboObjectiveTreeViewer';
import { MboQuarterlyReviewForm, type ProgressLogItem, type FeedbackItem } from './MboQuarterlyReviewForm';
import { MboCycleSettingsCard } from './MboCycleSettingsCard';
import { MboRevisionTimelineModal } from './MboRevisionTimelineModal';
import { MboReviseGoalModal } from './MboReviseGoalModal';
import { MboProjectPortfolioView } from './MboProjectPortfolioView';
import { MboPlanApprovalModal } from './MboPlanApprovalModal';
import { MboScheduleRangePicker } from './MboScheduleRangePicker';
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
  hasPrerequisiteGoals,
  levelLabelKo,
  listCreatableLevels,
  listEligibleParentGoals,
  prerequisiteLabel,
  resolveMaxCreatableLevel,
  validateGoalCreation,
  type ExistingGoalRef,
} from '../domain/mboGoalHierarchy';
import { OrganizationMemberPickerModal } from './OrganizationMemberPickerModal';
import { useActiveUser } from '@/shared/session/useActiveUser';
import {
  ensureDefaultProjectCategories,
  listProjectCategories,
} from '../services/projectCategoryService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { useAuth } from '@/core/auth/AuthProvider';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';

export const MboManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'objectives' | 'projects'>('objectives');
  const [projectSubView, setProjectSubView] = useState<'portfolio' | 'monthly'>('portfolio');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [cycleSettings, setCycleSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const goalsLocked = areGoalsLocked(cycleSettings, new Date());

  const [localObjectives, setLocalObjectives] = useState<ObjectiveNode[]>([]);
  const [localFeedbacks, setLocalFeedbacks] = useState<FeedbackItem[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

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
  const [listScope, setListScope] = useState<MboListScope>('mine');
  const [ownerFilterId, setOwnerFilterId] = useState<string>('');
  const [personQuery, setPersonQuery] = useState('');
  const [orgMembers, setOrgMembers] = useState<MboPickerMember[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<MboPickerDepartment[]>([]);
  const [viewerMemberId, setViewerMemberId] = useState<string | null>(null);
  const [sharesByObjective, setSharesByObjective] = useState<Map<string, string[]>>(new Map());
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [sharePickerOpen, setSharePickerOpen] = useState(false);
  const [sharePickerObjectiveId, setSharePickerObjectiveId] = useState<string | null>(null);
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

  // 선택 프로젝트의 피드백 hydrate
  useEffect(() => {
    const projectId = selectedProjectId;
    if (!orgId || !projectId) {
      setLocalFeedbacks([]);
      return;
    }
    let cancelled = false;
    void MboService.listFeedbackComments(orgId, projectId)
      .then((feedbackRows) => {
        if (cancelled) return;
        setLocalFeedbacks(
          feedbackRows.map((row) => ({
            id: row.id,
            projectId: row.project_id,
            authorName: row.author_name,
            authorRole: row.author_role,
            feedbackType: row.feedback_type as FeedbackItem['feedbackType'],
            content: row.content,
            createdAt: row.created_at ? new Date(row.created_at).toLocaleTimeString() : '',
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setLocalFeedbacks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, selectedProjectId]);

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

  // DB 데이터 우선 바인딩 — 공개범위 + 스코프 + 사람 필터
  const objectives: ObjectiveNode[] = useMemo(() => {
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
    const raw =
      refineObjectives && refineObjectives.length > 0
        ? refineObjectives.map(mapRow)
        : localObjectives.map((obj) => ({
            ...obj,
            isRevised: obj.revision > 1,
            revisionCount: obj.revision,
            targetValue: obj.weight,
            ownerId: obj.ownerId ?? null,
            visibilityType: obj.visibilityType ?? ('PRIVATE' as MboVisibilityType),
            sharedMemberIds: obj.sharedMemberIds ?? [],
            deletedAt: obj.deletedAt ?? null,
          }));
    return filterObjectivesForViewer(raw, {
      scope: listScope,
      currentUserId: viewerUserId,
      currentMemberId: viewerMemberId ?? orgScope?.viewerMemberId,
      isOwnerOrAdmin: isOrgAdmin,
      managedUserIds: orgScope?.managedUserIds,
      viewerLeadDepartmentPath: orgScope?.leadDepartmentPaths[0] ?? null,
      ownerFilterId: ownerFilterId || null,
    });
  }, [
    refineObjectives,
    localObjectives,
    sharesByObjective,
    listScope,
    viewerUserId,
    viewerMemberId,
    orgScope,
    isOrgAdmin,
    ownerFilterId,
  ]);

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
          ownerName: row.owner_name || '미배정',
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

  const selectedObjective = objectives.find((o) => o.id === selectedObjectiveId) || objectives[0];
  const selectedPortfolioProject =
    portfolioProjects.find((p) => p.id === selectedProjectId) || portfolioProjects[0] || null;

  // 선택 목표에 프로젝트가 없으면 기본 프로젝트 확보
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

  // 목표 가중치 100% 인터락 검증
  const weightValidation = useMemo(() => {
    return validateMboObjectiveWeights(objectives);
  }, [objectives]);

  // 목표 상태 전이 액션
  const handleTransitionStatus = (id: string, targetStatus: MboStatus, reason?: string) => {
    const target = objectives.find((o) => o.id === id);
    if (!target) return;

    const transition = canTransitionMboStatus(target.status, targetStatus, {
      isManager,
      rejectionReason: reason,
    });
    if (!transition.allowed) {
      showToast(
        transition.reason || `전이할 수 없는 상태입니다: ${target.status} -> ${targetStatus}`,
        'warning',
      );
      return;
    }

    if (!orgId) {
      showToast('조직 컨텍스트가 없습니다.', 'error');
      return;
    }
    mutateUpdate(
      {
        resource: 'mbo_objectives',
        id,
        values: {
          status: targetStatus,
          rejection_reason: targetStatus === 'rejected' ? reason : null,
        },
      },
      {
        onSuccess: () => {
          void objQuery?.refetch?.();
          showToast(`목표 상태가 [${targetStatus}]로 변경되었습니다.`, 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : '상태 변경 실패', 'error');
        },
      }
    );
  };

  // 신규 목표 생성 — 항상 DB + 기본 실행 프로젝트 확보
  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!orgId) {
      showToast('조직 컨텍스트가 없습니다. 로그인·조직을 확인하세요.', 'error');
      return;
    }
    if (goalsLocked) {
      showToast('목표 잠금 기간에는 새 목표를 등록할 수 없습니다.', 'warning');
      return;
    }
    if (!selectedOwnerMember?.userId) {
      showToast('담당자를 조직 멤버에서 선택해 주세요.', 'warning');
      return;
    }
    if (newVisibility === 'PARTIAL' && newShareMemberIds.length === 0) {
      showToast('선택 공개일 때 공유 대상자를 지정해 주세요.', 'warning');
      return;
    }

    const parentId = newLevel === 'company' ? null : newParentId || null;
    const departmentName =
      (newDepartmentId
        ? orgDepartments.find((d) => d.id === newDepartmentId)?.name
        : null) ||
      newDept.trim() ||
      selectedOwnerMember.departmentName ||
      '부서';

    const gate = validateGoalCreation({
      actor: goalActor,
      request: {
        level: newLevel,
        parentId,
        departmentId: newDepartmentId || null,
        departmentName,
      },
      existing: existingGoalRefs,
    });
    if (!gate.allowed) {
      showToast(gate.reason ?? '이 단계의 목표를 등록할 수 없습니다.', 'warning');
      return;
    }

    const ownerName = selectedOwnerMember.displayName;
    const ownerUserId = selectedOwnerMember.userId;

    mutateCreate(
      {
        resource: 'mbo_objectives',
        values: {
          organization_id: orgId,
          parent_id: parentId,
          level: newLevel,
          department_name: departmentName,
          owner_id: ownerUserId,
          owner_name: ownerName,
          title: newTitle.trim(),
          success_criteria: newCriteria.trim(),
          start_date: newStartDate,
          target_date: newTargetDate,
          weight: newWeight,
          progress_rate: 0,
          status: 'draft',
          target_value: newWeight,
          visibility_type: newVisibility,
        },
      },
      {
        onSuccess: async (result) => {
          const createdId = (result as { data?: { id?: string } })?.data?.id;
          try {
            if (createdId) {
              if (newVisibility === 'PARTIAL') {
                await MboService.replaceGoalShares(orgId, createdId, newShareMemberIds);
              }
              const project = await MboService.ensureDefaultProject(orgId, {
                id: createdId,
                title: newTitle.trim(),
                owner_id: ownerUserId,
                owner_name: ownerName,
                start_date: newStartDate,
                target_date: newTargetDate,
              });
              setSelectedObjectiveId(createdId);
              setSelectedProjectId(project.id);
              const shares = await MboService.listObjectiveSharesByOrg(orgId).catch(
                () => new Map<string, string[]>()
              );
              setSharesByObjective(shares);
            }
          } catch {
            showToast('목표는 저장됐으나 실행 프로젝트 자동 생성에 실패했습니다.', 'warning');
          }
          void objQuery?.refetch?.();
          void projectQuery?.refetch?.();
          setShowCreateModal(false);
          setNewTitle('');
          setNewShareMemberIds([]);
          setNewVisibility('PRIVATE');
          setNewParentId('');
          setNewDepartmentId('');
          showToast('신규 MBO 과제와 실행 프로젝트가 등록되었습니다.', 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : '목표 등록 실패', 'error');
        },
      }
    );
  };

  const handleChangeVisibility = useCallback(
    async (objectiveId: string, visibility: MboVisibilityType) => {
      if (!orgId) return;
      if (visibility === 'PARTIAL') {
        setSharePickerObjectiveId(objectiveId);
        setNewShareMemberIds(sharesByObjective.get(objectiveId) ?? []);
        setSharePickerOpen(true);
        return;
      }
      try {
        await MboService.updateGoalVisibility(orgId, objectiveId, visibility, []);
        const shares = await MboService.listObjectiveSharesByOrg(orgId);
        setSharesByObjective(shares);
        void objQuery?.refetch?.();
        showToast('공개범위가 변경되었습니다.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '공개범위 변경 실패', 'error');
      }
    },
    [orgId, sharesByObjective, objQuery]
  );

  const handleConfirmSoftDelete = () => {
    if (!deleteGoalId || !deleteReason.trim()) {
      showToast('삭제 사유를 입력해 주세요.', 'warning');
      return;
    }
    void MboService.softDeleteObjective(deleteGoalId, deleteReason.trim())
      .then(() => {
        showToast('과제가 삭제되었고 이력이 저장되었습니다.', 'success');
        setDeleteGoalId(null);
        setDeleteReason('');
        void objQuery?.refetch?.();
        void projectQuery?.refetch?.();
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : '삭제 실패', 'error');
      });
  };

  return (
    <WorkPageFrame width="hub">
      {/* 최상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>MBO 개인 과제</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">내가 맡은 과제 관리</h1>
          <p className="text-xs text-slate-500 mt-1">
            약속한 과제를 등록·수정·삭제하고, 공개범위를 정하며 월별 점검 이력을 남깁니다. 부서장은 하위 구성원 과제를 열람할 수 있습니다.
          </p>
        </div>

        {/* 상단 네비게이션 탭 — 데스크톱 고정 폭에서 넘치면 가로 스크롤 */}
        <div className="flex max-w-full overflow-x-auto bg-slate-100 p-1 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('objectives')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'objectives'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>목표 트리 & KPI</span>
          </button>
          <button
            type="button"
            data-testid="mbo-tab-projects"
            onClick={() => {
              setActiveTab('projects');
              setProjectSubView('portfolio');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>진행 프로젝트</span>
          </button>
        </div>
      </div>

      {/* 목표 가중치 합계 실시간 인터락 배너 */}
      <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
        weightValidation.valid
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span className="font-bold">
            {weightValidation.valid
              ? `전사/부서 목표 가중치 합계: 100% (정상 정렬)`
              : `목표 가중치 합계 조정 필요: 현재 ${weightValidation.totalWeight}% (${weightValidation.difference > 0 ? `${weightValidation.difference}% 추가 필요` : `${Math.abs(weightValidation.difference)}% 초과`})`}
          </span>
        </div>
        <span className="text-[11px] font-medium opacity-80">
          모든 목표 항목의 가중치 합은 정확히 100%로 맞춰야 공정한 평가가 가능합니다.
        </span>
      </div>

      <MboCycleSettingsCard onChange={setCycleSettings} />

      {goalsLocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          목표 잠금이 적용되었습니다. 목표 문장과 핵심 지표는 수정할 수 없습니다. 월별 체크인은 계속 작성할 수 있습니다.
        </div>
      ) : null}

      {/* 탭 1: 목표 트리 뷰 */}
      {activeTab === 'objectives' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {(
                [
                  { id: 'mine' as const, label: '내 과제' },
                  { id: 'team' as const, label: '팀(하위)' },
                  { id: 'visible' as const, label: '열람 가능' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  disabled={chip.id === 'team' && !isManager}
                  onClick={() => setListScope(chip.id)}
                  className={`min-h-12 rounded-lg px-3 text-xs font-bold ${
                    listScope === chip.id
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600'
                  } ${chip.id === 'team' && !isManager ? 'opacity-40' : ''}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
              사람 검색
              <input
                className="min-h-12 rounded-lg border border-slate-200 px-3 text-sm font-semibold"
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
                placeholder="이름 또는 초성"
              />
            </label>
            <label className="flex min-w-[180px] flex-col gap-1 text-xs font-bold text-slate-600">
              담당자
              <select
                className="min-h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
                value={ownerFilterId}
                onChange={(e) => setOwnerFilterId(e.target.value)}
              >
                <option value="">전체</option>
                {personFilterOptions.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <MboObjectiveTreeViewer
            objectives={objectives}
            selectedObjectiveId={selectedObjectiveId}
            goalsLocked={goalsLocked}
            onSelectObjective={(id) => setSelectedObjectiveId(id)}
            onOpenCreateModal={() => {
              if (goalsLocked) {
                showToast('목표 잠금 기간에는 새 목표를 등록할 수 없습니다.', 'warning');
                return;
              }
              if (viewerMemberId && !newOwnerMemberId) {
                setNewOwnerMemberId(viewerMemberId);
              }
              const defaultLevel = resolveMaxCreatableLevel(goalActor);
              setNewLevel(defaultLevel);
              const parents = listEligibleParentGoals(defaultLevel, existingGoalRefs);
              const preferredParent =
                (selectedObjectiveId &&
                  parents.find((p) => p.id === selectedObjectiveId)?.id) ||
                parents[0]?.id ||
                '';
              setNewParentId(defaultLevel === 'company' ? '' : preferredParent);
              if (goalActor.ledDepartmentIds.length === 1) {
                setNewDepartmentId(goalActor.ledDepartmentIds[0]);
                const ledName = orgDepartments.find(
                  (d) => d.id === goalActor.ledDepartmentIds[0]
                )?.name;
                if (ledName) setNewDept(ledName);
              } else {
                setNewDepartmentId('');
              }
              setShowCreateModal(true);
            }}
            onRequestApproval={(id) => {
              if (requirePlanApproval && hasApprovalWorkflow) {
                setPlanApprovalObjectiveId(id);
                return;
              }
              handleTransitionStatus(id, 'submitted');
            }}
            onApprove={(id) => handleTransitionStatus(id, 'approved')}
            onOpenRejectModal={(id) => setShowRejectModal(id)}
            onOpenRevisionHistory={(id) => setHistoryGoalId(id)}
            onOpenRevise={(id) => {
              if (goalsLocked) {
                showToast('목표 잠금 기간에는 목표치·마감을 수정할 수 없습니다.', 'warning');
                return;
              }
              setReviseGoalId(id);
            }}
            onOpenDelete={(id) => {
              setDeleteGoalId(id);
              setDeleteReason('');
            }}
            onChangeVisibility={(id, visibility) => void handleChangeVisibility(id, visibility)}
          />
        </div>
      )}

      {planApprovalObjectiveId ? (
        <MboPlanApprovalModal
          open
          organizationId={orgId ?? ''}
          objectiveId={planApprovalObjectiveId}
          objectiveTitle={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.title ?? 'MBO 목표'
          }
          objectiveDescription={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.description
          }
          successCriteria={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.successCriteria
          }
          ownerName={objectives.find((o) => o.id === planApprovalObjectiveId)?.ownerName}
          objectiveStatus={
            objectives.find((o) => o.id === planApprovalObjectiveId)?.status ?? 'draft'
          }
          requirePlanApproval={requirePlanApproval}
          hasApprovalWorkflow={hasApprovalWorkflow}
          requesterId={authUser?.id || activeUser?.id || ''}
          requesterName={activeUser?.name || authUser?.email || '기안자'}
          onClose={() => setPlanApprovalObjectiveId(null)}
          onSubmitted={() => {
            handleTransitionStatus(planApprovalObjectiveId, 'submitted');
            showToast('MBO 계획 결재가 상신되었습니다.', 'success');
          }}
          onSkipToLocalSubmit={() => handleTransitionStatus(planApprovalObjectiveId, 'submitted')}
        />
      ) : null}

      {/* 탭 2: 진행 프로젝트 + 월별 체크 */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {missingMonthlyProjectIds.length > 0 ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"
              data-testid="mbo-missing-monthly-badge"
            >
              {currentPeriodYm} 월별 체크인 미제출 프로젝트 {missingMonthlyProjectIds.length}건
            </div>
          ) : null}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              className={`h-12 rounded-lg px-4 text-xs font-bold ${
                projectSubView === 'portfolio'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600'
              }`}
              onClick={() => setProjectSubView('portfolio')}
            >
              연도·월·개인 뷰
            </button>
            <button
              type="button"
              data-testid="mbo-tab-monthly-check"
              className={`h-12 rounded-lg px-4 text-xs font-bold ${
                projectSubView === 'monthly'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-600'
              }`}
              onClick={() => setProjectSubView('monthly')}
            >
              월별 체크
            </button>
          </div>

          {projectSubView === 'portfolio' ? (
            portfolioProjects.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                실행 프로젝트가 없습니다. 목표를 등록하면 기본 프로젝트가 자동 생성됩니다.
              </div>
            ) : (
              <MboProjectPortfolioView
                projects={portfolioProjects}
                categories={projectCategories}
                organizationId={orgId}
                selectedProjectId={selectedProjectId}
                onSelectProject={(id) => {
                  setSelectedProjectId(id);
                  const proj = portfolioProjects.find((p) => p.id === id);
                  if (proj?.objectiveId) {
                    const match = objectives.find((o) => o.id === proj.objectiveId);
                    if (match) setSelectedObjectiveId(match.id);
                  }
                }}
                onOpenQuarterlyReview={(id) => {
                  setSelectedProjectId(id);
                  setProjectSubView('monthly');
                }}
                onCategoriesChanged={() => void reloadProjectCategories()}
              />
            )
          ) : !selectedPortfolioProject?.id ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              실행 프로젝트를 먼저 선택하거나, 목표 등록으로 기본 프로젝트를 만드세요.
            </div>
          ) : (
            <MboQuarterlyReviewForm
              projectId={selectedPortfolioProject.id}
              projectTitle={selectedPortfolioProject.title}
              logs={logs}
              feedbacks={localFeedbacks}
              authorName={activeUser?.name || authUser?.email || '실무자'}
              onCreateLog={async (newLog) => {
                if (!orgId) throw new Error('조직 컨텍스트가 없습니다.');
                await MboService.recordProgressLog({
                  organization_id: orgId,
                  project_id: newLog.projectId,
                  author_name: newLog.authorName,
                  log_date: newLog.logDate,
                  progress_rate: newLog.progressRate,
                  achievements: newLog.achievements,
                  issues_and_actions: newLog.issuesAndActions ?? null,
                  next_steps: newLog.nextSteps ?? null,
                  period_ym: newLog.periodYm,
                });
                await logQuery?.refetch?.();
                await projectQuery?.refetch?.();
                await objQuery?.refetch?.();
              }}
              onCreateFeedback={async (newFb) => {
                if (!orgId) throw new Error('조직 컨텍스트가 없습니다.');
                await MboService.createFeedbackComment({
                  organization_id: orgId,
                  project_id: newFb.projectId,
                  author_name: newFb.authorName,
                  author_role: newFb.authorRole,
                  feedback_type: newFb.feedbackType,
                  content: newFb.content,
                });
                const rows = await MboService.listFeedbackComments(orgId, newFb.projectId);
                setLocalFeedbacks(
                  rows.map((row) => ({
                    id: row.id,
                    projectId: row.project_id,
                    authorName: row.author_name,
                    authorRole: row.author_role,
                    feedbackType: row.feedback_type as FeedbackItem['feedbackType'],
                    content: row.content,
                    createdAt: row.created_at
                      ? new Date(row.created_at).toLocaleTimeString()
                      : '',
                  }))
                );
              }}
            />
          )}
        </div>
      )}

      {/* 신규 목표 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">새 과제 등록</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObjective} className="space-y-3.5" data-testid="mbo-create-objective-form">
              <div
                className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-indigo-950"
                data-testid="mbo-goal-hierarchy-hint"
              >
                <p className="font-bold">
                  현재 등록 가능 최고 단계: {levelLabelKo(maxCreatableLevel)}
                  {goalActor.roleName ? ` · ${goalActor.roleName}` : ''}
                </p>
                <p className="mt-1 text-indigo-800/90">
                  자기보다 상급 단계는 등록할 수 없습니다. 상위 목표가 먼저 있어야 하위 단계를 입력할 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">목표 계층 구분</label>
                  <select
                    value={newLevel}
                    onChange={(e) => {
                      const next = e.target.value as MboLevel;
                      setNewLevel(next);
                      if (next === 'company') {
                        setNewParentId('');
                      } else {
                        const parents = listEligibleParentGoals(next, existingGoalRefs);
                        setNewParentId((prev) =>
                          parents.some((p) => p.id === prev) ? prev : parents[0]?.id || ''
                        );
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    data-testid="mbo-create-objective-level"
                  >
                    {creatableLevels.map((level) => (
                      <option key={level} value={level}>
                        {levelLabelKo(level)}
                      </option>
                    ))}
                  </select>
                  {!hasPrerequisiteGoals(newLevel, existingGoalRefs) ? (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">
                      {prerequisiteLabel(newLevel)}가 아직 없습니다.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">가중치 (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {newLevel !== 'company' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">상위 목표 *</label>
                  <select
                    value={newParentId}
                    onChange={(e) => setNewParentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    data-testid="mbo-create-objective-parent"
                  >
                    <option value="">상위 목표 선택</option>
                    {eligibleParents.map((parent) => {
                      const title =
                        objectives.find((o) => o.id === parent.id)?.title ?? parent.id;
                      return (
                        <option key={parent.id} value={parent.id}>
                          [{levelLabelKo(parent.level)}] {title}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">목표 타이틀 *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 2026 하반기 신규 회원 유치 및 상담 전환율 35% 달성"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  data-testid="mbo-create-objective-title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">핵심 성공 기준 (KPI) *</label>
                <input
                  type="text"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  placeholder="예: 월 신규 상담 50건 이상, 등록 전환율 35% 돌파"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  data-testid="mbo-create-objective-criteria"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {newLevel === 'department' ? '대상 조직 *' : '담당 부서'}
                  </label>
                  {newLevel === 'department' && ledDepartments.length > 0 ? (
                    <select
                      value={newDepartmentId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setNewDepartmentId(id);
                        const name = orgDepartments.find((d) => d.id === id)?.name ?? '';
                        setNewDept(name);
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                      data-testid="mbo-create-objective-department"
                    >
                      <option value="">리더로 맡은 조직 선택</option>
                      {ledDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      placeholder={selectedOwnerMember?.departmentName || '부서명'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">책임 담당자 *</label>
                  <button
                    type="button"
                    onClick={() => setOwnerPickerOpen(true)}
                    className="w-full min-h-12 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-left"
                  >
                    {selectedOwnerMember?.displayName || '조직 멤버에서 선택'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">공개범위</label>
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value as MboVisibilityType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="PRIVATE">비공개 (본인·부서장·관리자)</option>
                  <option value="PUBLIC">전체 공개 (조직 멤버)</option>
                  <option value="PARTIAL">선택 공개</option>
                </select>
                {newVisibility === 'PARTIAL' ? (
                  <button
                    type="button"
                    className="mt-2 min-h-12 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800"
                    onClick={() => setSharePickerOpen(true)}
                  >
                    공유 대상 {newShareMemberIds.length}명 선택
                  </button>
                ) : null}
              </div>

              <MboScheduleRangePicker
                startDate={newStartDate}
                targetDate={newTargetDate}
                onChange={({ startDate, targetDate }) => {
                  setNewStartDate(startDate);
                  setNewTargetDate(targetDate);
                }}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="min-h-12 px-4 text-xs font-semibold text-slate-500"
                >
                  취소
                </button>
                <button
                  type="submit"
                  data-testid="mbo-create-objective-submit"
                  className="min-h-12 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
                >
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MboRevisionTimelineModal
        open={Boolean(historyGoalId)}
        goalId={historyGoalId || ''}
        currentTargetValue={objectives.find((o) => o.id === historyGoalId)?.targetValue}
        currentDueDate={objectives.find((o) => o.id === historyGoalId)?.targetDate}
        onClose={() => setHistoryGoalId(null)}
      />

      <MboReviseGoalModal
        open={Boolean(reviseGoalId)}
        goalId={reviseGoalId || ''}
        currentTargetValue={objectives.find((o) => o.id === reviseGoalId)?.targetValue}
        currentDueDate={objectives.find((o) => o.id === reviseGoalId)?.targetDate}
        onClose={() => setReviseGoalId(null)}
        onRevised={() => {
          void objQuery?.refetch?.();
          setLocalObjectives((prev) =>
            prev.map((obj) =>
              obj.id === reviseGoalId
                ? { ...obj, revision: obj.revision + 1, isRevised: true, revisionCount: obj.revision + 1 }
                : obj,
            ),
          );
        }}
      />

      {/* 반려 사유 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">목표 반려 사유 작성</h3>
            <textarea
              value={rejectionInput}
              onChange={(e) => setRejectionInput(e.target.value)}
              placeholder="구체적인 반려 사유와 수정 권고 사항을 입력하세요."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none h-24"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showRejectModal) {
                    handleTransitionStatus(showRejectModal, 'rejected', rejectionInput);
                    setShowRejectModal(null);
                    setRejectionInput('');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                반려 처리
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteGoalId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">과제 삭제</h3>
            <p className="text-xs text-slate-500">
              삭제하면 목록에서 숨겨지며, 삭제 사유와 시점이 이력에 남습니다.
            </p>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="삭제 사유 *"
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="min-h-12 px-4 text-xs font-semibold text-slate-500"
                onClick={() => {
                  setDeleteGoalId(null);
                  setDeleteReason('');
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="min-h-12 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white"
                onClick={handleConfirmSoftDelete}
              >
                삭제 확정
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OrganizationMemberPickerModal
        open={ownerPickerOpen}
        mode="single"
        title="담당자 선택"
        departments={orgDepartments}
        members={orgMembers}
        selectedIds={newOwnerMemberId ? [newOwnerMemberId] : []}
        onChange={(ids) => setNewOwnerMemberId(ids[0] ?? '')}
        onClose={() => setOwnerPickerOpen(false)}
        onConfirm={() => setOwnerPickerOpen(false)}
      />

      <OrganizationMemberPickerModal
        open={sharePickerOpen}
        mode="multiple"
        title="선택 공개 대상"
        departments={orgDepartments}
        members={orgMembers}
        selectedIds={newShareMemberIds}
        onChange={setNewShareMemberIds}
        onClose={() => {
          setSharePickerOpen(false);
          setSharePickerObjectiveId(null);
        }}
        onConfirm={() => {
          if (sharePickerObjectiveId && orgId) {
            void MboService.updateGoalVisibility(
              orgId,
              sharePickerObjectiveId,
              'PARTIAL',
              newShareMemberIds
            )
              .then(async () => {
                const shares = await MboService.listObjectiveSharesByOrg(orgId);
                setSharesByObjective(shares);
                void objQuery?.refetch?.();
                showToast('선택 공개 대상이 저장되었습니다.', 'success');
              })
              .catch((err) => {
                showToast(err instanceof Error ? err.message : '공유 저장 실패', 'error');
              })
              .finally(() => {
                setSharePickerOpen(false);
                setSharePickerObjectiveId(null);
              });
            return;
          }
          setSharePickerOpen(false);
        }}
      />
    </WorkPageFrame>
  );
};
