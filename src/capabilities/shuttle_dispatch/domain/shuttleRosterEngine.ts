/** 사내 통근 셔틀 노선·정류장·고정 명부 순수 검증·집계 */

export type ShuttleDirection = 'TO_WORK' | 'FROM_WORK';

export type MemberWithRole = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type RouteDraft = {
  name: string;
  direction: ShuttleDirection;
  departureTime: string;
  capacity: number;
  /** 담당 기사 표시명 (선택) */
  driverName?: string | null;
  /** 담당 기사 연락처 (선택) */
  driverPhone?: string | null;
};

/** 표시·tel 링크용: 숫자·하이픈·공백·괄호·+ 만 허용 */
const PHONE_RE = /^[0-9+\-\s()]+$/;

export function normalizeDriverPhoneForTel(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.length >= 8 ? digits : null;
}

export type ShuttleStopDraft = {
  stop_order: number;
  stop_name: string;
  pickup_time?: string | null;
  dropoff_time?: string | null;
  is_pickup?: boolean;
  is_dropoff?: boolean;
};

export type ShuttleStop = ShuttleStopDraft & {
  id: string;
  route_id: string;
};

export type ShuttleRegistration = {
  id: string;
  member_id: string;
  route_id: string | null;
  pickup_stop_id: string | null;
  dropoff_stop_id: string | null;
  is_active: boolean;
};

export type StopSummaryReport = {
  stopId: string;
  stopOrder: number;
  stopName: string;
  pickupTime: string | null;
  dropoffTime: string | null;
  pickupCount: number;
  dropoffCount: number;
  onboardAfter: number;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function parseMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.trim().split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function canManageShuttle(member: MemberWithRole): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const perms = member.permissions ?? {};
  return (
    perms['shuttle:manage'] === true ||
    perms['shuttle:routes:manage'] === true ||
    perms['shuttle:dispatch:operate'] === true
  );
}

export function validateRouteForm(routeDraft: RouteDraft): { isValid: boolean; error?: string } {
  if (!routeDraft.name.trim()) {
    return { isValid: false, error: '노선명을 입력하세요.' };
  }
  if (!TIME_RE.test(routeDraft.departureTime.trim())) {
    return { isValid: false, error: '출발 시각 형식이 올바르지 않습니다 (HH:MM).' };
  }
  if (!Number.isInteger(routeDraft.capacity) || routeDraft.capacity <= 0) {
    return { isValid: false, error: '탑승 정원은 1 이상의 정수여야 합니다.' };
  }
  if (routeDraft.direction !== 'TO_WORK' && routeDraft.direction !== 'FROM_WORK') {
    return { isValid: false, error: '방향(출근/퇴근)이 올바르지 않습니다.' };
  }
  const phone = (routeDraft.driverPhone ?? '').trim();
  if (phone && !PHONE_RE.test(phone)) {
    return { isValid: false, error: '기사 연락처 형식이 올바르지 않습니다.' };
  }
  return { isValid: true };
}

export function validateStopsSequence(stops: ShuttleStopDraft[]): { isValid: boolean; error?: string } {
  if (stops.length < 2) {
    return { isValid: false, error: '정류장은 2곳 이상 필요합니다.' };
  }

  const orders = stops.map((s) => s.stop_order).sort((a, b) => a - b);
  const unique = new Set(orders);
  if (unique.size !== orders.length) {
    return { isValid: false, error: '정류장 순번이 중복되었습니다.' };
  }
  for (let i = 0; i < orders.length; i += 1) {
    if (orders[i] !== i + 1) {
      return { isValid: false, error: '정류장 순번은 1부터 연속이어야 합니다.' };
    }
  }

  let lastPickup: number | null = null;
  let lastDropoff: number | null = null;

  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  for (const stop of sorted) {
    if (!stop.stop_name.trim()) {
      return { isValid: false, error: '정류장명을 입력하세요.' };
    }
    const pickupMin = stop.is_pickup !== false ? parseMinutes(stop.pickup_time) : null;
    const dropoffMin = stop.is_dropoff !== false ? parseMinutes(stop.dropoff_time) : null;

    if (pickupMin != null && lastPickup != null && pickupMin < lastPickup) {
      return { isValid: false, error: '승차 시각이 이전 정류장보다 빠릅니다.' };
    }
    if (dropoffMin != null && lastDropoff != null && dropoffMin < lastDropoff) {
      return { isValid: false, error: '하차 시각이 이전 정류장보다 빠릅니다.' };
    }
    if (pickupMin != null && dropoffMin != null && dropoffMin < pickupMin) {
      return { isValid: false, error: '같은 정류장에서 하차 시각이 승차 시각보다 빠릅니다.' };
    }

    if (pickupMin != null) lastPickup = pickupMin;
    if (dropoffMin != null) lastDropoff = dropoffMin;
  }

  return { isValid: true };
}

export function aggregateStopHeadcounts(
  registrations: ShuttleRegistration[],
  stops: ShuttleStop[],
): StopSummaryReport[] {
  const active = registrations.filter((r) => r.is_active && r.route_id);
  const sorted = [...stops].sort((a, b) => a.stop_order - b.stop_order);
  let onboard = 0;

  return sorted.map((stop) => {
    const pickupCount = active.filter((r) => r.pickup_stop_id === stop.id).length;
    const dropoffCount = active.filter((r) => r.dropoff_stop_id === stop.id).length;
    onboard += pickupCount - dropoffCount;
    return {
      stopId: stop.id,
      stopOrder: stop.stop_order,
      stopName: stop.stop_name,
      pickupTime: stop.pickup_time ?? null,
      dropoffTime: stop.dropoff_time ?? null,
      pickupCount,
      dropoffCount,
      onboardAfter: onboard,
    };
  });
}
