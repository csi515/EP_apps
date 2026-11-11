import { DEVICE_ONLY_PERSISTED_KEYS, type StorageKey } from './storageKeys';

let organizationId: string | null = null;
let industryType: string | null = null;

export function getOrganizationId(): string | null {
  return organizationId;
}

export function setOrganizationId(id: string | null): void {
  organizationId = id;
}

export function getIndustryType(): string | null {
  return industryType;
}

export function setIndustryType(type: string | null): void {
  industryType = type;
}

/** device-only 키(ACTIVE_USER 등)는 테넌트와 무관한 브라우저 세션 — org suffix 금지 */
export function isDeviceOnlyStorageKey(baseKey: string): boolean {
  return DEVICE_ONLY_PERSISTED_KEYS.has(baseKey as StorageKey);
}

/** org 스코프 localStorage 키 생성 */
export function resolveStorageKey(baseKey: string): string {
  if (organizationId && !isDeviceOnlyStorageKey(baseKey)) {
    return `${baseKey}_${organizationId}`;
  }
  return baseKey;
}
