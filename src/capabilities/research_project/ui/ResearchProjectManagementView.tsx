import React, { useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import {
  RESEARCH_STATUS_LABELS,
  getCoLeadNames,
  getCurrentGate,
  getLeadName,
  type ResearchMember,
  type ResearchProjectStatus,
} from '../domain/researchProjectEngine';
import { useResearchProjectWorkspace } from '../hooks/useResearchProjectWorkspace';
import { ResearchProjectDetailPanel } from './ResearchProjectDetailPanel';
import { showToast } from '@/shared/feedback/uiFeedback';

const STATUS_FILTERS: Array<ResearchProjectStatus | 'all'> = [
  'all',
  'active',
  'gate_review',
  'completed',
  'draft',
];

function formatKrw(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export const ResearchProjectManagementView: React.FC = () => {
  const ws = useResearchProjectWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [budgetPlanned, setBudgetPlanned] = useState(30_000_000);
  const [leadName, setLeadName] = useState('');
  const [coLeadName, setCoLeadName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const members: ResearchMember[] = [
      { memberId: `lead-${Date.now()}`, memberName: leadName, role: 'lead' },
    ];
    if (coLeadName.trim()) {
      members.push({
        memberId: `co-${Date.now()}`,
        memberName: coLeadName.trim(),
        role: 'co_lead',
      });
    }
    setSaving(true);
    const result = await ws.createResearchProjectPersisted({
      title,
      summary,
      startDate,
      endDate,
      budgetPlanned: Number(budgetPlanned) || 0,
      members,
    });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.ok === false ? result.error : '생성 실패');
      return;
    }
    setCreateOpen(false);
    setTitle('');
    setSummary('');
    setLeadName('');
    setCoLeadName('');
    setFormError('');
    showToast('연구과제가 등록되었습니다.', 'success');
  };

  if (ws.isLoading) {
    return <div className="p-8 text-center text-slate-400">연구과제를 불러오는 중...</div>;
  }

  if (!ws.orgId) {
    return (
      <div className="p-8 text-center text-slate-500">
        사업장을 선택한 후 연구과제를 관리할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <FolderKanban className="h-5 w-5 text-indigo-600" />
            연구과제 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Refine·Supabase 영속화 · 게이트는 전자결재(approval_workflow)와 연동 가능
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          과제 등록
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ws.setFilter(s)}
            className={`min-h-[40px] rounded-full px-3 text-sm ${
              ws.filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {s === 'all' ? '전체' : RESEARCH_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">
          {ws.filteredProjects.map((p) => {
            const gate = getCurrentGate(p.gates);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => ws.setSelectedId(p.id)}
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
                      {getCoLeadNames(p).length > 0 ? ` · 부담당 ${getCoLeadNames(p).join(', ')}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {RESEARCH_STATUS_LABELS[p.status]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{p.startDate} ~ {p.endDate}</span>
                  <span>{formatKrw(p.budget.planned)}</span>
                  <span>
                    {gate ? `${gate.gateOrder}차 (${gate.status})` : '게이트 완료'} · {p.progressRate}%
                  </span>
                </div>
              </button>
            );
          })}
          {ws.filteredProjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              등록된 연구과제가 없습니다. 과제 등록으로 추가하세요.
            </div>
          )}
        </div>

        {ws.selected ? (
          <ResearchProjectDetailPanel
            project={ws.selected}
            hasApprovalWorkflow={ws.hasApprovalWorkflow}
            onSpend={(amount) => ws.recordSpendPersisted(ws.selected!, amount)}
            onDirectGateDecision={(gateOrder, status, note) =>
              ws.directGateDecision(ws.selected!, gateOrder, status, note, '연구소장')
            }
            onSubmitGateApproval={(gateId, note) =>
              ws.submitGateToApproval(ws.selected!, gateId, note, getLeadName(ws.selected!))
            }
            onDeliverableStatus={ws.updateDeliverableStatusPersisted}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            과제를 선택하세요.
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">연구과제 등록</h2>
            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="과제명"
                className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="과제 요약"
                className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm"
                />
              </div>
              <input
                type="number"
                min={0}
                value={budgetPlanned}
                onChange={(e) => setBudgetPlanned(Number(e.target.value))}
                placeholder="계획 예산(원)"
                className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="연구 담당자 (필수)"
                className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                value={coLeadName}
                onChange={(e) => setCoLeadName(e.target.value)}
                placeholder="부담당자 (선택)"
                className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-sm"
              />
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="min-h-[44px] rounded-lg px-4 text-sm text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCreate()}
                className="min-h-[44px] rounded-lg bg-indigo-600 px-4 text-sm text-white disabled:opacity-60"
              >
                {saving ? '저장 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
