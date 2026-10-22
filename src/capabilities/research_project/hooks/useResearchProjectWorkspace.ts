import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCreate, useInvalidate, useList, useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  buildDefaultGateApprovalSteps,
  buildGateApprovalRequestValues,
  canSubmitGateToApprovalWorkflow,
  gateDecisionFromApprovalStatus,
  shouldSyncGateFromApproval,
  type GateLinkedApprovalStatus,
} from '../domain/researchProjectApproval';
import {
  canDirectDecideGate,
  createResearchProject,
  decideGate,
  markGateSubmittedForApproval,
  projectRowPatchFromDomain,
  recordBudgetSpend,
  type ResearchMember,
  type ResearchProject,
  type ResearchProjectStatus,
} from '../domain/researchProjectEngine';
import { assembleResearchProject } from '../services/researchProjectMappers';
import type { Database } from '@/lib/supabase/database.types';

type ProjectRow = Database['core']['Tables']['research_projects']['Row'];
type MemberRow = Database['core']['Tables']['research_project_members']['Row'];
type GateRow = Database['core']['Tables']['research_project_gates']['Row'];
type DeliverableRow = Database['core']['Tables']['research_project_deliverables']['Row'];
type ApprovalRow = Database['core']['Tables']['approval_requests']['Row'];

export function useResearchProjectWorkspace() {
  const { currentOrganization, activeCapabilities } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const hasApprovalWorkflow = activeCapabilities.includes('approval_workflow');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ResearchProjectStatus | 'all'>('all');
  const syncedApprovalIds = useRef(new Set<string>());

  const invalidate = useInvalidate();
  const refetchAll = useCallback(() => {
    void invalidate({ resource: 'research_projects', invalidates: ['list'] });
    void invalidate({ resource: 'research_project_members', invalidates: ['list'] });
    void invalidate({ resource: 'research_project_gates', invalidates: ['list'] });
    void invalidate({ resource: 'research_project_deliverables', invalidates: ['list'] });
    void invalidate({ resource: 'approval_requests', invalidates: ['list'] });
  }, [invalidate]);

  const projectsQuery = useList<ProjectRow>({
    resource: 'research_projects',
    pagination: { mode: 'off' },
    queryOptions: { enabled: Boolean(orgId) },
  });
  const membersQuery = useList<MemberRow>({
    resource: 'research_project_members',
    pagination: { mode: 'off' },
    queryOptions: { enabled: Boolean(orgId) },
  });
  const gatesQuery = useList<GateRow>({
    resource: 'research_project_gates',
    pagination: { mode: 'off' },
    queryOptions: { enabled: Boolean(orgId) },
  });
  const deliverablesQuery = useList<DeliverableRow>({
    resource: 'research_project_deliverables',
    pagination: { mode: 'off' },
    queryOptions: { enabled: Boolean(orgId) },
  });
  const approvalsQuery = useList<ApprovalRow>({
    resource: 'approval_requests',
    pagination: { mode: 'off' },
    filters: [{ field: 'entity_type', operator: 'eq', value: 'research_project_gate' }],
    queryOptions: { enabled: Boolean(orgId) && hasApprovalWorkflow },
  });

  const { mutate: createProject } = useCreate();
  const { mutate: createMember } = useCreate();
  const { mutate: createGate } = useCreate();
  const { mutate: createDeliverable } = useCreate();
  const { mutate: createApproval } = useCreate();
  const { mutate: createApprovalStep } = useCreate();
  const { mutate: updateProject } = useUpdate();
  const { mutate: updateGate } = useUpdate();
  const { mutate: updateDeliverable } = useUpdate();

  const approvalById = useMemo(() => {
    const map = new Map<string, ApprovalRow>();
    for (const row of approvalsQuery.query.data?.data ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [approvalsQuery.query.data?.data]);

  const projects = useMemo(() => {
    const projectRows = projectsQuery.query.data?.data ?? [];
    const members = membersQuery.query.data?.data ?? [];
    const gates = gatesQuery.query.data?.data ?? [];
    const deliverables = deliverablesQuery.query.data?.data ?? [];

    return projectRows.map((row) =>
      assembleResearchProject(
        row,
        members.filter((m) => m.project_id === row.id),
        gates.filter((g) => g.project_id === row.id),
        deliverables.filter((d) => d.project_id === row.id)
      )
    );
  }, [
    projectsQuery.query.data?.data,
    membersQuery.query.data?.data,
    gatesQuery.query.data?.data,
    deliverablesQuery.query.data?.data,
  ]);

  const filteredProjects = useMemo(
    () => (filter === 'all' ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter]
  );

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const isLoading =
    projectsQuery.query.isLoading ||
    membersQuery.query.isLoading ||
    gatesQuery.query.isLoading ||
    deliverablesQuery.query.isLoading;

  const persistProjectPatch = useCallback(
    (project: ResearchProject) => {
      updateProject({
        resource: 'research_projects',
        id: project.id,
        values: projectRowPatchFromDomain(project),
      });
    },
    [updateProject]
  );

  const persistGate = useCallback(
    (gate: ResearchProject['gates'][number]) => {
      updateGate({
        resource: 'research_project_gates',
        id: gate.id,
        values: {
          status: gate.status,
          approval_request_id: gate.approvalRequestId,
          decided_by_name: gate.decidedByName,
          decided_at: gate.decidedAt,
          decision_note: gate.decisionNote,
        },
      });
    },
    [updateGate]
  );

  const syncApprovalOutcomes = useCallback(() => {
    if (!hasApprovalWorkflow || projects.length === 0) return;

    for (const project of projects) {
      for (const gate of project.gates) {
        if (!gate.approvalRequestId) continue;
        const approval = approvalById.get(gate.approvalRequestId);
        if (!approval) continue;
        if (syncedApprovalIds.current.has(`${gate.id}:${approval.status}`)) continue;
        if (!shouldSyncGateFromApproval(gate, approval.status as GateLinkedApprovalStatus)) continue;

        const decision = gateDecisionFromApprovalStatus(approval.status as GateLinkedApprovalStatus);
        if (!decision) continue;

        const result = decideGate(
          project,
          gate.gateOrder,
          {
            status: decision,
            decidedByName: approval.requester_name || '결재 승인자',
            decisionNote:
              approval.rejection_reason ||
              (typeof approval.content === 'object' &&
              approval.content &&
              'submit_note' in (approval.content as object)
                ? String((approval.content as Record<string, unknown>).submit_note)
                : undefined),
            decidedAt: approval.final_approved_at || approval.rejected_at || new Date().toISOString(),
          },
          { fromApprovalSync: true }
        );
        if (result.error) continue;

        syncedApprovalIds.current.add(`${gate.id}:${approval.status}`);
        persistGate(result.project.gates.find((g) => g.id === gate.id)!);
        persistProjectPatch(result.project);
      }
    }
  }, [approvalById, hasApprovalWorkflow, persistGate, persistProjectPatch, projects]);

  useEffect(() => {
    syncApprovalOutcomes();
  }, [syncApprovalOutcomes]);

  const createResearchProjectPersisted = useCallback(
    (params: {
      title: string;
      summary?: string;
      startDate: string;
      endDate: string;
      budgetPlanned: number;
      members: ResearchMember[];
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!orgId) return Promise.resolve({ ok: false, error: '사업장(organization)이 선택되지 않았습니다.' });

      const draft = createResearchProject({
        organizationId: orgId,
        title: params.title,
        summary: params.summary,
        startDate: params.startDate,
        endDate: params.endDate,
        budgetPlanned: params.budgetPlanned,
        members: params.members,
        deliverables: [{ title: '중간 산출물', dueDate: params.endDate }],
      });
      if (!draft.project) return Promise.resolve({ ok: false, error: draft.error || '생성 실패' });
      const project = draft.project;

      return new Promise((resolve) => {
        createProject(
          {
            resource: 'research_projects',
            values: {
              title: project.title,
              summary: project.summary,
              status: project.status,
              start_date: project.startDate,
              end_date: project.endDate,
              budget_planned: project.budget.planned,
              budget_spent: 0,
              progress_rate: 0,
            },
          },
          {
            onSuccess: (res) => {
              const newId = String(res.data?.id ?? '');
              if (!newId) {
                resolve({ ok: false, error: '과제 ID를 받지 못했습니다.' });
                return;
              }
              for (const m of project.members) {
                createMember({
                  resource: 'research_project_members',
                  values: {
                    project_id: newId,
                    member_name: m.memberName,
                    member_id: null,
                    role: m.role,
                  },
                });
              }
              for (const g of project.gates) {
                createGate({
                  resource: 'research_project_gates',
                  values: {
                    project_id: newId,
                    gate_order: g.gateOrder,
                    title: g.title,
                    status: g.status,
                  },
                });
              }
              for (const d of project.deliverables) {
                createDeliverable({
                  resource: 'research_project_deliverables',
                  values: {
                    project_id: newId,
                    title: d.title,
                    due_date: d.dueDate,
                    status: d.status,
                    sort_order: d.sortOrder,
                  },
                });
              }
              setSelectedId(newId);
              refetchAll();
              resolve({ ok: true });
            },
            onError: () => resolve({ ok: false, error: '과제 저장에 실패했습니다.' }),
          }
        );
      });
    },
    [
      orgId,
      createProject,
      createMember,
      createGate,
      createDeliverable,
      refetchAll,
    ]
  );

  const recordSpendPersisted = useCallback(
    (project: ResearchProject, amount: number): string | null => {
      const result = recordBudgetSpend(project, amount);
      if (result.error) return result.error;
      persistProjectPatch(result.project);
      return null;
    },
    [persistProjectPatch]
  );

  const directGateDecision = useCallback(
    (
      project: ResearchProject,
      gateOrder: number,
      status: 'approved' | 'rejected',
      note: string,
      decidedByName: string
    ): string | null => {
      const gate = project.gates.find((g) => g.gateOrder === gateOrder);
      if (gate && !canDirectDecideGate(gate)) {
        return '전자결재 상신된 게이트는 결재함에서 처리하거나 동기화를 기다려 주세요.';
      }
      const result = decideGate(project, gateOrder, {
        status,
        decidedByName,
        decisionNote: note,
      });
      if (result.error) return result.error;
      const updatedGate = result.project.gates.find((g) => g.gateOrder === gateOrder);
      if (updatedGate) persistGate(updatedGate);
      persistProjectPatch(result.project);
      return null;
    },
    [persistGate, persistProjectPatch]
  );

  const submitGateToApproval = useCallback(
    (
      project: ResearchProject,
      gateId: string,
      gateNote: string,
      requesterName: string
    ): Promise<string | null> => {
      if (!orgId) return Promise.resolve('사업장이 선택되지 않았습니다.');
      const gate = project.gates.find((g) => g.id === gateId);
      if (!gate) return Promise.resolve('게이트를 찾을 수 없습니다.');
      const guard = canSubmitGateToApprovalWorkflow(gate, hasApprovalWorkflow);
      if (!guard.allowed) return Promise.resolve(guard.reason || '상신 불가');

      return new Promise((resolve) => {
        createApproval(
          {
            resource: 'approval_requests',
            values: buildGateApprovalRequestValues({
              project,
              gate,
              requesterName,
              gateNote,
            }),
          },
          {
            onSuccess: (res) => {
              const approvalId = String(res.data?.id ?? '');
              if (!approvalId) {
                resolve('결재 문서 생성에 실패했습니다.');
                return;
              }
              const steps = buildDefaultGateApprovalSteps(orgId, approvalId);
              for (const step of steps) {
                createApprovalStep({
                  resource: 'approval_steps',
                  values: step,
                });
              }
              const marked = markGateSubmittedForApproval(project, gateId, approvalId);
              if (marked.error || !marked.project) {
                resolve(marked.error || '게이트 상태 갱신 실패');
                return;
              }
              const updatedGate = marked.project.gates.find((g) => g.id === gateId)!;
              persistGate(updatedGate);
              persistProjectPatch(marked.project);
              refetchAll();
              resolve(null);
            },
            onError: () => resolve('전자결재 기안에 실패했습니다.'),
          }
        );
      });
    },
    [
      orgId,
      hasApprovalWorkflow,
      createApproval,
      createApprovalStep,
      persistGate,
      persistProjectPatch,
      refetchAll,
    ]
  );

  const updateDeliverableStatusPersisted = useCallback(
    (deliverableId: string, status: ResearchProject['deliverables'][number]['status']) => {
      updateDeliverable({
        resource: 'research_project_deliverables',
        id: deliverableId,
        values: { status },
      });
    },
    [updateDeliverable]
  );

  return {
    orgId,
    isLoading,
    hasApprovalWorkflow,
    filter,
    setFilter,
    projects,
    filteredProjects,
    selected,
    selectedId,
    setSelectedId,
    refetchAll,
    createResearchProjectPersisted,
    recordSpendPersisted,
    directGateDecision,
    submitGateToApproval,
    updateDeliverableStatusPersisted,
    syncApprovalOutcomes,
  };
}
