/**
 * Tenant Custom Addon & Billing Engine
 *
 * Core-Capability-Preset 원칙을 준수하는 순수 도메인 엔진.
 * - 글로벌 프리셋 무결성을 보존하면서 테넌트별 유료 애드온(custom_addons) 동적 결합
 * - 플랜 기본료와 장착 애드온 개수에 따른 월 청구 금액 자동 산출
 * - 프리셋 기본 기능과 미활성 애드온 목록 필터링 및 유효성 검증
 */

import { CAPABILITY_MANIFESTS, getCapabilityDisplayName } from '@/capabilities';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import type { SubscriptionPlan } from './adminTenantService';

export const DEFAULT_ADDON_UNIT_PRICE = 20000;

export const PLAN_BASE_FEES: Record<SubscriptionPlan, number> = {
  'Free Trial': 0,
  Basic: 19000,
  Pro: 29000,
  Enterprise: 59000,
};

export interface AddonBillingInfo {
  base_fee: number;
  addons_total: number;
  total_monthly_fee: number;
}

export interface AddonCapabilityOption {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
}

/**
 * 플랜과 애드온 목록에 기반한 월 청구 금액 계산
 */
export function calculateAddonBilling(
  plan: SubscriptionPlan,
  customAddons: string[],
  unitPrice: number = DEFAULT_ADDON_UNIT_PRICE
): AddonBillingInfo {
  const base_fee = PLAN_BASE_FEES[plan] ?? 29000;
  const addons_total = (customAddons.length || 0) * unitPrice;
  const total_monthly_fee = base_fee + addons_total;

  return {
    base_fee,
    addons_total,
    total_monthly_fee,
  };
}

/**
 * 특정 업종 프리셋에서 추가 가능한 애드온 Capability 목록을 조회합니다.
 * (프리셋 기본 기능 및 이미 장착된 애드온은 제외)
 */
export function getAvailableAddonCapabilities(
  presetId: string,
  currentAddons: string[] = [],
  unitPrice: number = DEFAULT_ADDON_UNIT_PRICE
): AddonCapabilityOption[] {
  const preset = getIndustryPreset(presetId);
  const presetCaps = new Set<string>((preset?.capabilities ?? []) as string[]);
  const currentAddonSet = new Set<string>(currentAddons);

  const descMap = new Map<string, string>();
  for (const manifest of CAPABILITY_MANIFESTS) {
    if (manifest.definition?.id) {
      const desc = (manifest.definition as unknown as { description?: string }).description;
      if (desc) {
        descMap.set(manifest.definition.id, desc);
      }
    }
  }

  const options: AddonCapabilityOption[] = [];

  for (const manifest of CAPABILITY_MANIFESTS) {
    const id = manifest.definition.id;
    // 프리셋 기본 제공 기능이 아니고, 아직 장착되지 않은 경우만 후보로 노출
    if (!presetCaps.has(id) && !currentAddonSet.has(id)) {
      options.push({
        id,
        name: getCapabilityDisplayName(id),
        description: descMap.get(id) || `${getCapabilityDisplayName(id)} 기능 모듈`,
        unitPrice,
      });
    }
  }

  // 한글 이름 순 정렬
  return options.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/**
 * 애드온 추가 유효성 검증
 */
export function validateAddonAddition(
  capId: string,
  currentAddons: string[],
  presetCapabilities: string[]
): { valid: boolean; error?: string } {
  if (!capId || typeof capId !== 'string') {
    return { valid: false, error: '추가할 기능 식별자를 입력해야 합니다.' };
  }

  const presetSet = new Set(presetCapabilities);
  if (presetSet.has(capId)) {
    return {
      valid: false,
      error: '해당 기능은 현재 사업장 프리셋에서 이미 기본 제공 중인 기능입니다.',
    };
  }

  const addonSet = new Set(currentAddons);
  if (addonSet.has(capId)) {
    return { valid: false, error: '이미 장착된 애드온입니다.' };
  }

  const exists = CAPABILITY_MANIFESTS.some((m) => m.definition.id === capId);
  if (!exists) {
    return { valid: false, error: '존재하지 않는 Capability 식별자입니다.' };
  }

  return { valid: true };
}

/**
 * 애드온 제거 유효성 검증
 */
export function validateAddonRemoval(
  capId: string,
  currentAddons: string[]
): { valid: boolean; error?: string } {
  const addonSet = new Set(currentAddons);
  if (!addonSet.has(capId)) {
    return { valid: false, error: '제거할 애드온이 현재 장착 목록에 존재하지 않습니다.' };
  }

  return { valid: true };
}

/**
 * 프리셋 기본 기능과 커스텀 애드온을 안전하게 합집합으로 병합
 */
export function mergeEffectiveCapabilities(
  presetCapabilities: string[] = [],
  customAddons: string[] = [],
  activeCapabilities: string[] = []
): string[] {
  const set = new Set<string>();

  presetCapabilities.forEach((c) => set.add(c));
  customAddons.forEach((c) => set.add(c));
  activeCapabilities.forEach((c) => set.add(c));

  return Array.from(set);
}
