export type ShuttleRouteRow = {
  id: string;
  tenant_id: string;
  name: string;
  direction: string;
  departure_time: string;
  capacity: number;
  is_active: boolean;
  driver_name: string | null;
  driver_phone: string | null;
};

export type ShuttleStopRow = {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  pickup_time: string | null;
  dropoff_time: string | null;
  is_pickup: boolean;
  is_dropoff: boolean;
};

export type ShuttleRegistrationRow = {
  id: string;
  tenant_id: string;
  member_id: string;
  route_id: string | null;
  pickup_stop_id: string | null;
  dropoff_stop_id: string | null;
  is_active: boolean;
};

export function formatShuttleClock(time: string | null | undefined, suffix: string): string {
  if (!time) return '';
  return ` (${time.slice(0, 5)} ${suffix})`;
}

export function shuttleDirectionLabel(direction: string): string {
  return direction === 'TO_WORK' ? '출근' : '퇴근';
}
