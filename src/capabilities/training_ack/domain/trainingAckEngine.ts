/**
 * 교육관리(training_ack) 순수 도메인
 * — 부서/개인 배정, 게시 상태, 이수 확인(acked_at)·재이수 규칙
 */

export type TrainingCourseStatus = 'draft' | 'published' | 'closed';

export type TrainingAssigneeTarget = {
  departmentId?: string | null;
  memberId?: string | null;
};

export function isMemberAssignedToCourse(
  assignees: TrainingAssigneeTarget[],
  memberId: string,
  memberDepartmentIds: readonly string[],
): boolean {
  if (!memberId) return false;
  const deptSet = new Set(memberDepartmentIds.filter(Boolean));
  return assignees.some((a) => {
    if (a.memberId && a.memberId === memberId) return true;
    if (a.departmentId && deptSet.has(a.departmentId)) return true;
    return false;
  });
}

/** 현재 교육 개정에 대한 이수가 유효한지 */
export function isAckCurrent(
  ack: { courseRevision: number } | null | undefined,
  courseRevision: number,
): boolean {
  return Boolean(ack && ack.courseRevision >= courseRevision);
}

/** 이수는 있으나 개정이 올라가서 재이수가 필요한지 */
export function needsReAck(
  ack: { courseRevision: number } | null | undefined,
  courseRevision: number,
): boolean {
  return Boolean(ack && ack.courseRevision < courseRevision);
}

export function canAcknowledgeCourse(input: {
  status: TrainingCourseStatus;
  assigned: boolean;
  ack: { courseRevision: number } | null | undefined;
  courseRevision: number;
}): { ok: boolean; reason?: string } {
  if (input.status !== 'published') {
    return { ok: false, reason: '게시된 교육만 이수 확인할 수 있습니다.' };
  }
  if (!input.assigned) {
    return { ok: false, reason: '배정된 교육만 이수 확인할 수 있습니다.' };
  }
  if (isAckCurrent(input.ack, input.courseRevision)) {
    return { ok: false, reason: '이미 이수 확인했습니다.' };
  }
  return { ok: true };
}

export function validateTrainingCourseDraft(input: {
  title: string;
  body: string;
}): { ok: boolean; reason?: string } {
  if (!input.title.trim()) return { ok: false, reason: '교육 제목을 입력해 주세요.' };
  if (!input.body.trim()) return { ok: false, reason: '교육 내용을 입력해 주세요.' };
  return { ok: true };
}

export function validateAssignees(
  assignees: TrainingAssigneeTarget[],
): { ok: boolean; reason?: string } {
  if (assignees.length === 0) {
    return { ok: false, reason: '부서 또는 개인 배정을 1건 이상 지정해 주세요.' };
  }
  for (const a of assignees) {
    const hasDept = Boolean(a.departmentId);
    const hasMember = Boolean(a.memberId);
    if (hasDept === hasMember) {
      return { ok: false, reason: '배정은 부서 또는 개인 중 하나만 지정해야 합니다.' };
    }
  }
  return { ok: true };
}

/** 이수 확인 시각 표시 (로컬) */
export function formatAckedAt(iso: string, locale = 'ko-KR'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function trainingStatusLabel(status: TrainingCourseStatus): string {
  if (status === 'published') return '게시';
  if (status === 'closed') return '종료';
  return '임시저장';
}
