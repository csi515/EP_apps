/**
 * Capability 계약. 구현 이동 없이 타입·매니페스트만 둔다.
 *
 * Core: 업종 독립 공통 기반
 * Capability: 여러 업종이 선택적으로 쓰는 업무 기능
 * Industry: 특정 업종의 조합·전용 기능
 * Composition: 업종과 capability를 조립
 */

export const CAPABILITY_IDS = [
  'attendance',
  'scheduling',
  'booking',
  'billing',
  'commerce',
  'parent',
  'resources',
  'transport',
  'roster',
  'enrollment',
  'consultation',
  'passes',
  'locker',
  'inventory',
  'seat_room',
  'rental_equipment',
  'maintenance_checklist',
  'instructor_match',
  'shift_schedule',
  'task_pipeline',
  'billing_invoicing',
  'ledger_simple',
  'credit_wallet',
  'consultation_crm',
  'treatment_chart',
  'safety_consent',
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export interface CapabilityDefinition {
  id: CapabilityId;
  displayName: string;
  dependencies: CapabilityId[];
  configurable: boolean;
  defaultEnabled: boolean;
  requiredPermissions: string[];
}

/** 장기 디렉터리 계약. 지금은 선언만 하고 기존 코드를 옮기지 않는다. */
export type CapabilityPackageLayout = {
  manifest: 'manifest.ts';
  domain: 'domain/';
  application: 'application/';
  ui: 'ui/';
  infrastructure: 'infrastructure/';
  barrel: 'index.ts';
};

export interface CapabilityManifest {
  definition: CapabilityDefinition;
}

export function defineCapability(definition: CapabilityDefinition): CapabilityManifest {
  return { definition };
}

export function assertCapabilityDefinition(definition: CapabilityDefinition): void {
  if (!CAPABILITY_IDS.includes(definition.id)) {
    throw new Error(`unknown capability id: ${definition.id}`);
  }
  if (!definition.displayName.trim()) {
    throw new Error(`capability ${definition.id}: displayName required`);
  }
  for (const dep of definition.dependencies) {
    if (!CAPABILITY_IDS.includes(dep)) {
      throw new Error(`capability ${definition.id}: unknown dependency ${dep}`);
    }
    if (dep === definition.id) {
      throw new Error(`capability ${definition.id}: cannot depend on itself`);
    }
  }
}

/**
 * 26대 Capability의 도메인 업무 영역 및 모듈 위계 관계.
 * AGENTS.md 원칙: 중복 구현 방지 및 단일 업무 본질 재사용 규격.
 */
export const CAPABILITY_DOMAIN_RELATIONS = {
  // 재무/결제/원장 도메인
  finance: {
    parent: 'billing',
    children: ['billing_invoicing', 'ledger_simple', 'credit_wallet'],
    description: '청구, 단순 원장, 적립 지갑은 billing 도메인의 특화 하위 기능',
  },
  // 고객 상담 및 신뢰 관리 도메인
  crm: {
    parent: 'consultation',
    children: ['consultation_crm', 'treatment_chart', 'safety_consent'],
    description: '상담 CRM, 시술 차트, 안전 동의서는 consultation 도메인의 특화 하위 기능',
  },
  // 원생 및 회원 명부 도메인
  roster_lifecycle: {
    parent: 'roster',
    children: ['enrollment'],
    description: '수강 등록은 roster 회원 라이프사이클의 진입 단계',
  },
  // 재고 및 커머스 도메인
  commerce_stock: {
    parent: 'commerce',
    children: ['inventory'],
    description: '단순 재고 관리는 commerce/stock 도메인의 하위 모듈',
  },
  // 공간 및 자원 점유 도메인
  spatial_resources: {
    parent: 'resources',
    children: ['seat_room', 'rental_equipment', 'locker', 'maintenance_checklist'],
    description: '좌석, 대여 장비, 라커, 점검표는 공간/자원 관리의 세부 모듈',
  },
  // 일정 및 예약 도메인
  scheduling_booking: {
    parent: 'scheduling',
    children: ['booking', 'shift_schedule'],
    description: '예약 및 교대 근무는 scheduling 도메인의 하위 실행 단위',
  },
} as const;
