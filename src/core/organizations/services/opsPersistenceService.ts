import { getCoreClient } from '@/lib/supabase';
import { filterRowsByDepartmentScope } from '@/core/organizations/departmentScope';

export type OpsTableName =
  | 'seat_rooms'
  | 'rental_equipments'
  | 'equipment_lifecycle'
  | 'maintenance_checklists'
  | 'safety_consents'
  | 'sop_risk_assessment'
  | 'hygiene_haccp_log'
  | 'space_turnarounds'
  | 'safety_consent_signatures';

export async function listOpsRows<T extends object>(
  table: OpsTableName,
  organizationId: string,
  options?: { departmentId?: string | null; scoped?: boolean },
): Promise<T[]> {
  const client = getCoreClient();
  const { data, error } = await client
    .from(table as never)
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as T[];
  if (options?.scoped && options.departmentId) {
    return filterRowsByDepartmentScope(
      rows as Array<T & { department_id?: string | null }>,
      true,
      options.departmentId,
    );
  }
  return rows;
}

export async function upsertOpsRow(
  table: OpsTableName,
  organizationId: string,
  row: Record<string, unknown>,
): Promise<void> {
  const client = getCoreClient();
  const payload = {
    ...row,
    organization_id: organizationId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from(table as never).upsert(payload as never);
  if (error) throw new Error(error.message);
}

export async function insertOpsRow(
  table: OpsTableName,
  organizationId: string,
  row: Record<string, unknown>,
): Promise<string> {
  const client = getCoreClient();
  const id = typeof row.id === 'string' ? row.id : crypto.randomUUID();
  const { error } = await client.from(table as never).insert({
    ...row,
    id,
    organization_id: organizationId,
  } as never);
  if (error) throw new Error(error.message);
  return id;
}

export async function updateOpsRow(
  table: OpsTableName,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const client = getCoreClient();
  const { error } = await client
    .from(table as never)
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteOpsRow(table: OpsTableName, id: string): Promise<void> {
  const client = getCoreClient();
  const { error } = await client.from(table as never).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** 예약 종료 시 턴어라운드 행 생성 */
export async function createTurnaroundFromBooking(input: {
  organizationId: string;
  roomId: string;
  roomName: string;
  bookingId: string;
  serviceStartAt: string;
  serviceEndAt: string;
  bufferMinutes: number;
  departmentId?: string | null;
}): Promise<string> {
  const bufferEnd = new Date(
    new Date(input.serviceEndAt).getTime() + input.bufferMinutes * 60_000,
  ).toISOString();
  return insertOpsRow('space_turnarounds', input.organizationId, {
    room_id: input.roomId,
    room_name: input.roomName,
    booking_id: input.bookingId,
    service_start_at: input.serviceStartAt,
    service_end_at: input.serviceEndAt,
    buffer_minutes: input.bufferMinutes,
    buffer_end_at: bufferEnd,
    status: 'cleaning_needed',
    checklist: [
      { id: 'wipe', item: '표면 소독', done: false },
      { id: 'reset', item: '비품 원위치', done: false },
    ],
    department_id: input.departmentId ?? null,
  });
}
