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
  curriculum: ['curriculum_progress'],
  retention: ['retention_marketing'],
  kds: ['table_order_kds'],
  'diet-body-log': ['diet_body_log'],
  shuttle: ['vehicle_shuttle', 'transport'],
  'commission-payroll': ['commission_payroll'],
  'lost-found': ['lost_found'],
  'recipe-bom': ['recipe_bom'],
  contracts: ['digital_contract'],
  'seat-timers': ['seat_timer_billing'],
  portfolio: ['treatment_portfolio'],
  'work-orders': ['work_order_kanban'],
  'turn-queue': ['waitlist_turn_queue'],
  'deposit-escrow': ['deposit_escrow'],
  'equipment-lifecycle': ['equipment_lifecycle'],
  'package-billing': ['package_split_billing'],
  'grade-analytics': ['exam_grade_analytics'],
  'staff-call': ['kiosk_staff_call'],
  'family-tree': ['membership_referral_tree'],
  'hygiene-log': ['hygiene_haccp_log'],
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
    tier: 'tier3_deferred',
    primaryCapability: 'rental_equipment',
  },
  maintenance: {
    tab: 'maintenance',
    label: '시설·점검표',
    description: '정기 시설 점검 및 체크리스트',
    tier: 'tier3_deferred',
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
    tier: 'tier3_deferred',
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
  curriculum: {
    tab: 'curriculum',
    label: '학습 진도·성장 리포트',
    description: '교재별 진도 체크, 승급 심사 및 성장 리포트 발행',
    tier: 'tier2_basic',
    primaryCapability: 'curriculum_progress',
  },
  retention: {
    tab: 'retention',
    label: '자동 리텐션 마케팅',
    description: '수강권 만료 D-Day 알림 및 재방문 주기 리마인드 큐',
    tier: 'tier2_basic',
    primaryCapability: 'retention_marketing',
  },
  kds: {
    tab: 'kds',
    label: '주방 KDS·테이블 주문',
    description: '테이블 QR 주문 접수 및 주방 조리 디스플레이',
    tier: 'tier2_basic',
    primaryCapability: 'table_order_kds',
  },
  'diet-body-log': {
    tab: 'diet-body-log',
    label: '식단·체성분 다이어리',
    description: '인바디 변화 추이, 운동 루틴 볼륨 및 식단 1:1 코멘트 피드백',
    tier: 'tier2_basic',
    primaryCapability: 'diet_body_log',
  },
  shuttle: {
    tab: 'shuttle',
    label: '안심통학·셔틀관제',
    description: '셔틀 차량 노선 운행, 정류장 승하차 체크 및 3분 전 도착 알림',
    tier: 'tier2_basic',
    primaryCapability: 'vehicle_shuttle',
  },
  'commission-payroll': {
    tab: 'commission-payroll',
    label: '프리랜서·인센티브 정산',
    description: '전문가별 매출 기여도 요율 수당 계산 및 3.3% 사업소득세 원천징수',
    tier: 'tier2_basic',
    primaryCapability: 'commission_payroll',
  },
  'lost-found': {
    tab: 'lost-found',
    label: '시설 분실물 보관',
    description: '락커·샤워실 습득물의 30일 법적 보관 기한 추적 및 반환/폐기',
    tier: 'tier2_basic',
    primaryCapability: 'lost_found',
  },
  'recipe-bom': {
    tab: 'recipe-bom',
    label: '레시피·BOM 원가',
    description: '메뉴별 원재료 배합비 설정 및 주문 시 재고 자동 차감',
    tier: 'tier2_basic',
    primaryCapability: 'recipe_bom',
  },
  contracts: {
    tab: 'contracts',
    label: '현장 전자계약',
    description: '태블릿 서명 표준계약서 및 환불 위약금 규정 아카이브',
    tier: 'tier2_basic',
    primaryCapability: 'digital_contract',
  },
  'seat-timers': {
    tab: 'seat-timers',
    label: '시간제 타이머·과금',
    description: '좌석/룸 실시간 잔여시간 카운트다운 및 초과요금 자동 과금',
    tier: 'tier2_basic',
    primaryCapability: 'seat_timer_billing',
  },
  portfolio: {
    tab: 'portfolio',
    label: '시술 룩북·업셀링',
    description: '디자이너 시술 포트폴리오 및 옵션 추가 맞춤 견적',
    tier: 'tier2_basic',
    primaryCapability: 'treatment_portfolio',
  },
  'work-orders': {
    tab: 'work-orders',
    label: '정비 칸반·견적',
    description: '정비 공정 5단계 칸반 보드 및 부품/공임 명세서 발행',
    tier: 'tier2_basic',
    primaryCapability: 'work_order_kanban',
  },
  'turn-queue': {
    tab: 'turn-queue',
    label: '순번대기·호출보드',
    description: '입구 태블릿 발권, 매장 DID 전광판 및 예상 대기시간 계산',
    tier: 'tier2_basic',
    primaryCapability: 'waitlist_turn_queue',
  },
  'deposit-escrow': {
    tab: 'deposit-escrow',
    label: '예약보증금·노쇼방지',
    description: '사전 예치금 에스크로 관리, 결제 시 자동 공제 및 노쇼 위약금 전입',
    tier: 'tier2_basic',
    primaryCapability: 'deposit_escrow',
  },
  'equipment-lifecycle': {
    tab: 'equipment-lifecycle',
    label: '장비수명·유지보수',
    description: '기구 정기 점검 주기, 감가상각 가액 및 신규 교체 vs 수리 진단',
    tier: 'tier2_basic',
    primaryCapability: 'equipment_lifecycle',
  },
  'package-billing': {
    tab: 'package-billing',
    label: '복합패키지·선수금',
    description: '결합 패키지 일시불 선수금 부채 보관 및 소진별 매출 실현 안분',
    tier: 'tier2_basic',
    primaryCapability: 'package_split_billing',
  },
  'grade-analytics': {
    tab: 'grade-analytics',
    label: '단원평가·성적분석',
    description: '시험 채점, 반 평균/표준편차(Z-Score) 및 영역별 취약 단원 분석',
    tier: 'tier2_basic',
    primaryCapability: 'exam_grade_analytics',
  },
  'staff-call': {
    tab: 'staff-call',
    label: '직원호출·벨보드',
    description: '좌석/룸 원터치 호출 접수 및 카운터 실시간 벨보드 모니터',
    tier: 'tier2_basic',
    primaryCapability: 'kiosk_staff_call',
  },
  'family-tree': {
    tab: 'family-tree',
    label: '패밀리·형제할인',
    description: '가족 그룹 묶음, 형제/자매 자동 결합 할인 및 공용 크레딧 지갑 공유',
    tier: 'tier2_basic',
    primaryCapability: 'membership_referral_tree',
  },
  'hygiene-log': {
    tab: 'hygiene-log',
    label: '주방위생·보건증',
    description: '냉장/냉동 실측 온도 기록, 식약처 위생 체크리스트 및 직원 보건증 만료 관리',
    tier: 'tier2_basic',
    primaryCapability: 'hygiene_haccp_log',
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
