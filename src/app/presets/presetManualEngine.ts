/**
 * Declarative Preset-based Automatic Manual Engine (Composition Layer)
 *
 * featureGuides.ts에 44개 업종을 개별 하드코딩하지 않고,
 * 각 프리셋에 선언된 Capability의 메타데이터(displayName, setupSchema, description, fields)를
 * 8대 비즈니스 도메인 섹션으로 자동 합성하여
 * 44개 전 업종에 대한 풍부한 기능 설명서 및 실무 팁을 생성한다.
 */

import {
  type FeatureGuideSection,
  type FeatureGuideItem,
  registerPresetGuideResolver,
} from '@/core/help/featureGuides';
import {
  getIndustryPreset,
  listIndustryPresets,
  CAPABILITY_BUNDLES,
} from './presetRegistry';
import { CAPABILITY_ALIASES, type PresetCapabilityId } from '@/core/presets/types';

interface DomainSectionMeta {
  id: string;
  title: string;
  description: string;
  capabilities: readonly string[];
}

/** 8대 비즈니스 도메인 분류 기준 */
const DOMAIN_SECTIONS: DomainSectionMeta[] = [
  {
    id: 'customer',
    title: '고객 및 회원 관리',
    description: '고객 정보 등록, 이용권 잔여 관리, 상담 및 이력을 체계적으로 운영합니다.',
    capabilities: [
      'attendance',
      'passes',
      'consultation_crm',
      'treatment_chart',
      'digital_guestbook',
      'loyalty_stamp',
      'membership_referral_tree',
      'credit_wallet',
      'vip_concierge_preference',
      'customer_blacklist_guard',
    ],
  },
  {
    id: 'facility',
    title: '공간·시설 및 자원 순환',
    description: '룸·좌석 배치, 사물함 배정, 대여 장비 및 공간 턴어라운드를 관리합니다.',
    capabilities: [
      'seat_room',
      'booking',
      'locker',
      'rental_equipment',
      'maintenance_checklist',
      'space_turnaround',
      'time_block_rental',
      'dormitory_bed',
    ],
  },
  {
    id: 'staff',
    title: '직원·인력 및 업무 공정',
    description: '강사/직원 스케줄 배정, 교대 인수인계, 근태 및 인센티브 정산을 처리합니다.',
    capabilities: [
      'instructor_match',
      'shift_schedule',
      'task_pipeline',
      'commission_payroll',
      'work_attendance_payroll',
      'substitute_dispatch',
      'sop_risk_assessment',
      'workplace_policy',
      'feedbacks',
      'approval_workflow',
      'leave_management',
    ],
  },
  {
    id: 'commerce',
    title: '판매·재고 및 주문 관리',
    description: '상품 판매, 비대면 테이블 주문, 식자재 BOM 원가 및 안전재고를 추적합니다.',
    capabilities: [
      'inventory',
      'table_order_kds',
      'recipe_bom',
      'pickup_orders',
      'supply_restock',
      'fefo_lot_tracker',
      'consumable_dispenser',
    ],
  },
  {
    id: 'billing',
    title: '수납·정산·계약 및 재무',
    description: '정기 청구서 발행, 전자 계약 서명, 시간제 타이머 과금 및 간이 장부를 운영합니다.',
    capabilities: [
      'billing_invoicing',
      'ledger_simple',
      'digital_contract',
      'seat_timer_billing',
      'package_split_billing',
      'deposit_escrow',
      'vendor_ap_invoice',
      'prepaid_tax_withholding',
      'petty_cash_expense',
      'royalty_profit_share',
    ],
  },
  {
    id: 'specialized',
    title: '업종 전문 특화 및 안심 케어',
    description: '커리큘럼 진도표, 알림장, 성적 분석 및 안전 동의서를 맞춤 관리합니다.',
    capabilities: [
      'curriculum_progress',
      'learning_journal',
      'level_assessment',
      'intake_assessment',
      'daily_care_report',
      'safety_consent',
      'treatment_portfolio',
      'work_order_kanban',
      'exam_grade_analytics',
      'pet_grooming_hotel',
      'laundry_drycleaning',
      'vehicle_shuttle',
      'diet_body_log',
      'event_contest_hub',
      'facility_incident_report',
      'parking_validator',
      'emergency_alert_broadcast',
      'custom_order_craft',
      'service_warranty_claim',
    ],
  },
  {
    id: 'erp',
    title: '경영 관리 & ERP 통제',
    description: '간이 손익계산서, 고정자산 감가상각, 3-Way 구매검수 및 감사 로그를 통제합니다.',
    capabilities: [
      'simple_pl_cashflow',
      'fixed_asset_depreciation',
      'procurement_3way_match',
      'budget_ceiling_quota',
      'field_audit_trail',
      'vendor_scorecard',
      'mbo',
      'quality_inspection',
      'change_management',
      'patent_ip_asset',
    ],
  },
];

