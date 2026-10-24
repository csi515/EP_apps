/** MBO 공개 범위 판정 및 수정 이력 diff. DB/RLS와 동일한 순수 규칙. */

export type MboVisibilityType = 'PUBLIC' | 'PRIVATE' | 'PARTIAL';

export interface MboGoalVisibilityInput {
  authorId: string;
  evaluatorId?: string | null;
  visibilityType: MboVisibilityType;
  /** organization_members.id 목록 (PARTIAL) */
  sharedMemberIds?: readonly string[];
  /** 목표 작성자의 조직도 부서 경로 (예: /root/dev/plat/core/) */
  authorDepartmentPath?: string | null;
}

export interface MboGoalShareRow {
  sharedWithMemberId: string;
}

export function canViewMboGoal(
  goal: MboGoalVisibilityInput,
  currentMemberId: string | null | undefined,
  currentUserId: string | null | undefined,
  options?: {
    isOwnerOrAdmin?: boolean;
    viewerLeadDepartmentPath?: string | null;
  },
): boolean {
  if (!currentUserId) return false;
  if (options?.isOwnerOrAdmin) return true;
  if (goal.authorId === currentUserId) return true;
  if (goal.evaluatorId && goal.evaluatorId === currentUserId) return true;

  // 조직도 트리 기반 부서장 계층 열람:
  // 조회자가 리더로 있는 부서 경로 하위에 있는 팀원의 MBO는 자동 열람 허용 (상위 리더 상속)
  if (options?.viewerLeadDepartmentPath && goal.authorDepartmentPath) {
    if (goal.authorDepartmentPath.startsWith(options.viewerLeadDepartmentPath)) {
      return true;
    }
  }

  if (goal.visibilityType === 'PUBLIC') return true;
  if (goal.visibilityType === 'PRIVATE') return false;
  if (goal.visibilityType === 'PARTIAL') {
    if (!currentMemberId) return false;
    const shares = goal.sharedMemberIds ?? [];
    return shares.includes(currentMemberId);
  }
  return false;
}

export interface MboRevisionSnapshot {
  id: string;
  previousTargetValue: number | null;
  previousDueDate: string | null;
  newTargetValue?: number | null;
  newDueDate?: string | null;
  unmetReason?: string | null;
  revisionReason: string;
  revisedBy: string;
  createdAt: string;
}

export interface FormattedRevisionItem {
  id: string;
  createdAt: string;
  revisedBy: string;
  unmetReason: string;
  revisionReason: string;
  targetDiff: string;
  dueDateDiff: string;
}

export function formatRevisionHistory(
  revisions: readonly MboRevisionSnapshot[],
  current?: { targetValue?: number | null; dueDate?: string | null },
): FormattedRevisionItem[] {
  const sorted = [...revisions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return sorted.map((rev, index) => {
    const next = sorted[index + 1];
    const afterTarget = next?.previousTargetValue ?? current?.targetValue ?? null;
    const afterDue = next?.previousDueDate ?? current?.dueDate ?? null;
    return {
      id: rev.id,
      createdAt: rev.createdAt,
      revisedBy: rev.revisedBy,
      unmetReason: rev.unmetReason?.trim() || '-',
      revisionReason: rev.revisionReason,
      targetDiff: formatNumericDiff(rev.previousTargetValue, afterTarget),
      dueDateDiff: formatDateDiff(rev.previousDueDate, afterDue),
    };
  });
}

export function nextRevisionCount(currentCount: number): number {
  if (!Number.isFinite(currentCount) || currentCount < 0) return 1;
  return Math.floor(currentCount) + 1;
}

export function buildRevisedGoalFlags(revisionCountBefore: number): {
  isRevised: true;
  revisionCount: number;
} {
  return {
    isRevised: true,
    revisionCount: nextRevisionCount(revisionCountBefore),
  };
}

function formatNumericDiff(before: number | null, after: number | null): string {
  if (before == null && after == null) return '변경 없음';
  return `${before ?? '-'} → ${after ?? '-'}`;
}

function formatDateDiff(before: string | null, after: string | null): string {
  if (!before && !after) return '변경 없음';
  return `${before ?? '-'} → ${after ?? '-'}`;
}

/** 한글 이름 → 초성 문자열 (사원 검색용) */
export function hangulToChosung(name: string): string {
  const CHO = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
  ];
  let out = '';
  for (const ch of name) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)] ?? '';
    }
  }
  return out;
}

export function memberMatchesQuery(
  name: string,
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return true;
  if (name.includes(q)) return true;
  const compact = q.replace(/\s/g, '');
  const CHOSET = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  if (compact.length > 0 && [...compact].every((c) => CHOSET.includes(c))) {
    return hangulToChosung(name).startsWith(compact);
  }
  return name.toLowerCase().includes(q.toLowerCase());
}
