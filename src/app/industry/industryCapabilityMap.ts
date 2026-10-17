/**
 * Industry → Capability runtime composition. Composition SoT.
 * Core catalog와 독립이다. Core는 @/capabilities 구현을 import하지 않는다.
 */
import type { CapabilityId } from '@/capabilities';
import { getIndustryDefinition, type IndustryType } from '@/core/industry/catalog';
import {
  isIndustryCapabilityDefaultOn,
  isIndustryCapabilityEnabled,
  type IndustryCapabilityFlagMap,
  type IndustryCapabilityId,
} from '@/core/industry/industryCapabilities';

declare module '@/core/industry/industryCapabilities' {
  interface IndustryCapabilityIds extends Record<CapabilityId, true> {}
}

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _capabilityIdsMatch: AssertEqual<IndustryCapabilityId, CapabilityId> = true;
void _capabilityIdsMatch;

/** Industry별 실행 시 켤 capability + 업종 기본 활성 플래그. */
export type IndustryRuntimeCapabilityComposition = {
  capabilities: IndustryCapabilityFlagMap;
  defaults: IndustryCapabilityFlagMap;
};

export const INDUSTRY_CAPABILITY_COMPOSITION = {
  piano: {
    capabilities: {
      roster: true,
      scheduling: true,
      billing: true,
      attendance: true,
      parent: true,
      enrollment: true,
      consultation: true,
      resources: true,
      booking: true,
    },
    defaults: { attendance: false },
  },
  pilates: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
      attendance: true,
      billing: true,
    },
    defaults: { attendance: false },
  },
  gym: {
    capabilities: {
      roster: true,
      scheduling: true,
      attendance: true,
      billing: true,
      transport: true,
      parent: true,
      enrollment: true,
    },
    defaults: { attendance: true },
  },
  skin_clinic: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
      attendance: true,
      billing: true,
      commerce: true,
    },
    defaults: { attendance: false },
  },
  sauna_jjimjilbang: {
    capabilities: {
      roster: true,
      booking: true,
      scheduling: true,
    },
    defaults: { attendance: false },
  },
  daycare: {
    capabilities: {
      roster: true,
      attendance: true,
      parent: true,
      scheduling: true,
      billing: true,
      enrollment: true,
      consultation: true,
    },
    defaults: { attendance: true },
  },
  retail: {
    capabilities: {
      roster: true,
      commerce: true,
    },
    defaults: { attendance: false },
  },
} as const satisfies Record<string, IndustryRuntimeCapabilityComposition>;

import { getIndustryPreset } from '@/app/presets/presetRegistry';

function resolveComposition(
  industry: IndustryType | string | null | undefined
): IndustryRuntimeCapabilityComposition | undefined {
  if (!industry) return undefined;
  const def = getIndustryDefinition(industry);
  const id = def?.id ?? industry;
  const dedicated = INDUSTRY_CAPABILITY_COMPOSITION[id as keyof typeof INDUSTRY_CAPABILITY_COMPOSITION];
  const preset = getIndustryPreset(id) ?? getIndustryPreset(String(industry));

  if (dedicated) {
    if (!preset) return dedicated;
    const capabilities: Record<string, boolean> = { ...dedicated.capabilities };
    for (const cap of preset.capabilities) {
      capabilities[cap] = true;
    }
    return {
      capabilities: capabilities as IndustryCapabilityFlagMap,
      defaults: dedicated.defaults,
    };
  }

  // Fallback: 7대 전용 모듈 외 업종은 Preset 정의(전방위 원자적 Capability)로부터 런타임 역량을 도출
  if (preset) {
    const caps = preset.capabilities;
    const capabilities: Record<string, boolean> = {
      roster: true,
      attendance: caps.includes('attendance'),
      scheduling: caps.includes('booking') || caps.includes('shift_schedule'),
      billing: caps.includes('billing_invoicing') || caps.includes('ledger_simple'),
      booking: caps.includes('booking') || caps.includes('seat_room'),
      commerce: caps.includes('inventory') || caps.includes('credit_wallet'),
      resources: caps.includes('seat_room') || caps.includes('rental_equipment'),
      consultation: caps.includes('consultation_crm'),
      parent: caps.includes('attendance') && preset.category === 'education',
      enrollment: preset.category === 'education',
    };

    // 프리셋에 선언된 61개 모든 원자적 Capability 번들을 동적으로 활성화
    for (const cap of caps) {
      capabilities[cap] = true;
    }

    return {
      capabilities: capabilities as IndustryCapabilityFlagMap,
      defaults: {
        attendance: caps.includes('attendance'),
      },
    };
  }

  return undefined;
}

export function getIndustryCapabilities(
  industry: IndustryType | string | null | undefined
): IndustryCapabilityFlagMap {
  return { ...(resolveComposition(industry)?.capabilities ?? {}) };
}

export function hasIndustryCapability(
  industry: IndustryType | string | null | undefined,
  capabilityId: string
): boolean {
  return isIndustryCapabilityEnabled(resolveComposition(industry)?.capabilities, capabilityId);
}

export function hasIndustryCapabilityDefault(
  industry: IndustryType | string | null | undefined,
  capabilityId: string
): boolean {
  return isIndustryCapabilityDefaultOn(resolveComposition(industry)?.defaults, capabilityId);
}

export type { IndustryCapabilityFlagMap, IndustryCapabilityId } from '@/core/industry/industryCapabilities';
export type { CapabilityId };
export type { IndustryCatalogMetadata } from '@/core/industry/catalog';
