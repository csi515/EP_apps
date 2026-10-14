/**
 * 범용 업종 셸(GenericIndustryShell) 탭별 요구 Capability 및 접근 권한 규칙
 * 순수 비즈니스/라우트 규칙 모듈 (React 및 CSS 자산 의존성 없음)
 */

export const TAB_REQUIRED_CAPABILITIES: Record<string, readonly string[]> = {
  // 기본 5대 기능 및 재무 허브
  bookings: ['booking', 'seat_room'],
  attendance: ['attendance'],
  passes: ['passes'],
  lockers: ['locker'],
  inventory: ['inventory'],
  finance: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  tuition: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  income: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  expenses: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],
  payroll: ['billing_invoicing', 'ledger_simple', 'credit_wallet', 'billing'],

  // 확장 12종 Capability 슬러그 라우트 (URL 슬러그와 1:1 매핑)
  'seat-rooms': ['seat_room', 'booking'],
  rentals: ['rental_equipment'],
  maintenance: ['maintenance_checklist'],
  instructors: ['instructor_match'],
  shifts: ['shift_schedule'],
  pipelines: ['task_pipeline'],
  'billing-invoices': ['billing_invoicing', 'billing'],
  ledger: ['ledger_simple', 'billing'],
  wallets: ['credit_wallet', 'billing'],
  consultations: ['consultation_crm'],
  charts: ['treatment_chart'],
  consents: ['safety_consent'],
};

export function isTabAllowedForCapabilities(tab: string, enabledCaps: readonly string[]): boolean {
  const required = TAB_REQUIRED_CAPABILITIES[tab];
  if (!required) return true;
  return required.some((cap) => enabledCaps.includes(cap));
}

export type TabImplementationTier = 'tier1_ready' | 'tier2_basic' | 'tier3_deferred';

export interface TabMetadataItem {
  tab: string;
  label: string;
  description: string;
  tier: TabImplementationTier;
  primaryCapability: string;
}

export const TAB_METADATA: Record<string, TabMetadataItem> = {
  // 공통 기본 탭
  dashboard: {
    tab: 'dashboard',
    label: '홈 대시보드',
    description: '사업장 운영 요약 및 주요 바로가기',
    tier: 'tier1_ready',
    primaryCapability: 'core',
  },
  students: {
    tab: 'students',
    label: '고객·회원 관리',
    description: '회원 및 고객 명부 조회와 신규 등록',
    tier: 'tier1_ready',
    primaryCapability: 'roster',
  },
  bookings: {
    tab: 'bookings',
    label: '예약·공간',
    description: '예약 일정 및 공간 좌석 캘린더',
    tier: 'tier1_ready',
    primaryCapability: 'booking',
  },
  'seat-rooms': {
    tab: 'seat-rooms',
    label: '좌석·공간 현황',
    description: '좌석 및 룸 점유/예약 현황',
    tier: 'tier1_ready',
    primaryCapability: 'seat_room',
  },
  attendance: {
    tab: 'attendance',
    label: '출결 관리',
    description: '입·퇴실 출석 확인 및 기록',
    tier: 'tier1_ready',
    primaryCapability: 'attendance',
  },
  passes: {
    tab: 'passes',
    label: '이용권·수강권',
    description: '회원권 및 이용권 잔여 관리',
    tier: 'tier1_ready',
    primaryCapability: 'passes',
  },
  lockers: {
    tab: 'lockers',
    label: '사물함·락커',
    description: '사물함 배정 및 만료 관리',
    tier: 'tier1_ready',
    primaryCapability: 'locker',
  },
  inventory: {
    tab: 'inventory',
    label: '재고·상품',
    description: '판매 상품 및 소모품 재고 관리',
    tier: 'tier2_basic',
    primaryCapability: 'inventory',
  },
  finance: {
    tab: 'finance',
    label: '수납·정산',
    description: '수납 내역 및 매출 원장 관리',
    tier: 'tier1_ready',
    primaryCapability: 'billing_invoicing',
  },
  consultations: {
    tab: 'consultations',
    label: '상담 내역',
    description: '고객 상담 기록 및 이력 관리',
    tier: 'tier1_ready',
    primaryCapability: 'consultation_crm',
  },
  'billing-invoices': {
    tab: 'billing-invoices',
    label: '청구서 관리',
    description: '정기 청구 및 인보이스 발행',
    tier: 'tier1_ready',
    primaryCapability: 'billing_invoicing',
  },
  ledger: {
    tab: 'ledger',
    label: '원장 관리',
    description: '수입 및 지출 단순 장부',
    tier: 'tier1_ready',
    primaryCapability: 'ledger_simple',
  },
  wallets: {
    tab: 'wallets',
    label: '크레딧 지갑',
    description: '고객별 적립금/크레딧 잔액 관리',
    tier: 'tier1_ready',
    primaryCapability: 'credit_wallet',
  },

  // Tier 3: 도메인 스키마 및 리소스 연동 완료, 전용 UI 화면 준비 중(연기)
  rentals: {
    tab: 'rentals',
    label: '장비·물품 대여',
    description: '대여 장비 목록 및 반납 관리',
    tier: 'tier2_basic',
    primaryCapability: 'rental_equipment',
  },
  maintenance: {
    tab: 'maintenance',
    label: '시설·점검표',
    description: '정기 시설 점검 및 체크리스트',
    tier: 'tier2_basic',
    primaryCapability: 'maintenance_checklist',
  },
  instructors: {
    tab: 'instructors',
    label: '강사·전문가 매칭',
    description: '담당 강사 배정 및 매칭 관리',
    tier: 'tier3_deferred',
    primaryCapability: 'instructor_match',
  },
  shifts: {
    tab: 'shifts',
    label: '근무 교대·시프트',
    description: '직원 근무 일정 및 시프트 배정',
    tier: 'tier2_basic',
    primaryCapability: 'shift_schedule',
  },
  pipelines: {
    tab: 'pipelines',
    label: '업무 파이프라인',
    description: '공정 및 단계별 업무 처리 현황',
    tier: 'tier2_basic',
    primaryCapability: 'task_pipeline',
  },
  charts: {
    tab: 'charts',
    label: '시술·관리 차트',
    description: '고객 시술 사진 및 맞춤 차트 기록',
    tier: 'tier2_basic',
    primaryCapability: 'treatment_chart',
  },
  consents: {
    tab: 'consents',
    label: '안전 동의서',
    description: '서명 동의서 및 서약서 보관 관리',
    tier: 'tier2_basic',
    primaryCapability: 'safety_consent',
  },
  settings: {
    tab: 'settings',
    label: '워크스페이스 설정',
    description: '사업장 운영 기본 설정 및 기능 구성',
    tier: 'tier1_ready',
    primaryCapability: 'core',
  },
  account: {
    tab: 'account',
    label: '내 계정',
    description: '사용자 프로필 및 계정 정보',
    tier: 'tier1_ready',
    primaryCapability: 'core',
  },
};

export function getTabMetadata(tab: string): TabMetadataItem | undefined {
  return TAB_METADATA[tab];
}
