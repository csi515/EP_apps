/**
 * 자원 예약 검토·취소 순수 판정 (reserve → approve/reject → cancel).
 * UI·클라이언트 가드용 fail-closed. RPC는 별도 권한·상태 검사.
 */
import type { ResourceReservationStatus } from '../types';

export type ResourceReviewDecision =
  | { ok: true; action: 'approved' | 'rejected' }
  | { ok: true; action: 'idempotent' }
  | { ok: false; reason: 'not_reviewable' };

export type ResourceCancelDecision =
  | { ok: true; action: 'cancelled' | 'idempotent' }
  | { ok: false; reason: 'not_cancellable' };

const CANCELLABLE_STATUSES: readonly ResourceReservationStatus[] = ['pending', 'approved'];

export function evaluateResourceReservationReview(
  status: ResourceReservationStatus,
  approve: boolean,
): ResourceReviewDecision {
  if (status === 'approved' && approve) return { ok: true, action: 'idempotent' };
  if (status === 'rejected' && !approve) return { ok: true, action: 'idempotent' };
  if (status !== 'pending') return { ok: false, reason: 'not_reviewable' };
  return { ok: true, action: approve ? 'approved' : 'rejected' };
}

export function evaluateResourceReservationCancel(
  status: ResourceReservationStatus,
): ResourceCancelDecision {
  if (status === 'cancelled') return { ok: true, action: 'idempotent' };
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, reason: 'not_cancellable' };
  }
  return { ok: true, action: 'cancelled' };
}