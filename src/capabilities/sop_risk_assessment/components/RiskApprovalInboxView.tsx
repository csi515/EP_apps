import React, { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { DocumentApprovalStepper } from './DocumentApprovalStepper';
import { ApprovalActionModal } from './ApprovalActionModal';
import {
  approveStep,
  listApprovalLines,
  listMyPendingApprovalLines,
  listRiskAssessments,
  rejectStep,
  type ApprovalLineRow,
  type RiskAssessmentRow,
} from '../services/riskAssessmentApprovalService';
import type { ApprovalStepState } from '../domain/approvalEngine';

type Identity = { id?: string };

function toStepState(row: ApprovalLineRow): ApprovalStepState {
  return {
    stepOrder: row.step_order as 1 | 2 | 3,
    stepType: row.step_type as ApprovalStepState['stepType'],
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name ?? undefined,
    actionStatus: row.action_status as ApprovalStepState['actionStatus'],
  };
}

/**
 * 내 결재 대기함 — 관리감독자/사업주가 검토·승인할 위험성평가 문서
 * 경로 개념: /workspace/approvals (산업 셸 탭 risk-approvals)
 */
export const RiskApprovalInboxView: React.FC = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id ?? '';
  const [pending, setPending] = useState<ApprovalLineRow[]>([]);
  const [docs, setDocs] = useState<Record<string, RiskAssessmentRow>>({});
  const [stepsByDoc, setStepsByDoc] = useState<Record<string, ApprovalStepState[]>>({});
  const [selected, setSelected] = useState<ApprovalLineRow | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const lines = await listMyPendingApprovalLines(userId);
      setPending(lines);
      const orgIds = [...new Set(lines.map((l) => l.organization_id))];
      const map: Record<string, RiskAssessmentRow> = {};
      for (const orgId of orgIds) {
        const list = await listRiskAssessments(orgId);
        for (const row of list) map[row.id] = row;
      }
      setDocs(map);

      const stepMap: Record<string, ApprovalStepState[]> = {};
      for (const line of lines) {
        const all = await listApprovalLines(line.assessment_id);
        stepMap[line.assessment_id] = all.map(toStepState);
      }
      setStepsByDoc(stepMap);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '대기함 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">내 결재 대기함</h2>
        <p className="mt-1 text-sm text-slate-500">
          사업주·관리감독자가 검토/승인해야 할 작업표준·위험성평가 문서를 모았습니다.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-500">불러오는 중…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {pending.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          대기 중인 결재 문서가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((line) => {
            const doc = docs[line.assessment_id];
            return (
              <li key={line.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-rose-700">
                      {line.step_order === 2 ? '검토 대기' : '최종 승인 대기'}
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {doc?.title ?? line.assessment_id}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {doc?.process_name ?? '-'} · v{doc?.current_version ?? '?'}.0 · {doc?.document_no}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="h-12 rounded-xl bg-emerald-700 px-4 font-bold text-white"
                      onClick={() => {
                        setSelected(line);
                        setModalMode('approve');
                      }}
                    >
                      {line.step_order === 2 ? '검토 승인 / 상신' : '최종 승인'}
                    </button>
                    <button
                      type="button"
                      className="h-12 rounded-xl bg-rose-700 px-4 font-bold text-white"
                      onClick={() => {
                        setSelected(line);
                        setModalMode('reject');
                      }}
                    >
                      반려
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <DocumentApprovalStepper steps={stepsByDoc[line.assessment_id] ?? [toStepState(line)]} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ApprovalActionModal
        open={Boolean(selected && modalMode)}
        mode={modalMode}
        title={docs[selected?.assessment_id ?? '']?.title ?? '결재 처리'}
        stepOrder={(selected?.step_order === 3 ? 3 : 2) as 2 | 3}
        requireNextAssignee={selected?.step_order === 2}
        onClose={() => {
          setSelected(null);
          setModalMode(null);
        }}
        onApprove={async ({ signature, comment, nextAssigneeId }) => {
          if (!selected) return;
          await approveStep({
            assessmentId: selected.assessment_id,
            stepOrder: selected.step_order,
            signature,
            comment,
            nextAssigneeId,
          });
          await reload();
        }}
        onReject={async (reason) => {
          if (!selected) return;
          await rejectStep({
            assessmentId: selected.assessment_id,
            stepOrder: selected.step_order,
            rejectReason: reason,
          });
          await reload();
        }}
      />
    </div>
  );
};
