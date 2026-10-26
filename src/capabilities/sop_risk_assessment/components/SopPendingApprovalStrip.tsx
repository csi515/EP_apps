import React, { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { ApprovalActionModal } from './ApprovalActionModal';
import { DocumentApprovalStepper } from './DocumentApprovalStepper';
import {
  approveStep,
  listApprovalLines,
  listMyPendingApprovalLines,
  listOrgMembers,
  listRiskAssessments,
  rejectStep,
  type ApprovalLineRow,
  type RiskAssessmentRow,
} from '../services/riskAssessmentApprovalService';
import { readDocumentBody, type OrgMemberOption } from '../domain/sopStepDocument';
import type { ApprovalStepState } from '../domain/approvalEngine';

type Identity = { id?: string };

function toStep(row: ApprovalLineRow): ApprovalStepState {
  return {
    stepOrder: row.step_order as 1 | 2 | 3,
    stepType: row.step_type as ApprovalStepState['stepType'],
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name ?? undefined,
    actionStatus: row.action_status as ApprovalStepState['actionStatus'],
  };
}

export const SopPendingApprovalStrip: React.FC = () => {
  const { data: identity } = useGetIdentity<Identity>();
  const userId = identity?.id ?? '';
  const [pending, setPending] = useState<ApprovalLineRow[]>([]);
  const [docs, setDocs] = useState<Record<string, RiskAssessmentRow>>({});
  const [membersByOrg, setMembersByOrg] = useState<Record<string, OrgMemberOption[]>>({});
  const [stepsByDoc, setStepsByDoc] = useState<Record<string, ApprovalStepState[]>>({});
  const [selected, setSelected] = useState<ApprovalLineRow | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    const lines = await listMyPendingApprovalLines(userId);
    setPending(lines);
    const orgIds = [...new Set(lines.map((line) => line.organization_id))];
    const docMap: Record<string, RiskAssessmentRow> = {};
    const memberMap: Record<string, OrgMemberOption[]> = {};
    await Promise.all(
      orgIds.map(async (orgId) => {
        const [list, members] = await Promise.all([listRiskAssessments(orgId), listOrgMembers(orgId)]);
        for (const row of list) docMap[row.id] = row;
        memberMap[orgId] = members;
      })
    );
    setDocs(docMap);
    setMembersByOrg(memberMap);
    const stepEntries = await Promise.all(
      lines.map(async (line) => [line.assessment_id, (await listApprovalLines(line.assessment_id)).map(toStep)] as const)
    );
    setStepsByDoc(Object.fromEntries(stepEntries));
  }, [userId]);

  useEffect(() => {
    void reload().catch((cause) => {
      setError(cause instanceof Error ? cause.message : '결재 대기함 조회 실패');
    });
  }, [reload]);

  if (!userId || (pending.length === 0 && !error)) return null;

  const selectedDoc = selected ? docs[selected.assessment_id] : undefined;
  const approverId = selectedDoc
    ? readDocumentBody(selectedDoc.snapshot_payload).intendedApproverId ?? ''
    : '';
  const options = (selected ? membersByOrg[selected.organization_id] ?? [] : []).map((member) => ({
    value: member.userId,
    label: `${member.name} · ${member.role}`,
  }));

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 print:hidden">
      <h2 className="text-sm font-black text-amber-950">내 결재 대기</h2>
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <ul className="mt-3 space-y-3">
        {pending.map((line) => {
          const doc = docs[line.assessment_id];
          return (
            <li key={line.id} className="rounded-xl bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{doc?.title ?? '작업표준'}</p>
                  <p className="text-xs text-slate-500">
                    {line.step_order === 2 ? '검토 대기' : '최종 승인 대기'} · {doc?.document_no}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white"
                    onClick={() => {
                      setSelected(line);
                      setMode('approve');
                    }}
                  >
                    {line.step_order === 2 ? '검토' : '승인'}
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-xl bg-rose-700 px-3 text-sm font-bold text-white"
                    onClick={() => {
                      setSelected(line);
                      setMode('reject');
                    }}
                  >
                    반려
                  </button>
                </div>
              </div>
              <DocumentApprovalStepper steps={stepsByDoc[line.assessment_id] ?? [toStep(line)]} />
            </li>
          );
        })}
      </ul>
      <ApprovalActionModal
        open={Boolean(selected && mode)}
        mode={mode}
        title={selectedDoc?.title ?? '결재 처리'}
        stepOrder={(selected?.step_order === 3 ? 3 : 2) as 2 | 3}
        requireNextAssignee={selected?.step_order === 2}
        defaultNextAssigneeId={approverId}
        nextAssigneeOptions={options}
        onClose={() => {
          setSelected(null);
          setMode(null);
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
    </section>
  );
};
