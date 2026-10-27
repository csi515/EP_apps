/**
 * EP_apps: 학부모 포털 딥링크 동기화 제거.
 * 훅 시그니처는 OrganizationProvider 호환을 위해 유지한다.
 */
export function useGuardianDeepLinkPortalSync(
  _userId: string | undefined,
  _enterParentPortal: () => void
): void {
  /* no-op — parent portal removed */
}
