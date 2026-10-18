/**
 * Moa-v2 무설정 역할 기반 권한 상속 체계 (Zero-Config RBAC Matrix).
 *
 * 사업주가 114개 기능의 체크박스를 일일이 설정할 필요 없이,
 * 업종별 4대 표준 직급(대표, 실장, 전담강사/담당자, 데스크/알바) 하나만 지정하면
 * 필요한 권한만 열리고 민감 재무/장부/계약 권한은 자동으로 차단되는 제로 컨피그 상속 체계.
 */

export interface ZeroConfigRoleTemplate {
  code: 'owner' | 'manager' | 'instructor' | 'staff';
  name: string; // 업종 맞춤 표기명 (예: "전담 강사", "오후 데스크")
  description: string;
  rank_order: number;
  permissions: string[];
  isSensitiveRestricted: boolean; // 재무/장부 차단 여부
}

// 8대 도메인 표준 권한 키
export const ALL_CANONICAL_PERMISSIONS = [
  // 수강권 / 이용권
  'passes:view',
  'passes:deduct',
  'passes:create',
  'passes:delete',
  // 출결 / 등하원
  'attendance:view',
  'attendance:checkin',
  'shuttle:view',
  // 예약 / 공간
  'booking:view',
  'booking:create',
  'seat_room:assign',
  'parking:validate',
  // 고객 / 상담
  'roster:view',
  'consultation:view',
  'consultation:write',
  'learning_journal:write',
  // 사물함
  'lockers:view',
  'lockers:assign',
  // 정산 / 재무 (민감)
  'settlement:view',
  'billing:invoice',
  'billing:collect',
  // 시설 / 안전
  'maintenance:check',
  'incident:report',
  // 운영 / 내규
  'emergency:broadcast',
  'workplace:policy',
] as const;

/**
 * 기본 권한 매트릭스 (Role -> Permissions)
 */
const BASE_ROLE_PERMISSIONS: Record<ZeroConfigRoleTemplate['code'], string[]> = {
  // 1. 대표자: 전권 보유
  owner: [...ALL_CANONICAL_PERMISSIONS],

  // 2. 실장 / 매니저: 운영 전반 및 일반 수납 가능, 전사 파괴적 삭제/소유권 제외
  manager: [
    'passes:view',
    'passes:deduct',
    'passes:create',
    'attendance:view',
    'attendance:checkin',
    'shuttle:view',
    'booking:view',
    'booking:create',
    'seat_room:assign',
    'parking:validate',
    'roster:view',
    'consultation:view',
    'consultation:write',
    'learning_journal:write',
    'lockers:view',
    'lockers:assign',
    'billing:invoice',
    'billing:collect',
    'maintenance:check',
    'incident:report',
    'emergency:broadcast',
    'workplace:policy',
    // settlement:view (민감 총매출 장부)는 기본 제외
  ],

  // 3. 전담 강사 / 디자이너 / 트레이너: 담당 회원 출결, 수업 예약, 일지 작성
  // * 재무/수납/정산 및 이용권 생성/삭제 전면 차단
  instructor: [
    'passes:view',
    'passes:deduct',
    'attendance:view',
    'attendance:checkin',
    'shuttle:view',
    'booking:view',
    'booking:create',
    'roster:view',
    'consultation:view',
    'consultation:write',
    'learning_journal:write',
    'maintenance:check',
    'incident:report',
  ],

  // 4. 데스크 알바 / 파트타이머: 출결 체크인, 회원 조회, 주차/락커 단순 배정
  // * 재무, 수납, 일지 수정, 이용권 발급/삭제 전면 차단
  staff: [
    'attendance:view',
    'attendance:checkin',
    'shuttle:view',
    'roster:view',
    'booking:view',
    'lockers:view',
    'lockers:assign',
    'parking:validate',
  ],
};

/**
 * 업종별 직급 명칭 커스터마이징 매핑
 */
