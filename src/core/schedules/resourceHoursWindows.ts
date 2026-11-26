/**
 * 자원 운영시간 창. Scheduling Capability와 동일 의미 (Core SoT).
 */

export const AVAILABILITY_WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
export type AvailabilityWeekdayLabel = (typeof AVAILABILITY_WEEKDAY_LABELS)[number];

export type AvailabilityResourceWindow = {
  resourceId: string;
  days?: AvailabilityWeekdayLabel[];
  startTime: string;
  endTime: string;
};

function toHm(value: string): string {
  return value.trim().slice(0, 5);
}

function localPartsFromIso(iso: string): {
  dayLabel: AvailabilityWeekdayLabel;
  hm: string;
} | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const dow = date.getDay();
  const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return { dayLabel: AVAILABILITY_WEEKDAY_LABELS[dow], hm };
}

function isOutsideActorWindows(params: {
  actorId?: string;
  startsAt: string;
  endsAt: string;
  windows: Array<{ actorId: string; days: readonly AvailabilityWeekdayLabel[]; startTime: string; endTime: string }>;
}): boolean {
  if (!params.actorId) return false;
  const mine = params.windows.filter(
    (window) =>
      window.actorId === params.actorId && window.days.length > 0 && window.startTime && window.endTime
  );
  if (mine.length === 0) return false;
  const start = localPartsFromIso(params.startsAt);
  const end = localPartsFromIso(params.endsAt);
  if (!start || !end) return true;
  return !mine.some(
    (window) =>
      window.days.includes(start.dayLabel) &&
      start.dayLabel === end.dayLabel &&
      start.hm >= window.startTime &&
      end.hm <= window.endTime
  );
}

/** 근무창이 없으면 제한 없음. 있으면 시작·종료가 같은 요일 창 안에 있어야 한다 */
export function isOutsideResourceHours(params: {
  resourceId?: string;
  startsAt: string;
  endsAt: string;
  windows?: AvailabilityResourceWindow[];
}): boolean {
  return isOutsideActorWindows({
    actorId: params.resourceId,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    windows: (params.windows ?? []).map((window) => ({
      actorId: window.resourceId,
      days: window.days ?? [...AVAILABILITY_WEEKDAY_LABELS],
      startTime: window.startTime,
      endTime: window.endTime,
    })),
  });
}

export function windowsFromResourceHours(resource: {
  id: string;
  open_time: string;
  close_time: string;
}): AvailabilityResourceWindow {
  return {
    resourceId: resource.id,
    days: [...AVAILABILITY_WEEKDAY_LABELS],
    startTime: toHm(resource.open_time),
    endTime: toHm(resource.close_time),
  };
}