import { resolveStorageKey } from '@/services/adapters/storageContext';

/**
 * 멀티테넌트 로컬스토리지 키 격리 유틸리티
 * 
 * 조직 ID(organizationId)가 존재할 경우 `${baseKey}_${organizationId}` 형태로 키를 변환하여
 * 동일 브라우저 환경에서 테넌트 간 로컬 캐시/목업 데이터 침범을 원천 차단합니다.
 */
export function getTenantStorageKey(baseKey: string): string {
  try {
    return resolveStorageKey(baseKey);
  } catch {
    return baseKey;
  }
}
