/**
 * EP_apps는 공유 전용 모듈 바인딩이 없다.
 */
export const SHARED_MODULE_BY_INDUSTRY: Readonly<Record<string, string>> = {};

export function resolveSharedModuleId(
  industryType?: string | null
): string | null {
  const raw = industryType?.trim();
  if (!raw) return null;
  return SHARED_MODULE_BY_INDUSTRY[raw] ?? null;
}
