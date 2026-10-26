import React, { useCallback } from 'react';
import { ApprovalWorkflowManagementView } from '@/capabilities/approval_workflow';
import type { ApprovalRequestRow } from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { useAuth } from '@/core/auth/AuthProvider';
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
      } catch {
        /* 결재 본문은 반영됨 */
      }
    },
    [orgId, userId]
  );

  return <ApprovalWorkflowManagementView onLinkedEntityOutcome={onLinkedEntityOutcome} />;
};
