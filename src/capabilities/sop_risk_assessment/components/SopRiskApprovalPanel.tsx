import React, { useCallback, useEffect, useState } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { DocumentApprovalStepper } from './DocumentApprovalStepper';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import {
  listApprovalLines,
  listOrgMembers,
  listRevisions,
  listRiskAssessments,
  reviseAssessment,
  saveDraftRiskAssessment,
  submitForReview,
  type ApprovalLineRow,
  type RevisionRow,
  type RiskAssessmentRow,
} from '../services/riskAssessmentApprovalService';
import { shouldShowOccasionalReviewBadge, type ApprovalStepState } from '../domain/approvalEngine';
import { readDocumentBody, validateDraftForSubmit, type OrgMemberOption } from '../domain/sopStepDocument';

type Identity = { id?: string };

function toStep(row: ApprovalLineRow): ApprovalStepState {
  return {
    stepOrder: row.step_order as 1 | 2 | 3,
    stepType: row.step_type as ApprovalStepState['stepType'],
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name ?? undefined,
    actionStatus: row.action_status as ApprovalStepState['actionStatus'],
    comment: row.comment,
  };
}

export const SopRiskApprovalPanel: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: identity } = useGetIdentity<Identity>();
  const orgId = currentOrganization?.id ?? '';
  const userId = identity?.id ?? '';

  const [docs, setDocs] = useState<RiskAssessmentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ApprovalStepState[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [members, setMembers] = useState<OrgMemberOption[]>([]);
  const [revisionReason, setRevisionReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    if (!orgId) return;
    const list = await listRiskAssessments(orgId);
    setDocs(list);
    if (!selectedId && list[0]) setSelectedId(list[0].id);
  }, [orgId, selectedId]);

  useEffect(() => {
    void reload().catch((cause) => {
      setError(cause instanceof Error ? cause.message : '문서 조회 실패');
    });
  }, [reload]);

  useEffect(() => {
    if (!orgId) return;
    void listOrgMembers(orgId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [orgId]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      const [lineRows, revRows] = await Promise.all([
        listApprovalLines(selectedId),
        listRevisions(selectedId),
      ]);
      setSteps(lineRows.map(toStep));
      setRevisions(revRows);
    })().catch((cause) => {
      setError(cause instanceof Error ? cause.message : '결재선 조회 실패');
    });
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    const body = readDocumentBody(selected.snapshot_payload);
    setReviewerId(body.intendedReviewerId ?? '');
    setApproverId(body.intendedApproverId ?? '');
  }, [selected]);

  const occasional = selected
    ? shouldShowOccasionalReviewBadge({
        status: selected.status as 'APPROVED' | 'LOCKED' | 'DRAFT',
        occasionalReviewRequired: selected.occasional_review_required,
        hasLinkedIncident: selected.occasional_review_required,
      })
    : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">문서 결재선 · 개정 이력</h3>
        {selected && selected.current_version > 1 ? (
          <button
            type="button"
            className="h-12 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900"
            onClick={() => setHistoryOpen(true)}
          >
            v1.{selected.current_version - 1} ⚠️ {selected.current_version - 1}회 개정됨
          </button>
        ) : null}
      </div>

      {occasional ? (
        <div className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
          ⚠️ 수시 평가 검토 필요 — 아차사고·현장 위험 요소 접수와 연계됨
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={[
                  'h-12 w-full rounded-lg border px-3 text-left text-sm font-semibold',
                  selectedId === doc.id ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white',
                ].join(' ')}
                onClick={() => setSelectedId(doc.id)}
              >
                {doc.title}
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {doc.status} · v{doc.current_version}
                </span>
              </button>
            </li>
          ))}
          {docs.length === 0 ? (
            <li className="text-sm text-slate-500">등록된 결재 문서가 없습니다.</li>
          ) : null}
        </ul>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {selected ? (
            <>
              <div className="mb-3">
                <div className="text-xs font-bold text-rose-700">{selected.document_no}</div>
                <h4 className="text-lg font-bold text-slate-900">{selected.title}</h4>
                <p className="text-sm text-slate-500">
                  공정: {selected.process_name} · 상태: {selected.status}
                </p>
              </div>
              <DocumentApprovalStepper steps={steps} />
              {selected ? (
                <ol className="mt-3 space-y-2">
                  {readDocumentBody(selected.snapshot_payload).rejectionHistory.map((note) => (
                    <li key={note.id} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
                      <p className="font-bold">{note.stepLabel} 반려</p>
                      <p className="mt-1 whitespace-pre-wrap">{note.reason}</p>
                    </li>
                  ))}
                </ol>
              ) : null}

              {selected.status === 'DRAFT' && selected.created_by === userId ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <select
                    className="h-12 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                    aria-label="검토자"
                    value={reviewerId}
                    onChange={(event) => setReviewerId(event.target.value)}
                  >
                    <option value="">검토자 선택</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-12 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                    aria-label="최종 승인자"
                    value={approverId}
                    onChange={(event) => setApproverId(event.target.value)}
                  >
                    <option value="">최종 승인자 선택</option>
                    {members.map((member) => (
                      <option key={`approver-${member.userId}`} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="h-12 rounded-xl bg-rose-700 px-4 font-bold text-white"
                    onClick={() => {
                      const current = selected;
                      const body = {
                        ...readDocumentBody(current.snapshot_payload),
                        intendedReviewerId: reviewerId.trim() || null,
                        intendedApproverId: approverId.trim() || null,
                      };
                      const check = validateDraftForSubmit(body);
                      if (!check.isValid) {
                        setError(check.error ?? '검토 요청 전에 내용을 확인해 주세요.');
                        return;
                      }
                      void saveDraftRiskAssessment({
                        assessmentId: current.id,
                        processName: current.process_name,
                        body,
                      })
                        .then(() => submitForReview(current.id, reviewerId.trim()))
                        .then(() => {
                          setMessage('검토 요청이 접수되었습니다.');
                          return reload();
                        })
                        .catch((cause) => {
                          setError(cause instanceof Error ? cause.message : '검토 요청 실패');
                        });
                    }}
                  >
                    {readDocumentBody(selected.snapshot_payload).rejectionHistory.length > 0 ? '다시 검토 요청' : '검토 요청'}
                  </button>
                </div>
              ) : null}

              {(selected.status === 'APPROVED' || selected.status === 'LOCKED') ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="h-12 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                    placeholder="개정 사유 (필수)"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-12 rounded-xl bg-slate-900 px-4 font-bold text-white"
                    onClick={() => {
                      void reviseAssessment({
                        assessmentId: selected.id,
                        revisionType: occasional ? 'OCCASIONAL' : 'PERIODIC',
                        revisionReason,
                      })
                        .then(() => {
                          setMessage('개정이 발의되어 새 DRAFT 버전이 생성되었습니다.');
                          setRevisionReason('');
                          return reload();
                        })
                        .catch((cause) => {
                          setError(cause instanceof Error ? cause.message : '개정 발의 실패');
                        });
                    }}
                  >
                    개정 발의
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">문서를 선택하세요.</p>
          )}
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <RevisionHistoryModal
        open={historyOpen}
        currentVersion={selected?.current_version ?? 1}
        revisions={revisions}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};