export function getZeroConfigRoleTemplates(industryType: string = 'general'): ZeroConfigRoleTemplate[] {
  const norm = (industryType || '').toLowerCase();

  // 피트니스 / 필라테스 / 체육
  if (norm.includes('pilates') || norm.includes('gym') || norm.includes('fitness') || norm.includes('taekwondo')) {
    return [
      {
        code: 'owner',
        name: '센터장 / 대표',
        description: '전사 재무, 결제, 직원 권한 및 매장 운영 전권을 보유합니다.',
        rank_order: 10,
        permissions: BASE_ROLE_PERMISSIONS.owner,
        isSensitiveRestricted: false,
      },
      {
        code: 'manager',
        name: '총괄 실장 / 매니저',
        description: '회원 등록, 수납 청구, 시설 점검, 시간표 배정을 총괄합니다.',
        rank_order: 20,
        permissions: BASE_ROLE_PERMISSIONS.manager,
        isSensitiveRestricted: false,
      },
      {
        code: 'instructor',
        name: '전담 강사 / 트레이너',
        description: '회원 레슨 출결, 이용권 차감, 운동 일지 및 상담 작성을 담당합니다. (재무 장부 열람 불가)',
        rank_order: 30,
        permissions: BASE_ROLE_PERMISSIONS.instructor,
        isSensitiveRestricted: true,
      },
      {
        code: 'staff',
        name: '오후 데스크 / 아르바이트',
        description: '입퇴실 출결 체크, 락커 배정, 회원 단순 조회를 지원합니다. (수납/장부 열람 불가)',
        rank_order: 40,
        permissions: BASE_ROLE_PERMISSIONS.staff,
        isSensitiveRestricted: true,
      },
    ];
  }

  // 뷰티 / 미용 / 피부 / 네일
  if (norm.includes('skin') || norm.includes('beauty') || norm.includes('hair') || norm.includes('nail')) {
    return [
      {
        code: 'owner',
        name: '원장 / 대표',
        description: '전사 경영, 총매출, 직원 인사 및 매장 운영 전권을 보유합니다.',
        rank_order: 10,
        permissions: BASE_ROLE_PERMISSIONS.owner,
        isSensitiveRestricted: false,
      },
      {
        code: 'manager',
        name: '점장 / 총괄 실장',
        description: '예약 조율, 수납, 고객 관리, 시설 점검을 총괄합니다.',
        rank_order: 20,
        permissions: BASE_ROLE_PERMISSIONS.manager,
        isSensitiveRestricted: false,
      },
      {
        code: 'instructor',
        name: '담당 디자이너 / 시술사',
        description: '배정 고객 시술 차트 작성, 예약 조회, 출결을 담당합니다. (재무 장부 열람 불가)',
        rank_order: 30,
        permissions: BASE_ROLE_PERMISSIONS.instructor,
        isSensitiveRestricted: true,
      },
      {
        code: 'staff',
        name: '인턴 / 어시스턴트',
        description: '내방 고객 응대, 출결 확인, 룸 배정을 지원합니다. (수납/장부 열람 불가)',
        rank_order: 40,
        permissions: BASE_ROLE_PERMISSIONS.staff,
        isSensitiveRestricted: true,
      },
    ];
  }

  // 외식 / 식음료 / 카페
  if (norm.includes('retail') || norm.includes('cafe') || norm.includes('restaurant') || norm.includes('bakery')) {
    return [
      {
        code: 'owner',
        name: '점주 / 대표자',
        description: '전사 손익, 결제 계좌, 세무, 직원 인사 전권을 보유합니다.',
        rank_order: 10,
        permissions: BASE_ROLE_PERMISSIONS.owner,
        isSensitiveRestricted: false,
      },
      {
        code: 'manager',
        name: '매장 캡틴 / 매니저',
        description: '발주 관리, 일일 마감, 스케줄표 배정, 시설 점검을 총괄합니다.',
        rank_order: 20,
        permissions: BASE_ROLE_PERMISSIONS.manager,
        isSensitiveRestricted: false,
      },
      {
        code: 'instructor',
        name: '전문 조리 / 바리스타',
        description: '주방 주문 확인, 재고 소비 기록, 위생 점검을 담당합니다. (재무 장부 열람 불가)',
        rank_order: 30,
        permissions: BASE_ROLE_PERMISSIONS.instructor,
        isSensitiveRestricted: true,
      },
      {
        code: 'staff',
        name: '홀 / 파트타이머',
        description: '출퇴근 체크, 고객 안내, 단순 테이블 서빙을 지원합니다. (매출/장부 열람 불가)',
        rank_order: 40,
        permissions: BASE_ROLE_PERMISSIONS.staff,
        isSensitiveRestricted: true,
      },
    ];
  }

  // 기본 교육 / 학원 / 일반
  return [
    {
      code: 'owner',
      name: '원장님 / 대표',
      description: '전사 재무, 수강료 청구, 직원 권한 및 학원 운영 전권을 보유합니다.',
      rank_order: 10,
      permissions: BASE_ROLE_PERMISSIONS.owner,
      isSensitiveRestricted: false,
    },
    {
      code: 'manager',
      name: '부원장 / 총괄 실장',
      description: '학부모 상담, 수강료 청구서 발송, 강사 시간표 배정, 시설 점검을 총괄합니다.',
      rank_order: 20,
      permissions: BASE_ROLE_PERMISSIONS.manager,
      isSensitiveRestricted: false,
    },
    {
      code: 'instructor',
      name: '전담 강사 / 선생님',
      description: '원생 등하원 출결, 수업 일지 작성, 레슨 이용권 차감을 담당합니다. (재무 장부 열람 불가)',
      rank_order: 30,
      permissions: BASE_ROLE_PERMISSIONS.instructor,
      isSensitiveRestricted: true,
    },
    {
      code: 'staff',
      name: '데스크 / 행정 알바',
      description: '등하원 PIN 체크인, 셔틀 탑승 확인, 회원 단순 조회를 지원합니다. (수납/장부 열람 불가)',
      rank_order: 40,
      permissions: BASE_ROLE_PERMISSIONS.staff,
      isSensitiveRestricted: true,
    },
  ];
}

/**
 * 신규 사업장 생성 시 기본으로 주입할 테넌트 직급 레코드 목록 생성
 */
export function generateDefaultTenantRoles(
  tenantId: string,
  industryType?: string
): Array<{ tenant_id: string; name: string; rank_order: number; permissions: string[] }> {
  const templates = getZeroConfigRoleTemplates(industryType);
  return templates.map((tpl) => ({
    tenant_id: tenantId,
    name: tpl.name,
    rank_order: tpl.rank_order,
    permissions: tpl.permissions,
  }));
}
