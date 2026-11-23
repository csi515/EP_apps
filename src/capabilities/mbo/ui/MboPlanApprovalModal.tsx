import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { FORM_CONTROL_CLASS, FormField } from '@/shared/components/ui/FormField';
import {
  createApprovalWithChosenLine,
  listApprovalOrgMembers,
  type ApprovalMemberOption,
} from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import {
  buildMboPlanApprovalContent,
  canSubmitMboPlanToApprovalWorkflow,
} from '../domain/mboPlanApproval';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';

type Props = {
  open: boolean;
  organizationId: string;
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string | null;
  successCriteria?: string | null;
  ownerName?: string | null;
  objectiveStatus: string;
  requirePlanApproval: boolean;
  hasApprovalWorkflow: boolean;
  requesterId: string;
  requesterName: string;
  onClose: () => void;
  onSubmitted: () => void;
  onSkipToLocalSubmit: () => void;
};

export const MboPlanApprovalModal: React.FC<Props> = ({
  open,
  organizationId,
  objectiveId,
  objectiveTitle,
  objectiveDescription,
  successCriteria,
  ownerName,
  objectiveStatus,
  requirePlanApproval,
  hasApprovalWorkflow,
  requesterId,
  requesterName,
  onClose,
  onSubmitted,
  onSkipToLocalSubmit,
}) => {
  const [members, setMembers] = useState<ApprovalMemberOption[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organizationId || !hasApprovalWorkflow) return;
    void listApprovalOrgMembers(organizationId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [open, organizationId, hasApprovalWorkflow]);

  const guard = canSubmitMboPlanToApprovalWorkflow({
    requirePlanApproval,
    hasApprovalWorkflow,
    objectiveStatus,
  });

  const handleConfirm = async () => {
    setError(null);
    if (!guard.allowed) {
      setError(guard.reason ?? '상신할 수 없습니다.');
      return;
    }
    if (!requirePlanApproval || !hasApprovalWorkflow) {
      onSkipToLocalSubmit();
      onClose();
      return;
    }
    const reviewer = members.find((m) => m.userId === reviewerId);
    const approver = members.find((m) => m.userId === approverId);
    if (!reviewer || !approver) {
      setError('검토자와 최종 승인자를 선택해 주세요.');
      return;
    }
    if (reviewer.userId === approver.userId) {
      setError('검토자와 최종 승인자는 서로 다른 사람이어야 합니다.');
      return;
    }
    setBusy(true);
    try {
      await createApprovalWithChosenLine({
        organizationId,
        title: `[MBO 계획] ${objectiveTitle}`,
        content: buildMboPlanApprovalContent({
          title: objectiveTitle,
          description: objectiveDescription,
          successCriteria,
          ownerName,
        }),
        requesterId,
        requesterName,
        reviewer: { userId: reviewer.userId, name: reviewer.name },
        approver: { userId: approver.userId, name: approver.name },
        entityType: 'mbo_plan',
        entityId: objectiveId,
      });
      onSubmitted();
      onClose();
    } catch (cause) {
      setError(userFacingErrorMessage(cause) || '결재 상신 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="계획 결재 상신"
      maxWidth="md"
      description={objectiveTitle}
      intent="form"
      dirty={Boolean(reviewerId || approverId)}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" isLoading={busy} onClick={() => void handleConfirm()}>
            상신
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        ) : null}
        {requirePlanApproval && hasApprovalWorkflow ? (
          <div className="grid gap-3">
            <FormField label="검토자" htmlFor="mbo-plan-reviewer">
              <select
                id="mbo-plan-reviewer"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className={FORM_CONTROL_CLASS}
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="최종 승인자" htmlFor="mbo-plan-approver">
              <select
                id="mbo-plan-approver"
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
                className={FORM_CONTROL_CLASS}
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={`a-${m.userId}`} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            계획 승인 필수가 아니거나 전자결재가 비활성이라 로컬 제출로 진행합니다.
          </p>
        )}
      </div>
    </Modal>
  );
};
