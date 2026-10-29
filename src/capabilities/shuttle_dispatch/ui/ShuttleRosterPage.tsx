import React, { useMemo, useState } from 'react';
import { useList } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { listRoleMembers } from '@/core/organizations/services/dynamicRoleService';
import { ShuttleManageGate } from './ShuttleAccessGate';
import { aggregateStopHeadcounts, type ShuttleRegistration, type ShuttleStop } from '../domain/shuttleRosterEngine';
import { downloadCsv } from '@/shared/utils/csvDownload';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import './shuttlePrint.css';

type RouteRow = {
  id: string;
  name: string;
  capacity: number;
};

type StopRow = ShuttleStop & {
  pickup_location_detail?: string | null;
};

type RegistrationRow = ShuttleRegistration & {
  tenant_id: string;
};

type MemberLite = {
  id: string;
  name?: string;
  email?: string;
  staff_id?: string | null;
};

function clockLabel(value: string | null): string {
  return value ? value.slice(0, 5) : '—';
}

export const ShuttleRosterPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const [routeId, setRouteId] = useState('');
  const [members, setMembers] = useState<MemberLite[]>([]);

  React.useEffect(() => {
    if (!orgId) return;
    void listRoleMembers(orgId).then((rows) =>
      setMembers(
        rows.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          staff_id: null,
        })),
      ),
    );
  }, [orgId]);

  const { query: routesQuery } = useList<RouteRow>({
    resource: 'shuttle_routes',
    meta: { schema: 'core' },
    filters: orgId ? [{ field: 'tenant_id', operator: 'eq', value: orgId }] : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const routes = (routesQuery.data?.data as RouteRow[]) ?? [];
  const selectedRoute = routes.find((r) => r.id === routeId) ?? routes[0] ?? null;

  React.useEffect(() => {
    if (!routeId && routes[0]?.id) setRouteId(routes[0].id);
  }, [routes, routeId]);

  const { query: stopsQuery } = useList<StopRow>({
    resource: 'shuttle_stops',
    meta: { schema: 'core' },
    filters: selectedRoute ? [{ field: 'route_id', operator: 'eq', value: selectedRoute.id }] : [],
    sorters: [{ field: 'stop_order', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(selectedRoute?.id) },
  });

  const { query: regQuery } = useList<RegistrationRow>({
    resource: 'shuttle_registrations',
    meta: { schema: 'core' },
    filters:
      orgId && selectedRoute
        ? [
            { field: 'tenant_id', operator: 'eq', value: orgId },
            { field: 'route_id', operator: 'eq', value: selectedRoute.id },
          ]
        : [],
    pagination: { pageSize: 500 },
    queryOptions: { enabled: Boolean(orgId && selectedRoute?.id) },
  });

  const stops = (stopsQuery.data?.data as StopRow[]) ?? [];
  const registrations = (regQuery.data?.data as RegistrationRow[]) ?? [];

  const summary = useMemo(
    () => aggregateStopHeadcounts(registrations, stops),
    [registrations, stops],
  );

  const activeCount = registrations.filter((r) => r.is_active).length;
  const capacity = selectedRoute?.capacity ?? 45;
  const fillRatio = capacity > 0 ? Math.min(100, Math.round((activeCount / capacity) * 100)) : 0;

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  function rosterByStop(stopId: string) {
    return registrations.filter(
      (r) => r.is_active && (r.pickup_stop_id === stopId || r.dropoff_stop_id === stopId),
    );
  }

  function exportCsv() {
    if (!selectedRoute) return;
    const header = ['순번', '정류장', '승차시각', '하차시각', '승차인원', '하차인원', '차내잔여', '위치안내'];
    const rows = summary.map((row) => {
      const stop = stops.find((s) => s.id === row.stopId);
      return [
        String(row.stopOrder),
        row.stopName,
        clockLabel(row.pickupTime),
        clockLabel(row.dropoffTime),
        String(row.pickupCount),
        String(row.dropoffCount),
        String(row.onboardAfter),
        stop?.pickup_location_detail ?? '',
      ];
    });
    downloadCsv(`shuttle-roster-${selectedRoute.name}.csv`, [header, ...rows]);
  }

  return (
    <ShuttleManageGate>
      <WorkPageFrame width="hub">
        <header className="shuttle-no-print flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">기사 전달용 셔틀 명부</h1>
            <p className="text-sm text-slate-500">승·하차 시각 및 정류장별 인원 집계</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl border px-4 text-sm"
              onClick={() => exportCsv()}
            >
              명단 CSV 다운로드
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
              onClick={() => window.print()}
            >
              기사용 명부 인쇄
            </button>
          </div>
        </header>

        <div className="shuttle-no-print space-y-2 rounded-2xl border bg-white p-4">
          <label className="block text-sm">
            노선 선택
            <select
              className="mt-1 min-h-11 w-full rounded-lg border px-3 md:max-w-md"
              value={selectedRoute?.id ?? ''}
              onChange={(e) => setRouteId(e.target.value)}
            >
              {routes.map((route) => (
                <option key={route.id} value={route.id}>{route.name}</option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-sm text-slate-600">
              탑승 예정 {activeCount} / {capacity}명
            </p>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-500" style={{ width: `${fillRatio}%` }} />
            </div>
          </div>
        </div>

        <div className="shuttle-roster-print-root space-y-4 rounded-2xl border bg-white p-4">
          <h2 className="text-center text-base font-bold">
            {selectedRoute?.name ?? '노선'} · 승하차 명부
          </h2>
          <table className="shuttle-roster-print-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>정류장명</th>
                <th>승차시각</th>
                <th>하차시각</th>
                <th>승차</th>
                <th>하차</th>
                <th>차내잔여</th>
                <th>승하차 위치 안내</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const stop = stops.find((s) => s.id === row.stopId);
                return (
                  <tr key={row.stopId}>
                    <td>{row.stopOrder}</td>
                    <td>{row.stopName}</td>
                    <td>{clockLabel(row.pickupTime)}</td>
                    <td>{clockLabel(row.dropoffTime)}</td>
                    <td>{row.pickupCount}</td>
                    <td>{row.dropoffCount}</td>
                    <td>{row.onboardAfter}</td>
                    <td>{stop?.pickup_location_detail ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {summary.map((row) => {
            const riders = rosterByStop(row.stopId);
            if (riders.length === 0) return null;
            return (
              <section key={`group-${row.stopId}`} className="break-inside-avoid">
                <h3 className="mt-3 text-sm font-bold">
                  {row.stopOrder}. {row.stopName} 탑승자
                </h3>
                <ul className="mt-1 grid gap-1 text-xs md:grid-cols-2">
                  {riders.map((reg) => {
                    const member = memberById.get(reg.member_id);
                    const label = member?.name || member?.email || reg.member_id.slice(0, 8);
                    return (
                      <li key={reg.id} className="rounded bg-slate-50 px-2 py-1">
                        {label}
                        {member?.staff_id ? ` · 사번 ${member.staff_id}` : ''}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </WorkPageFrame>
    </ShuttleManageGate>
  );
};
