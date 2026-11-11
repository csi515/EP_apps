import React, { useCallback } from 'react';
import { ApprovalWorkflowManagementView } from '@/capabilities/approval_workflow';
import type { ApprovalRequestRow } from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuth } from '@/core/auth/AuthProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { syncApprovalLinkedEntity } from './syncApprovalLinkedEntity';

/** 페이지 계층에서 Cap 연계 동기화를 주입해 approval_workflow 역의존을 피한다. */
export const ApprovalWorkflowWithLinkedSync: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.id ?? '';
  const userId = user?.id ?? '';

  const onLinkedEntityOutcome = useCallback(
    async (req: ApprovalRequestRow, outcome: 'approved' | 'rejected') => {
      if (!orgId || !userId) return;
      try {
        await syncApprovalLinkedEntity({
          req,
          outcome,
          organizationId: orgId,
          actorUserId: userId,
        });
      } catch (cause) {
        showToast(
          cause instanceof Error
            ? `결재는 반영됐으나 연계 동기화에 실패했습니다: ${cause.message}`
            : '결재는 반영됐으나 연계 동기화에 실패했습니다.',
          'warning'
        );
      }
    },
    [orgId, userId]
  );

  return <ApprovalWorkflowManagementView onLinkedEntityOutcome={onLinkedEntityOutcome} />;
};
