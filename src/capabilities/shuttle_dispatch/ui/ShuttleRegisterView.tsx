import React, { useEffect, useMemo, useState } from 'react';
import { useCreate, useInvalidate, useList, useUpdate } from '@refinedev/core';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { showToast } from '@/shared/feedback/uiFeedback';
import { canActivateShuttleRegistration } from '../domain/shuttleRosterEngine';
import { WorkPageFrame } from '@/shared/components/ui/WorkPageFrame';
import { ContentFadeIn } from '@/shared/components/ui/ContentFadeIn';
import { ShuttleRegisterDriverContacts } from './ShuttleRegisterDriverContacts';
import { ShuttleRegisterFormCard } from './ShuttleRegisterFormCard';
import { ShuttleRegisterMyList } from './ShuttleRegisterMyList';
import type {
  ShuttleRegistrationRow,
  ShuttleRouteRow,
  ShuttleStopRow,
} from './shuttleRegisterTypes';

export const ShuttleRegisterView: React.FC = () => {
  const { currentOrganization, selectedMembership } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const memberId = selectedMembership?.id ?? null;
  const invalidate = useInvalidate();

  const [useShuttle, setUseShuttle] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');

  const { query: routesQuery } = useList<ShuttleRouteRow>({
    resource: 'shuttle_routes',
    meta: { schema: 'core' },
    filters: orgId
      ? [{ field: 'tenant_id', operator: 'eq', value: orgId }, { field: 'is_active', operator: 'eq', value: true }]
      : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: Boolean(orgId) },
  });

  const { query: myRegsQuery } = useList<ShuttleRegistrationRow>({
    resource: 'shuttle_registrations',
    meta: { schema: 'core' },
    filters:
      orgId && memberId
        ? [
            { field: 'tenant_id', operator: 'eq', value: orgId },
            { field: 'member_id', operator: 'eq', value: memberId },
          ]
        : [],
    pagination: { pageSize: 50 },
    queryOptions: { enabled: Boolean(orgId && memberId) },
  });

  const { query: routeActiveRegsQuery } = useList<ShuttleRegistrationRow>({
    resource: 'shuttle_registrations',
    meta: { schema: 'core' },
    filters:
      orgId && routeId
        ? [
            { field: 'tenant_id', operator: 'eq', value: orgId },
            { field: 'route_id', operator: 'eq', value: routeId },
            { field: 'is_active', operator: 'eq', value: true },
          ]
        : [],
    pagination: { pageSize: 500 },
    queryOptions: { enabled: Boolean(orgId && routeId) },
  });

  const { query: stopsQuery } = useList<ShuttleStopRow>({
    resource: 'shuttle_stops',
    meta: { schema: 'core' },
    filters: routeId ? [{ field: 'route_id', operator: 'eq', value: routeId }] : [],
    sorters: [{ field: 'stop_order', order: 'asc' }],
    pagination: { pageSize: 100 },
    queryOptions: { enabled: Boolean(routeId) },
  });

  const routes = (routesQuery.data?.data as ShuttleRouteRow[]) ?? [];
  const myRegistrations = ((myRegsQuery.data?.data as ShuttleRegistrationRow[]) ?? []).filter(
    (r) => r.route_id,
  );
  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const selectedRoute = routeById.get(routeId) ?? null;
  const existingForRoute = myRegistrations.find((r) => r.route_id === routeId) ?? null;
  const stops = (stopsQuery.data?.data as ShuttleStopRow[]) ?? [];
  const activeCount = ((routeActiveRegsQuery.data?.data as ShuttleRegistrationRow[]) ?? []).length;
  const capacity = selectedRoute?.capacity ?? 0;
  const pickupOptions = useMemo(() => stops.filter((s) => s.is_pickup), [stops]);
  const dropoffOptions = useMemo(() => stops.filter((s) => s.is_dropoff), [stops]);

  useEffect(() => {
    if (!routeId) return;
    if (existingForRoute) {
      setUseShuttle(existingForRoute.is_active);
      setPickupStopId(existingForRoute.pickup_stop_id ?? '');
      setDropoffStopId(existingForRoute.dropoff_stop_id ?? '');
      return;
    }
    setUseShuttle(true);
    setPickupStopId('');
    setDropoffStopId('');
  }, [
    routeId,
    existingForRoute?.id,
    existingForRoute?.is_active,
    existingForRoute?.pickup_stop_id,
    existingForRoute?.dropoff_stop_id,
  ]);

  const { mutate: createReg, mutation: createMutation } = useCreate();
  const { mutate: updateReg, mutation: updateMutation } = useUpdate();
  const saving = createMutation.isPending || updateMutation.isPending;

  function refreshLists() {
    void invalidate({ resource: 'shuttle_registrations', invalidates: ['list'] });
  }

  function loadRegistration(reg: ShuttleRegistrationRow) {
    if (!reg.route_id) return;
    setRouteId(reg.route_id);
    setUseShuttle(reg.is_active);
    setPickupStopId(reg.pickup_stop_id ?? '');
    setDropoffStopId(reg.dropoff_stop_id ?? '');
  }

  function save() {
    if (!orgId || !memberId) return;
    if (!routeId) {
      showToast('이용 노선을 선택하세요.', 'error');
      return;
    }
    if (useShuttle && (!pickupStopId || !dropoffStopId)) {
      showToast('노선과 승·하차 정류장을 모두 선택하세요.', 'error');
      return;
    }

    const alreadyActiveOnRoute = existingForRoute?.is_active === true;
    if (
      useShuttle &&
      !canActivateShuttleRegistration(activeCount, capacity, alreadyActiveOnRoute)
    ) {
      showToast(`선택한 노선 정원이 마감되었습니다 (${activeCount}/${capacity}).`, 'error');
      return;
    }

    const values = {
      tenant_id: orgId,
      member_id: memberId,
      route_id: routeId,
      pickup_stop_id: useShuttle ? pickupStopId : null,
      dropoff_stop_id: useShuttle ? dropoffStopId : null,
      is_active: useShuttle,
      updated_at: new Date().toISOString(),
    };

    const onDone = {
      onSuccess: () => {
        showToast('셔틀 이용 설정이 저장되었습니다.', 'success');
        refreshLists();
      },
      onError: (e: { message?: string }) => showToast(e.message ?? '저장 실패', 'error'),
    };

    // 노선별 upsert: 다른 노선 등록은 건드리지 않음
    if (existingForRoute?.id) {
      updateReg(
        { resource: 'shuttle_registrations', id: existingForRoute.id, values, meta: { schema: 'core' } },
        onDone,
      );
      return;
    }

    createReg({ resource: 'shuttle_registrations', values, meta: { schema: 'core' } }, onDone);
  }

  function deactivateRegistration(reg: ShuttleRegistrationRow) {
    if (!reg.is_active) return;
    updateReg(
      {
        resource: 'shuttle_registrations',
        id: reg.id,
        values: { is_active: false, updated_at: new Date().toISOString() },
        meta: { schema: 'core' },
      },
      {
        onSuccess: () => {
          showToast('해당 노선 이용을 중지했습니다.', 'success');
          refreshLists();
          if (reg.route_id === routeId) setUseShuttle(false);
        },
        onError: (e) => showToast(e.message ?? '저장 실패', 'error'),
      },
    );
  }

  return (
    <WorkPageFrame width="form">
      <header>
        <h1 className="text-xl font-bold text-slate-900">내 통근 셔틀 설정</h1>
        <p className="text-sm text-slate-500">
          출근·퇴근 등 노선별로 각각 등록할 수 있습니다. 한 번 설정하면 매일 동일하게 적용됩니다.
        </p>
      </header>

      <ContentFadeIn motionKey={`${routeId}-${myRegistrations.length}`} className="space-y-6">
        <ShuttleRegisterMyList
          registrations={myRegistrations}
          routeById={routeById}
          selectedRouteId={routeId}
          saving={saving}
          onEdit={loadRegistration}
          onDeactivate={deactivateRegistration}
        />

        <ShuttleRegisterDriverContacts routes={routes} selectedRouteId={routeId} />

        <ShuttleRegisterFormCard
          useShuttle={useShuttle}
          onUseShuttleChange={setUseShuttle}
          routeId={routeId}
          onRouteIdChange={setRouteId}
          routes={routes}
          myRegistrations={myRegistrations}
          selectedRoute={selectedRoute}
          existingForRoute={existingForRoute}
          activeCount={activeCount}
          capacity={capacity}
          pickupStopId={pickupStopId}
          dropoffStopId={dropoffStopId}
          onPickupChange={setPickupStopId}
          onDropoffChange={setDropoffStopId}
          pickupOptions={pickupOptions}
          dropoffOptions={dropoffOptions}
          saving={saving}
          canSave={Boolean(orgId && memberId)}
          onSave={save}
        />
      </ContentFadeIn>
    </WorkPageFrame>
  );
};
