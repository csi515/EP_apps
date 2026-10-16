/**
 * Capability 의존성 검증 및 자동 연쇄 활성화 순수 도메인 엔진 (Pure Functions)
 *
 * 원칙:
 *  - 특정 기능을 켤 때 필수 선행 기능이 꺼져 있다면 자동으로 함께 활성화(autoEnabled)
 *  - 특정 필수 선행 기능을 끌 때 이를 의존하고 있는 하위 기능이 있다면 연쇄 비활성화(autoDisabled)
 *  - 모든 연산은 불변(Immutable) 순수 함수로 수행
 */

import type { CapabilityId } from '@/capabilities/_shared/capabilityTypes';

/**
 * Capability 간 필수 선행 의존 관계 맵 (DAG)
 * Key: 대상 기능 -> Value: 해당 기능을 사용하기 위해 사전에 반드시 켜져 있어야 하는 필수 기능들
 */
export const CAPABILITY_DEPENDENCY_GRAPH: Partial<Record<CapabilityId, readonly CapabilityId[]>> = {
  // 예약은 이용권(회원권) 차감과 결합
  booking: ['passes'],

  // 출결, 사물함, 체형기록, 진도, 시술차트, 안전동의서는 고객 명부(roster)에 귀속
  attendance: ['roster'],
  locker: ['roster'],
  diet_body_log: ['roster'],
  curriculum_progress: ['roster'],
  treatment_chart: ['roster'],
  safety_consent: ['roster'],

  // 강사 매칭 및 수당 정산은 스태프 시프트 근무표 필수
  instructor_match: ['shift_schedule'],
  commission_payroll: ['shift_schedule'],
  work_attendance_payroll: ['shift_schedule'],

  // B2B 매입 전표, 주문제작 픽업, 테이블 주문, BOM 레시피는 재고(자재) 관리 필수
  vendor_ap_invoice: ['inventory'],
  pickup_orders: ['inventory'],
  table_order_kds: ['inventory'],
  recipe_bom: ['inventory'],

  // 시간제 좌석 타이머 과금은 공간(seat_room) 필수
  seat_timer_billing: ['seat_room'],

  // 장비 대여는 재고 필수
  rental_equipment: ['inventory'],

  // 유지보수 점검표는 공간 또는 장비 점검
  maintenance_checklist: ['seat_room'],

  // 사규 관리 및 교대 인수인계는 근무표 및 스태프 관리와 결합
  workplace_policy: ['shift_schedule'],
  feedbacks: ['shift_schedule'],

  // 분실물/습득물, 전자계약, 모바일스탬프, 추천인, 셔틀, 수업일지, 승급심사는 고객 명부(roster) 필수
  lost_found: ['roster'],
  digital_contract: ['roster'],
  loyalty_stamp: ['roster'],
  membership_referral_tree: ['roster'],
  vehicle_shuttle: ['roster'],
  learning_journal: ['roster'],
  level_assessment: ['roster'],

  // 공간 턴어라운드 버퍼는 공간(seat_room) 필수
  space_turnaround: ['seat_room'],

  // 소모품 안전재고 발주는 재고(inventory) 필수
  supply_restock: ['inventory'],

  // 결석 보강은 원생 명부 및 스케줄링 필수
  makeup_lesson_pass: ['roster', 'scheduling'],

  // 사전 문진표는 상담 CRM 연계
  intake_assessment: ['consultation_crm'],

  // 돌봄 알림장은 원생/대상 명부 필수
  daily_care_report: ['roster'],

  // 강사 대강 긴급 호출은 근무표 연계
  substitute_dispatch: ['shift_schedule'],

  // 모바일 입장권은 공간/좌석 점유 연계
  entry_pass_ticket: ['seat_room'],

  // 원내 발표회·대회는 원생 명부 연계
  event_contest_hub: ['roster'],

  // 단원평가 성적 분석은 진도 기록 필수
  exam_grade_analytics: ['curriculum_progress'],
};

