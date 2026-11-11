import React, { useEffect, useState } from 'react';
import {
  Users,
  Wallet,
  FileCheck,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Play,
} from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  RESEARCH_STATUS_LABELS,
  GATE_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  DELIVERABLE_TYPE_LABELS,
  DELIVERABLE_STATUS_LABELS,
  calculateBudgetRemaining,
  canDirectDecideGate,
  canReopenRejectedGate,
  formatDeliverableTitle,
  parseDeliverableType,
  getCurrentGate,
  validateHttpUrl,
  type DeliverableType,
  type ResearchProject,
} from '../domain/researchProjectEngine';
import type { GateApprovalAssignee } from '../domain/researchProjectApproval';
import {
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import { showToast } from '@/shared/feedback/uiFeedback';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ResearchProjectRelatedLinksSection } from './ResearchProjectRelatedLinksSection';
import { RESEARCH_COPY } from './researchUiCopy';

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

const TYPE_BADGE_STYLES: Record<DeliverableType, string> = {
  paper: 'bg-blue-50 text-blue-700 border-blue-200',
  conference: 'bg-purple-50 text-purple-700 border-purple-200',
  thesis: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  report: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  patent: 'bg-amber-50 text-amber-700 border-amber-200',
  code: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export interface ResearchProjectDetailPanelProps {
  project: ResearchProject;
  hasApprovalWorkflow: boolean;
  readOnly?: boolean;
  canDecideGate?: boolean;
  onSpend: (amount: number) => string | null;
  onActivateDraft?: () => string | null;
  onDirectGateDecision: (
    gateOrder: number,
    status: 'approved' | 'rejected',
    note: string
  ) => string | null;
  onReopenRejectedGate?: (gateOrder: number) => string | null;
  onSubmitGateApproval: (
    gateId: string,
    note: string,
    reviewer: GateApprovalAssignee,
    approver: GateApprovalAssignee
  ) => Promise<string | null>;
  onDeliverableStatus: (
    id: string,
    status: ResearchProject['deliverables'][number]['status']
  ) => Promise<string | null>;
  onAddDeliverable?: (
    title: string,
    dueDate?: string | null,
    evidenceUrl?: string | null
  ) => Promise<string | null>;
  onUpdateDeliverableEvidence?: (
    id: string,
    evidenceUrl: string | null
  ) => Promise<string | null>;
  onAddRelatedLink?: (title: string, url: string) => Promise<string | null>;
  onDeleteRelatedLink?: (linkId: string) => Promise<string | null>;
}

export const ResearchProjectDetailPanel: React.FC<ResearchProjectDetailPanelProps> = ({
  project,
  hasApprovalWorkflow,
  readOnly = false,
  canDecideGate = true,
  onSpend,
  onActivateDraft,
  onDirectGateDecision,
  onReopenRejectedGate,
  onSubmitGateApproval,
  onDeliverableStatus,
  onAddDeliverable,
  onUpdateDeliverableEvidence,
  onAddRelatedLink,
  onDeleteRelatedLink,
}) => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? '';
  const [gateNote, setGateNote] = useState('');
  const [spendAmount, setSpendAmount] = useState(1_000_000);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [members, setMembers] = useState<ApprovalMemberOption[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [newType, setNewType] = useState<DeliverableType>('paper');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setGateNote('');
    setSpendAmount(1_000_000);
    setReviewerId('');
    setApproverId('');
    setNewType('paper');
    setNewTitle('');
    setNewDueDate('');
    setNewEvidenceUrl('');
    setShowAddDeliverable(false);
    setEvidenceDrafts({});
  }, [project.id]);

  useEffect(() => {
    if (!orgId || !hasApprovalWorkflow) return;
    void listApprovalOrgMembers(orgId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [orgId, hasApprovalWorkflow]);

  const currentGate = getCurrentGate(project.gates);

  const handleSpend = () => {
    const err = onSpend(Number(spendAmount) || 0);
    if (err) showToast(err, 'error');
    else showToast('연구비 집행이 기록되었습니다.', 'success');
  };

  const handleActivate = () => {
    if (!onActivateDraft) return;
    const err = onActivateDraft();
    if (err) showToast(err, 'error');
    else showToast(RESEARCH_COPY.activateDraftDone, 'success');
  };

  const handleDirect = (status: 'approved' | 'rejected') => {
    if (!currentGate) return;
    const err = onDirectGateDecision(currentGate.gateOrder, status, gateNote);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast(
        `${currentGate.gateOrder}차 게이트 ${status === 'approved' ? '승인' : '반려'}`,
        'success'
      );
    }
  };

  const handleReopen = () => {
    if (!currentGate || !onReopenRejectedGate) return;
    const err = onReopenRejectedGate(currentGate.gateOrder);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast(RESEARCH_COPY.reopenRejectedGateDone, 'success');
    }
  };

  const handleSubmitApproval = async () => {
    if (!currentGate) return;
    const reviewer = members.find((m) => m.userId === reviewerId);
    const approver = members.find((m) => m.userId === approverId);
    if (!reviewer || !approver) {
      showToast('검토자와 최종 승인자를 선택해 주세요.', 'error');
      return;
    }
    setSubmittingApproval(true);
    const err = await onSubmitGateApproval(
      currentGate.id,
      gateNote,
      { userId: reviewer.userId, name: reviewer.name },
      { userId: approver.userId, name: approver.name }
    );
    setSubmittingApproval(false);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast('전자결재로 게이트 심의가 상신되었습니다.', 'success');
    }
  };

  const handleCreateDeliverable = async () => {
    if (!newTitle.trim()) {
      showToast('산출물 제목을 입력해주세요.', 'warning');
      return;
    }
    let evidence: string | null = newEvidenceUrl.trim() || null;
    if (evidence) {
      const check = validateHttpUrl(evidence);
      if (!check.isValid) {
        showToast(check.errorMessage || RESEARCH_COPY.relatedLinksInvalidUrl, 'error');
        return;
      }
    }
    if (!onAddDeliverable) return;
    const formattedTitle = formatDeliverableTitle(newType, newTitle);
    const err = await onAddDeliverable(formattedTitle, newDueDate || null, evidence);
    if (err) {
      showToast(err, 'error');
      return;
    }
    showToast(`[${DELIVERABLE_TYPE_LABELS[newType]}] ${RESEARCH_COPY.deliverableAdded}`, 'success');
    setNewTitle('');
    setNewDueDate('');
    setNewEvidenceUrl('');
    setShowAddDeliverable(false);
  };

  const handleDeliverableStatus = async (
    id: string,
    status: ResearchProject['deliverables'][number]['status']
  ) => {
    const err = await onDeliverableStatus(id, status);
    if (err) showToast(err, 'error');
    else showToast(RESEARCH_COPY.deliverableStatusUpdated, 'success');
  };

  const handleSaveEvidence = async (id: string) => {
    if (!onUpdateDeliverableEvidence) return;
    const raw = (evidenceDrafts[id] ?? '').trim();
    let next: string | null = raw || null;
    if (next) {
      const check = validateHttpUrl(next);
      if (!check.isValid) {
        showToast(check.errorMessage || RESEARCH_COPY.relatedLinksInvalidUrl, 'error');
        return;
      }
    }
    const err = await onUpdateDeliverableEvidence(id, next);
    if (err) showToast(err, 'error');
    else showToast(RESEARCH_COPY.evidenceUrlUpdated, 'success');
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>
          {project.summary && <p className="mt-1 text-sm text-slate-600">{project.summary}</p>}
          <p className="mt-1 text-xs text-slate-400">{RESEARCH_STATUS_LABELS[project.status]}</p>
        </div>
        {project.status === 'draft' && onActivateDraft && !readOnly ? (
          <Button variant="primary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={handleActivate}>
            {RESEARCH_COPY.activateDraft}
          </Button>
        ) : null}
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4" /> 연구진 (PI 및 참여 연구원)
        </h3>
        <ul className="space-y-1 text-sm text-slate-600">
          {project.members.map((m) => (
            <li key={`${m.memberId}-${m.role}`}>
              <span className="font-medium text-slate-700">{MEMBER_ROLE_LABELS[m.role]}</span> —{' '}
              {m.memberName}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Wallet className="h-4 w-4" /> 연구 예산
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">계획</div>
            <div className="font-medium">{formatKrw(project.budget.planned)}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <div className="text-xs text-slate-500">집행</div>
            <div className="font-medium">{formatKrw(project.budget.spent)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <div className="text-xs text-emerald-700">잔액</div>
            <div className="font-medium text-emerald-800">
              {formatKrw(calculateBudgetRemaining(project.budget))}
            </div>
          </div>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              value={spendAmount}
              onChange={(e) => setSpendAmount(Number(e.target.value))}
              className="w-36"
            />
            <Button variant="secondary" onClick={handleSpend}>
              집행 기록
            </Button>
          </div>
        ) : null}
      </section>

      <ResearchProjectRelatedLinksSection
        links={project.links ?? []}
        onAdd={readOnly ? undefined : onAddRelatedLink}
        onDelete={readOnly ? undefined : onDeleteRelatedLink}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileCheck className="h-4 w-4" /> 학술 및 연구 산출물 (논문·특허·보고서)
          </h3>
          {onAddDeliverable && !readOnly && (
            <button
              type="button"
              onClick={() => setShowAddDeliverable((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="h-3.5 w-3.5" /> 산출물 추가
            </button>
          )}
        </div>

        {showAddDeliverable && !readOnly && (
          <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
            <div className="text-xs font-semibold text-indigo-900">신규 산출물 등록</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as DeliverableType)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium"
              >
                {Object.entries(DELIVERABLE_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="산출물 명칭 (예: 저널 투고 논문, 디펜스 논문)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs sm:col-span-2"
              />
            </div>
            <input
              type="url"
              value={newEvidenceUrl}
              onChange={(e) => setNewEvidenceUrl(e.target.value)}
              placeholder={RESEARCH_COPY.evidenceUrlPlaceholder}
              className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">목표 마감일:</span>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddDeliverable(false)}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateDeliverable()}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        )}

        <ul className="space-y-2 text-sm text-slate-600">
          {project.deliverables.map((d) => {
            const parsed = parseDeliverableType(d.title);
            const badgeClass = TYPE_BADGE_STYLES[parsed.type] || TYPE_BADGE_STYLES.other;
            return (
              <li
                key={d.id}
                className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`inline-block shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                    >
                      {DELIVERABLE_TYPE_LABELS[parsed.type] || '기타'}
                    </span>
                    <span className="truncate font-medium text-slate-800">{parsed.cleanTitle}</span>
                    {d.dueDate && (
                      <span className="shrink-0 text-[11px] text-slate-400">(~{d.dueDate})</span>
                    )}
                    {d.evidenceUrl && (
                      <a
                        href={d.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-slate-400 hover:text-indigo-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <select
                    value={d.status}
                    disabled={readOnly}
                    onChange={(e) =>
                      void handleDeliverableStatus(
                        d.id,
                        e.target.value as typeof d.status
                      )
                    }
                    className="min-h-[34px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 disabled:opacity-60"
                  >
                    {Object.entries(DELIVERABLE_STATUS_LABELS).map(([statusKey, statusLabel]) => (
                      <option key={statusKey} value={statusKey}>
                        {statusLabel}
                      </option>
                    ))}
                  </select>
                </div>
                {onUpdateDeliverableEvidence && !readOnly ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="url"
                      value={evidenceDrafts[d.id] ?? d.evidenceUrl ?? ''}
                      onChange={(e) =>
                        setEvidenceDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      placeholder={RESEARCH_COPY.evidenceUrlPlaceholder}
                      className="min-h-[36px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveEvidence(d.id)}
                      className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:border-indigo-300"
                    >
                      {RESEARCH_COPY.evidenceUrlUpdate}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
          {project.deliverables.length === 0 && (
            <li className="py-2 text-xs text-slate-400">등록된 산출물이 없습니다.</li>
          )}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GitBranch className="h-4 w-4" /> 게이트 심의 & 단계 승인
        </h3>
        <ol className="space-y-2">
          {project.gates
            .slice()
            .sort((a, b) => a.gateOrder - b.gateOrder)
            .map((g) => (
              <li
                key={g.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                {g.status === 'approved' || g.status === 'skipped' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                ) : g.status === 'rejected' ? (
                  <XCircle className="mt-0.5 h-4 w-4 text-rose-600" />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 text-amber-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">
                    {g.gateOrder}차 · {g.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    상태: {GATE_STATUS_LABELS[g.status]}
                    {g.approvalRequestId ? (
                      <>
                        {' · '}
                        <a
                          href={`/workspace/approvals?requestId=${encodeURIComponent(g.approvalRequestId)}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {RESEARCH_COPY.openApproval}
                        </a>
                      </>
                    ) : null}
                    {g.decidedByName ? ` · 승인자: ${g.decidedByName}` : ''}
                    {g.decidedAt ? ` (${g.decidedAt.slice(0, 10)})` : ''}
                  </div>
                  {g.decisionNote && (
                    <div className="mt-1 rounded bg-slate-50 p-1.5 text-xs text-slate-600">
                      심의 의견: {g.decisionNote}
                    </div>
                  )}
                </div>
              </li>
            ))}
        </ol>

        {currentGate && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-700">
              현재 심의 차수: {currentGate.gateOrder}차 ({currentGate.title}) ·{' '}
              {GATE_STATUS_LABELS[currentGate.status]}
            </div>
            {currentGate.status === 'in_approval' && currentGate.approvalRequestId ? (
              <a
                href={`/workspace/approvals?requestId=${encodeURIComponent(currentGate.approvalRequestId)}`}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-indigo-600 hover:underline"
              >
                {RESEARCH_COPY.openApproval}
              </a>
            ) : null}
            {canDecideGate ? (
              <>
                <textarea
                  value={gateNote}
                  onChange={(e) => setGateNote(e.target.value)}
                  placeholder="심의/결재 의견 (선택)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                />
                {hasApprovalWorkflow && currentGate.status === 'pending' ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      aria-label="검토자"
                      value={reviewerId}
                      onChange={(e) => setReviewerId(e.target.value)}
                      className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                    >
                      <option value="">검토자 선택</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="최종 승인자"
                      value={approverId}
                      onChange={(e) => setApproverId(e.target.value)}
                      className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                    >
                      <option value="">최종 승인자 선택</option>
                      {members.map((member) => (
                        <option key={`approver-${member.userId}`} value={member.userId}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {canDirectDecideGate(currentGate) && (
                    <>
                      <Button variant="success" size="sm" onClick={() => handleDirect('approved')}>
                        직접 승인
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDirect('rejected')}
                      >
                        직접 반려
                      </Button>
                    </>
                  )}
                  {canReopenRejectedGate(currentGate) && onReopenRejectedGate ? (
                    <Button variant="secondary" size="sm" onClick={handleReopen}>
                      {RESEARCH_COPY.reopenRejectedGate}
                    </Button>
                  ) : null}
                  {hasApprovalWorkflow && currentGate.status === 'pending' && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={submittingApproval}
                      onClick={() => void handleSubmitApproval()}
                    >
                      전자결재 상신
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
};
