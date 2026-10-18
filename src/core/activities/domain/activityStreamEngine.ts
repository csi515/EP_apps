/**
 * 전사 단일 활동 스트림 도메인 엔진 (Universal Activity Stream Engine)
 *
 * Core-Capability-Preset 3계층 아키텍처 원칙을 준수하는 순수 비즈니스 로직.
 * 특정 업종을 전혀 몰라야 하며, generic 다형성 대상(target_type, target_id)에 대해
 * 고객, 계약, 결제, 수리공정, 출석, 상담 등 전사에서 발생한 모든 이력을
 * 단일 피드형 타임라인 데이터로 정규화하고 필터링/그룹화합니다.
 */

export interface ActivityRecord {
  id: string;
  organizationId: string;
  actorId?: string | null;
  actorName: string;
  targetType: string; // 'customer', 'project', 'task', 'contract', 'expense', etc.
  targetId: string;
  activityType: string; // 'created', 'updated', 'status_changed', 'consultation', 'payment', 'attendance', 'signed', 'cancelled'
  title: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityBadgeInfo {
  label: string;
  colorClass: string;
  bgColorClass: string;
  iconName: 'plus' | 'edit' | 'check' | 'message' | 'dollar' | 'file' | 'x' | 'clock';
}

/**
 * 활동 유형별 UI 배지 스타일 매핑
 */
export function formatActivityTypeBadge(activityType: string): ActivityBadgeInfo {
  switch (activityType.toLowerCase()) {
    case 'created':
      return {
        label: '신규 등록',
        colorClass: 'text-emerald-700',
        bgColorClass: 'bg-emerald-50 border-emerald-200',
        iconName: 'plus',
      };
    case 'updated':
      return {
        label: '정보 수정',
        colorClass: 'text-blue-700',
        bgColorClass: 'bg-blue-50 border-blue-200',
        iconName: 'edit',
      };
    case 'status_changed':
      return {
        label: '상태 전이',
        colorClass: 'text-purple-700',
        bgColorClass: 'bg-purple-50 border-purple-200',
        iconName: 'clock',
      };
    case 'consultation':
      return {
        label: '상담/소통',
        colorClass: 'text-indigo-700',
        bgColorClass: 'bg-indigo-50 border-indigo-200',
        iconName: 'message',
      };
    case 'payment':
      return {
        label: '결제/과금',
        colorClass: 'text-amber-700',
        bgColorClass: 'bg-amber-50 border-amber-200',
        iconName: 'dollar',
      };
    case 'signed':
      return {
        label: '전자서명',
        colorClass: 'text-teal-700',
        bgColorClass: 'bg-teal-50 border-teal-200',
        iconName: 'file',
      };
    case 'cancelled':
      return {
        label: '취소/반려',
        colorClass: 'text-rose-700',
        bgColorClass: 'bg-rose-50 border-rose-200',
        iconName: 'x',
      };
    default:
      return {
        label: activityType,
        colorClass: 'text-slate-700',
        bgColorClass: 'bg-slate-50 border-slate-200',
        iconName: 'check',
      };
  }
}

/**
 * 활동 스트림 필터링 및 최신순 정렬
 */
export function filterAndSortActivities(
  activities: readonly ActivityRecord[],
  options?: {
    query?: string;
    activityType?: string;
    targetType?: string;
    targetId?: string;
  }
): ActivityRecord[] {
  let list = [...activities];

  if (options?.targetType) {
    list = list.filter((a) => a.targetType === options.targetType);
  }

  if (options?.targetId) {
    list = list.filter((a) => a.targetId === options.targetId);
  }

  if (options?.activityType) {
    list = list.filter((a) => a.activityType === options.activityType);
  }

  if (options?.query && options.query.trim().length > 0) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.content && a.content.toLowerCase().includes(q)) ||
        a.actorName.toLowerCase().includes(q)
    );
  }

  // 최신순 (내림차순) 정렬
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 날짜(YYYY-MM-DD)별 타임라인 그룹화
 */
export function groupActivitiesByDate(
  activities: readonly ActivityRecord[]
): Record<string, ActivityRecord[]> {
  const groups: Record<string, ActivityRecord[]> = {};

  for (const item of activities) {
    const dateKey = item.createdAt ? item.createdAt.slice(0, 10) : '기타';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  }

  return groups;
}
