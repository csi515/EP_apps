import type { Session } from '@supabase/supabase-js';
import type { OrganizationMembership } from '@/core/organizations/services/organizationService';
import type { MemberRole, Organization } from '@/lib/supabase';
import {
  buildLocalSession,
  getLocalAuthToken,
  notifyLocalAuthListeners,
  setLocalAuthToken,
  subscribeLocalAuth,
} from './localSessionStore';

const API_BASE =
  String(import.meta.env?.VITE_AUTH_API_BASE ?? '').trim() || '/api/local-auth';

type LocalUserDto = {
  id: string;
  email: string;
  full_name: string;
  must_change_password?: boolean;
};

type MembershipDto = {
  membership_id: string;
  organization_id: string;
  role: string;
  staff_id: string | null;
  parent_customer_id: string | null;
  is_current_context: boolean;
  organization_role_id?: string | null;
  organization_role_name?: string | null;
  permissions?: Record<string, boolean>;
  feature_permissions?: Record<string, boolean>;
  organization_name: string;
  organization_industry_type: string;
  organization_slug: string | null;
  organization_settings: Record<string, unknown>;
  organization_is_active: boolean;
  organization_public_code: string;
};

export type LocalOrgRoleDto = {
  id: string;
  name: string;
  rank_order: number;
  permissions: Record<string, boolean>;
  description?: string;
  is_system?: boolean;
};

export type LocalOrgMemberDto = {
  id: string;
  user_id: string;
  role: string;
  organization_role_id: string | null;
  feature_permissions: Record<string, boolean>;
  email?: string;
  name?: string;
  is_active?: boolean;
};

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null }
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = init?.token === undefined ? getLocalAuthToken() : init.token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `로컬 인증 요청 실패 (${res.status})`);
  }
  return data;
}

/** PostgREST Authorization 헤더에 JWT 주입 (Supabase Auth 세션 없이) */
async function syncSupabaseJwt(accessToken: string | null, _expiresIn = 14 * 24 * 60 * 60): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    const rest = (supabase as unknown as { rest?: { headers: Record<string, string> } }).rest;
    if (!rest?.headers) return;
    if (accessToken) {
      rest.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete rest.headers.Authorization;
    }
  } catch {
    /* PostgREST/클라이언트 미기동 시 무시 */
  }
}

export async function localSignIn(email: string, password: string): Promise<Session> {
  const data = await apiFetch<{
    access_token: string;
    user: LocalUserDto;
    expires_in: number;
  }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    token: null,
  });

  setLocalAuthToken(data.access_token);
  await syncSupabaseJwt(data.access_token, data.expires_in);
  const session = buildLocalSession(data.access_token, data.user, data.expires_in);
  notifyLocalAuthListeners(session);
  return session;
}

export async function localGetSession(): Promise<Session | null> {
  // cookie 세션도 허용: 토큰 없어도 /session 호출
  const token = getLocalAuthToken();
  const data = await apiFetch<{
    session: { access_token: string; user: LocalUserDto } | null;
  }>('/session', { token: token ?? null });

  if (!data.session) {
    setLocalAuthToken(null);
    return null;
  }

  if (data.session.access_token) {
    setLocalAuthToken(data.session.access_token);
    await syncSupabaseJwt(data.session.access_token);
  }
  return buildLocalSession(data.session.access_token, data.session.user);
}

export async function localSignOut(): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>('/logout', { method: 'POST' });
  } finally {
    setLocalAuthToken(null);
    await syncSupabaseJwt(null);
    notifyLocalAuthListeners(null);
  }
}

export function localOnAuthStateChange(
  callback: (session: Session | null) => void
): () => void {
  return subscribeLocalAuth(callback);
}

export async function localFetchMemberships(): Promise<OrganizationMembership[]> {
  const data = await apiFetch<{ memberships: MembershipDto[] }>('/memberships');
  return (data.memberships ?? []).map((row) => ({
    id: row.membership_id,
    organizationId: row.organization_id,
    role: row.role as MemberRole,
    staffId: row.staff_id,
    parentCustomerId: row.parent_customer_id,
    isCurrentContext: row.is_current_context,
    organizationRoleId: row.organization_role_id ?? null,
    organizationRoleName: row.organization_role_name ?? null,
    permissions: row.permissions ?? {},
    featurePermissions: row.feature_permissions ?? {},
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      industry_type: row.organization_industry_type,
      slug: row.organization_slug,
      settings: row.organization_settings,
      is_active: row.organization_is_active,
      public_code: row.organization_public_code,
      created_at: '',
      updated_at: '',
    } as Organization,
  }));
}

export async function localSetActiveMembership(membershipId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>('/memberships/active', {
    method: 'POST',
    body: JSON.stringify({ membership_id: membershipId }),
  });
}

export async function localClearActiveMembership(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/memberships/clear', { method: 'POST' });
}

export async function localListOrgRoles(organizationId: string): Promise<LocalOrgRoleDto[]> {
  const data = await apiFetch<{ roles: LocalOrgRoleDto[] }>(
    `/organizations/${encodeURIComponent(organizationId)}/roles`
  );
  return data.roles ?? [];
}

/** 초기 설정: 직급 일괄 등록 (이름·rank_order·permissions) */
export async function localReplaceOrgRoles(
  organizationId: string,
  roles: Array<{
    id?: string;
    name: string;
    rank_order?: number;
    permissions?: Record<string, boolean>;
  }>,
  options?: { replace?: boolean }
): Promise<{ seeded: number }> {
  const data = await apiFetch<{ seeded: number }>(
    `/organizations/${encodeURIComponent(organizationId)}/roles`,
    {
      method: options?.replace === false ? 'POST' : 'PUT',
      body: JSON.stringify({
        roles,
        replace: options?.replace !== false,
      }),
    }
  );
  return { seeded: data.seeded ?? roles.length };
}

export async function localSaveOrgRole(input: {
  organizationId: string;
  id?: string | null;
  name: string;
  rank_order?: number;
  permissions: Record<string, boolean>;
}): Promise<void> {
  await apiFetch(`/organizations/${encodeURIComponent(input.organizationId)}/roles`, {
    method: 'POST',
    body: JSON.stringify({
      replace: false,
      roles: [
        {
          id: input.id || undefined,
          name: input.name,
          rank_order: input.rank_order,
          permissions: input.permissions,
        },
      ],
    }),
  });
}

export async function localListOrgMembers(organizationId: string): Promise<LocalOrgMemberDto[]> {
  const data = await apiFetch<{ members: LocalOrgMemberDto[] }>(
    `/organizations/${encodeURIComponent(organizationId)}/members`
  );
  return data.members ?? [];
}

export async function localAssignMemberRole(
  memberId: string,
  roleId: string | null,
  reason = ''
): Promise<void> {
  await apiFetch(`/members/${encodeURIComponent(memberId)}/role`, {
    method: 'POST',
    body: JSON.stringify({ role_id: roleId, reason }),
  });
}

export async function localGrantMemberFeaturePermission(
  memberId: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  await apiFetch(`/members/${encodeURIComponent(memberId)}/feature-permissions`, {
    method: 'POST',
    body: JSON.stringify({ feature_key: featureKey, enabled }),
  });
}

export async function localUpdateOrganization(
  organizationId: string,
  patch: { name?: string; settings?: Record<string, unknown> }
): Promise<void> {
  await apiFetch(`/organizations/${encodeURIComponent(organizationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
