import React, { useState } from 'react';
import {
  Users,
  Wallet,
  FileCheck,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  RESEARCH_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  calculateBudgetRemaining,
  canDirectDecideGate,
  getCoLeadNames,
  getCurrentGate,
  getLeadName,
  type ResearchProject,
} from '../domain/researchProjectEngine';
import { showToast } from '@/shared/feedback/uiFeedback';

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export interface ResearchProjectDetailPanelProps {
  project: ResearchProject;
  hasApprovalWorkflow: boolean;
  onSpend: (amount: number) => string | null;
  onDirectGateDecision: (
    gateOrder: number,
    status: 'approved' | 'rejected',
    note: string
  ) => string | null;
  onSubmitGateApproval: (gateId: string, note: string) => Promise<string | null>;
  onDeliverableStatus: (id: string, status: ResearchProject['deliverables'][number]['status']) => void;
}

export const ResearchProjectDetailPanel: React.FC<ResearchProjectDetailPanelProps> = ({
  project,
  hasApprovalWorkflow,
  onSpend,
  onDirectGateDecision,
  onSubmitGateApproval,
  onDeliverableStatus,
}) => {
  const [gateNote, setGateNote] = useState('');
  const [spendAmount, setSpendAmount] = useState(1_000_000);
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const currentGate = getCurrentGate(project.gates);

  const handleSpend = () => {
    const err = onSpend(Number(spendAmount) || 0);
    if (err) showToast(err, 'error');
    else showToast('연구비 집행이 기록되었습니다.', 'success');
  };

  const handleDirect = (status: 'approved' | 'rejected') => {
    if (!currentGate) return;
    const err = onDirectGateDecision(currentGate.gateOrder, status, gateNote);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast(`${currentGate.gateOrder}차 게이트 ${status === 'approved' ? '승인' : '반려'}`, 'success');
    }
  };

  const handleSubmitApproval = async () => {
    if (!currentGate) return;
    setSubmittingApproval(true);
    const err = await onSubmitGateApproval(currentGate.id, gateNote);
    setSubmittingApproval(false);
    if (err) showToast(err, 'error');
    else {
      setGateNote('');
      showToast('전자결재로 게이트 심의가 상신되었습니다.', 'success');
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{project.title}</h2>
        {project.summary && <p className="mt-1 text-sm text-slate-600">{project.summary}</p>}
        <p className="mt-1 text-xs text-slate-400">{RESEARCH_STATUS_LABELS[project.status]}</p>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4" /> 연구진
        </h3>
        <ul className="space-y-1 text-sm text-slate-600">
          {project.members.map((m) => (
            <li key={`${m.memberId}-${m.role}`}>
              {MEMBER_ROLE_LABELS[m.role]} — {m.memberName}
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
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            value={spendAmount}
            onChange={(e) => setSpendAmount(Number(e.target.value))}
            className="min-h-[44px] w-36 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleSpend}
            className="min-h-[44px] rounded-lg bg-slate-800 px-3 text-sm text-white"
          >
            집행 기록
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileCheck className="h-4 w-4" /> 산출물
        </h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {project.deliverables.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>{d.title}</span>
              <select
                value={d.status}
                onChange={(e) =>
                  onDeliverableStatus(d.id, e.target.value as typeof d.status)
                }
                className="min-h-[40px] rounded-lg border border-slate-200 px-2 text-xs"
              >
                <option value="planned">planned</option>
                <option value="submitted">submitted</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
              </select>
            </li>
          ))}
          {project.deliverables.length === 0 && <li className="text-slate-400">등록된 산출물 없음</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GitBranch className="h-4 w-4" /> 게이트 승인
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
                    {g.status}
                    {g.approvalRequestId ? ` · 결재 ${g.approvalRequestId.slice(0, 8)}…` : ''}
                    {g.decidedByName ? ` · ${g.decidedByName}` : ''}
                  </div>
                </div>
              </li>
            ))}
        </ol>

        {currentGate && project.status !== 'completed' && project.status !== 'canceled' && (
          <div className="space-y-2 rounded-lg bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <AlertCircle className="h-4 w-4" />
              현재 {currentGate.gateOrder}차 게이트
              {currentGate.status === 'in_approval' ? ' (전자결재 진행 중)' : ''}
            </div>
            <textarea
              value={gateNote}
              onChange={(e) => setGateNote(e.target.value)}
              placeholder="심의·상신 메모"
              className="min-h-[72px] w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {hasApprovalWorkflow && canDirectDecideGate(currentGate) && (
                <button
                  type="button"
                  disabled={submittingApproval}
                  onClick={() => void handleSubmitApproval()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm text-white disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  전자결재 상신
                </button>
              )}
              {canDirectDecideGate(currentGate) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleDirect('approved')}
                    className="min-h-[44px] rounded-lg bg-emerald-600 px-4 text-sm text-white"
                  >
                    직접 승인
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirect('rejected')}
                    className="min-h-[44px] rounded-lg bg-rose-600 px-4 text-sm text-white"
                  >
                    직접 반려
                  </button>
                </>
              )}
            </div>
            {currentGate.status === 'in_approval' && (
              <p className="text-xs text-amber-800">
                결재함(approval_workflow)에서 승인·반려되면 이 화면에 자동 반영됩니다.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
