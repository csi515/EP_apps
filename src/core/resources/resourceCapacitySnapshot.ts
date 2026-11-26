import { computeCapacitySnapshot } from '@/core/schedules/capacityMath';
import type { CapacitySnapshot } from '@/core/schedules/capacityTypes';
import { countResourceOccupancy, type ResourceOccupancyReservation } from './resourceOccupancy';

export function resourceCapacitySnapshot(params: {
  capacity?: number | null;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reservations: readonly ResourceOccupancyReservation[];
}): CapacitySnapshot {
  return computeCapacitySnapshot({
    capacity: params.capacity,
    booked: countResourceOccupancy(params),
  });
}

export type { ResourceOccupancyReservation };