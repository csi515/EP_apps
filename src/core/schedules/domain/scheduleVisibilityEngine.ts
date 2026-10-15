/**
 * 일정 공개 범위(Visibility Level) 및 동료 스케줄 상호 조회/마스킹 순수 도메인 엔진
 * 
 * 1. 일정 공개 범위(Visibility Level):
 *    - 'PUBLIC': 일정명, 시간대, 배정 룸/자원 등 상세 정보 모두 공유
 *    - 'FREE_BUSY_ONLY': 구체적 일정 내용은 숨기고 '예약 중(바쁨)' / '비어있음' 슬롯 상태만 공유
 *    - 'PRIVATE': 본인 외 타 직원에게 비공개 (완전 숨김)
 * 
 * 2. 권한 및 마스킹(Security Boundary):
 *    - 반드시 동일 organization_id(같은 사업장) 소속 직원 간에만 조회 허용.
 *    - 타 직원의 'FREE_BUSY_ONLY' 일정 조회 시 고객명, 시술 메모, 전화번호 등 민감 개인정보는 자동 마스킹.
 *    - 사업주(Owner) 및 관리자(Admin)는 사업장 운영을 위해 전체 일정을 투명하게 확인 가능.
 *    - 본인 일정은 본인 설정과 무관하게 본인에게 항상 100% 상세 표시 및 편집 가능.
 */

export type ScheduleVisibility = 'PUBLIC' | 'FREE_BUSY_ONLY' | 'PRIVATE';

export type CalendarColorTheme =
  | 'indigo'
  | 'purple'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'slate'
  | 'rose'
  | 'blue';

export interface StaffScheduleProfile {
  id: string;
  name: string;
  organizationId: string;
  roleTitle?: string;
  defaultVisibility?: ScheduleVisibility;
  color?: string;
  colorTheme?: CalendarColorTheme;
  status?: 'active' | 'inactive' | 'resigned';
}

export interface ViewerContext {
  id?: string | null; // staffId
  role: 'owner' | 'admin' | 'staff' | 'customer';
  organizationId: string;
}

export type ScheduleViewMode = 'my_only' | 'all' | 'custom_staff';

export interface BaseScheduleEntity {
  id: string;
  organizationId?: string;
  staffId?: string;
  staffName?: string;
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  roomName?: string;
  startsAt: string;
  endsAt: string;
  memo?: string;
  visibility?: ScheduleVisibility;
  [key: string]: any;
}

export interface ProcessedScheduleItem<T extends BaseScheduleEntity = BaseScheduleEntity> {
  original: T;
  sanitized: T;
  visibility: ScheduleVisibility;
  isOwnSchedule: boolean;
  isOwnerOrAdmin: boolean;
  isMasked: boolean;
  displayTitle: string;
  displaySubtitle?: string;
  colorTheme: CalendarColorTheme;
  canEdit: boolean;
}

/**
 * 직급/역할에 따른 고유 캘린더 테마 색상 결정
 */
export function getStaffThemeColor(
  staff?: Pick<StaffScheduleProfile, 'roleTitle' | 'colorTheme' | 'color'> | null
): CalendarColorTheme {
  if (staff?.colorTheme) return staff.colorTheme;

  const role = (staff?.roleTitle || '').toLowerCase().trim();

  // 1. 대표/사업주/원장급 -> purple
  if (
    role.includes('대표') ||
    role.includes('원장') ||
    role.includes('owner') ||
    role.includes('director') ||
    role.includes('점주')
  ) {
    return 'purple';
  }

  // 2. 수석/부원장/팀장/매니저/실장급 -> indigo
  if (
    role.includes('수석') ||
    role.includes('부원장') ||
    role.includes('실장') ||
    role.includes('팀장') ||
    role.includes('매니저') ||
    role.includes('head') ||
    role.includes('manager')
  ) {
    return 'indigo';
  }

  // 3. 전문 디자이너/전임강사/프로 -> teal / emerald
  if (
    role.includes('프로') ||
    role.includes('전임') ||
    role.includes('디자이너') ||
    role.includes('강사') ||
    role.includes('instructor')
  ) {
    return 'teal';
  }

  // 4. 어시스턴트/인턴/파트타임 -> amber / blue
  if (
    role.includes('인턴') ||
    role.includes('어시') ||
    role.includes('파트') ||
    role.includes('assistant') ||
    role.includes('intern')
  ) {
    return 'amber';
  }

  return 'slate';
}

/**
 * 일정 가시성 최종 결정:
 * 개별 일정에 오버라이드가 있으면 우선 적용, 없으면 직원의 기본 공개 범위, 둘 다 없으면 'PUBLIC'
 */
export function resolveScheduleVisibility(
  eventVisibility?: ScheduleVisibility,
  staffDefaultVisibility?: ScheduleVisibility
): ScheduleVisibility {
  if (eventVisibility) return eventVisibility;
  if (staffDefaultVisibility) return staffDefaultVisibility;
  return 'PUBLIC';
}

export interface FilterScheduleVisibilityParams<T extends BaseScheduleEntity> {
  viewer: ViewerContext;
  schedules: T[];
  staffProfiles: Map<string, StaffScheduleProfile> | StaffScheduleProfile[];
  viewMode?: ScheduleViewMode;
  selectedStaffIds?: string[];
  maskCustomerPIIOnPublic?: boolean;
}

