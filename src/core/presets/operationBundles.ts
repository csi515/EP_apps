/**
 * [우리 매장 맞춤 세트] 카탈로그 및 연쇄 의존성 해결 엔진 (Pure Domain Engine)
 *
 * 사장님 친화적 원칙:
 *  - 기술 용어('Capability', 'Plugin', 'Pack' 등) 대신 '[우리 매장 맞춤 세트]', '[추천 운영 기능]' 사용
 *  - 사장님이 비즈니스 목적별로 직관적인 세트를 선택하면, 하위의 세부 원자적 도구(Capability)들이
 *    DAG 선행 의존성에 따라 누락 없이 자동 연쇄 활성화(Auto-Enabled)된다.
 *  - 세트 비활성화 시 다른 활성 세트가 공유하는 도구는 안전하게 보존된다.
 */

import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';
import {
  CAPABILITY_DEPENDENCY_GRAPH,
  collectRequiredPrerequisites,
  collectDependentDependents,
} from '@/core/capabilities/capabilityDependency';

/**
 * 9대 [우리 매장 맞춤 세트] 식별자
 */
export type OperationToolSetId =
  | 'attendance_safety' // [안심 등하원 및 출결 도구]
  | 'booking_timeslot' // [수업·타임슬롯 예약 도구]
  | 'staff_operations' // [직원 관리 및 매장 내규 도구]
  | 'billing_passes' // [수강료 및 정기 결제 관리 도구]
  | 'growth_records' // [원생 성장 및 수업 일지 도구]
  | 'retail_commerce' // [매점 및 물품 판매 도구]
  | 'space_rental' // [매장 공간 및 사물함 도구]
  | 'facility_care' // [현장 소통 및 시설 관리 세트]
  | 'crm_growth'; // [단골 락인 및 체험 유입 도구]

export interface OperationToolSet {
  readonly id: OperationToolSetId;
  readonly displayName: string; // 사장님 친화형 UI 명칭
  readonly shortName: string; // 모바일 탭/배지용 간결 명칭
  readonly description: string; // 매장에 생기는 변화 안내
  readonly iconName: string; // Lucide 아이콘 키
  readonly badge?: string; // 추천 태그
  readonly capabilities: readonly CapabilityId[]; // 포함되는 원자적 부품들
  readonly recommendedFor: readonly string[]; // 추천 업종 프리셋 ID
}

/**
 * 9대 맞춤 운영 도구 세트 표준 카탈로그
 */
