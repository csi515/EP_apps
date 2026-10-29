import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useList, useCreate, useUpdate } from '@refinedev/core';
import {
  Target,
  FolderKanban,
  Award,
  Layers,
  FileText,
  X,
  Plus,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  canTransitionMboStatus,
  calculateGradeFromScore,
  validateMboObjectiveWeights,
  type MboStatus,
  type MboLevel,
  type MboEvaluationGrade,
  type MboEvaluationType,
} from '../domain/mboEngine';
import {
  DEFAULT_MBO_CYCLE,
  areGoalsLocked,
  isReviewWindowOpen,
  type MboCycleSettings,
} from '../domain/mboCycle';
import {
  DEFAULT_WORKLOAD_THRESHOLDS,
  type WorkloadThresholds,
} from '../domain/workloadCapacityEngine';
import { showToast } from '@/shared/feedback/uiFeedback';
import { MboObjectiveTreeViewer, type ObjectiveNode } from './MboObjectiveTreeViewer';
import { MboQuarterlyReviewForm, type ProgressLogItem, type FeedbackItem } from './MboQuarterlyReviewForm';
import { MboEvaluationMatrixView, type EvaluationItem } from './MboEvaluationMatrixView';
import { TeamWeeklyWorkloadView } from './TeamWeeklyWorkloadView';
import { MboYearlyCapacityForecastView } from './MboYearlyCapacityForecastView';
import { MboCycleSettingsCard } from './MboCycleSettingsCard';
import { MboRevisionTimelineModal } from './MboRevisionTimelineModal';
import { MboReviseGoalModal } from './MboReviseGoalModal';
import { MboProjectPortfolioView } from './MboProjectPortfolioView';
import { MboPlanApprovalModal } from './MboPlanApprovalModal';
import type { PortfolioProject } from '../domain/projectPortfolioEngine';
import type { ProjectCategory } from '../domain/projectCategoryEngine';
import { MboService } from '../services/mboService';
import {
  canManageObjectiveOwner,
  loadMboViewerOrgScope,
  type MboViewerOrgScope,
} from '../services/mboOrgScopeService';
import { readMboRequirePlanApproval } from '../domain/mboPlanApproval';
import { formatPeriodYm, listMissingMonthlyCheckins } from '../domain/mboMonthlyCheckin';
import { useActiveUser } from '@/shared/session/useActiveUser';
import {
  ensureDefaultProjectCategories,
  listProjectCategories,
} from '../services/projectCategoryService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { usePermissions } from '@/core/auth/usePermissions';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { useAuth } from '@/core/auth/AuthProvider';

