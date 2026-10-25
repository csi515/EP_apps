import { z } from 'zod';
import {
  CAPABILITY_BUNDLES,
  getIndustryPreset,
} from './presetRegistry';
import type {
  CapabilityModuleBundle,
  CapabilitySetupSchema,
  PresetCapabilityId,
  SetupFieldDefinition,
} from '@/core/presets/types';

export interface IndustryQuestionField extends SetupFieldDefinition {
  capabilityId: PresetCapabilityId;
  capabilityTitle: string;
}

export interface PresetRoleConfig {
  name: string;
  rank_order: number;
  permissions: string[];
}

export interface PresetRoomConfig {
  name: string;
  capacity?: number;
}

export interface PresetOperatingHoursConfig {
  day_type: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface PresetPayload {
  industry: string;
  roles: PresetRoleConfig[];
  rooms?: PresetRoomConfig[];
  locker_count?: number;
  operating_hours: PresetOperatingHoursConfig;
  capabilities?: readonly PresetCapabilityId[];
  business_rules?: Record<string, unknown>;
  [key: string]: unknown;
}

// 4대 주요 업종 및 기본 Capability 맵
const INDUSTRY_CAPABILITY_MAP: Record<string, PresetCapabilityId[]> = {
  piano: ['seat_room', 'attendance', 'passes', 'consultation_crm'],
  piano_academy: ['seat_room', 'attendance', 'passes', 'consultation_crm'],
  sauna: ['locker', 'passes', 'credit_wallet'],
  sauna_jjimjilbang: ['locker', 'passes', 'credit_wallet'],
  pilates: ['seat_room', 'booking', 'passes', 'instructor_match'],
  custom: [],
};

// 업종 정규화 순수 함수
export function normalizeIndustryKey(industry: string): string {
  const norm = (industry || '').toLowerCase().trim();
  if (norm === 'piano_academy' || norm === 'piano') return 'piano';
  if (norm === 'sauna' || norm === 'sauna_jjimjilbang') return 'sauna';
  if (norm === 'pilates') return 'pilates';
  if (norm === 'taekwondo' || norm === 'taekwondo_academy') return 'taekwondo_academy';
  if (norm === 'manufacturing_light' || norm === 'manufacturing') return 'manufacturing_light';
  if (norm === 'iso_human_capital' || norm === 'human_capital') return 'iso_human_capital';
  if (norm === 'rnd_lab_management' || norm === 'rnd_lab' || norm === 'rnd') return 'rnd_lab_management';
  if (norm === 'custom') return 'custom';
  return norm;
}

// 업종별 활성 Capability 질문 목록 반환
export function getQuestionsForIndustry(industry: string): IndustryQuestionField[] {
  const normKey = normalizeIndustryKey(industry);

  let capIds: readonly PresetCapabilityId[] = [];

  if (normKey in INDUSTRY_CAPABILITY_MAP) {
    capIds = INDUSTRY_CAPABILITY_MAP[normKey];
  } else {
    // 8대 기존 프리셋에서 조회
    const preset = getIndustryPreset(normKey);
    if (preset) {
      capIds = preset.capabilities;
    }
  }

  const questions: IndustryQuestionField[] = [];
  const seenFieldIds = new Set<string>();

  for (const capId of capIds) {
    const bundle: CapabilityModuleBundle | undefined = CAPABILITY_BUNDLES[capId];
    if (!bundle || !bundle.setupSchema) continue;

    for (const field of bundle.setupSchema.fields) {
      const fieldKey = `${capId}_${field.id}`;
      if (!seenFieldIds.has(fieldKey)) {
        seenFieldIds.add(fieldKey);
        questions.push({
          ...field,
          capabilityId: capId,
          capabilityTitle: bundle.setupSchema.title,
        });
      }
    }
  }

  return questions;
}

// 업종별 표준 추천값 (Pre-fill Recommendations) - Zero-Condition Data-Driven
export function getStandardPresetsForIndustry(industry: string): {
  roles: PresetRoleConfig[];
  rooms?: PresetRoomConfig[];
  locker_count?: number;
  operating_hours: PresetOperatingHoursConfig;
} {
  const normKey = normalizeIndustryKey(industry);
  const preset = getIndustryPreset(normKey);

  if (!preset) {
    return {
      roles: [{ name: '대표', rank_order: 1, permissions: ['*'] }],
      operating_hours: {
        day_type: 'WEEKDAY',
        start_time: '09:00',
        end_time: '18:00',
        slot_minutes: 60,
      },
    };
  }

  // 1. Roles: 프리셋 정의 우선, 없으면 terms.instructor 기반 동적 생성
  let roles: PresetRoleConfig[];
  if (preset.roles && preset.roles.length > 0) {
    roles = preset.roles.map((r) => ({
      name: r.name,
      rank_order: r.rank_order,
      permissions: [...r.permissions],
    }));
  } else if (preset.terms?.instructor) {
    roles = [
      { name: '대표/관리자', rank_order: 1, permissions: ['*'] },
      { name: preset.terms.instructor, rank_order: 2, permissions: ['passes:*', 'attendance:*', 'booking:*'] },
      { name: '스태프/직원', rank_order: 3, permissions: ['attendance:checkin'] },
    ];
  } else {
    roles = [{ name: '대표', rank_order: 1, permissions: ['*'] }];
  }

  // 2. Rooms: 프리셋 resourceTypes에서 락커를 제외한 공간/베이/룸 변환
  let rooms: PresetRoomConfig[] | undefined;
  if (preset.resourceTypes && preset.resourceTypes.length > 0) {
    const nonLockerResources = preset.resourceTypes.filter((rt) => rt.type !== 'locker');
    if (nonLockerResources.length > 0) {
      rooms = nonLockerResources.map((rt) => ({
        name: rt.name,
        capacity:
          rt.capacity ?? (rt.type === 'bay' || rt.type === 'court' || rt.type === 'room' || rt.type === 'line' ? 2 : 1),
      }));
    }
  }

  // 3. 락커: 프리셋 facilities.needsLocker 또는 capabilities.includes('locker')
  const locker_count = preset.facilities?.needsLocker
    ? (preset.facilities.defaultLockerCount ?? 50)
    : preset.capabilities.includes('locker')
    ? 50
    : undefined;

  // 4. 운영 시간: 프리셋 operatingHours 직접 사용
  const operating_hours: PresetOperatingHoursConfig = preset.operatingHours
    ? { ...preset.operatingHours }
    : {
        day_type: 'WEEKDAY',
        start_time: '09:00',
        end_time: '18:00',
        slot_minutes: 60,
      };

  return {
    roles,
    rooms,
    locker_count,
    operating_hours,
  };
}

// Zod 검증식: 퀵 온보딩 폼 기본 스키마
export const QuickSetupFormZodSchema = z.object({
  name: z.string().min(1, '사업장 이름을 입력해주세요.'),
  industry: z.string().min(1, '업종을 선택해주세요.'),
  locker_count: z.number().int().positive().optional(),
  totalLockerCount: z.number().int().positive().optional(),
  roles: z
    .array(
      z.object({
        name: z.string().min(1),
        rank_order: z.number().int(),
        permissions: z.array(z.string()),
      })
    )
    .optional(),
  rooms: z
    .array(
      z.object({
        name: z.string().min(1),
        capacity: z.number().int().positive().optional(),
      })
    )
    .optional(),
  operating_hours: z
    .object({
      day_type: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      slot_minutes: z.number().int().positive(),
    })
    .optional(),
});

// 순수 함수: 기본값과 폼 입력값을 병합하여 RPC payload JSONB 빌드
export function buildPresetPayload(
  industry: string,
  formValues: Record<string, any> = {}
): PresetPayload {
  const normKey = normalizeIndustryKey(industry);
  const defaults = getStandardPresetsForIndustry(normKey);
  const preset = getIndustryPreset(normKey);

  // 1. Roles 병합 (사용자 지정 roles 우선)
  const roles: PresetRoleConfig[] =
    Array.isArray(formValues.roles) && formValues.roles.length > 0
      ? formValues.roles
      : defaults.roles;

  // 2. Rooms 병합 (사용자 지정 rooms 우선)
  const rooms: PresetRoomConfig[] | undefined =
    Array.isArray(formValues.rooms) && formValues.rooms.length > 0
      ? formValues.rooms
      : defaults.rooms;

  // 3. 락커 수량 오버라이드 병합
  let locker_count: number | undefined;
  if (typeof formValues.locker_count === 'number') {
    locker_count = formValues.locker_count;
  } else if (typeof formValues.totalLockerCount === 'number') {
    locker_count = formValues.totalLockerCount;
  } else if (defaults.locker_count !== undefined) {
    locker_count = defaults.locker_count;
  }

  // 4. 운영 시간 병합
  const operating_hours: PresetOperatingHoursConfig = {
    day_type: formValues.operating_hours?.day_type || defaults.operating_hours.day_type,
    start_time: formValues.operating_hours?.start_time || defaults.operating_hours.start_time,
    end_time: formValues.operating_hours?.end_time || defaults.operating_hours.end_time,
    slot_minutes:
      Number(formValues.operating_hours?.slot_minutes) || defaults.operating_hours.slot_minutes,
  };

  const payload: PresetPayload = {
    industry: normKey,
    roles,
    operating_hours,
    ...(preset?.capabilities ? { capabilities: preset.capabilities } : {}),
    ...(preset?.businessRules ? { business_rules: preset.businessRules } : {}),
    ...(preset?.terms ? { terms: preset.terms } : {}),
    ...(preset?.facilities ? { facilities: preset.facilities } : {}),
    ...(preset?.defaultSettings ?? {}),
    ...formValues,
  };

  if (rooms) {
    payload.rooms = rooms;
  }
  if (locker_count !== undefined) {
    payload.locker_count = locker_count;
  }

  return payload;
}
