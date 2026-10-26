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

  if (hasPrefix('resources') || tokens.includes('booking:book') || tokens.includes('booking:*')) {
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

  // MBO·결재·파이프라인은 카탈로그 전용 키가 없으므로 상위 직급에 위임 관리 권한 부여
  if (hasPrefix('mbo') || hasPrefix('approval_workflow') || hasPrefix('task_pipeline')) {
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

  let seeded = 0;
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
    await saveDynamicRole({
      organizationId: input.organizationId,
      name: seed.name,
      permissions,
    });
    seeded += 1;
  }

  return { seeded, skipped: false };
}
