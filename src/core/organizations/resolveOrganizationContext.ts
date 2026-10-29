/**
 * OrganizationProvider 선택/부트스트랩 순수 로직.
 * 부작용(localStorage·React setState)은 Provider가 commit 시 수행한다.
 *
 * 개념 분리:
 * - Organization Selection = selectedMembership (및 localStorage org id)
 * - Portal Mode = none | parent (고객 포털 제거; parent도 EP_apps에서 비활성)
 */
import type { MemberRole } from '../../lib/supabase';
import type { UserRole } from '../../types';
import type { OrganizationMembership } from './services/organizationService';

export const STAFF_ROLES = new Set<string>([
  'owner',
  'admin',
  'manager',
  'staff',
  'instructor',
]);
export const CUSTOMER_ROLES = new Set<string>(['customer', 'member']);

/** 앱 포털 모드 — 조직 선택(selectedMembership)과 별개. 고객 포털 제거. */
export type AppPortalMode = 'none' | 'parent';

export type MembershipStorageAction =
  | { action: 'store'; organizationId: string }
  | { action: 'clear' }
  | { action: 'unchanged' };

export type MembershipSelectionResult = {
  membership: OrganizationMembership | null;
  storage: MembershipStorageAction;
};

/** membershipId로 선택. null/빈 목록 → 선택 해제(storage 유지). 미존재 id → 해제 + storage clear. */
export function resolveMembershipById(
  memberships: OrganizationMembership[],
  membershipId: string | null
): MembershipSelectionResult {
  if (!membershipId || memberships.length === 0) {
    return { membership: null, storage: { action: 'unchanged' } };
  }
  const membership = memberships.find((m) => m.id === membershipId);
  if (membership) {
    return {
      membership,
      storage: { action: 'store', organizationId: membership.organizationId },
    };
  }
  return { membership: null, storage: { action: 'clear' } };
}

/** organizationId로 선택(동일 org 내 첫 멤버십). 규칙은 resolveMembershipById와 대칭. */
export function resolveMembershipByOrganizationId(
  memberships: OrganizationMembership[],
  organizationId: string | null
): MembershipSelectionResult {
  if (!organizationId || memberships.length === 0) {
    return { membership: null, storage: { action: 'unchanged' } };
  }
  const membership = memberships.find((m) => m.organizationId === organizationId);
  if (membership) {
    return {
      membership,
      storage: { action: 'store', organizationId },
    };
  }
  return { membership: null, storage: { action: 'clear' } };
}

/**
 * 방금 생성한 사업장은 현재 렌더의 memberships에 없을 수 있다.
 * refresh 직후 최신 목록에서 다시 찾는다.
 */
export function resolveMembershipAfterRefresh(
  currentMemberships: OrganizationMembership[],
  latestMemberships: OrganizationMembership[],
  organizationId: string
): MembershipSelectionResult {
  const current = resolveMembershipByOrganizationId(currentMemberships, organizationId);
  if (current.membership) return current;
  return resolveMembershipByOrganizationId(latestMemberships, organizationId);
}

export type PortalAccessFlags = {
  canAccessParentPortal: boolean;
  canAccessCustomerPortal: boolean;
  isParentOnly: boolean;
  isCustomerOnly: boolean;
};

export function computePortalAccessFlags(
  memberships: OrganizationMembership[],
  opts: {
    blockedOwnerOrgIds: string[];
    portalChildren: number;
    parentId: string | null;
  }
): PortalAccessFlags & {
  staffMemberships: OrganizationMembership[];
  customerMemberships: OrganizationMembership[];
  hasParentAccess: boolean;
} {
  const blocked = new Set(opts.blockedOwnerOrgIds);
  const isBlockedOwner = (m: OrganizationMembership) =>
    m.role === 'owner' && blocked.has(m.organizationId);

  const staffMemberships = memberships.filter(
    (m) => STAFF_ROLES.has(m.role) && !isBlockedOwner(m)
  );
  const customerMemberships = memberships.filter((m) => CUSTOMER_ROLES.has(m.role));
  const hasLegacyParentMembership = memberships.some(
    (m) => m.role === 'parent' || m.role === 'guardian'
  );
  const hasParentAccess = opts.portalChildren > 0 || hasLegacyParentMembership;

  const isParentOnly =
    staffMemberships.length === 0 && hasParentAccess && customerMemberships.length === 0;
  const isCustomerOnly =
    staffMemberships.length === 0 && !hasParentAccess && customerMemberships.length > 0;

  return {
    staffMemberships,
    customerMemberships,
    hasParentAccess,
    // parentId 없으면 포털 진입 불가 (프로필 미확보). membership 없음만으로 parent 단정하지 않음.
    canAccessParentPortal: hasParentAccess && opts.parentId !== null,
    canAccessCustomerPortal: customerMemberships.length > 0,
    isParentOnly,
    isCustomerOnly,
  };
}

