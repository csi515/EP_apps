import React from 'react';
import { Button } from '@/shared/components/ui/Button';
import {
  shuttleDirectionLabel,
  type ShuttleRegistrationRow,
  type ShuttleRouteRow,
} from './shuttleRegisterTypes';

type Props = {
  registrations: ShuttleRegistrationRow[];
  routeById: Map<string, ShuttleRouteRow>;
  selectedRouteId: string;
  saving: boolean;
  onEdit: (reg: ShuttleRegistrationRow) => void;
  onDeactivate: (reg: ShuttleRegistrationRow) => void;
};

export const ShuttleRegisterMyList: React.FC<Props> = ({
  registrations,
  routeById,
  selectedRouteId,
  saving,
  onEdit,
  onDeactivate,
}) => (
  <section
    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    aria-labelledby="shuttle-my-regs-heading"
  >
    <h2 id="shuttle-my-regs-heading" className="text-sm font-bold text-slate-900">
      내 등록 노선
    </h2>
    <p className="mt-0.5 text-xs text-slate-500">
      등록된 노선을 선택해 수정하거나 이용을 중지할 수 있습니다.
    </p>
    {registrations.length === 0 ? (
      <p className="mt-3 text-sm text-slate-400">아직 등록한 노선이 없습니다.</p>
    ) : (
      <ul className="mt-3 space-y-2">
        {registrations.map((reg) => {
          const route = reg.route_id ? routeById.get(reg.route_id) : undefined;
          return (
            <li
              key={reg.id}
              className={`rounded-xl border px-3 py-2.5 ${
                reg.route_id === selectedRouteId
                  ? 'border-indigo-300 bg-indigo-50/80'
                  : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {route?.name ?? '알 수 없는 노선'}
                    {route ? (
                      <span className="ml-1.5 text-xs font-medium text-slate-500">
                        ({shuttleDirectionLabel(route.direction)})
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {reg.is_active ? '이용 중' : '이용 중지'}
                    {route?.departure_time ? ` · 출발 ${route.departure_time.slice(0, 5)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" className="min-h-11" onClick={() => onEdit(reg)}>
                    수정
                  </Button>
                  {reg.is_active ? (
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      isLoading={saving}
                      onClick={() => onDeactivate(reg)}
                    >
                      이용 중지
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
