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

// 업종별 표준 추천값 (Pre-fill Recommendations)
export function getStandardPresetsForIndustry(industry: string): {
  roles: PresetRoleConfig[];
  rooms?: PresetRoomConfig[];
  locker_count?: number;
  operating_hours: PresetOperatingHoursConfig;
} {
  const normKey = normalizeIndustryKey(industry);

  switch (normKey) {
    case 'piano':
      return {
        roles: [
          { name: '원장', rank_order: 1, permissions: ['*'] },
          { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'passes:view'] },
          { name: '파트타임', rank_order: 3, permissions: ['attendance:checkin'] },
        ],
        rooms: [
          { name: '그랜드룸', capacity: 2 },
          { name: '일반 1호', capacity: 1 },
          { name: '일반 2호', capacity: 1 },
          { name: '일반 3호', capacity: 1 },
          { name: '일반 4호', capacity: 1 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '13:00',
          end_time: '19:00',
          slot_minutes: 30,
        },
      };

    case 'sauna':
      return {
        roles: [
          { name: '사장', rank_order: 1, permissions: ['*'] },
          { name: '주간 카운터', rank_order: 2, permissions: ['passes:*', 'lockers:*'] },
          { name: '야간 카운터', rank_order: 3, permissions: ['passes:deduct', 'lockers:assign'] },
        ],
        locker_count: 50,
        operating_hours: {
          day_type: 'ALL_WEEK',
          start_time: '05:00',
          end_time: '23:00',
          slot_minutes: 60,
        },
      };

    case 'pilates':
      return {
        roles: [
          { name: '대표', rank_order: 1, permissions: ['*'] },
          { name: '수석강사', rank_order: 2, permissions: ['passes:*', 'booking:*'] },
          { name: '강사', rank_order: 3, permissions: ['attendance:checkin'] },
        ],
        rooms: [
          { name: '리포머룸', capacity: 6 },
          { name: '체어룸', capacity: 6 },
          { name: '개인레슨실', capacity: 1 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '21:00',
          slot_minutes: 50,
        },
      };

    case 'custom':
      return {
        roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '18:00',
          slot_minutes: 60,
        },
      };

    case 'manufacturing_light':
      return {
        roles: [
          { name: '공장장/관리자', rank_order: 1, permissions: ['*'] },
          { name: '생산반장', rank_order: 2, permissions: ['task_pipeline:*', 'recipe_bom:*', 'inventory:*', 'quality_inspection:*', 'maintenance_checklist:*'] },
          { name: '현장작업자', rank_order: 3, permissions: ['task_pipeline:view', 'task_pipeline:update', 'sop_risk_assessment:view', 'maintenance_checklist:submit', 'feedbacks:create'] },
        ],
        rooms: [
          { name: '1호 가공 라인', capacity: 10 },
          { name: '2호 조립 라인', capacity: 10 },
          { name: '검사실/완제품실', capacity: 5 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '08:00',
          end_time: '17:00',
          slot_minutes: 60,
        },
      };

    case 'iso_human_capital':
      return {
        roles: [
          { name: '대표이사/총괄임원', rank_order: 1, permissions: ['*'] },
          { name: '인사팀장/HRD', rank_order: 2, permissions: ['mbo:*', 'work_attendance_payroll:*', 'workplace_policy:*', 'feedbacks:*', 'approval_workflow:*'] },
          { name: '부서장/팀장', rank_order: 2, permissions: ['mbo:update', 'shift_schedule:*', 'feedbacks:view', 'approval_workflow:submit'] },
          { name: '사원/팀원', rank_order: 3, permissions: ['mbo:view', 'workplace_policy:view', 'feedbacks:create', 'work_attendance_payroll:view'] },
        ],
        rooms: [
          { name: '본사 대회의실', capacity: 20 },
          { name: 'HR 상담실', capacity: 4 },
          { name: '교육 세미나실', capacity: 30 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '18:00',
          slot_minutes: 60,
        },
      };

    case 'rnd_lab_management':
      return {
        roles: [
          { name: '연구소장/센터장', rank_order: 1, permissions: ['*'] },
          { name: '수석/책임연구원', rank_order: 2, permissions: ['research_project:*', 'task_pipeline:*', 'resources:*', 'patent_ip_asset:*', 'equipment_lifecycle:*', 'mbo:*'] },
          { name: '선임/전임연구원', rank_order: 3, permissions: ['research_project:update', 'task_pipeline:update', 'resources:book', 'patent_ip_asset:submit', 'sop_risk_assessment:view'] },
        ],
        rooms: [
          { name: '정밀분석기기실 (FE-SEM/XRD)', capacity: 1 },
          { name: '항온항습 신뢰성평가실', capacity: 2 },
          { name: '제1합성실험실 (Lab 1)', capacity: 8 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '18:00',
          slot_minutes: 60,
        },
      };

    default: {
      const preset = getIndustryPreset(normKey);
      if (preset) {
        const roles: PresetRoleConfig[] =
          preset.roles && preset.roles.length > 0
            ? preset.roles.map((r) => ({
                name: r.name,
                rank_order: r.rank_order,
                permissions: [...r.permissions],
              }))
            : [{ name: '대표', rank_order: 1, permissions: ['*'] }];

        const rooms: PresetRoomConfig[] | undefined =
          preset.resourceTypes && preset.resourceTypes.length > 0
            ? preset.resourceTypes.map((rt) => ({
                name: rt.name,
                capacity:
                  rt.capacity ?? (rt.type === 'bay' || rt.type === 'court' || rt.type === 'room' || rt.type === 'line' ? 2 : 1),
              }))
            : undefined;

        const locker_count = preset.capabilities.includes('locker') ? 50 : undefined;

        let operating_hours: PresetOperatingHoursConfig;
        if (preset.category === 'fitness' || preset.category === 'wellness') {
          operating_hours = {
            day_type: 'ALL_WEEK',
            start_time: '06:00',
            end_time: '23:00',
            slot_minutes: 60,
          };
        } else if (preset.category === 'education' || preset.category === 'childcare') {
          operating_hours = {
            day_type: 'WEEKDAY',
            start_time: '13:00',
            end_time: '21:00',
            slot_minutes: 30,
          };
        } else if (preset.category === 'beauty') {
          operating_hours = {
            day_type: 'WEEKDAY',
            start_time: '10:00',
            end_time: '20:00',
            slot_minutes: 60,
          };
        } else if (preset.category === 'manufacturing') {
          operating_hours = {
            day_type: 'WEEKDAY',
            start_time: '08:00',
            end_time: '17:00',
            slot_minutes: 60,
          };
        } else if (preset.category === 'studio' || (preset.category as string) === 'space_rental') {
          operating_hours = {
            day_type: 'ALL_WEEK',
            start_time: '09:00',
            end_time: '22:00',
            slot_minutes: 60,
          };
        } else {
          operating_hours = {
            day_type: 'WEEKDAY',
            start_time: '09:00',
            end_time: '18:00',
            slot_minutes: 60,
          };
        }

        return {
          roles,
          rooms,
          locker_count,
          operating_hours,
        };
      }

      return {
        roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '18:00',
          slot_minutes: 60,
        },
      };
    }
  }
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
