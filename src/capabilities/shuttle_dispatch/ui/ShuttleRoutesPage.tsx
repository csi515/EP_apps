import React, { useEffect, useMemo, useState } from 'react';
import { useCreate, useDelete, useList, useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { ShuttleManageGate } from './ShuttleAccessGate';
import {
  validateRouteForm,
  validateStopsSequence,
  type ShuttleDirection,
  type ShuttleStopDraft,
} from '../domain/shuttleRosterEngine';

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
};

type StopRow = {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  pickup_time: string | null;
  dropoff_time: string | null;
  pickup_location_detail: string | null;
  is_pickup: boolean;
  is_dropoff: boolean;
};

type StopDraft = ShuttleStopDraft & { id?: string; pickup_location_detail?: string | null };

const EMPTY_ROUTE = {
  name: '',
  direction: 'FROM_WORK' as ShuttleDirection,
  departureTime: '18:30',
  capacity: 45,
  is_active: true,
  driverName: '',
  driverPhone: '',
};

export const ShuttleRoutesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null);
  const [routeDraft, setRouteDraft] = useState(EMPTY_ROUTE);
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
    setRouteDraft(EMPTY_ROUTE);
    setRouteModalOpen(true);
  }

  function openEditRoute(route: RouteRow) {
    setEditingRoute(route);
    setRouteDraft({
      name: route.name,
      direction: route.direction,
      departureTime: route.departure_time.slice(0, 5),
      capacity: route.capacity,
      is_active: route.is_active,
      driverName: route.driver_name ?? '',
      driverPhone: route.driver_phone ?? '',
    });
    setRouteModalOpen(true);
  }

  function saveRoute() {
    if (!orgId) return;
    const validation = validateRouteForm({
      name: routeDraft.name,
      direction: routeDraft.direction,
      departureTime: routeDraft.departureTime,
      capacity: routeDraft.capacity,
      driverName: routeDraft.driverName,
      driverPhone: routeDraft.driverPhone,
    });
    if (!validation.isValid) {
      showToast(validation.error ?? '입력값을 확인하세요.', 'error');
      return;
    }

    const values = {
      tenant_id: orgId,
      name: routeDraft.name.trim(),
      direction: routeDraft.direction,
      departure_time: `${routeDraft.departureTime}:00`,
      capacity: routeDraft.capacity,
      is_active: routeDraft.is_active,
      driver_name: routeDraft.driverName.trim() || null,
      driver_phone: routeDraft.driverPhone.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingRoute) {
      updateRoute(
        { resource: 'shuttle_routes', id: editingRoute.id, values, meta: { schema: 'core' } },
        {
          onSuccess: () => {
            showToast('노선이 저장되었습니다.', 'success');
            setRouteModalOpen(false);
            void routesQuery.refetch();
          },
          onError: (e) => showToast(e.message, 'error'),
        },
      );
      return;
    }

    createRoute(
      { resource: 'shuttle_routes', values, meta: { schema: 'core' } },
      {
        onSuccess: (data) => {
          showToast('노선이 추가되었습니다.', 'success');
          setRouteModalOpen(false);
          const created = data.data as RouteRow;
          if (created?.id) setSelectedRouteId(created.id);
          void routesQuery.refetch();
        },
        onError: (e) => showToast(e.message, 'error'),
      },
    );
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

  function addStopRow() {
    const nextOrder = stopDrafts.length + 1;
    setStopDrafts((prev) => [
      ...prev,
      {
        stop_order: nextOrder,
        stop_name: '',
        pickup_time: '',
        dropoff_time: '',
        pickup_location_detail: '',
        is_pickup: true,
        is_dropoff: true,
      },
    ]);
  }

  function moveStop(index: number, delta: number) {
    const next = [...stopDrafts];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setStopDrafts(next.map((row, i) => ({ ...row, stop_order: i + 1 })));
  }

  async function persistStops() {
    if (!selectedRouteId) return;
    const validation = validateStopsSequence(
      stopDrafts.map((s) => ({
        stop_order: s.stop_order,
        stop_name: s.stop_name,
        pickup_time: s.pickup_time || null,
        dropoff_time: s.dropoff_time || null,
        is_pickup: s.is_pickup,
        is_dropoff: s.is_dropoff,
      })),
    );
    if (!validation.isValid) {
      showToast(validation.error ?? '정류장 검증 실패', 'error');
      return;
    }

    const existingIds = new Set(stops.map((s) => s.id));
    const draftIds = new Set(stopDrafts.filter((s) => s.id).map((s) => s.id as string));

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

    for (const draft of stopDrafts) {
      const payload = {
        route_id: selectedRouteId,
        stop_order: draft.stop_order,
        stop_name: draft.stop_name.trim(),
        pickup_time: draft.pickup_time ? `${draft.pickup_time}:00` : null,
        dropoff_time: draft.dropoff_time ? `${draft.dropoff_time}:00` : null,
        pickup_location_detail: draft.pickup_location_detail ?? null,
        is_pickup: draft.is_pickup ?? true,
        is_dropoff: draft.is_dropoff ?? true,
      };

      if (draft.id) {
        await new Promise<void>((resolve, reject) => {
          updateStop(
            { resource: 'shuttle_stops', id: draft.id, values: payload, meta: { schema: 'core' } },
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

    showToast('정류장이 저장되었습니다.', 'success');
    void stopsQuery.refetch();
  }

  return (
    <ShuttleManageGate>
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">셔틀 노선·정류장 관리</h1>
            <p className="text-sm text-slate-500">승·하차 시각을 포함한 노선 마스터 편집</p>
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
                  <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => openEditRoute(selectedRoute)}>
                    노선 편집
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm text-rose-700"
                    onClick={() => setDeleteConfirm(selectedRoute)}
                  >
                    노선 삭제
                  </button>
                </div>

                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  <p className="text-[11px] font-bold text-slate-500">담당 기사</p>
                  <p className="mt-0.5 font-semibold">
                    {selectedRoute.driver_name?.trim() || '담당자 미등록'}
                    {selectedRoute.driver_phone?.trim()
                      ? ` · ${selectedRoute.driver_phone.trim()}`
                      : ''}
                  </p>
                </div>

                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold">정류장 ({stopDrafts.length})</h2>
                  <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={addStopRow}>
                    + 정류장 추가
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="p-2">순번</th>
                        <th className="p-2">정류장명</th>
                        <th className="p-2">승차</th>
                        <th className="p-2">하차</th>
                        <th className="p-2">위치 안내</th>
                        <th className="p-2">승/하차</th>
                        <th className="p-2">순서</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {stopDrafts.map((stop, index) => (
                        <tr key={stop.id ?? `new-${index}`} className="border-b">
                          <td className="p-2">{stop.stop_order}</td>
                          <td className="p-2">
                            <input
                              className="min-h-10 w-full rounded border px-2"
                              value={stop.stop_name}
                              onChange={(e) => {
                                const next = [...stopDrafts];
                                next[index] = { ...stop, stop_name: e.target.value };
                                setStopDrafts(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="time"
                              className="min-h-10 rounded border px-2"
                              value={stop.pickup_time ?? ''}
                              onChange={(e) => {
                                const next = [...stopDrafts];
                                next[index] = { ...stop, pickup_time: e.target.value };
                                setStopDrafts(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="time"
                              className="min-h-10 rounded border px-2"
                              value={stop.dropoff_time ?? ''}
                              onChange={(e) => {
                                const next = [...stopDrafts];
                                next[index] = { ...stop, dropoff_time: e.target.value };
                                setStopDrafts(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="min-h-10 w-full rounded border px-2"
                              value={stop.pickup_location_detail ?? ''}
                              onChange={(e) => {
                                const next = [...stopDrafts];
                                next[index] = { ...stop, pickup_location_detail: e.target.value };
                                setStopDrafts(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={stop.is_pickup ?? true}
                                onChange={(e) => {
                                  const next = [...stopDrafts];
                                  next[index] = { ...stop, is_pickup: e.target.checked };
                                  setStopDrafts(next);
                                }}
                              />
                              승
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={stop.is_dropoff ?? true}
                                onChange={(e) => {
                                  const next = [...stopDrafts];
                                  next[index] = { ...stop, is_dropoff: e.target.checked };
                                  setStopDrafts(next);
                                }}
                              />
                              하
                            </label>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button type="button" className="min-h-10 rounded border px-2" onClick={() => moveStop(index, -1)}>▲</button>
                              <button type="button" className="min-h-10 rounded border px-2" onClick={() => moveStop(index, 1)}>▼</button>
                            </div>
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              className="text-xs text-rose-600"
                              onClick={() => setStopDrafts(stopDrafts.filter((_, i) => i !== index).map((row, i) => ({ ...row, stop_order: i + 1 })))}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="mt-4 min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"
                  onClick={() => void persistStops()}
                >
                  정류장 저장
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">노선을 선택하거나 새로 만드세요.</p>
            )}
          </section>
        </div>

        {routeModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
              <h2 className="text-lg font-bold">{editingRoute ? '노선 편집' : '새 노선'}</h2>
              <div className="mt-3 space-y-3 text-sm">
                <label className="block">
                  노선명
                  <input
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.name}
                    onChange={(e) => setRouteDraft({ ...routeDraft, name: e.target.value })}
                  />
                </label>
                <label className="block">
                  방향
                  <select
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.direction}
                    onChange={(e) => setRouteDraft({ ...routeDraft, direction: e.target.value as ShuttleDirection })}
                  >
                    <option value="TO_WORK">출근 (TO_WORK)</option>
                    <option value="FROM_WORK">퇴근 (FROM_WORK)</option>
                  </select>
                </label>
                <label className="block">
                  출발 시각
                  <input
                    type="time"
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.departureTime}
                    onChange={(e) => setRouteDraft({ ...routeDraft, departureTime: e.target.value })}
                  />
                </label>
                <label className="block">
                  탑승 정원
                  <input
                    type="number"
                    min={1}
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.capacity}
                    onChange={(e) => setRouteDraft({ ...routeDraft, capacity: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  담당 기사
                  <input
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.driverName}
                    onChange={(e) => setRouteDraft({ ...routeDraft, driverName: e.target.value })}
                    placeholder="예: 김기사"
                    maxLength={64}
                  />
                </label>
                <label className="block">
                  기사 연락처
                  <input
                    type="tel"
                    className="mt-1 min-h-11 w-full rounded-lg border px-3"
                    value={routeDraft.driverPhone}
                    onChange={(e) => setRouteDraft({ ...routeDraft, driverPhone: e.target.value })}
                    placeholder="예: 010-1234-5678"
                    maxLength={32}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeDraft.is_active}
                    onChange={(e) => setRouteDraft({ ...routeDraft, is_active: e.target.checked })}
                  />
                  활성 노선
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="min-h-11 px-4" onClick={() => setRouteModalOpen(false)}>취소</button>
                <button type="button" className="min-h-11 rounded-lg bg-slate-900 px-4 text-white" onClick={saveRoute}>저장</button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4">
              <h2 className="text-lg font-bold text-rose-700">노선 삭제</h2>
              <p className="mt-2 text-sm text-slate-600">
                「{deleteConfirm.name}」을 삭제하면 연결된 정류장이 함께 삭제되고, 탑승 등록의 노선·정류장 참조는 해제됩니다.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="min-h-11 px-4" onClick={() => setDeleteConfirm(null)}>취소</button>
                <button type="button" className="min-h-11 rounded-lg bg-rose-600 px-4 text-white" onClick={confirmDeleteRoute}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ShuttleManageGate>
  );
};
