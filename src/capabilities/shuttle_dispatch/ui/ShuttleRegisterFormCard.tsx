import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import { FORM_CONTROL_CLASS } from '@/shared/components/ui/FormField';
import {
  formatShuttleClock,
  shuttleDirectionLabel,
  type ShuttleRegistrationRow,
  type ShuttleRouteRow,
  type ShuttleStopRow,
} from './shuttleRegisterTypes';

type Props = {
  useShuttle: boolean;
  onUseShuttleChange: (value: boolean) => void;
  routeId: string;
  onRouteIdChange: (value: string) => void;
  routes: ShuttleRouteRow[];
  myRegistrations: ShuttleRegistrationRow[];
  selectedRoute: ShuttleRouteRow | null;
  existingForRoute: ShuttleRegistrationRow | null;
  activeCount: number;
  capacity: number;
  pickupStopId: string;
  dropoffStopId: string;
  onPickupChange: (value: string) => void;
  onDropoffChange: (value: string) => void;
  pickupOptions: ShuttleStopRow[];
  dropoffOptions: ShuttleStopRow[];
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
};

export const ShuttleRegisterFormCard: React.FC<Props> = ({
  useShuttle,
  onUseShuttleChange,
  routeId,
  onRouteIdChange,
  routes,
  myRegistrations,
  selectedRoute,
  existingForRoute,
  activeCount,
  capacity,
  pickupStopId,
  dropoffStopId,
  onPickupChange,
  onDropoffChange,
  pickupOptions,
  dropoffOptions,
  saving,
  canSave,
  onSave,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800">노선별 이용 설정</legend>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="radio"
          name="shuttle-use"
          checked={useShuttle}
          onChange={() => onUseShuttleChange(true)}
        />
        이 노선 이용함
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="radio"
          name="shuttle-use"
          checked={!useShuttle}
          onChange={() => onUseShuttleChange(false)}
        />
        이 노선 이용 안 함
      </label>
    </fieldset>

    <div className={`mt-4 space-y-3 ${useShuttle ? '' : 'pointer-events-none opacity-40'}`}>
      <label className="block text-sm">
        이용 노선
        <select
          className={`mt-1 min-h-11 ${FORM_CONTROL_CLASS}`}
          value={routeId}
          onChange={(e) => onRouteIdChange(e.target.value)}
        >
          <option value="">선택</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name} ({shuttleDirectionLabel(route.direction)})
              {myRegistrations.some((r) => r.route_id === route.id) ? ' · 등록됨' : ''}
            </option>
          ))}
        </select>
      </label>

      {selectedRoute ? (
        <p className="text-xs text-slate-600">
          정원 {activeCount} / {capacity}명
          {activeCount >= capacity && existingForRoute?.is_active !== true ? ' · 마감' : ''}
        </p>
      ) : null}

      <label className="block text-sm">
        승차 정류장
        <select
          className={`mt-1 min-h-11 ${FORM_CONTROL_CLASS}`}
          value={pickupStopId}
          onChange={(e) => onPickupChange(e.target.value)}
          disabled={!routeId}
        >
          <option value="">선택</option>
          {pickupOptions.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.stop_name}
              {formatShuttleClock(stop.pickup_time, '승차')}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        하차 정류장
        <select
          className={`mt-1 min-h-11 ${FORM_CONTROL_CLASS}`}
          value={dropoffStopId}
          onChange={(e) => onDropoffChange(e.target.value)}
          disabled={!routeId}
        >
          <option value="">선택</option>
          {dropoffOptions.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.stop_name}
              {formatShuttleClock(stop.dropoff_time, '하차')}
            </option>
          ))}
        </select>
      </label>
    </div>

    <Button
      variant="primary"
      className="mt-6 min-h-11 w-full"
      isLoading={saving}
      disabled={!canSave}
      onClick={onSave}
    >
      {existingForRoute ? '이 노선 설정 저장' : '노선 등록 저장'}
    </Button>
  </div>
);
