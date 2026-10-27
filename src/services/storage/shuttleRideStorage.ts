// @ts-nocheck
import { STORAGE_KEYS } from '../adapters';
import { deleteById, generateEntityId, getItem, setItem } from './helpers';

export type ShuttleDirection = 'pickup' | 'dropoff' | 'both';
export type ShuttleRideStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

/** 차량 운행(셔틀) 신청 — 레거시 transport 타입 인라인 */
export interface ShuttleRideRequest {
  id: string;
  studentId: string;
  studentName: string;
  rideDate: string;
  direction: ShuttleDirection;
  addressLabel: string;
  address: string;
  addressDetail?: string;
  pickupAddressId?: string;
  guardianName?: string;
  note?: string;
  status: ShuttleRideStatus;
  confirmedAt?: string;
  confirmedBy?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** 차량 운행 신청 CRUD (로컬) */
export function createShuttleRideStorage() {
  return {
    getShuttleRideRequests(): ShuttleRideRequest[] {
      return getItem<ShuttleRideRequest[]>(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, []);
    },

    saveShuttleRideRequest(
      input: Omit<ShuttleRideRequest, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
        createdAt?: string;
        updatedAt?: string;
      }
    ): ShuttleRideRequest {
      const list = this.getShuttleRideRequests();
      const now = new Date().toISOString();
      let saved: ShuttleRideRequest;

      if (input.id) {
        const idx = list.findIndex((item) => item.id === input.id);
        if (idx >= 0) {
          saved = { ...list[idx], ...input, id: input.id, updatedAt: now };
          list[idx] = saved;
        } else {
          saved = {
            ...input,
            id: input.id,
            createdAt: input.createdAt || now,
            updatedAt: now,
          } as ShuttleRideRequest;
          list.push(saved);
        }
      } else {
        saved = {
          ...input,
          id: generateEntityId('shuttle'),
          createdAt: now,
          updatedAt: now,
        } as ShuttleRideRequest;
        list.push(saved);
      }

      setItem(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, list);
      return saved;
    },

    deleteShuttleRideRequest(id: string): void {
      deleteById(STORAGE_KEYS.SHUTTLE_RIDE_REQUESTS, id);
    },
  };
}
