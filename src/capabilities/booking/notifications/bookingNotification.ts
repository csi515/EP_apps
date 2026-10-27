import type { PracticeRoomBooking } from '@/capabilities/resources/types';

export interface NotifyBookingChangeParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  title: string;
  message: string;
  date?: string;
  portalTab?: string;
}

/** EP_apps: 학부모 알림 인프라 제거 — no-op */
export function notifyBookingChange(_params: NotifyBookingChangeParams): void {
  /* parent alert removed */
}

/** @deprecated notifyBookingChange 를 사용한다 */
export const notifySkinBookingChange = notifyBookingChange;

/** 연습실 예약 시 알림 (EP_apps: no-op) */
export function notifyParentPracticeRoomBooked(
  _booking: Pick<
    PracticeRoomBooking,
    'studentId' | 'studentName' | 'room' | 'date' | 'startTime' | 'endTime'
  >,
  _parentPhone?: string
): void {
  /* parent alert removed */
}

export interface NotifyParentPracticeReviewedParams {
  studentId: string;
  studentName: string;
  parentPhone?: string;
  date: string;
  songTitle: string;
}

/** 가정 연습 일지 스태프 확인 시 알림 (EP_apps: no-op) */
export function notifyParentPracticeReviewed(_params: NotifyParentPracticeReviewedParams): void {
  /* parent alert removed */
}
