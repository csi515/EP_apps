/**
 * EP_apps 포털 모드 — 고객 포털만 유지.
 * 학부모 포털(parent) 활성화는 제거됨 (항상 inactive).
 */

const CUSTOMER_PORTAL_MODE_KEY = 'ep_customer_portal_active';
const LEGACY_CUSTOMER_PORTAL_MODE_KEY = 'moa_customer_portal_active';

/** @deprecated EP_apps에서는 학부모 포털 없음 — 항상 false */
export function isParentPortalModeActive(): boolean {
  return false;
}

/** @deprecated EP_apps에서는 학부모 포털 없음 — no-op */
export function setParentPortalModeActive(_active: boolean): void {
  /* parent portal removed */
}

export function isCustomerPortalModeActive(): boolean {
  try {
    const current = sessionStorage.getItem(CUSTOMER_PORTAL_MODE_KEY);
    if (current === '1') return true;
    if (current != null) return false;
    const legacy = sessionStorage.getItem(LEGACY_CUSTOMER_PORTAL_MODE_KEY);
    if (legacy === '1') {
      sessionStorage.setItem(CUSTOMER_PORTAL_MODE_KEY, '1');
      sessionStorage.removeItem(LEGACY_CUSTOMER_PORTAL_MODE_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setCustomerPortalModeActive(active: boolean): void {
  try {
    if (active) {
      sessionStorage.setItem(CUSTOMER_PORTAL_MODE_KEY, '1');
    } else {
      sessionStorage.removeItem(CUSTOMER_PORTAL_MODE_KEY);
    }
    sessionStorage.removeItem(LEGACY_CUSTOMER_PORTAL_MODE_KEY);
  } catch {
    /* ignore */
  }
}
