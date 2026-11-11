import React, { useEffect, useMemo, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { FolderKanban, Pencil, Plus, X } from 'lucide-react';
import {
  RESEARCH_KANBAN_COLUMNS,
  RESEARCH_STATUS_LABELS,
  GATE_STATUS_LABELS,
  buildMemberProjectLoad,
  getCoLeadNames,
  getCurrentGate,
  getLeadName,
  type ResearchProjectStatus,
} from '../domain/researchProjectEngine';
import { useResearchProjectWorkspace } from '../hooks/useResearchProjectWorkspace';
import { ResearchProjectDetailPanel } from './ResearchProjectDetailPanel';
import { ResearchProjectCreateModal } from './ResearchProjectCreateModal';
import { ResearchProjectEditModal } from './ResearchProjectEditModal';
import { RESEARCH_COPY } from './researchUiCopy';
import { showToast } from '@/shared/feedback/uiFeedback';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { Button } from '@/shared/components/ui/Button';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { uiMotion } from '@/shared/components/ui/uiMotion';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { PageListSkeleton } from '@/shared/components/ui/Skeleton';
import { usePermissions } from '@/core/auth/usePermissions';
import {
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow/services/approvalWorkflowService';

type Identity = { id?: string; name?: string };

const STATUS_FILTERS: Array<ResearchProjectStatus | 'all'> = [
  'all',
  'draft',
  'active',
  'gate_review',
  'suspended',
  'completed',
  'canceled',
];

type ViewMode = 'list' | 'kanban';

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export const ResearchProjectManagementView: React.FC = () => {
  const ws = useResearchProjectWorkspace();
  const { data: identity } = useGetIdentity<Identity>();
  const { canPermission, isAdmin, isOwner } = usePermissions();
  const canMutate = isAdmin || isOwner || canPermission('research:write');
  const canDecideGate = isAdmin || isOwner || canPermission('research:gate:decide');
  const readOnly = !canMutate && !canDecideGate;

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgMembers, setOrgMembers] = useState<ApprovalMemberOption[]>([]);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (!ws.orgId) return;
    void listApprovalOrgMembers(ws.orgId)
      .then(setOrgMembers)
      .catch(() => setOrgMembers([]));
  }, [ws.orgId]);

  useEffect(() => {
    if (ws.selectedId) setMobileDetailOpen(true);
  }, [ws.selectedId]);

  const workload = useMemo(
    () => buildMemberProjectLoad(ws.projects ?? []),
    [ws.projects]
  );
  const maxLoad = Math.max(1, ...workload.map((w) => w.projectCount));

  const selectProject = (id: string) => {
    ws.setSelectedId(id);
    setMobileDetailOpen(true);
  };

  const closeMobileDetail = () => {
    setMobileDetailOpen(false);
  };

  if (ws.isLoading) {
    return (
      <WorkPageFrame width="hub">
        <PageListSkeleton rows={5} message="연구과제를 불러오는 중..." />
      </WorkPageFrame>
    );
  }

  if (!ws.orgId) {
    return (
      <WorkPageFrame width="form" className="text-center text-slate-500">
        사업장을 선택한 후 연구과제를 관리할 수 있습니다.
      </WorkPageFrame>
    );
  }

  const hasAnyProjects = (ws.projects ?? []).length > 0;
  const filterEmpty = hasAnyProjects && ws.filteredProjects.length === 0;

  return (
    <WorkPageFrame width="hub">
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FolderKanban className="h-5 w-5 text-indigo-600" />
            {RESEARCH_COPY.appTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{RESEARCH_COPY.appSubtitle}</p>
          {readOnly ? (
            <p className="mt-1 text-xs text-amber-700">{RESEARCH_COPY.readOnlyHint}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            activeClassName="bg-slate-900 text-white"
            options={[
              { value: 'kanban', label: '칸반' },
              { value: 'list', label: '목록' },
            ]}
          />
          {canMutate ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
            >
              과제 등록
            </Button>
          ) : null}
        </div>
      </div>

      {workload.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">연구원 참여 부하 (과제 수)</h2>
          <ul className="mt-3 space-y-2">
            {workload.slice(0, 8).map((row) => (
              <li
                key={row.memberId ?? row.memberName}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-24 shrink-0 truncate text-slate-700">{row.memberName}</span>
                <div className="h-2 flex-1 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full bg-indigo-500 ${uiMotion.PROGRESS_WIDTH}`}
                    style={{ width: `${(row.projectCount / maxLoad) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-600">{row.projectCount}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FilterTabs
        active={ws.filter}
        onChange={ws.setFilter}
        activeClassName="bg-slate-900 text-white shadow-xs"
        tabs={STATUS_FILTERS.map((s) => ({
          id: s,
          label: s === 'all' ? '전체' : RESEARCH_STATUS_LABELS[s],
        }))}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ContentFadeIn motionKey={`${viewMode}-${ws.filter}`} className="space-y-3">
          {viewMode === 'kanban' ? (
            <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-4">
              {RESEARCH_KANBAN_COLUMNS.map((col) => {
                const cards = ws.filteredProjects.filter((p) => col.statuses.includes(p.status));
                return (
                  <div
                    key={col.id}
                    className="min-w-[12rem] rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {col.label} ({cards.length})
                    </p>
                    <div className="space-y-2">
                      {cards.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProject(p.id)}
                          className={`w-full rounded-lg border p-3 text-left text-sm ${
                            ws.selectedId === p.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <p className="font-medium text-slate-900">{p.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getLeadName(p)} · {p.progressRate}%
                          </p>
                        </button>
                      ))}
                      {cards.length === 0 ? (
                        <p className="text-xs text-slate-400">없음</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className={`space-y-2 ${viewMode === 'kanban' ? 'hidden lg:block' : ''}`}>
            {ws.filteredProjects.map((p) => {
              const gate = getCurrentGate(p.gates);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    ws.selectedId === p.id
                      ? 'border-indigo-500 bg-indigo-50/60'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{p.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {getLeadName(p)}
                        {getCoLeadNames(p).length > 0
                          ? ` · 부담당 ${getCoLeadNames(p).join(', ')}`
                          : ''}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {RESEARCH_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>
                      {p.startDate} ~ {p.endDate}
                    </span>
                    <span>{formatKrw(p.budget.planned)}</span>
                    <span>
                      {gate
                        ? `${gate.gateOrder}차 (${GATE_STATUS_LABELS[gate.status]})`
                        : '게이트 완료'}{' '}
                      · {p.progressRate}%
                    </span>
                  </div>
                </button>
              );
            })}
            {!hasAnyProjects ? (
              <EmptyState
                title={RESEARCH_COPY.emptyNoProjects}
                description={RESEARCH_COPY.emptyNoProjectsHint}
                action={
                  canMutate
                    ? { label: '과제 등록', onClick: () => setCreateOpen(true) }
                    : undefined
                }
              />
            ) : null}
            {filterEmpty ? (
              <EmptyState
                title={RESEARCH_COPY.emptyFilter}
                description={RESEARCH_COPY.emptyFilterHint}
                action={{ label: '전체 보기', onClick: () => ws.setFilter('all') }}
              />
            ) : null}
          </div>
        </ContentFadeIn>

        <div
          className={`${
            mobileDetailOpen && ws.selected
              ? 'fixed inset-0 z-40 flex flex-col bg-white p-4 lg:static lg:z-auto lg:bg-transparent lg:p-0'
              : 'hidden lg:block'
          }`}
        >
          {ws.selected ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
                <p className="truncate text-sm font-semibold text-slate-800">{ws.selected.title}</p>
                <div className="flex items-center gap-1">
                  {canMutate ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={RESEARCH_COPY.editTitle}
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={RESEARCH_COPY.closeDetail}
                    onClick={closeMobileDetail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mb-3 hidden items-center justify-end gap-2 lg:flex">
                {canMutate ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={() => setEditOpen(true)}
                  >
                    수정
                  </Button>
                ) : null}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ResearchProjectDetailPanel
                  project={ws.selected}
                  hasApprovalWorkflow={ws.hasApprovalWorkflow}
                  readOnly={!canMutate}
                  canDecideGate={canDecideGate}
                  onSpend={(amount) => ws.recordSpendPersisted(ws.selected!, amount)}
                  onActivateDraft={() => ws.activateDraftPersisted(ws.selected!)}
                  onDirectGateDecision={(gateOrder, status, note) =>
                    ws.directGateDecision(
                      ws.selected!,
                      gateOrder,
                      status,
                      note,
                      identity?.name?.trim() || getLeadName(ws.selected!)
                    )
                  }
                  onReopenRejectedGate={(gateOrder) =>
                    ws.reopenRejectedGatePersisted(ws.selected!, gateOrder)
                  }
                  onSubmitGateApproval={(gateId, note, reviewer, approver) =>
                    ws.submitGateToApproval(
                      ws.selected!,
                      gateId,
                      note,
                      identity?.name?.trim() || getLeadName(ws.selected!),
                      identity?.id ?? '',
                      reviewer,
                      approver
                    )
                  }
                  onDeliverableStatus={ws.updateDeliverableStatusPersisted}
                  onAddDeliverable={(title, dueDate, evidenceUrl) =>
                    ws.addDeliverablePersisted(ws.selected!.id, title, dueDate, evidenceUrl)
                  }
                  onUpdateDeliverableEvidence={(id, evidenceUrl) =>
                    ws.updateDeliverableEvidencePersisted(id, evidenceUrl)
                  }
                  onAddRelatedLink={(title, url) =>
                    ws.addRelatedLinkPersisted(ws.selected!.id, title, url)
                  }
                  onDeleteRelatedLink={(linkId) => ws.deleteRelatedLinkPersisted(linkId)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              {RESEARCH_COPY.selectProject}
            </div>
          )}
        </div>
      </div>

      <ResearchProjectCreateModal
        isOpen={createOpen}
        saving={saving}
        requireCoLead={ws.runtimeSettings.requireCoLead}
        members={orgMembers}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (input) => {
          setSaving(true);
          const result = await ws.createResearchProjectPersisted(input);
          setSaving(false);
          if (result.ok === false) return result.error;
          showToast(RESEARCH_COPY.created, 'success');
          return null;
        }}
      />

      <ResearchProjectEditModal
        isOpen={editOpen}
        project={ws.selected}
        saving={saving}
        requireCoLead={ws.runtimeSettings.requireCoLead}
        members={orgMembers}
        onClose={() => setEditOpen(false)}
        onSubmit={async (input) => {
          if (!ws.selected) return '과제를 선택해 주세요.';
          setSaving(true);
          const err = await ws.updateResearchProjectPersisted(ws.selected, input);
          setSaving(false);
          if (err) return err;
          showToast(RESEARCH_COPY.updated, 'success');
          return null;
        }}
        onLifecycle={async (status) => {
          if (!ws.selected) return '과제를 선택해 주세요.';
          const err = await ws.setLifecyclePersisted(ws.selected, status);
          if (err) return err;
          showToast(
            status === 'suspended'
              ? RESEARCH_COPY.suspended
              : status === 'canceled'
                ? RESEARCH_COPY.canceled
                : RESEARCH_COPY.resumed,
            'success'
          );
          return null;
        }}
      />
    </WorkPageFrame>
  );
};