export const MboManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'objectives' | 'projects' | 'evaluations' | 'workload' | 'forecast'
  >('objectives');
  const [projectSubView, setProjectSubView] = useState<'portfolio' | 'monthly'>('portfolio');
  const [thresholds, setThresholds] = useState<WorkloadThresholds>(DEFAULT_WORKLOAD_THRESHOLDS);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [cycleSettings, setCycleSettings] = useState<MboCycleSettings>(DEFAULT_MBO_CYCLE);
  const goalsLocked = areGoalsLocked(cycleSettings, new Date());
  const reviewOpen = isReviewWindowOpen(cycleSettings, new Date());

  const [localObjectives, setLocalObjectives] = useState<ObjectiveNode[]>([]);
  const [localFeedbacks, setLocalFeedbacks] = useState<FeedbackItem[]>([]);
  const [localEvaluations, setLocalEvaluations] = useState<EvaluationItem[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState<MboLevel>('individual');
  const [newOwner, setNewOwner] = useState('');
  const [newDept, setNewDept] = useState('운영팀');
  const [newCriteria, setNewCriteria] = useState('');
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
      return;
    }
    let cancelled = false;
    void loadMboViewerOrgScope(orgId, userId).then((scope) => {
      if (!cancelled) setOrgScope(scope);
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

  // 선택 프로젝트의 피드백·평가 hydrate (기밀 평가는 서비스+RLS 경로만)
  useEffect(() => {
    const projectId = selectedProjectId;
    if (!orgId || !projectId) {
      setLocalFeedbacks([]);
      setLocalEvaluations([]);
      return;
    }
    let cancelled = false;
    const userId = authUser?.id || activeUser?.id || '';
    void Promise.all([
      MboService.listFeedbackComments(orgId, projectId),
      MboService.listEvaluations(orgId, projectId, userId, isOrgAdmin, {
        isSubtreeLeaderOfTarget: orgScope?.isSubtreeLeaderOfTarget,
      }),
    ])
      .then(([feedbackRows, evalRows]) => {
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
        setLocalEvaluations(
          evalRows.map((row) => ({
            id: row.id,
            projectId: row.project_id,
            targetUserName: '대상자',
            evaluatorName: row.evaluator_name || '평가자',
            evaluationType: (row.evaluation_type || 'manager') as MboEvaluationType,
            score: Number(row.score ?? 0),
            grade: (row.grade || calculateGradeFromScore(Number(row.score ?? 0))) as MboEvaluationGrade,
            qualitativeFeedback: row.qualitative_feedback || '',
            isConfidential: row.is_confidential ?? true,
            createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLocalFeedbacks([]);
          setLocalEvaluations([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, selectedProjectId, authUser?.id, activeUser?.id, isOrgAdmin, orgScope]);

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

  // DB 데이터 우선 바인딩 — org admin / 본인 / 하위 리더 스코프
  const objectives: ObjectiveNode[] = useMemo(() => {
    const scope = orgScope;
    const mapRow = (row: any): ObjectiveNode & { ownerId?: string | null } => ({
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
    });
    const raw =
      refineObjectives && refineObjectives.length > 0
        ? refineObjectives.map(mapRow)
        : localObjectives.map((obj) => ({
            ...obj,
            isRevised: obj.revision > 1,
            revisionCount: obj.revision,
            targetValue: obj.weight,
            ownerId: null as string | null,
          }));
    if (isOrgAdmin || !scope) return raw;
    return raw.filter((obj) =>
      canManageObjectiveOwner(scope, obj.ownerId, viewerUserId, isOrgAdmin),
    );
  }, [refineObjectives, localObjectives, orgScope, isOrgAdmin, viewerUserId]);

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

  const evaluations: EvaluationItem[] = localEvaluations;

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
      owner_id: null,
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

    const parentId =
      selectedObjectiveId && selectedObjectiveId !== 'none' ? selectedObjectiveId : null;
    const ownerName = newOwner || activeUser?.name || '신규 담당자';

    mutateCreate(
      {
        resource: 'mbo_objectives',
        values: {
          organization_id: orgId,
          parent_id: parentId,
          level: newLevel,
          department_name: newDept,
          owner_name: ownerName,
          title: newTitle.trim(),
          success_criteria: newCriteria.trim(),
          start_date: newStartDate,
          target_date: newTargetDate,
          weight: newWeight,
          progress_rate: 0,
          status: 'draft',
          target_value: newWeight,
        },
      },
      {
        onSuccess: async (result) => {
          const createdId = (result as { data?: { id?: string } })?.data?.id;
          try {
            if (createdId) {
              const project = await MboService.ensureDefaultProject(orgId, {
                id: createdId,
                title: newTitle.trim(),
                owner_id: null,
                owner_name: ownerName,
                start_date: newStartDate,
                target_date: newTargetDate,
              });
              setSelectedObjectiveId(createdId);
              setSelectedProjectId(project.id);
            }
          } catch {
            /* 프로젝트 확보 실패는 목표 생성 성공과 분리 안내 */
            showToast('목표는 저장됐으나 실행 프로젝트 자동 생성에 실패했습니다.', 'warning');
          }
          void objQuery?.refetch?.();
          void projectQuery?.refetch?.();
          setShowCreateModal(false);
          setNewTitle('');
          showToast('신규 MBO 목표와 실행 프로젝트가 등록되었습니다.', 'success');
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : '목표 등록 실패', 'error');
        },
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pt-2 pb-12">
      {/* 최상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold mb-1.5">
            <Target className="w-3.5 h-3.5" />
            <span>조직 목표 및 성과 관리 (MBO)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MBO 목표 & 성과평가 허브</h1>
          <p className="text-xs text-slate-500 mt-1">
            전사·부서·개인 목표 계층(가중치 100%), 월별 체크인 및 다면 성과평가를 통합 관리합니다. 목표는 조직 멤버 범위에서 공유됩니다.
          </p>
        </div>

        {/* 상단 네비게이션 탭 */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
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
          <button
            type="button"
            onClick={() => setActiveTab('evaluations')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'evaluations'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>다면 성과평가표</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workload')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>주간 팀 부하</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'forecast'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>캐퍼시티 예측</span>
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
        />
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

      {/* 탭 3: 다면 성과평가표 뷰 */}
      {activeTab === 'evaluations' && (
        reviewOpen && !selectedPortfolioProject?.id ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            실행 프로젝트가 없습니다. 목표를 등록하면 기본 프로젝트가 생성되며, 그 프로젝트 기준으로 평가합니다.
          </div>
        ) : reviewOpen ? (
          <MboEvaluationMatrixView
            projectId={selectedPortfolioProject?.id || ''}
            projectTitle={
              selectedPortfolioProject?.title || selectedObjective?.title || '선택된 목표'
            }
            targetUserName={selectedObjective?.ownerName || '담당자'}
            evaluations={evaluations}
            onCreateEvaluation={async (newEval) => {
              if (!orgId) {
                showToast('조직 컨텍스트가 없습니다.', 'error');
                return;
              }
              const projectId = selectedPortfolioProject?.id;
              if (!projectId) {
                showToast('평가할 실행 프로젝트를 선택해주세요.', 'warning');
                return;
              }
              try {
                const evaluatorId = authUser?.id || activeUser?.id || null;
                await MboService.createEvaluation({
                  organization_id: orgId,
                  project_id: projectId,
                  evaluator_id: evaluatorId,
                  evaluator_name: newEval.evaluatorName,
                  target_user_id: selectedPortfolioProject?.ownerId ?? null,
                  evaluation_type: newEval.evaluationType,
                  score: newEval.score,
                  qualitative_feedback: newEval.qualitativeFeedback,
                  is_confidential: newEval.isConfidential,
                  grade: calculateGradeFromScore(newEval.score),
                } as never);
                const userId = authUser?.id || activeUser?.id || '';
                const rows = await MboService.listEvaluations(
                  orgId,
                  projectId,
                  userId,
                  isOrgAdmin,
                  { isSubtreeLeaderOfTarget: orgScope?.isSubtreeLeaderOfTarget },
                );
                setLocalEvaluations(
                  rows.map((row) => ({
                    id: row.id,
                    projectId: row.project_id,
                    targetUserName: '대상자',
                    evaluatorName: row.evaluator_name || '평가자',
                    evaluationType: (row.evaluation_type || 'manager') as MboEvaluationType,
                    score: Number(row.score ?? 0),
                    grade: (row.grade ||
                      calculateGradeFromScore(Number(row.score ?? 0))) as MboEvaluationGrade,
                    qualitativeFeedback: row.qualitative_feedback || '',
                    isConfidential: row.is_confidential ?? true,
                    createdAt: row.created_at
                      ? new Date(row.created_at).toLocaleDateString()
                      : '',
                  }))
                );
                showToast('평가가 저장되었습니다.', 'success');
              } catch (cause) {
                showToast(cause instanceof Error ? cause.message : '평가 저장 실패', 'error');
              }
            }}
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Award className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-base font-bold text-slate-900">평가 기간이 아닙니다</p>
            <p className="mt-2 text-sm text-slate-500">
              사업주가 설정한 연말 평가 기간에만 평가를 작성·제출할 수 있습니다. 월별 체크인은 연중 작성할 수 있습니다.
            </p>
          </div>
        )
      )}

      {/* 탭 4: 주간 팀 부하 모니터링 */}
      {activeTab === 'workload' && (
        <TeamWeeklyWorkloadView
          initialThresholds={thresholds}
          onThresholdsChange={setThresholds}
        />
      )}

      {/* 탭 5: 연간 캐퍼시티 예측 대사 */}
      {activeTab === 'forecast' && (
        <MboYearlyCapacityForecastView thresholds={thresholds} />
      )}

      {/* 신규 목표 등록 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">신규 MBO 목표 등록</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateObjective} className="space-y-3.5" data-testid="mbo-create-objective-form">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">목표 계층 구분</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as MboLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="company">전사 전략 목표</option>
                    <option value="department">부서 핵심 목표</option>
                    <option value="individual">개인 KPI 과제</option>
                  </select>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">담당 부서</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">책임 담당자</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="담당자명"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                등록된 목표는 조직 멤버 범위(테넌트 RLS)에서 공유됩니다. 세부 공개범위는 후속 기능입니다.
              </p>

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
    </div>
  );
};
