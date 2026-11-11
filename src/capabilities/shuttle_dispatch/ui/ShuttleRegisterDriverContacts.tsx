import React from 'react';
import { Phone } from 'lucide-react';
import { normalizeDriverPhoneForTel } from '../domain/shuttleRosterEngine';
import { shuttleDirectionLabel, type ShuttleRouteRow } from './shuttleRegisterTypes';

type Props = {
  routes: ShuttleRouteRow[];
  selectedRouteId: string;
};

export const ShuttleRegisterDriverContacts: React.FC<Props> = ({ routes, selectedRouteId }) => (
  <section
    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    aria-labelledby="shuttle-driver-contacts-heading"
  >
    <h2 id="shuttle-driver-contacts-heading" className="text-sm font-bold text-slate-900">
      노선별 기사 연락처
    </h2>
    <p className="mt-0.5 text-xs text-slate-500">
      전직원이 확인할 수 있습니다. 통화 버튼으로 바로 연결하세요.
    </p>
    {routes.length === 0 ? (
      <p className="mt-3 text-sm text-slate-400">등록된 활성 노선이 없습니다.</p>
    ) : (
      <ul className="mt-3 space-y-2">
        {routes.map((route) => {
          const tel = normalizeDriverPhoneForTel(route.driver_phone);
          const selected = route.id === selectedRouteId;
          return (
            <li
              key={route.id}
              className={`rounded-xl border px-3 py-2.5 ${
                selected ? 'border-indigo-300 bg-indigo-50/80' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {route.name}
                    <span className="ml-1.5 text-xs font-medium text-slate-500">
                      ({shuttleDirectionLabel(route.direction)})
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {route.driver_name?.trim() || '담당자 미등록'}
                    {route.driver_phone?.trim() ? ` · ${route.driver_phone.trim()}` : ''}
                  </p>
                </div>
                {tel ? (
                  <a
                    href={`tel:${tel}`}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                    aria-label={`${route.name} 기사에게 전화`}
                  >
                    <Phone className="h-4 w-4" aria-hidden />
                    전화
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
