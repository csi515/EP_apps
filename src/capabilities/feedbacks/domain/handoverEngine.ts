/**
 * 현장 소통 및 교대 인수인계 순수 도메인 엔진 (Pure Domain Engine)
 *
 * 책임:
 *  - 교대 근무 인수인계장 체크리스트 완료율 계산
 *  - 다음 근무자 인수인계 확인/서약 가드
 *  - 고객 VOC 및 직원 개선 건의 상태 집계
 *  - 안전사고 미해결 건수 및 중증도 판정
 */

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly note?: string;
}

export interface HandoverNote {
  readonly id: string;
  readonly organization_id: string;
  readonly shift_date: string;
  readonly shift_type: 'morning' | 'middle' | 'evening' | 'night';
  readonly writer_staff_id: string;
  readonly content: string;
  readonly checklist_items: readonly ChecklistItem[];
  readonly confirmed_by_next_shift_staff_id?: string | null;
  readonly confirmed_at?: string | null;
}

export interface FeedbackItem {
  readonly id: string;
  readonly organization_id: string;
  readonly author_type: 'customer' | 'staff';
  readonly author_id?: string | null;
  readonly title: string;
  readonly content: string;
  readonly status: 'open' | 'in_progress' | 'resolved';
  readonly is_internal_only: boolean;
  readonly created_at: string;
}

export interface IncidentLog {
  readonly id: string;
  readonly organization_id: string;
  readonly occurred_at: string;
  readonly severity: 'minor' | 'moderate' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly actions_taken?: string | null;
  readonly preventive_measures?: string | null;
  readonly is_resolved: boolean;
}

/**
 * 1. 인수인계 체크리스트 진행률 및 전체 완료 여부 계산 (순수 함수)
 */
export function calculateChecklistProgress(items: readonly ChecklistItem[]): {
  total: number;
  completed: number;
  percentage: number;
  isAllCompleted: boolean;
} {
  if (!items || items.length === 0) {
    return { total: 0, completed: 0, percentage: 100, isAllCompleted: true };
  }

  const total = items.length;
  const completed = items.filter((item) => item.checked).length;
  const percentage = Math.round((completed / total) * 100);
  const isAllCompleted = completed === total;

  return { total, completed, percentage, isAllCompleted };
}

/**
 * 2. 다음 근무자의 인수인계 확인 서약 가능 여부 검증 (순수 함수)
 *
 * 규칙:
 *  - 이미 확인된 인수인계장은 중복 확인 불가
 *  - 작성자 본인은 본인의 인수인계장을 "다음 근무자"로서 셀프 확인할 수 없음
 *  - 체크리스트가 모두 완료되어야 확인 가능
 */
export function canConfirmHandover(
  note: HandoverNote,
  confirmingStaffId: string
): { canConfirm: boolean; reason?: string } {
  if (note.confirmed_at || note.confirmed_by_next_shift_staff_id) {
    return { canConfirm: false, reason: '이미 다음 근무자의 확인 서약이 완료된 인수인계장입니다.' };
  }

  if (note.writer_staff_id === confirmingStaffId) {
    return { canConfirm: false, reason: '작성자 본인은 다음 근무자 확인 서약을 진행할 수 없습니다.' };
  }

  const { isAllCompleted } = calculateChecklistProgress(note.checklist_items);
  if (!isAllCompleted) {
    return { canConfirm: false, reason: '필수 인수인계 체크리스트 항목이 아직 모두 완료되지 않았습니다.' };
  }

  return { canConfirm: true };
}

/**
 * 3. 미처리(open / in_progress) 건의 및 VOC 필터링 및 집계 (순수 함수)
 */
export function summarizeFeedbacks(feedbacks: readonly FeedbackItem[]): {
  total: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  customerVocCount: number;
  staffIdeaCount: number;
} {
  let openCount = 0;
  let inProgressCount = 0;
  let resolvedCount = 0;
  let customerVocCount = 0;
  let staffIdeaCount = 0;

  for (const fb of feedbacks) {
    if (fb.status === 'open') openCount++;
    else if (fb.status === 'in_progress') inProgressCount++;
    else if (fb.status === 'resolved') resolvedCount++;

    if (fb.author_type === 'customer') customerVocCount++;
    else if (fb.author_type === 'staff') staffIdeaCount++;
  }

  return {
    total: feedbacks.length,
    openCount,
    inProgressCount,
    resolvedCount,
    customerVocCount,
    staffIdeaCount,
  };
}

/**
 * 4. 미해결 안전사고 및 등급별 집계 (순수 함수)
 */
export function countUnresolvedIncidents(incidents: readonly IncidentLog[]): {
  totalUnresolved: number;
  criticalCount: number;
  moderateCount: number;
  minorCount: number;
} {
  let totalUnresolved = 0;
  let criticalCount = 0;
  let moderateCount = 0;
  let minorCount = 0;

  for (const inc of incidents) {
    if (!inc.is_resolved) {
      totalUnresolved++;
      if (inc.severity === 'critical') criticalCount++;
      else if (inc.severity === 'moderate') moderateCount++;
      else if (inc.severity === 'minor') minorCount++;
    }
  }

  return {
    totalUnresolved,
    criticalCount,
    moderateCount,
    minorCount,
  };
}