/**
 * 특정 업종 프리셋에 대한 선언적 자동 매뉴얼 생성 함수
 */
export function generatePresetFeatureGuide(industryId: string): {
  intro: { title: string; body: string };
  sections: FeatureGuideSection[];
} | undefined {
  if (!industryId) return undefined;

  const preset = getIndustryPreset(industryId);
  if (!preset) return undefined;

  const activeCaps = new Set<string>();
  for (const cap of preset.capabilities) {
    activeCaps.add(cap);
    const aliased = CAPABILITY_ALIASES[cap as PresetCapabilityId];
    if (aliased) activeCaps.add(aliased);
  }

  const sections: FeatureGuideSection[] = [];

  for (const domain of DOMAIN_SECTIONS) {
    const matchingCaps = domain.capabilities.filter((c) => activeCaps.has(c));
    if (matchingCaps.length === 0) continue;

    const items: FeatureGuideItem[] = [];

    for (const capId of matchingCaps) {
      const bundle =
        CAPABILITY_BUNDLES[capId as PresetCapabilityId] ||
        (CAPABILITY_ALIASES[capId as PresetCapabilityId]
          ? CAPABILITY_BUNDLES[CAPABILITY_ALIASES[capId as PresetCapabilityId]]
          : undefined);

      if (bundle?.setupSchema) {
        const schema = bundle.setupSchema;
        const fieldLabels = schema.fields?.map((f) => f.label) || [];
        const howTo =
          fieldLabels.length > 0
            ? `주요 설정 항목: ${fieldLabels.slice(0, 3).join(', ')}${
                fieldLabels.length > 3 ? ' 외' : ''
              }을 매장 정책에 맞게 구성하세요.`
            : `${schema.title}의 설정을 매장 운영 정책에 맞춰 조율할 수 있습니다.`;

        items.push({
          id: capId,
          title: schema.title,
          summary: schema.description,
          howTo,
        });
      } else {
        items.push({
          id: capId,
          title: capId,
          summary: `${capId} 도메인 업무를 지원합니다.`,
          howTo: '상세 설정 및 실시간 모니터링을 진행하세요.',
        });
      }
    }

    if (items.length > 0) {
      sections.push({
        id: domain.id,
        title: domain.title,
        description: domain.description,
        items,
      });
    }
  }

  // 공통 설정 섹션 추가
  sections.push({
    id: 'settings',
    title: '사업장 공통 설정',
    description: '상호명, 연락처, 관리자 계정 및 기본 옵션을 설정합니다.',
    items: [
      {
        id: 'org_settings',
        title: '사업장 정보 및 프로필',
        summary: '사업장 이름, 대표자 연락처, 주소, 운영 시간을 설정합니다.',
        howTo: '설정 > 사업장 정보 탭에서 변경할 수 있습니다.',
      },
      {
        id: 'member_roles',
        title: '직원 권한 및 보안 설정',
        summary: '직원별 조회 및 수정 권한 범위를 안전하게 제한합니다.',
        howTo: '설정 > 직원 권한 관리에서 역할을 지정할 수 있습니다.',
      },
    ],
  });

  return {
    intro: {
      title: `${preset.name} 기능 안내`,
      body: `${preset.description} ${preset.name} 운영을 위해 선언된 ${activeCaps.size}개 핵심 Capability가 활성화되어 있습니다. 아래에서 각 기능의 목적과 실무 활용 팁을 확인해 보세요.`,
    },
    sections,
  };
}

/**
 * Core FeatureGuides 리졸버에 자동 매뉴얼 엔진을 등록하는 초기화 함수
 */
export function initPresetManualEngine(): void {
  registerPresetGuideResolver((industry: string) => {
    return generatePresetFeatureGuide(industry);
  });
}

// 모듈 로드 시 자동 등록
initPresetManualEngine();
