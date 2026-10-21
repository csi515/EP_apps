import { useCallback, useMemo } from 'react';
import { useCreate, useList, useUpdate } from '@refinedev/core';
import type { PatentAsset } from '../domain/patentIpAssetEngine';
import {
  patentAssetToInsert,
  patentAssetToUpdate,
  patentRowToAsset,
  type PatentRow,
} from '../services/patentMappers';

export function usePatentWorkspace(organizationId: string | null | undefined) {
  const enabled = Boolean(organizationId);

  const { query } = useList<PatentRow>({
    resource: 'patents',
    meta: { schema: 'core' },
    filters: enabled
      ? [{ field: 'organization_id', operator: 'eq', value: organizationId }]
      : [],
    sorters: [{ field: 'created_at', order: 'desc' }],
    pagination: { pageSize: 200 },
    queryOptions: { enabled },
  });

  const { mutate: createMutate } = useCreate();
  const { mutate: updateMutate } = useUpdate();

  const patents = useMemo(() => {
    const rows = (query?.data?.data as PatentRow[] | undefined) ?? [];
    return rows.map(patentRowToAsset);
  }, [query?.data?.data]);

  const persistPatent = useCallback(
    (asset: PatentAsset, mode: 'create' | 'update') => {
      if (!organizationId) return Promise.reject(new Error('organization required'));
      return new Promise<PatentAsset>((resolve, reject) => {
        if (mode === 'create') {
          createMutate(
            {
              resource: 'patents',
              values: patentAssetToInsert(organizationId, asset),
              meta: { schema: 'core' },
            },
            {
              onSuccess: (res) => {
                const row = res.data as PatentRow;
                resolve(patentRowToAsset(row));
                void query?.refetch?.();
              },
              onError: (err) => reject(err),
            },
          );
        } else {
          updateMutate(
            {
              resource: 'patents',
              id: asset.id,
              values: patentAssetToUpdate(asset),
              meta: { schema: 'core' },
            },
            {
              onSuccess: () => {
                resolve(asset);
                void query?.refetch?.();
              },
              onError: (err) => reject(err),
            },
          );
        }
      });
    },
    [organizationId, createMutate, updateMutate, query],
  );

  return {
    patents,
    isLoading: query?.isLoading ?? false,
    refetch: query?.refetch,
    persistPatent,
  };
}
