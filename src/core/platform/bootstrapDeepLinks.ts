import { parseDeepLinksFromUrl } from './deepLinkParser';
import {
  notifyStaffLinkPending,
  parseStaffLinkFromUrl,
  storePendingStaffLink,
} from './pendingStaffLink';

/**
 * EP_apps: 스태프 초대 딥링크만 처리.
 * 학부모(guardian) 포털 딥링크·활성화는 제거됨.
 */

/** @deprecated 학부모 포털 제거 — 호환용 이벤트명만 유지 */
export const GUARDIAN_LINK_PENDING_EVENT = 'ep:guardian-link-pending';

/** 네이티브/유니버설 링크 URL 문자열 → pending session 저장 */
export function applyDeepLinkFromString(url: string): void {
  const { staffLink } = parseDeepLinksFromUrl(url);
  if (staffLink) {
    storePendingStaffLink(staffLink);
    notifyStaffLinkPending();
  }
}

/** 웹/PWA: 현재 URL 쿼리(staff_link)를 sessionStorage에 저장하고 URL에서 제거 */
export function bootstrapWebDeepLinks(): void {
  const staff = parseStaffLinkFromUrl();
  if (staff) {
    storePendingStaffLink(staff);
    notifyStaffLinkPending();
  }
}
