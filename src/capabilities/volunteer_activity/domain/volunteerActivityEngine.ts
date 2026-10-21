/** 사내 봉사활동 게시·정원·참여 순수 검증 */

export type MemberWithRole = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type VolunteerActivityStatus = 'open' | 'closed' | 'cancelled';

export type VolunteerActivityDraft = {
  title: string;
  activityType: string;
  description?: string;
  capacity: number;
  eventDate?: string | null;
};

export type VolunteerActivity = {
  id: string;
  organizationId: string;
  title: string;
  activityType: string;
  description: string | null;
  capacity: number;
  eventDate: string | null;
  status: VolunteerActivityStatus;
  signupCount: number;
};

export function canManageVolunteerActivity(member: MemberWithRole): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const perms = member.permissions ?? {};
  return perms['volunteer:manage'] === true;
}

export function validateVolunteerActivityDraft(
  draft: VolunteerActivityDraft
): { isValid: boolean; error?: string } {
  if (!draft.title.trim()) {
    return { isValid: false, error: '활동 제목을 입력하세요.' };
  }
  if (!Number.isInteger(draft.capacity) || draft.capacity <= 0) {
    return { isValid: false, error: '모집 인원은 1 이상의 정수여야 합니다.' };
  }
  if (!draft.activityType.trim()) {
    return { isValid: false, error: '활동 종류를 입력하세요.' };
  }
  return { isValid: true };
}

export function isVolunteerJoinAllowed(activity: {
  status: VolunteerActivityStatus;
  capacity: number;
  signupCount: number;
}): boolean {
  if (activity.status !== 'open') return false;
  return activity.signupCount < activity.capacity;
}

export function remainingVolunteerSlots(capacity: number, signupCount: number): number {
  return Math.max(0, capacity - signupCount);
}

export function deriveVolunteerStatusAfterCount(
  capacity: number,
  signupCount: number,
  current: VolunteerActivityStatus
): VolunteerActivityStatus {
  if (current === 'cancelled') return 'cancelled';
  if (signupCount >= capacity) return 'closed';
  return 'open';
}
