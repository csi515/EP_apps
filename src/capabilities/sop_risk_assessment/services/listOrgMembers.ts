import { getCoreClient } from '@/lib/supabase/client';
import type { OrgMemberOption } from '../domain/sopStepDocument';

function permissionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, flag]) => flag === true)
      .map(([key]) => key);
  }
  return [];
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listOrgMembers(organizationId: string): Promise<OrgMemberOption[]> {
  const client = getCoreClient();
  const joined = await client
    .from('organization_members')
    .select(
      'user_id, role, profiles!organization_members_user_id_fkey(full_name), tenant_roles!organization_members_custom_role_id_fkey(permissions)'
    )
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (!joined.error && joined.data) {
    return (joined.data as unknown as Array<Record<string, unknown>>).map((row) => {
      const profile = firstRow(row.profiles as { full_name: string | null } | { full_name: string | null }[] | null);
      const roleRow = firstRow(
        row.tenant_roles as { permissions: unknown } | { permissions: unknown }[] | null
      );
      const userId = String(row.user_id);
      const role = String(row.role ?? 'staff');
      return {
        userId,
        role,
        name: profile?.full_name?.trim() || role,
        permissions: permissionList(roleRow?.permissions),
      };
    });
  }

  const fallback = await client
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true);
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    name: row.role,
    permissions: [],
  }));
}