export interface DependencyResolutionResult {
  nextActive: CapabilityId[];
  autoEnabled: CapabilityId[];
  autoDisabled: CapabilityId[];
  blockedReason?: string;
}

/**
 * 1. 특정 기능을 켤 때 필요한 모든 선행 의존 기능 재귀 수집 (순수 함수)
 */
export function collectRequiredPrerequisites(
  capabilityId: CapabilityId,
  currentActiveSet: ReadonlySet<CapabilityId>
): CapabilityId[] {
  const result: CapabilityId[] = [];
  const visited = new Set<CapabilityId>();

  function dfs(curr: CapabilityId) {
    if (visited.has(curr)) return;
    visited.add(curr);

    const prerequisites = CAPABILITY_DEPENDENCY_GRAPH[curr] ?? [];
    for (const prereq of prerequisites) {
      if (!currentActiveSet.has(prereq) && !result.includes(prereq)) {
        result.push(prereq);
      }
      dfs(prereq);
    }
  }

  dfs(capabilityId);
  return result;
}

/**
 * 2. 특정 기능을 끌 때 이를 의존하고 있어 함께 꺼져야 하는 모든 하위 기능 재귀 수집 (순수 함수)
 */
export function collectDependentDependents(
  capabilityId: CapabilityId,
  currentActiveSet: ReadonlySet<CapabilityId>
): CapabilityId[] {
  const result: CapabilityId[] = [];
  const visited = new Set<CapabilityId>();

  function dfs(target: CapabilityId) {
    if (visited.has(target)) return;
    visited.add(target);

    for (const [parentCap, prereqs] of Object.entries(CAPABILITY_DEPENDENCY_GRAPH)) {
      const cap = parentCap as CapabilityId;
      if (currentActiveSet.has(cap) && prereqs && prereqs.includes(target)) {
        if (!result.includes(cap)) {
          result.push(cap);
        }
        dfs(cap);
      }
    }
  }

  dfs(capabilityId);
  return result;
}

/**
 * 3. 기능 ON/OFF 토글에 따른 의존성 해결 (순수 함수)
 *
 * @param currentActive 현재 활성화된 기능 ID 목록
 * @param toggledCapability 토글 대상 기능 ID
 * @param targetState 켜기(true) 또는 끄기(false)
 */
export function resolveCapabilityDependencies(
  currentActive: readonly CapabilityId[],
  toggledCapability: CapabilityId,
  targetState: boolean
): DependencyResolutionResult {
  const activeSet = new Set<CapabilityId>(currentActive);

  if (targetState) {
    // 켜기 시나리오
    if (activeSet.has(toggledCapability)) {
      return {
        nextActive: Array.from(activeSet),
        autoEnabled: [],
        autoDisabled: [],
      };
    }

    // 선행 의존 기능 수집
    const autoEnabled = collectRequiredPrerequisites(toggledCapability, activeSet);

    const nextActive = new Set<CapabilityId>(activeSet);
    nextActive.add(toggledCapability);
    for (const auto of autoEnabled) {
      nextActive.add(auto);
    }

    return {
      nextActive: Array.from(nextActive),
      autoEnabled,
      autoDisabled: [],
    };
  } else {
    // 끄기 시나리오
    if (!activeSet.has(toggledCapability)) {
      return {
        nextActive: Array.from(activeSet),
        autoEnabled: [],
        autoDisabled: [],
      };
    }

    // 이 기능을 필수 의존하고 있는 하위 활성 기능들 연쇄 비활성화 수집
    const autoDisabled = collectDependentDependents(toggledCapability, activeSet);

    const nextActive = new Set<CapabilityId>(activeSet);
    nextActive.delete(toggledCapability);
    for (const auto of autoDisabled) {
      nextActive.delete(auto);
    }

    return {
      nextActive: Array.from(nextActive),
      autoEnabled: [],
      autoDisabled,
    };
  }
}