/**
 * 로그인/refresh 후 어떤 선택·포털로 갈지.
 * Provider의 refreshOrganizations 분기 순서를 그대로 보존한다.
 */
export type OrganizationBootstrapDecision =
  | { kind: 'enter_parent' }
  | { kind: 'select_membership'; membershipId: string }
  | { kind: 'select_organization'; organizationId: string }
  | { kind: 'select_organization_or_clear'; organizationId: string | null };

/** 부트스트랩 결정을 Provider가 실행할 계획으로 변환 (포털 모드 ≠ 조직 선택) */
export type BootstrapApplyPlan = {
  portalMode: AppPortalMode;
  /** null membershipId = 선택 해제. organizationId 경로는 resolveMembershipByOrganizationId */
  selection:
    | { by: 'membership'; membershipId: string | null }
    | { by: 'organization'; organizationId: string | null };
  clearStoredOrganizationId: boolean;
};

export function planBootstrapApply(
  decision: OrganizationBootstrapDecision
): BootstrapApplyPlan {
  switch (decision.kind) {
    case 'enter_parent':
      return {
        portalMode: 'parent',
        selection: { by: 'membership', membershipId: null },
        clearStoredOrganizationId: true,
      };
    case 'select_membership':
      return {
        portalMode: 'none',
        selection: { by: 'membership', membershipId: decision.membershipId },
        clearStoredOrganizationId: false,
      };
    case 'select_organization':
      return {
        portalMode: 'none',
        selection: { by: 'organization', organizationId: decision.organizationId },
        clearStoredOrganizationId: false,
      };
    case 'select_organization_or_clear':
      return {
        portalMode: 'none',
        selection: { by: 'organization', organizationId: decision.organizationId },
        clearStoredOrganizationId: false,
      };
    default: {
      const _exhaustive: never = decision;
      return _exhaustive;
    }
  }
}

export function resolveOrganizationBootstrap(input: {
  memberships: OrganizationMembership[];
  blockedOwnerOrgIds: string[];
  portalChildren: number;
  parentId: string | null;
  parentPortalModeActive: boolean;
  storedOrganizationId: string | null;
}): {
  flags: PortalAccessFlags;
  decision: OrganizationBootstrapDecision;
} {
  const access = computePortalAccessFlags(input.memberships, {
    blockedOwnerOrgIds: input.blockedOwnerOrgIds,
    portalChildren: input.portalChildren,
    parentId: input.parentId,
  });
  const {
    staffMemberships,
    isParentOnly,
    isCustomerOnly,
    canAccessParentPortal,
    canAccessCustomerPortal,
  } = access;

  const flags: PortalAccessFlags = {
    canAccessParentPortal,
    canAccessCustomerPortal,
    isParentOnly,
    isCustomerOnly,
  };

  const blocked = new Set(input.blockedOwnerOrgIds);
  const isBlockedOwner = (m: OrganizationMembership) =>
    m.role === 'owner' && blocked.has(m.organizationId);

  // EP_apps: 학부모·수강생 포털 진입 없음. 멤버십이 있으면 워크스페이스로 바로 진입한다.

  // 1. 활성 컨텍스트 멤버십
  const currentContextMembership = input.memberships.find((m) => m.isCurrentContext);
  if (currentContextMembership && !isBlockedOwner(currentContextMembership)) {
    return {
      flags,
      decision: { kind: 'select_membership', membershipId: currentContextMembership.id },
    };
  }

  // 2. staff 없고 blocked owner만
  if (staffMemberships.length === 0) {
    const blockedOwner = input.memberships.find((m) => isBlockedOwner(m));
    if (blockedOwner) {
      return {
        flags,
        decision: {
          kind: 'select_organization',
          organizationId: blockedOwner.organizationId,
        },
      };
    }
  }

  // 3. stored → 첫 staff → 첫 멤버십. 목록 화면 없이 자동 선택.
  // membership 0건 → organizationId null (소속 없음 안내).
  const storedMembership = input.storedOrganizationId
    ? input.memberships.find((m) => m.organizationId === input.storedOrganizationId)
    : undefined;
  const storedUsable = Boolean(storedMembership && !isBlockedOwner(storedMembership));
  const firstUsable =
    staffMemberships[0] ??
    input.memberships.find((m) => !isBlockedOwner(m)) ??
    input.memberships[0];
  const autoId = storedUsable
    ? input.storedOrganizationId
    : firstUsable?.organizationId ?? null;

  return {
    flags,
    decision: { kind: 'select_organization_or_clear', organizationId: autoId },
  };
}

