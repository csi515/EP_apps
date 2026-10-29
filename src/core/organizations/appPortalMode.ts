/**
 * EP_apps 포털 모드 — 학부모·고객 포털 제거됨.
 * 레거시 sessionStorage 키만 정리한다.
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

/** @deprecated 고객 포털 제거 — 항상 false, 잔여 키 정리 */
export function isCustomerPortalModeActive(): boolean {
  try {
    sessionStorage.removeItem(CUSTOMER_PORTAL_MODE_KEY);
    sessionStorage.removeItem(LEGACY_CUSTOMER_PORTAL_MODE_KEY);
  } catch {
    /* ignore */
  }
  return false;
}

/** @deprecated 고객 포털 제거 — 잔여 키만 삭제 */
export function setCustomerPortalModeActive(_active: boolean): void {
  try {
    sessionStorage.removeItem(CUSTOMER_PORTAL_MODE_KEY);
    sessionStorage.removeItem(LEGACY_CUSTOMER_PORTAL_MODE_KEY);
  } catch {
    /* ignore */
  }
}
