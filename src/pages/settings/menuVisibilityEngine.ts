import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { CAPABILITY_MANIFESTS, getCapabilityDisplayName } from '@/capabilities';

export interface PresetMenuItem {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  isVisible: boolean;
}

/**
 * 특정 업종 프리셋에 포함된 Capability 메뉴 목록을 반환합니다.
 * 프리셋에 정의되지 않은 타 업종 Capability는 엄격히 제외(화이트리스트)됩니다.
 */
export function getPresetMenuItems(presetId: string, hiddenCapabilities: string[] = []): PresetMenuItem[] {
  const preset = getIndustryPreset(presetId);
  if (!preset) return [];

  const capabilities = (preset.capabilities ?? []) as string[];
  const requiredSet = new Set<string>((preset.requiredCapabilities ?? []) as string[]);
  const hiddenSet = new Set<string>(hiddenCapabilities);

  // Manifest 설명 맵 구성
  const descMap = new Map<string, string>();
  for (const manifest of CAPABILITY_MANIFESTS) {
    if (manifest.definition?.id) {
      const desc = (manifest.definition as unknown as { description?: string }).description;
      if (desc) {
        descMap.set(manifest.definition.id, desc);
      }
    }
  }

  return capabilities.map((id) => {
    const isRequired = requiredSet.has(id);
    const isHidden = !isRequired && hiddenSet.has(id);
    return {
      id,
      name: getCapabilityDisplayName(id),
      description: descMap.get(id) || `${getCapabilityDisplayName(id)} 기능 모듈`,
      isRequired,
      isVisible: !isHidden,
    };
  });
}

/**
 * 특정 Capability가 프리셋에서 필수 기능인지 검사합니다.
 */
export function isCapabilityRequired(presetId: string, capId: string): boolean {
  const preset = getIndustryPreset(presetId);
  if (!preset) return false;
  const requiredSet = new Set<string>((preset.requiredCapabilities ?? []) as string[]);
  return requiredSet.has(capId);
}

/**
 * Capability 표시 여부를 토글합니다.
 * 필수 기능은 절대로 숨길 수 없으며 항상 표시 상태를 유지합니다.
 */
export function toggleCapabilityVisibility(
  presetId: string,
  currentHidden: string[],
  capId: string
): string[] {
  // 필수 기능 보호 가드
  if (isCapabilityRequired(presetId, capId)) {
    return currentHidden.filter((id) => id !== capId);
  }

  const hiddenSet = new Set(currentHidden);
  if (hiddenSet.has(capId)) {
    hiddenSet.delete(capId);
  } else {
    hiddenSet.add(capId);
  }

  return Array.from(hiddenSet);
}

/**
 * 네비게이션/사이드바에 최종 노출될 유효한 Capability ID 목록을 계산합니다.
 */
export function getEffectiveSidebarCapabilities(
  presetId: string,
  hiddenCapabilities: string[] = []
): string[] {
  const preset = getIndustryPreset(presetId);
  if (!preset) return [];

  const capabilities = (preset.capabilities ?? []) as string[];
  const requiredSet = new Set<string>((preset.requiredCapabilities ?? []) as string[]);
  const hiddenSet = new Set<string>(hiddenCapabilities);

  // 필수 기능은 항상 노출, 그 외는 hiddenSet에 없는 것만 노출
  return capabilities.filter((id) => requiredSet.has(id) || !hiddenSet.has(id));
}