export const OPERATION_TOOL_SETS: readonly OperationToolSet[] = [
  {
    id: 'attendance_safety',
    displayName: '[안심 등하원 및 출결 도구]',
    shortName: '안심 등하원·출결',
    description: '원생 출결 체크, 등하원 셔틀 탑승 현황 및 학부모 안심 알림을 한곳에서 관리합니다.',
    iconName: 'ShieldCheck',
    badge: '학원·교육 추천',
    capabilities: ['attendance', 'vehicle_shuttle', 'parent'],
    recommendedFor: [
      'piano',
      'taekwondo',
      'art_academy',
      'study_room',
      'english_academy',
      'math_academy',
      'ballet',
      'swimming',
      'daycare',
      'kindergarten',
      'infant_care',
      'skating',
      'kendo',
      'coding_academy',
      'robot_academy',
    ],
  },
  {
    id: 'booking_timeslot',
    displayName: '[수업·타임슬롯 예약 도구]',
    shortName: '수업·시간표 예약',
    description: '공간 및 강습 타임슬롯 예약, 이용권(회원권) 자동 차감 및 실시간 대기 순번을 제공합니다.',
    iconName: 'CalendarClock',
    badge: '예약 매장 필수',
    capabilities: ['booking', 'passes', 'seat_room', 'waitlist_turn_queue'],
    recommendedFor: [
      'pilates',
      'yoga',
      'pt_gym',
      'tennis',
      'golf_practice',
      'music_rehearsal',
      'dance_studio',
      'vocal_studio',
      'table_tennis',
    ],
  },
  {
    id: 'staff_operations',
    displayName: '[직원 관리 및 매장 내규 도구]',
    shortName: '직원 사규·근무표',
    description: '매장 사규/내규 전자 서약, 강사·직원 교대 근무표(시프트) 및 현장 업무 인수인계를 지원합니다.',
    iconName: 'UsersGear',
    badge: '직원 고용 매장 필수',
    capabilities: ['workplace_policy', 'shift_schedule', 'instructor_match', 'task_pipeline', 'feedbacks'],
    recommendedFor: ['*'], // 전 업종 공통 권장
  },
  {
    id: 'billing_passes',
    displayName: '[수강료 및 정기 결제 관리 도구]',
    shortName: '수강료·정기 결제',
    description: '원비·수강료 청구서 발행, 복합 분할 청구 및 간이 수납 원장을 관리합니다.',
    iconName: 'ReceiptText',
    badge: '정기 수납 추천',
    capabilities: ['billing_invoicing', 'package_split_billing', 'ledger_simple', 'credit_wallet'],
    recommendedFor: [
      'piano',
      'taekwondo',
      'pilates',
      'yoga',
      'pt_gym',
      'crossfit',
      'boxing',
      'study_room',
      'english_academy',
      'math_academy',
    ],
  },
  {
    id: 'growth_records',
    displayName: '[원생 성장 및 수업 일지 도구]',
    shortName: '원생 진도·성장 일지',
    description: '레슨/수업 진도 기록, 단원평가 채점 및 피트니스 체형/운동 일지를 기록합니다.',
    iconName: 'GraduationCap',
    badge: '성장 관리',
    capabilities: ['curriculum_progress', 'exam_grade_analytics', 'diet_body_log', 'learning_journal'],
    recommendedFor: [
      'piano',
      'art_academy',
      'ballet',
      'taekwondo',
      'study_room',
      'english_academy',
      'math_academy',
      'pt_gym',
      'pilates',
    ],
  },
  {
    id: 'retail_commerce',
    displayName: '[매점 및 물품 판매 도구]',
    shortName: '매점·용품 판매',
    description: '교재·운동용품 재고 관리, 매입 전표 정리 및 사전 예약 픽업 주문을 처리합니다.',
    iconName: 'ShoppingBag',
    badge: '물품 판매',
    capabilities: ['inventory', 'vendor_ap_invoice', 'pickup_orders', 'recipe_bom'],
    recommendedFor: [
      'craft_workshop',
      'baking_studio',
      'cafe_bakery',
      'pt_gym',
      'tennis',
      'golf_practice',
      'boardgame_cafe',
      'flower_shop',
    ],
  },
  {
    id: 'space_rental',
    displayName: '[매장 공간 및 사물함 도구]',
    shortName: '공간·사물함 대여',
    description: '사물함(락커) 배정, 룸/좌석 시간제 타이머 과금 및 공용 장비 대여를 관리합니다.',
    iconName: 'Box',
    badge: '공간·기물 관리',
    capabilities: ['locker', 'seat_room', 'seat_timer_billing', 'rental_equipment'],
    recommendedFor: [
      'study_cafe',
      'reading_room',
      'shared_office',
      'music_rehearsal',
      'party_room',
      'shooting_studio',
      'billiards',
      'boardgame_cafe',
    ],
  },
  {
    id: 'facility_care',
    displayName: '[현장 소통 및 시설 관리 세트]',
    shortName: '시설 점검·분실물',
    description: '시설 정기 점검표, 기물 관리, 매장 유실물/분실물 보관 및 안전 감사 일지를 작성합니다.',
    iconName: 'Wrench',
    badge: '시설 안전',
    capabilities: ['maintenance_checklist', 'equipment_lifecycle', 'lost_found', 'sop_risk_assessment', 'feedbacks'],
    recommendedFor: [
      'swimming',
      'climbing',
      'kids_cafe',
      'trampoline_park',
      'sauna_spa',
      'pet_hotel',
      'car_repair',
      'laundromat',
    ],
  },
  {
    id: 'crm_growth',
    displayName: '[단골 락인 및 체험 유입 도구]',
    shortName: '단골 락인·스탬프',
    description: '체험 상담 리드 전환, 모바일 전자 스탬프 및 패밀리 추천인 리워드로 단골을 확보합니다.',
    iconName: 'Sparkles',
    badge: '단골 유치',
    capabilities: ['consultation_crm', 'loyalty_stamp', 'membership_referral_tree', 'retention_marketing', 'trial_funnel'],
    recommendedFor: [
      'hair_salon',
      'nail_shop',
      'skin_care',
      'pet_grooming',
      'pet_hotel',
      'craft_workshop',
      'flower_shop',
      'baking_studio',
    ],
  },
] as const;

