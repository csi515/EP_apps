import { useMemo } from 'react';
import { useList } from '@refinedev/core';
import type { ChemicalReagent, HazardClass, GhsPictogram } from '../domain/hazardousSubstanceEngine';
import {
  HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
  HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE,
} from '../persistence';

/** Supabase row shape — 마이그레이션 추가 시 스키마와 맞출 것. */
export type HazardousSubstanceRow = {
  id: string;
  name: string;
  formula?: string | null;
  cas_number?: string | null;
  hazard_classes?: HazardClass[] | null;
  ghs_pictograms?: GhsPictogram[] | null;
  storage_cabinet_id?: string | null;
  storage_cabinet_name?: string | null;
  current_stock?: number | null;
  min_safe_stock?: number | null;
  unit?: string | null;
  msds_pdf_url?: string | null;
  is_regulated_precursor?: boolean | null;
  expiration_date?: string | null;
};

export function mapHazardousSubstanceRowToReagent(row: HazardousSubstanceRow): ChemicalReagent {
  return {
    id: row.id,
    name: row.name,
    formula: row.formula ?? undefined,
    casNumber: row.cas_number ?? '',
    hazardClasses: row.hazard_classes?.length ? row.hazard_classes : ['general'],
    ghsPictograms: row.ghs_pictograms ?? [],
    storageCabinetId: row.storage_cabinet_id ?? '',
    storageCabinetName: row.storage_cabinet_name ?? '',
    currentStock: row.current_stock ?? 0,
    minSafeStock: row.min_safe_stock ?? 0,
    unit: row.unit ?? 'mL',
    msdsPdfUrl: row.msds_pdf_url,
    isRegulatedPrecursor: row.is_regulated_precursor ?? false,
    expirationDate: row.expiration_date,
  };
}

export function useHazardousSubstanceReagents() {
  const { query } = useList<HazardousSubstanceRow>({
    resource: HAZARDOUS_SUBSTANCE_REAGENT_RESOURCE,
    pagination: { pageSize: 200 },
    queryOptions: {
      enabled: HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
    },
  });

  const reagents = useMemo(() => {
    if (!HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED) {
      return [] as ChemicalReagent[];
    }
    const rows = (query.data?.data ?? []) as HazardousSubstanceRow[];
    return rows.map(mapHazardousSubstanceRowToReagent);
  }, [query.data?.data]);

  return {
    reagents,
    persistenceEnabled: HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED,
    isLoading: HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED && (query.isLoading || query.isFetching),
    isError: HAZARDOUS_SUBSTANCE_REAGENT_PERSISTENCE_ENABLED && Boolean(query.isError),
    refetch: query.refetch,
  };
}