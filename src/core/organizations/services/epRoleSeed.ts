/**
 * EP Zero-Setup 직급 → organization_roles 1회 시드.
 * 프리셋 roles.permissions(문자열 토큰)을 RolePermissionMap으로 매핑한다.
 * (Core는 presetRegistry를 import하지 않는다 — 호출측이 presetRoles를 주입)
 */
import {
  EMPTY_ROLE_PERMISSIONS,
  ROLE_PERMISSION_KEYS,
  type RolePermissionMap,
} from '@/domain/permissions';
import { isLocalAuthEnabled } from '@/core/auth/localAuth/isLocalAuth';
import { localReplaceOrgRoles } from '@/core/auth/localAuth/localAuthApi';
import { listDynamicRoles, saveDynamicRole } from './dynamicRoleService';

export type EpSeedRoleInput = {
  name: string;
  rankOrder: number;
};

export type PresetRoleSeed = {
  name: string;
  rank_order: number;
  permissions: readonly string[];
};

/** 프리셋 Capability 권한 토큰 → RolePermissionMap 키 반영 */
export function mapPresetPermissionTokensToRoleMap(
  tokens: readonly string[]
): RolePermissionMap {
  const next: RolePermissionMap = { ...EMPTY_ROLE_PERMISSIONS };
  const setAll = (value: boolean) => {
    for (const key of ROLE_PERMISSION_KEYS) next[key] = value;
  };

  if (tokens.includes('*')) {
    setAll(true);
    return next;
  }

  const hasPrefix = (prefix: string) =>
    tokens.some((t) => t === prefix || t.startsWith(`${prefix}:`) || t === `${prefix}:*`);

  // 예약 이용(book)과 공용자원 카탈로그 관리(resources:*)는 분리한다.
  if (
    tokens.includes('booking:book') ||
    tokens.includes('booking:*') ||
    hasPrefix('booking')
  ) {
    next.booking = true;
  }
  if (hasPrefix('resources') || tokens.includes('booking:*')) {
    next.booking = true;
    next.seat_room = true;
    next.rental_equipment = true;
    next.resources_manage = true;
    next['resources:manage'] = true;
  }

  if (hasPrefix('research_project') || tokens.includes('rnd_portal:access')) {
    next['rnd_portal:access'] = true;
  }

  if (hasPrefix('whistleblower_grievance') || tokens.includes('feedbacks:*')) {
    next.grievances_manage = true;
    next['feedbacks:read_all'] = true;
  }

  if (hasPrefix('shuttle') || hasPrefix('vehicle_shuttle') || hasPrefix('shuttle_dispatch')) {
    next['shuttle:manage'] = true;
  }

  if (hasPrefix('volunteer')) {
    next['volunteer:manage'] = true;
  }

  if (hasPrefix('meal_survey')) {
    next['meal_survey:manage'] = true;
  }

  if (hasPrefix('office_supply')) {
    next['office_supply_request:manage'] = true;
  }

  // MBO·결재·파이프라인: view/submit만으로는 직급 위임 권한을 주지 않는다.
  // * / update / manage / approve 또는 도메인 전체 와일드카드만 위임 관리로 승격.
  const grantsDelegationAdmin = tokens.some((t) => {
    if (t === 'mbo:*' || t === 'approval_workflow:*' || t === 'task_pipeline:*') return true;
    if (/^(mbo|approval_workflow|task_pipeline):(update|manage|approve)\b/.test(t)) return true;
    if (t === 'task_pipeline:*') return true;
    return false;
  });
  if (grantsDelegationAdmin) {
    next['roles:assign'] = true;
    next['members:manage'] = true;
    next.members_manage = true;
    next.policies = true;
  }

  if (tokens.includes('roles:assign') || tokens.includes('members:manage')) {
    next['roles:assign'] = true;
    next['members:manage'] = true;
    next.members_manage = true;
  }

  return next;
}

function matchPresetRole(
  seed: EpSeedRoleInput,
  presetRoles: readonly PresetRoleSeed[],
  index: number
): PresetRoleSeed | null {
  if (presetRoles.length === 0) return null;
  const byName = presetRoles.find(
    (r) =>
      r.name === seed.name ||
      r.name.includes(seed.name) ||
      seed.name.includes(r.name.split(/[/\s]/)[0] ?? '')
  );
  if (byName) return byName;
  if (index < presetRoles.length) return presetRoles[index] ?? null;
  return presetRoles[presetRoles.length - 1] ?? null;
}

/**
 * Zero-Setup 완료 시 organization_roles가 비어 있으면 프리셋·위저드 직급을 1회 시드한다.
 * 이미 직급이 있으면 no-op.
 */
export async function seedEpOrganizationRoles(input: {
  organizationId: string;
  wizardRoles: EpSeedRoleInput[];
  /** 프리셋 roles 시드(호출측 getIndustryPreset에서 주입) */
  presetRoles?: readonly PresetRoleSeed[];
}): Promise<{ seeded: number; skipped: boolean }> {
  const existing = await listDynamicRoles(input.organizationId);
  if (existing.length > 0) {
    return { seeded: 0, skipped: true };
  }

  const presetRoles = input.presetRoles ?? [];

  const sources: EpSeedRoleInput[] =
    input.wizardRoles.length > 0
      ? input.wizardRoles
      : presetRoles.map((r) => ({ name: r.name, rankOrder: r.rank_order }));

  const built: Array<{
    name: string;
    rank_order: number;
    permissions: RolePermissionMap;
  }> = [];

  for (let i = 0; i < sources.length; i++) {
    const seed = sources[i]!;
    const matched = matchPresetRole(seed, presetRoles, i);
    const tokens = matched?.permissions ?? (i === 0 ? (['*'] as const) : (['mbo:view'] as const));
    const permissions = mapPresetPermissionTokensToRoleMap([...tokens]);
    // 최상위 직급은 위임·소유권 이전 포함
    if (i === 0 || tokens.includes('*')) {
      permissions['roles:assign'] = true;
      permissions['members:manage'] = true;
      permissions.members_manage = true;
      permissions['ownership:transfer'] = true;
      permissions['rnd_portal:access'] = true;
    }
    built.push({
      name: seed.name,
      rank_order: seed.rankOrder || (i + 1) * 100,
      permissions,
    });
  }

  // 사내 PG / 로컬 인증: 일괄 PUT으로 organization_roles 저장
  if (isLocalAuthEnabled()) {
    const result = await localReplaceOrgRoles(
      input.organizationId,
      built.map((r) => ({
        name: r.name,
        rank_order: r.rank_order,
        permissions: r.permissions as Record<string, boolean>,
      })),
      { replace: existing.length === 0 }
    );
    return { seeded: result.seeded, skipped: false };
  }

  let seeded = 0;
  for (const row of built) {
    await saveDynamicRole({
      organizationId: input.organizationId,
      name: row.name,
      permissions: row.permissions,
      rankOrder: row.rank_order,
    });
    seeded += 1;
  }

  return { seeded, skipped: false };
}