export const OPERATION_TOOL_SET_MAP: ReadonlyMap<OperationToolSetId, OperationToolSet> = new Map(
  OPERATION_TOOL_SETS.map((set) => [set.id, set])
);

/**
 * 1. 선택된 도구 세트들을 활성화할 때 필요한 모든 Capability와 선행 의존성을 연쇄 계산
 *
 * @param selectedToolSetIds 사장님이 체크한 도구 세트 ID 배열
 * @param currentActiveCaps 현재 활성화된 Capability ID 목록
 * @returns 최종 활성화될 nextCapabilities 및 신규 활성화된 autoEnabledCaps
 */
export function resolveToolSetActivation(
  selectedToolSetIds: readonly OperationToolSetId[],
  currentActiveCaps: readonly CapabilityId[] = []
): {
  nextCapabilities: CapabilityId[];
  autoEnabledCaps: CapabilityId[];
} {
  const activeSet = new Set<CapabilityId>(currentActiveCaps);
  const targetCapabilities = new Set<CapabilityId>();

  // 1) 선택된 모든 세트의 capability 취합
  for (const toolSetId of selectedToolSetIds) {
    const toolSet = OPERATION_TOOL_SET_MAP.get(toolSetId);
    if (!toolSet) continue;
    for (const cap of toolSet.capabilities) {
      targetCapabilities.add(cap);
    }
  }

  // 2) 각 capability의 DAG 선행 의존성(Prerequisites) 연쇄 수집
  const autoEnabledSet = new Set<CapabilityId>();
  for (const cap of targetCapabilities) {
    if (!activeSet.has(cap)) {
      autoEnabledSet.add(cap);
    }
    const prereqs = collectRequiredPrerequisites(cap, activeSet);
    for (const prereq of prereqs) {
      targetCapabilities.add(prereq);
      if (!activeSet.has(prereq)) {
        autoEnabledSet.add(prereq);
      }
    }
  }

  // 3) 합집합 계산
  const nextSet = new Set<CapabilityId>(activeSet);
  for (const cap of targetCapabilities) {
    nextSet.add(cap);
  }

  return {
    nextCapabilities: Array.from(nextSet).sort(),
    autoEnabledCaps: Array.from(autoEnabledSet).sort(),
  };
}

/**
 * 2. 특정 도구 세트를 끌 때 안전하게 비활성화할 Capability 계산
 *
 * - 해제하려는 세트에 속한 기능 중, "여전히 활성 상태인 다른 세트들"에서
 *   필요로 하는 기능 및 그 선행 의존성은 절대 끄지 않고 보존한다.
 * - 비활성화되는 기능에만 의존하는 하위 기능은 함께 안전하게 비활성화된다.
 *
 * @param deselectedToolSetId 해제할 세트 ID
 * @param remainingToolSetIds 여전히 켜져 있는 다른 세트 ID 배열
 * @param currentActiveCaps 현재 활성화된 Capability ID 목록
 */
