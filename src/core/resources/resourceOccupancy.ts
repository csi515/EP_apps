import { isBlockingReservationStatus, resourceRangesOverlap } from './overlap';
import type { ResourceReservationStatus } from './types';

export type ResourceOccupancyReservation = {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: ResourceReservationStatus;
};

export function countResourceOccupancy(params: {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reservations: readonly ResourceOccupancyReservation[];
}): number {
  return params.reservations.filter(
    (row) =>
      row.resourceId === params.resourceId &&
      isBlockingReservationStatus(row.status) &&
      resourceRangesOverlap(row.startsAt, row.endsAt, params.startsAt, params.endsAt)
  ).length;
}