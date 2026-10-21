import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { filterRowsByMemberDepartmentScope, type DepartmentScopeType } from '@/core/organizations/departmentScope';

export type StockLocation = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  departmentId: string | null;
  isActive: boolean;
};

type StockLocationRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  department_id: string | null;
  is_active: boolean;
};

function ensureClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  return getCoreClient();
}

function mapRow(row: StockLocationRow): StockLocation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    departmentId: row.department_id,
    isActive: row.is_active,
  };
}

/** 자재 창고(부서 연동) CRUD·스코프 필터 */
export const stockLocationService = {
  async ensureCentral(organizationId: string): Promise<string> {
    const client = ensureClient();
    const { data, error } = await client.rpc(
      'ensure_central_stock_location_id' as never,
      { p_organization_id: organizationId } as never
    );
    if (error) throw error;
    const id = typeof data === 'string' ? data : String(data ?? '');
    if (!id) throw new Error('중앙 창고를 준비하지 못했습니다.');
    return id;
  },

  async listLocations(organizationId: string): Promise<StockLocation[]> {
    const client = ensureClient();
    await this.ensureCentral(organizationId);
    const { data, error } = await client
      .from('stock_locations' as never)
      .select('id, organization_id, name, code, department_id, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('code', { ascending: true });
    if (error) throw error;
    return ((data as StockLocationRow[] | null) ?? []).map(mapRow);
  },

  /** 부서 스코프 적용. department_id NULL(central)은 항상 포함. */
  filterByMemberScope(
    locations: StockLocation[],
    input: {
      scopeType: DepartmentScopeType;
      memberDepartmentId: string | null;
      memberPath: string | null;
      departmentPathById: ReadonlyMap<string, string>;
    }
  ): StockLocation[] {
    return filterRowsByMemberDepartmentScope(
      locations.map((loc) => ({ ...loc, department_id: loc.departmentId })),
      input
    ).map(({ department_id: _d, ...rest }) => rest as StockLocation);
  },

  async createDepartmentLocation(input: {
    organizationId: string;
    name: string;
    code: string;
    departmentId: string;
  }): Promise<StockLocation> {
    const client = ensureClient();
    const name = input.name.trim();
    const code = input.code.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    if (!name) throw new Error('창고 이름을 입력해 주세요.');
    if (code.length < 2) throw new Error('창고 코드가 올바르지 않습니다.');
    if (code === 'central') throw new Error('central 코드는 예약되어 있습니다.');
    if (!input.departmentId) throw new Error('부서를 선택해 주세요.');

    const { data, error } = await client
      .from('stock_locations' as never)
      .insert({
        organization_id: input.organizationId,
        name,
        code,
        department_id: input.departmentId,
        is_active: true,
        metadata: { kind: 'department' },
      } as never)
      .select('id, organization_id, name, code, department_id, is_active')
      .single();
    if (error) throw error;
    return mapRow(data as StockLocationRow);
  },
};
