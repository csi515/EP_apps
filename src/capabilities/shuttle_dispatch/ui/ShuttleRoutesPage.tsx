import React, { useEffect, useMemo, useState } from 'react';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { ShuttleManageGate } from './ShuttleAccessGate';
import {
  scheduleRowsToStopDrafts,
  validateRouteForm,
  validateStopsSequence,
  type ShuttleDirection,
  type ShuttleStopDraft,
} from '../domain/shuttleRosterEngine';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import {
  ShuttleRouteScheduleModal,
  type ScheduleRouteDraft,
  type ScheduleStopDraft,
} from './ShuttleRouteScheduleModal';

type RouteRow = {
  id: string;
  tenant_id: string;
  name: string;
  direction: ShuttleDirection;
  departure_time: string;
  capacity: number;
  is_active: boolean;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number?: string | null;
  return_is_reverse?: boolean | null;
  weekday_return_time?: string | null;
  friday_return_time?: string | null;
};

type StopRow = {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  pickup_time: string | null;
  dropoff_time: string | null;
  pickup_location_detail: string | null;
  remark?: string | null;
  is_pickup: boolean;
  is_dropoff: boolean;
};

type StopDraft = ShuttleStopDraft & {
  id?: string;
  pickup_location_detail?: string | null;
  remark?: string | null;
};

const EMPTY_SCHEDULE: ScheduleRouteDraft = {
  name: '',
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  direction: 'TO_WORK',
  capacity: 45,
  is_active: true,
  returnIsReverse: true,
  weekdayReturnTime: '17:45',
  fridayReturnTime: '11:45',
  stops: [
    { time: '', stop_name: '', remark: '' },
    { time: '', stop_name: '', remark: '' },
  ],
};

function stopsToScheduleRows(stops: StopRow[]): ScheduleStopDraft[] {
  return stops.map((s) => ({
    id: s.id,
    time: (s.pickup_time || s.dropoff_time || '').slice(0, 5),
    stop_name: s.stop_name,
    remark: s.remark ?? s.pickup_location_detail ?? '',
  }));
}

function routeToScheduleDraft(route: RouteRow, stops: StopRow[]): ScheduleRouteDraft {
  return {
    name: route.name,
    vehicleNumber: route.vehicle_number ?? '',
    driverName: route.driver_name ?? '',
    driverPhone: route.driver_phone ?? '',
    direction: route.direction,
    capacity: route.capacity,
    is_active: route.is_active,
    returnIsReverse: route.return_is_reverse !== false,
    weekdayReturnTime: route.weekday_return_time?.slice(0, 5) ?? '',
    fridayReturnTime: route.friday_return_time?.slice(0, 5) ?? '',
    stops:
      stops.length > 0
        ? stopsToScheduleRows(stops)
        : [
            { time: '', stop_name: '', remark: '' },
            { time: '', stop_name: '', remark: '' },
          ],
  };
}