/** selectedMembership에서 context에 노출하는 파생 필드 */
export function deriveSelectionFields(membership: OrganizationMembership | null): {
  currentOrganization: OrganizationMembership['organization'] | null;
  currentRole: MemberRole | null;
  currentStaffId: string | null;
  currentParentCustomerId: string | null;
} {
  if (!membership) {
    return {
      currentOrganization: null,
      currentRole: null,
      currentStaffId: null,
      currentParentCustomerId: null,
    };
  }
  return {
    currentOrganization: membership.organization,
    currentRole: membership.role,
    currentStaffId: membership.staffId,
    currentParentCustomerId: membership.parentCustomerId,
  };
}

/**
 * StorageService activeUser.role 파생.
 * membership 없음 ≠ parent. 포털 모드가 parent일 때만 parent로 확정.
 * loading 중에는 null → sync skip.
 * 선택·포털 모두 없으면 'member'(최소 권한 placeholder).
 */
export function resolveActiveUserRole(input: {
  loading: boolean;
  currentRole: MemberRole | null;
  portalMode: AppPortalMode;
}): UserRole | null {
  if (input.loading) return null;
  if (input.currentRole) return input.currentRole as UserRole;
  if (input.portalMode === 'parent') return 'parent';
  return 'member';
}

export function portalModeToFlags(mode: AppPortalMode): {
  parentPortalActive: boolean;
  customerPortalActive: boolean;
} {
  return {
    parentPortalActive: mode === 'parent',
    customerPortalActive: false,
  };
}

export type OrganizationSessionState = {
  flags: PortalAccessFlags;
  decision: OrganizationBootstrapDecision;
  selectedMembership: OrganizationMembership | null;
  portalMode: AppPortalMode;
  storage: MembershipStorageAction;
  storedOrganizationId: string | null;
};

/**
 * login/refresh 후 Provider가 커밋하는 선택 상태.
 * 업종 필드를 읽지 않는다.
 */
export function applyBootstrapToSession(
  input: Parameters<typeof resolveOrganizationBootstrap>[0]
): OrganizationSessionState {
  const { flags, decision } = resolveOrganizationBootstrap(input);
  const plan = planBootstrapApply(decision);
  const result =
    plan.selection.by === 'membership'
      ? resolveMembershipById(input.memberships, plan.selection.membershipId)
      : resolveMembershipByOrganizationId(input.memberships, plan.selection.organizationId);

  const storage: MembershipStorageAction =
    plan.clearStoredOrganizationId && result.storage.action !== 'store'
      ? { action: 'clear' }
      : result.storage;

  let storedOrganizationId = input.storedOrganizationId;
  if (storage.action === 'store') storedOrganizationId = storage.organizationId;
  else if (storage.action === 'clear') storedOrganizationId = null;

  return {
    flags,
    decision,
    selectedMembership: result.membership,
    portalMode: plan.portalMode,
    storage,
    storedOrganizationId,
  };
}

/** 사업장 전환 시 이전 org local state를 새 org에 쓰지 않는다. */
export function nextOrganizationLocalStateAction(
  previousOrganizationId: string | null | undefined,
  nextOrganizationId: string
): 'clear' | 'keep' {
  return previousOrganizationId !== nextOrganizationId ? 'clear' : 'keep';
}

/** selectedMembership이 선택 SoT인지. 테스트·회귀에서 사용. */
export function assertSelectionInvariant(membership: OrganizationMembership | null): void {
  const fields = deriveSelectionFields(membership);
  if (!membership) {
    if (fields.currentOrganization != null) {
      throw new Error('selectedMembership이 없으면 currentOrganization도 null이어야 한다');
    }
    return;
  }
  if (fields.currentOrganization?.id !== membership.organizationId) {
    throw new Error(
      `currentOrganization.id (${fields.currentOrganization?.id}) !== selectedMembership.organizationId (${membership.organizationId})`
    );
  }
  if (fields.currentOrganization.id !== membership.organization.id) {
    throw new Error(
      `currentOrganization.id (${fields.currentOrganization.id}) !== membership.organization.id (${membership.organization.id})`
    );
  }
}
