import { SCHEDULE_HOLDING_STATUSES } from './capacityTypes';
import type { CapacitySnapshot } from './capacityTypes';

export function normalizeCapacity(value?: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

export function normalizeBooked(value?: number | null): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function computeCapacitySnapshot(params: {
  capacity?: number | null;
  booked?: number | null;
  closed?: boolean;
}): CapacitySnapshot {
  const capacity = normalizeCapacity(params.capacity);
  const booked = normalizeBooked(params.booked);
  const available = params.closed ? 0 : Math.max(0, capacity - booked);
  return {
    capacity,
    booked,
    available,
    isFull: available <= 0,
  };
}

export function canAccept(snapshot: CapacitySnapshot, seats = 1): boolean {
  const need = Math.max(1, Math.floor(Number(seats) || 1));
  return snapshot.available >= need;
}

export function countHoldingStatuses(
  statuses: readonly string[],
  holding: readonly string[] = SCHEDULE_HOLDING_STATUSES
): number {
  const allowed = new Set(holding);
  return statuses.filter((status) => allowed.has(status)).length;
}

export function reservationCapacitySnapshot(params: {
  capacity?: number | null;
  statuses: readonly string[];
  holdingStatuses?: readonly string[];
  closed?: boolean;
}): CapacitySnapshot {
  return computeCapacitySnapshot({
    capacity: params.capacity,
    booked: countHoldingStatuses(params.statuses, params.holdingStatuses),
    closed: params.closed,
  });
}