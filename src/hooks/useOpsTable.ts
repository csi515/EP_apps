import { useCallback, useEffect, useState } from 'react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  insertOpsRow,
  listOpsRows,
  updateOpsRow,
  type OpsTableName,
} from '@/core/organizations/services/opsPersistenceService';

/** Ops 테이블 CRUD 훅. localStorage 시드를 대체한다. */
export function useOpsTable<T extends { id: string; department_id?: string | null }>(
  table: OpsTableName,
) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id ?? null;
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orgId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(await listOpsRows<T>(table, orgId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조회 실패');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, table]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (row: Omit<T, 'id'> & { id?: string }) => {
      if (!orgId) throw new Error('organization required');
      const id = await insertOpsRow(table, orgId, row as Record<string, unknown>);
      await reload();
      return id;
    },
    [orgId, reload, table],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      await updateOpsRow(table, id, patch as Record<string, unknown>);
      await reload();
    },
    [reload, table],
  );

  return { rows, loading, error, reload, create, update, organizationId: orgId };
}