export function resolveToolSetDeactivation(
  deselectedToolSetId: OperationToolSetId,
  remainingToolSetIds: readonly OperationToolSetId[],
  currentActiveCaps: readonly CapabilityId[]
): {
  nextCapabilities: CapabilityId[];
  autoDisabledCaps: CapabilityId[];
} {
  const currentSet = new Set<CapabilityId>(currentActiveCaps);
  const targetSet = OPERATION_TOOL_SET_MAP.get(deselectedToolSetId);
  if (!targetSet) {
    return {
      nextCapabilities: Array.from(currentSet).sort(),
      autoDisabledCaps: [],
    };
  }

  // 1) 유지되어야 하는 다른 세트들의 모든 capability 및 선행 조건 수집 (Protected Set)
  const protectedCaps = new Set<CapabilityId>();
  for (const remainingId of remainingToolSetIds) {
    const set = OPERATION_TOOL_SET_MAP.get(remainingId);
    if (!set) continue;
    for (const cap of set.capabilities) {
      protectedCaps.add(cap);
      const prereqs = collectRequiredPrerequisites(cap, new Set());
      for (const p of prereqs) {
        protectedCaps.add(p);
      }
    }
  }

  // 2) 해제 대상 세트의 capability 중 보호되지 않는 것들 선별
  const candidatesToDisable = new Set<CapabilityId>();
  for (const cap of targetSet.capabilities) {
    if (!protectedCaps.has(cap) && currentSet.has(cap)) {
      candidatesToDisable.add(cap);
    }
  }

  // 3) 해제 대상들에 의존하는 하위 기능들 연쇄 비활성화 수집
  const autoDisabledSet = new Set<CapabilityId>(candidatesToDisable);
  for (const cap of candidatesToDisable) {
    const dependents = collectDependentDependents(cap, currentSet);
    for (const dep of dependents) {
      if (!protectedCaps.has(dep)) {
        autoDisabledSet.add(dep);
      }
    }
  }

  // 4) 최종 활성 목록 계산
  const nextSet = new Set<CapabilityId>(currentSet);
  for (const cap of autoDisabledSet) {
    nextSet.delete(cap);
  }

  return {
    nextCapabilities: Array.from(nextSet).sort(),
    autoDisabledCaps: Array.from(autoDisabledSet).sort(),
  };
}

/**
 * 3. 업종 프리셋 ID에 부합하는 추천 도구 세트 목록 조회
 */
export function getRecommendedToolSetsForPreset(presetId: string): OperationToolSetId[] {
  const recommended: OperationToolSetId[] = [];
  for (const set of OPERATION_TOOL_SETS) {
    if (set.recommendedFor.includes('*') || set.recommendedFor.includes(presetId)) {
      recommended.push(set.id);
    }
  }
  return recommended;
}

/**
 * 4. 특정 Capability가 어떤 맞춤 세트에 포함되어 있는지 역방향 조회
 */
export function getToolSetsForCapability(capabilityId: CapabilityId): OperationToolSetId[] {
  const result: OperationToolSetId[] = [];
  for (const set of OPERATION_TOOL_SETS) {
    if (set.capabilities.includes(capabilityId)) {
      result.push(set.id);
    }
  }
  return result;
}

/**
 * 5. 현재 활성화된 Capability 목록을 바탕으로, 완전히 충족된 도구 세트 판별
 */
export function getActiveToolSetIdsFromCapabilities(
  activeCapabilities: readonly CapabilityId[]
): OperationToolSetId[] {
  const activeSet = new Set<CapabilityId>(activeCapabilities);
  const activeToolSetIds: OperationToolSetId[] = [];

  for (const toolSet of OPERATION_TOOL_SETS) {
    // 세트 내의 모든 핵심 기능이 activeSet에 포함되어 있는지 확인
    const isFull = toolSet.capabilities.every((cap) => activeSet.has(cap));
    if (isFull) {
      activeToolSetIds.push(toolSet.id);
    }
  }

  return activeToolSetIds;
}
