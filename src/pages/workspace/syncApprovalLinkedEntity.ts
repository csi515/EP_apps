/**
 * 전자결재 최종 승인·반려 후 연계 도메인 동기화.
 * approval_workflow → 타 Cap 역의존을 피하기 위해 페이지 계층에 둔다.
 */
import {
  isMboPlanApprovalEntity,
  isResourceReservationApprovalEntity,
  type ApprovalRequestRow,
} from '@/capabilities/approval_workflow/services/approvalWorkflowService';
import { reviewResourceReservation } from '@/capabilities/resources/reservationService';
import { MboService } from '@/capabilities/mbo/services/mboService';

export async function syncApprovalLinkedEntity(input: {
  req: ApprovalRequestRow;
  outcome: 'approved' | 'rejected';
  organizationId: string;
  actorUserId: string;
}): Promise<void> {
  const { req, outcome, organizationId, actorUserId } = input;
  if (!req.entity_id) return;

  if (isResourceReservationApprovalEntity(req.entity_type)) {
    await reviewResourceReservation(req.entity_id, outcome === 'approved');
    return;
  }

  if (isMboPlanApprovalEntity(req.entity_type)) {
    await MboService.reviewObjective(
      req.entity_id,
      organizationId,
      actorUserId,
      outcome === 'approved' ? 'approve' : 'reject',
      outcome === 'rejected' ? '전자결재 반려' : undefined
    );
  }
}
