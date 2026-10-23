/**
 * 업종 플러그인 매니페스트의 선택 플래그 기본값을 한곳에 모은 표.
 * 매니페스트에 값이 없을 때(undefined/null) 이 표의 값이 실제로 쓰인다.
 *
 * 라벨 문자열(placeLabel·ownerLabel·customerLabel·feeLabel 등)은 넣지 않는다.
 * 호출부마다 기본값이 달라서(예: '사업장' vs '학원') 한 값으로 묶으면 동작이 바뀐다.
 */
import type { IndustryPluginManifest } from './pluginTypes';

export const PLUGIN_FLAG_DEFAULTS = {
  isAppointment: false,
  publicLandingAdultFirst: false,
  usesClassBasedSchedule: false,
  showSchoolFields: false,
  showPickupFields: false,
  supportsDeposit: false,
  showsTextbooksLink: false,
  runsPinCheckInSideEffects: false,
  showsMakeupList: false,
  usesWithdrawalExitLabel: false,
  savesAttendanceWithPass: false,
  showsPracticeRoomTab: false,
  showsCustomerPoints: false,
  showsAdultPracticeGuide: false,
  showsStaffPracticeGuide: false,
  includesLinkedBillingIncome: false,
  showsPerformanceVideos: false,
  showsSongStamps: false,
  attendanceSummaryMetric: 'indigo',
} as const satisfies Partial<Record<keyof IndustryPluginManifest, unknown>>;

export type PluginFlagName = keyof typeof PLUGIN_FLAG_DEFAULTS;

type Widen<T> = T extends boolean ? boolean : T extends string ? string : T;
export type PluginFlagValue<F extends PluginFlagName> = Widen<(typeof PLUGIN_FLAG_DEFAULTS)[F]>;

/**
 * 플러그인 플래그 값을 읽는다. 값이 없으면 PLUGIN_FLAG_DEFAULTS를 쓴다.
 * 불리언 플래그는 예전 `Boolean(plugin.flag)`와 같게 truthy 여부로 정규화한다.
 */
export function getPluginFlag<F extends PluginFlagName>(
  plugin: Partial<IndustryPluginManifest> | null | undefined,
  flag: F
): PluginFlagValue<F> {
  const fallback = PLUGIN_FLAG_DEFAULTS[flag];
  const raw = (plugin as Record<string, unknown> | null | undefined)?.[flag];
  if (typeof fallback === 'boolean') {
    return (raw == null ? fallback : Boolean(raw)) as PluginFlagValue<F>;
  }
  return (raw ?? fallback) as PluginFlagValue<F>;
}
