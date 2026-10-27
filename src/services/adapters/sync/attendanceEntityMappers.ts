// @ts-nocheck
import type { Json } from '@/lib/supabase/database.types';

export type CheckInMethod = 'pin' | 'qr' | 'nfc' | 'kiosk' | 'manual';

export interface AttendanceSession {
  id: string;
  customerId: string;
  customerName: string;
  sessionDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  checkInMethod?: CheckInMethod;
  checkOutMethod?: CheckInMethod;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
}

type DbCheckInMethod = 'pin' | 'qr' | 'nfc' | 'kiosk' | 'manual';

export function sessionToCoreRow(session: AttendanceSession, organizationId: string) {
  return {
    id: session.id,
    organization_id: organizationId,
    customer_id: session.customerId,
    session_date: session.sessionDate,
    check_in_at: session.checkInAt || null,
    check_out_at: session.checkOutAt || null,
    check_in_method: (session.checkInMethod as DbCheckInMethod) || null,
    check_out_method: (session.checkOutMethod as DbCheckInMethod) || null,
    memo: session.memo || null,
    metadata: { customerName: session.customerName } as Json,
  };
}

export function coreRowToSession(row: {
  id: string;
  customer_id: string;
  session_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_method: DbCheckInMethod | null;
  check_out_method: DbCheckInMethod | null;
  memo: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}): AttendanceSession {
  const meta = (row.metadata || {}) as { customerName?: string };
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: meta.customerName || '',
    sessionDate: row.session_date,
    checkInAt: row.check_in_at || undefined,
    checkOutAt: row.check_out_at || undefined,
    checkInMethod: row.check_in_method || undefined,
    checkOutMethod: row.check_out_method || undefined,
    memo: row.memo || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 고객 PIN 해시 → 로컬 미러 행 (학원 출결 잔여 호환) */
export function pinRowsFromCustomers(
  customers: Array<{ id: string; check_in_pin_hash?: string | null }>
): Array<{ customerId: string; pinHash: string }> {
  return customers
    .filter((c) => Boolean(c.check_in_pin_hash))
    .map((c) => ({ customerId: c.id, pinHash: String(c.check_in_pin_hash) }));
}