export const ShuttleRoutesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleRouteDraft>(EMPTY_SCHEDULE);
  const [savingRoute, setSavingRoute] = useState(false);
  const [stopDrafts, setStopDrafts] = useState<StopDraft[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<RouteRow | null>(null);

  const { query: routesQuery } = useList<RouteRow>({
    resource: 'shuttle_routes',
    meta: { schema: 'core' },
    filters: orgId ? [{ field: 'tenant_id', operator: 'eq', value: orgId }] : [],
    sorters: [{ field: 'departure_time', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const routes = (routesQuery.data?.data as RouteRow[]) ?? [];

  useEffect(() => {
    if (!selectedRouteId && routes[0]?.id) setSelectedRouteId(routes[0].id);
  }, [routes, selectedRouteId]);

  const { query: stopsQuery } = useList<StopRow>({
    resource: 'shuttle_stops',
    meta: { schema: 'core' },
    filters: selectedRouteId ? [{ field: 'route_id', operator: 'eq', value: selectedRouteId }] : [],
    sorters: [{ field: 'stop_order', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(selectedRouteId) },
  });

  const stops = (stopsQuery.data?.data as StopRow[]) ?? [];

  useEffect(() => {
    setStopDrafts(
      stops.map((s) => ({
        id: s.id,
        stop_order: s.stop_order,
        stop_name: s.stop_name,
        pickup_time: s.pickup_time?.slice(0, 5) ?? '',
        dropoff_time: s.dropoff_time?.slice(0, 5) ?? '',
        pickup_location_detail: s.pickup_location_detail,
        remark: s.remark,
        is_pickup: s.is_pickup,
        is_dropoff: s.is_dropoff,
      })),
    );
  }, [stops]);

  const { mutate: createRoute } = useCreate();
  const { mutate: updateRoute } = useUpdate();
  const { mutate: deleteRoute } = useDelete();
  const { mutate: createStop } = useCreate();
  const { mutate: updateStop } = useUpdate();
  const { mutate: deleteStop } = useDelete();

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  function openCreateRoute() {
    setEditingRoute(null);
    setScheduleDraft(EMPTY_SCHEDULE);
    setRouteModalOpen(true);
  }

  function openEditRoute(route: RouteRow) {
    setEditingRoute(route);
    setScheduleDraft(routeToScheduleDraft(route, route.id === selectedRouteId ? stops : []));
    setRouteModalOpen(true);
  }

  async function replaceStopsForRoute(routeId: string, rows: ScheduleStopDraft[]) {
    const mapped = scheduleRowsToStopDrafts(rows);
    const withRemark = mapped.map((row, i) => ({
      ...row,
      remark: rows[i]?.remark?.trim() || null,
    }));

    const validation = validateStopsSequence(withRemark);
    if (!validation.isValid) {
      throw new Error(validation.error ?? '정류장 검증 실패');
    }

    const existing = routeId === selectedRouteId ? stops : [];
    const existingIds = new Set(existing.map((s) => s.id));
    const draftIds = new Set(rows.filter((s) => s.id).map((s) => s.id as string));

    for (const removedId of existingIds) {
      if (!draftIds.has(removedId)) {
        await new Promise<void>((resolve, reject) => {
          deleteStop(
            { resource: 'shuttle_stops', id: removedId, meta: { schema: 'core' } },
            { onSuccess: () => resolve(), onError: (e) => reject(e) },
          );
        });
      }
    }

    for (let i = 0; i < withRemark.length; i += 1) {
      const draft = withRemark[i];
      const rowId = rows[i]?.id;
      const payload = {
        route_id: routeId,
        stop_order: draft.stop_order,
        stop_name: draft.stop_name.trim(),
        pickup_time: draft.pickup_time ? `${draft.pickup_time}:00` : null,
        dropoff_time: draft.dropoff_time ? `${draft.dropoff_time}:00` : null,
        pickup_location_detail: null,
        remark: draft.remark,
        is_pickup: draft.is_pickup ?? true,
        is_dropoff: draft.is_dropoff ?? true,
      };

      if (rowId && existingIds.has(rowId)) {
        await new Promise<void>((resolve, reject) => {
          updateStop(
            { resource: 'shuttle_stops', id: rowId, values: payload, meta: { schema: 'core' } },
            { onSuccess: () => resolve(), onError: (e) => reject(e) },
          );
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          createStop(
            { resource: 'shuttle_stops', values: payload, meta: { schema: 'core' } },
            { onSuccess: () => resolve(), onError: (e) => reject(e) },
          );
        });
      }
    }
  }

  async function saveSchedule(draft: ScheduleRouteDraft) {
    if (!orgId) return;

    const firstTime = draft.stops.find((s) => s.time.trim())?.time.trim() || '07:00';
    const validation = validateRouteForm({
      name: draft.name,
      direction: draft.direction,
      departureTime: firstTime,
      capacity: draft.capacity,
      driverName: draft.driverName,
      driverPhone: draft.driverPhone,
      vehicleNumber: draft.vehicleNumber,
      returnIsReverse: draft.returnIsReverse,
      weekdayReturnTime: draft.weekdayReturnTime || null,
      fridayReturnTime: draft.fridayReturnTime || null,
    });
    if (!validation.isValid) {
      showToast(validation.error ?? '입력값을 확인하세요.', 'error');
      return;
    }

    const stopCheck = validateStopsSequence(scheduleRowsToStopDrafts(draft.stops));
    if (!stopCheck.isValid) {
      showToast(stopCheck.error ?? '정류장 입력을 확인하세요.', 'error');
      return;
    }

    const values = {
      tenant_id: orgId,
      name: draft.name.trim(),
      direction: draft.direction,
      departure_time: `${firstTime}:00`,
      capacity: draft.capacity,
      is_active: draft.is_active,
      driver_name: draft.driverName.trim() || null,
      driver_phone: draft.driverPhone.trim() || null,
      vehicle_number: draft.vehicleNumber.trim() || null,
      return_is_reverse: draft.returnIsReverse,
      weekday_return_time: draft.weekdayReturnTime ? `${draft.weekdayReturnTime}:00` : null,
      friday_return_time: draft.fridayReturnTime ? `${draft.fridayReturnTime}:00` : null,
      updated_at: new Date().toISOString(),
    };

    setSavingRoute(true);
    try {
      if (editingRoute) {
        await new Promise<void>((resolve, reject) => {
          updateRoute(
            { resource: 'shuttle_routes', id: editingRoute.id, values, meta: { schema: 'core' } },
            { onSuccess: () => resolve(), onError: (e) => reject(e) },
          );
        });
        await replaceStopsForRoute(editingRoute.id, draft.stops);
        showToast('노선·시간표가 저장되었습니다.', 'success');
        setSelectedRouteId(editingRoute.id);
      } else {
        const created = await new Promise<RouteRow>((resolve, reject) => {
          createRoute(
            { resource: 'shuttle_routes', values, meta: { schema: 'core' } },
            {
              onSuccess: (data) => resolve(data.data as RouteRow),
              onError: (e) => reject(e),
            },
          );
        });
        if (!created?.id) throw new Error('노선 생성에 실패했습니다.');
        await replaceStopsForRoute(created.id, draft.stops);
        showToast('노선·시간표가 추가되었습니다.', 'success');
        setSelectedRouteId(created.id);
      }
      setRouteModalOpen(false);
      void routesQuery.refetch();
      void stopsQuery.refetch();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '저장에 실패했습니다.', 'error');
    } finally {
      setSavingRoute(false);
    }
  }

  function confirmDeleteRoute() {
    if (!deleteConfirm) return;
    deleteRoute(
      { resource: 'shuttle_routes', id: deleteConfirm.id, meta: { schema: 'core' } },
      {
        onSuccess: () => {
          showToast('노선이 삭제되었습니다. 연결 정류장·탑승 등록은 DB 정책에 따라 처리됩니다.', 'success');
          setDeleteConfirm(null);
          setSelectedRouteId(null);
          void routesQuery.refetch();
        },
        onError: (e) => showToast(e.message, 'error'),
      },
    );
  }

  async function persistStops() {
    if (!selectedRouteId) return;
    try {
      await replaceStopsForRoute(
        selectedRouteId,
        stopDrafts.map((s) => ({
          id: s.id,
          time: (s.pickup_time || s.dropoff_time || '').toString(),
          stop_name: s.stop_name,
          remark: s.remark ?? '',
        })),
      );
      showToast('정류장이 저장되었습니다.', 'success');
      void stopsQuery.refetch();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '정류장 저장 실패', 'error');
    }
  }

  return (
    <ShuttleManageGate>
      <WorkPageFrame width="hub">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">셔틀 노선·정류장 관리</h1>
            <p className="text-sm text-slate-500">시간·정류장·비고 표와 퇴근 안내를 한 번에 등록합니다</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
            onClick={openCreateRoute}
          >
            + 새 노선 만들기
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border bg-white p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">노선 목록</p>
            <ul className="space-y-1">
              {routes.map((route) => (
                <li key={route.id}>
                  <button
                    type="button"
                    className={`min-h-11 w-full rounded-lg px-3 text-left text-sm ${
                      selectedRouteId === route.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedRouteId(route.id)}
                  >
                    {route.name}
                    <span className="block text-xs opacity-80">
                      {route.direction === 'TO_WORK' ? '출근' : '퇴근'} · {route.departure_time.slice(0, 5)}
                      {route.vehicle_number ? ` · 차량 ${route.vehicle_number}` : ''}
                    </span>
                    {route.driver_name || route.driver_phone ? (
                      <span className="block text-[11px] opacity-75">
                        기사 {route.driver_name || '미등록'}
                        {route.driver_phone ? ` · ${route.driver_phone}` : ''}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {routes.length === 0 ? (
                <li className="px-2 py-4 text-sm text-slate-400">등록된 노선이 없습니다.</li>
              ) : null}
            </ul>
          </aside>

          <section className="rounded-2xl border bg-white p-4">
            {selectedRoute ? (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border px-3 text-sm"
                    onClick={() => openEditRoute(selectedRoute)}
                  >
                    노선·시간표 편집
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm text-rose-700"
                    onClick={() => setDeleteConfirm(selectedRoute)}
                  >
                    노선 삭제
                  </button>
                </div>

                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
                  <p className="text-center font-bold">
                    {selectedRoute.name}
                    {selectedRoute.vehicle_number
                      ? ` 현재차량 : ${selectedRoute.vehicle_number}`
                      : ''}{' '}
                    {selectedRoute.driver_name || ''}
                    {selectedRoute.driver_phone ? ` ${selectedRoute.driver_phone}` : ''}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-xs font-bold text-slate-500">
                        <th className="p-2.5">시간</th>
                        <th className="p-2.5">정류장</th>
                        <th className="p-2.5">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stopDrafts.map((stop) => (
                        <tr key={stop.id ?? stop.stop_order} className="border-b border-slate-100">
                          <td className="p-2.5 font-semibold tabular-nums">
                            {(stop.pickup_time || stop.dropoff_time || '—').toString()}
                          </td>
                          <td className="p-2.5">{stop.stop_name}</td>
                          <td className="p-2.5 text-slate-600">
                            {stop.remark || stop.pickup_location_detail || ''}
                          </td>
                        </tr>
                      ))}
                      {stopDrafts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-sm text-slate-400">
                            등록된 정류장이 없습니다. 노선·시간표 편집에서 추가하세요.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-1 text-center text-sm font-extrabold leading-snug">
                  {selectedRoute.return_is_reverse !== false ? (
                    <p className="text-blue-700">퇴근은 역순</p>
                  ) : null}
                  {selectedRoute.weekday_return_time ? (
                    <p className="text-blue-700">
                      월~목 {selectedRoute.name} {selectedRoute.weekday_return_time.slice(0, 5)} 출발
                    </p>
                  ) : null}
                  {selectedRoute.friday_return_time ? (
                    <p className="text-rose-600">
                      금요일 퇴근 {selectedRoute.name}{' '}
                      {selectedRoute.friday_return_time.slice(0, 5)} 출발
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="mt-4 min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  onClick={() => void persistStops()}
                >
                  현재 표 기준으로 정류장 재저장
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">노선을 선택하거나 새로 만드세요.</p>
            )}
          </section>
        </div>

        <ShuttleRouteScheduleModal
          open={routeModalOpen}
          title={editingRoute ? '노선·시간표 편집' : '새 노선 만들기'}
          initial={scheduleDraft}
          saving={savingRoute}
          onClose={() => setRouteModalOpen(false)}
          onSave={(draft) => void saveSchedule(draft)}
        />

        {deleteConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4">
              <h2 className="text-lg font-bold text-rose-700">노선 삭제</h2>
              <p className="mt-2 text-sm text-slate-600">
                「{deleteConfirm.name}」을 삭제하면 연결된 정류장이 함께 삭제되고, 탑승 등록의 노선·정류장 참조는
                해제됩니다.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="min-h-11 px-4" onClick={() => setDeleteConfirm(null)}>
                  취소
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg bg-rose-600 px-4 text-white"
                  onClick={confirmDeleteRoute}
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </WorkPageFrame>
    </ShuttleManageGate>
  );
};
