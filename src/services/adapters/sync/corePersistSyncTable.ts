import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/supabase/database.types';
import type { PersistAbortGuard } from './syncTypes';
import { upsertThenDiffDelete } from './persistHelpers';
import { pendingDeleteIds } from '../pendingMutations';
import type { StorageKey } from '../storageKeys';

export type CoreClient = SupabaseClient<Database, 'core'>;

/**
 * Core org 테이블 upsert 후 명시적 삭제(tombstone)만 반영. false면 soft-fail(outbox 유지).
 * tombstoneKeys의 pending delete mutation id만 삭제한다 — 원격 목록과의 diff로 삭제를 추론하지 않는다.
 */
export async function syncTable(
  client: CoreClient,
  table:
    | 'staff'
    | 'customers'
    | 'services'
    | 'schedules'
    | 'payments'
    | 'payment_transactions'
    | 'expenses'
    | 'income_entries'
    | 'teacher_payroll_settlements'
    | 'consultations'
    | 'notifications'
    | 'attendance_sessions'
    | 'session_passes',
  orgId: string,
  currentIds: string[],
  upsertAll: () => Promise<boolean>,
  options: {
    cachePresent: boolean;
    context: string;
    isAborted?: PersistAbortGuard;
    /** 삭제 tombstone을 읽을 로컬 storage key */
    tombstoneKeys: StorageKey[];
  }
): Promise<boolean> {
  return upsertThenDiffDelete({
    context: options.context,
    cachePresent: options.cachePresent,
    currentIds,
    isAborted: options.isAborted,
    upsertAll,
    tombstoneIds: options.tombstoneKeys.flatMap((key) => pendingDeleteIds(key, orgId)),
    deleteIds: async (ids) => {
      const { error } = await client.from(table).delete().eq('organization_id', orgId).in('id', ids);
      return { error };
    },
  });
}