/**
 * 사업장 내 동료 일정 상호 조회 및 가시성/마스킹 필터링 순수 함수
 */
export function filterAndSanitizeSchedulesForViewer<T extends BaseScheduleEntity>(
  params: FilterScheduleVisibilityParams<T>
): ProcessedScheduleItem<T>[] {
  const {
    viewer,
    schedules,
    viewMode = 'all',
    selectedStaffIds = [],
    maskCustomerPIIOnPublic = true,
  } = params;

  const staffMap: Map<string, StaffScheduleProfile> =
    params.staffProfiles instanceof Map
      ? params.staffProfiles
      : new Map(params.staffProfiles.map((s) => [s.id, s]));

  const isOwnerOrAdmin = viewer.role === 'owner' || viewer.role === 'admin';
  const viewerStaffId = viewer.id ?? null;

  const results: ProcessedScheduleItem<T>[] = [];

  for (const item of schedules) {
    // 1. 보안 원칙: 타 테넌트(organization_id) 데이터는 무조건 배제
    if (item.organizationId && item.organizationId !== viewer.organizationId) {
      continue;
    }

    const itemStaffId = item.staffId ?? '';
    const isOwnSchedule = Boolean(viewerStaffId && itemStaffId === viewerStaffId);
    const staffProfile = itemStaffId ? staffMap.get(itemStaffId) : undefined;

    // 2. 스태프 필터 모드 적용
    if (viewMode === 'my_only') {
      // 내 일정만 보기
      if (!isOwnSchedule) continue;
    } else if (viewMode === 'custom_staff') {
      // 특정 직원 다중 선택 필터
      if (!itemStaffId || !selectedStaffIds.includes(itemStaffId)) {
        continue;
      }
    }

    // 3. 가시성 결정 (개별 오버라이드 -> 직원 기본값 -> PUBLIC)
    const effectiveVisibility = resolveScheduleVisibility(
      item.visibility,
      staffProfile?.defaultVisibility
    );

    // 4. 가시성 및 권한 규칙 검증
    // - 사업주/관리자 또는 본인 일정: 항상 모든 정보 열람 및 편집 가능
    if (isOwnerOrAdmin || isOwnSchedule) {
      const colorTheme = getStaffThemeColor(staffProfile);
      const title = item.customerName || item.serviceName || '예약';
      const subtitle = [
        item.serviceName,
        item.staffName || staffProfile?.name,
        item.roomName,
      ]
        .filter(Boolean)
        .join(' · ');

      results.push({
        original: item,
        sanitized: { ...item },
        visibility: effectiveVisibility,
        isOwnSchedule,
        isOwnerOrAdmin,
        isMasked: false,
        displayTitle: title,
        displaySubtitle: subtitle,
        colorTheme,
        canEdit: true,
      });
      continue;
    }

    // - 타 직원의 일정일 때:
    if (effectiveVisibility === 'PRIVATE') {
      // 비공개: 타 직원에게 완전 숨김
      continue;
    }

    if (effectiveVisibility === 'FREE_BUSY_ONLY') {
      // 슬롯 예약 여부(바쁨)만 공유, 구체적 고객 정보 및 서비스 메모 마스킹
      const staffName = item.staffName || staffProfile?.name || '동료 직원';
      const sanitized: T = {
        ...item,
        customerName: '예약 중 (비공개)',
        customerPhone: undefined,
        memo: undefined,
        serviceName: '일정 있음',
        isMasked: true,
      };

      results.push({
        original: item,
        sanitized,
        visibility: 'FREE_BUSY_ONLY',
        isOwnSchedule: false,
        isOwnerOrAdmin: false,
        isMasked: true,
        displayTitle: '예약 중 (바쁨)',
        displaySubtitle: `${staffName}${item.roomName ? ` · ${item.roomName}` : ''}`,
        colorTheme: 'slate', // 바쁨 상태는 차분한 slate 테마 적용
        canEdit: false,
      });
      continue;
    }

    // effectiveVisibility === 'PUBLIC'
    // 공개 일정이지만, 개인정보 보호(PII)를 위해 고객 연락처나 극비 메모는 마스킹 가능
    const staffName = item.staffName || staffProfile?.name || '동료 직원';
    const sanitized: T = {
      ...item,
      customerPhone: maskCustomerPIIOnPublic ? undefined : item.customerPhone,
      memo: maskCustomerPIIOnPublic ? undefined : item.memo,
      isMasked: false,
    };

    const colorTheme = getStaffThemeColor(staffProfile);
    const title = item.customerName || item.serviceName || '공개 일정';
    const subtitle = [
      item.serviceName,
      staffName,
      item.roomName,
    ]
      .filter(Boolean)
      .join(' · ');

    results.push({
      original: item,
      sanitized,
      visibility: 'PUBLIC',
      isOwnSchedule: false,
      isOwnerOrAdmin: false,
      isMasked: false,
      displayTitle: title,
      displaySubtitle: subtitle,
      colorTheme,
      canEdit: false, // 타 직원의 일정은 기본적으로 편집 불가
    });
  }

  return results;
}
