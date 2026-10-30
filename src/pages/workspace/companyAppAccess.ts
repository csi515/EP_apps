import { isOrgAdmin } from '@/core/auth/permissionsRole';
import {
  canAccessRndPortal,
  canManageMealSurvey,
  canManageOfficeSupplyRequest,
  canManageResourceCatalog,
  canManageShuttleRoutes,
  canManageVolunteer,
  getCallerEffectivePermissions,
  normalizeRolePermissions,
  type AccessMember,
} from '@/domain/permissions';
import { FEATURE_OPTION_I18N } from '@/core/i18n/epAppsMessages';
import type { PublishedCompanyAppId } from './publishedCompanyApps';

/** 멤버별 앱 이용 허용(회원 목록에서 개별 배정) */
export const COMPANY_APP_ACCESS_FEATURE_PREFIX = 'company_app:';

export function companyAppAccessFeatureKey(appId: PublishedCompanyAppId): string {
  return `${COMPANY_APP_ACCESS_FEATURE_PREFIX}${appId}`;
}

/** 담당자 직무 키 — 배정 시 해당 앱 런처·진입도 허용 */
export const COMPANY_APP_LEGACY_MANAGER_FEATURE_KEYS: Partial<
  Record<PublishedCompanyAppId, string>
> = {
  resources: 'resources:manage',
  grievances: 'grievances_manage',
  volunteer: 'volunteer:manage',
  shuttle: 'shuttle:manage',
  office_supply: 'office_supply_request:manage',
  meal_survey: 'meal_survey:manage',
  sop_risk: 'safety:manage',
};

/** @deprecated UI는 FEATURE_OPTION_I18N + translate 사용. 폴백/레거시 표시용 */
export const COMPANY_APP_ACCESS_LABELS: Record<string, string> = {
  'company_app:research': '연구소 앱',
  'company_app:mbo': 'MBO 앱',
  'company_app:shuttle': '통근 셔틀 앱',
  'company_app:resources': '공용 자원 앱',
  'company_app:sop_risk': '작업표준·위험성평가 앱',
  'company_app:grievances': '노경 건의함 앱',
  'company_app:volunteer': '봉사활동 앱',
  'company_app:meal_survey': '식수인원 조사 앱',
  'company_app:office_supply': '사무용품 취합 앱',
  resources: '공용자원 담당',
  'volunteer:manage': '봉사활동 담당',
  grievances_manage: '노경·고충 담당',
  'shuttle:manage': '통근셔틀 담당',
  'office_supply_request:manage': '사무용품 담당',
  'meal_survey:manage': '식수조사 담당',
  'safety:manage': '현장 안전/SOP 담당',
};

export type CompanyAppFeatureAssignmentOption = {
  key: string;
  /** i18n label key (ep.feature.*) */
  labelKey: string;
  /** i18n desc key */
  descKey: string;
  /** i18n short chip key */
  chipKey: string;
  /** 한글 폴백 (translate 미기동/테스트용) */
  label: string;
  desc: string;
  appId?: PublishedCompanyAppId;
};

function buildOption(
  key: string,
  label: string,
  desc: string,
  appId?: PublishedCompanyAppId
): CompanyAppFeatureAssignmentOption {
  const i18n = FEATURE_OPTION_I18N[key];
  return {
    key,
    label,
    desc,
    labelKey: i18n?.labelKey ?? key,
    descKey: i18n?.descKey ?? key,
    chipKey: i18n?.chipKey ?? key,
    appId,
  };
}

/** 회원 목록 — 앱 이용·담당 권한 배정 (표시 순서) */
export const COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS: readonly CompanyAppFeatureAssignmentOption[] =
  [
    buildOption(
      companyAppAccessFeatureKey('research'),
      '연구소 앱 이용',
      '연구소 포털 런처 표시 및 /rnd 진입',
      'research'
    ),
    buildOption(
      companyAppAccessFeatureKey('mbo'),
      'MBO 앱 이용',
      'MBO 목표·월별 체크 앱 진입',
      'mbo'
    ),
    buildOption(
      companyAppAccessFeatureKey('shuttle'),
      '통근 셔틀 앱 이용',
      '셔틀 신청·노선 앱 진입',
      'shuttle'
    ),
    buildOption(
      companyAppAccessFeatureKey('resources'),
      '공용 자원 앱 이용',
      '차량·회의실 예약 앱 진입',
      'resources'
    ),
    buildOption(
      companyAppAccessFeatureKey('sop_risk'),
      '작업표준·위험성평가 앱 이용',
      'SOP·위험성평가 앱 진입',
      'sop_risk'
    ),
    buildOption(
      companyAppAccessFeatureKey('grievances'),
      '노경 건의함 앱 이용',
      '건의함 앱 진입',
      'grievances'
    ),
    buildOption(
      companyAppAccessFeatureKey('volunteer'),
      '봉사활동 앱 이용',
      '봉사 신청·관리 앱 진입',
      'volunteer'
    ),
    buildOption(
      companyAppAccessFeatureKey('meal_survey'),
      '식수인원 조사 앱 이용',
      '식수 조사 앱 진입',
      'meal_survey'
    ),
    buildOption(
      companyAppAccessFeatureKey('office_supply'),
      '사무용품 취합 앱 이용',
      '소모품 신청 앱 진입',
      'office_supply'
    ),
    buildOption('resources:manage', '공용자원/총무 담당', '회의실·업무차량 자원 등록 및 승인'),
    buildOption('volunteer:manage', '봉사활동 담당', '봉사 프로그램 개설 및 신청자 확정'),
    buildOption('grievances_manage', '노경 건의함 담당', '고충 건의함 열람 및 답변 등록'),
    buildOption('shuttle:manage', '통근 셔틀 담당', '셔틀 노선 및 배차 스케줄 관리'),
    buildOption(
      'office_supply_request:manage',
      '사무 소모품 담당',
      '소모품 신청 검토 및 재고 불출'
    ),
    buildOption('meal_survey:manage', '식수인원 조사 담당', '식사 슬롯·식수 현황 관리'),
    buildOption('safety:manage', '현장 안전/SOP 담당', '위험성평가 및 작업표준 관리'),
  ] as const;

/** 앱 이용(company_app:*) 권한만 — 일괄 배정 UI용 */
export const COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS = COMPANY_APP_FEATURE_ASSIGNMENT_OPTIONS.filter(
  (opt): opt is CompanyAppFeatureAssignmentOption & { appId: PublishedCompanyAppId } =>
    Boolean(opt.appId)
);

export type CompanyAppAccessInput = AccessMember & {
  feature_permissions?: Record<string, boolean> | null;
};

export type FeatureTriState = 'granted' | 'denied' | 'unset';

/** 멤버 feature_permissions 키의 명시 부여/거부/미설정 */
export function getMemberFeatureTriState(
  key: string,
  featurePermissions: Record<string, boolean> | null | undefined
): FeatureTriState {
  if (!featurePermissions || !Object.prototype.hasOwnProperty.call(featurePermissions, key)) {
    return 'unset';
  }
  return featurePermissions[key] ? 'granted' : 'denied';
}

function resolveMemberFeatureAccess(
  appId: PublishedCompanyAppId,
  featurePermissions: Record<string, boolean> | null | undefined
): FeatureTriState {
  const primary = getMemberFeatureTriState(
    companyAppAccessFeatureKey(appId),
    featurePermissions
  );
  if (primary !== 'unset') return primary;

  const legacyKey = COMPANY_APP_LEGACY_MANAGER_FEATURE_KEYS[appId];
  if (!legacyKey) return 'unset';
  return getMemberFeatureTriState(legacyKey, featurePermissions);
}

function roleGrantsCompanyApp(appId: PublishedCompanyAppId, member: AccessMember): boolean {
  const effective = getCallerEffectivePermissions(member);

  switch (appId) {
    case 'research':
      return canAccessRndPortal(member);
    case 'mbo':
      return Boolean(effective['mbo:goals:read']);
    case 'resources':
      return (
        canManageResourceCatalog(member) ||
        Boolean(effective.booking || effective.seat_room || effective.rental_equipment)
      );
    case 'shuttle':
      return canManageShuttleRoutes(member) || true;
    case 'sop_risk':
      return false;
    case 'grievances':
      return Boolean(effective.grievances_manage || effective['feedbacks:read_all']);
    case 'volunteer':
      return canManageVolunteer(member) || true;
    case 'meal_survey':
      return canManageMealSurvey(member) || true;
    case 'office_supply':
      return canManageOfficeSupplyRequest(member) || true;
    default:
      return false;
  }
}

export type AppPermissionEffectiveState = 'granted' | 'denied' | 'role' | 'unset';

/**
 * UI용 앱 권한 유효 상태.
 * granted = 개별 부여, denied = 명시 차단, role = 직급/담당으로 허용, unset = 미설정·불가
 */
export function describeAppPermissionEffectiveState(
  appId: PublishedCompanyAppId,
  input: CompanyAppAccessInput | null | undefined
): AppPermissionEffectiveState {
  if (!input) return 'unset';
  if (isOrgAdmin(input.role)) return 'granted';

  const featureState = resolveMemberFeatureAccess(appId, input.feature_permissions);
  if (featureState === 'granted') return 'granted';
  if (featureState === 'denied') return 'denied';

  const member: AccessMember = {
    role: input.role,
    customRole: input.customRole,
    permissions: input.permissions ?? input.customRole?.permissions ?? null,
  };
  if (roleGrantsCompanyApp(appId, member)) return 'role';
  return 'unset';
}

/**
 * 사내 게시 앱 런처·라우트 진입 가능 여부.
 * - owner/admin/manager/director 등 조직 관리자: capability만 충족하면 전 앱 표시
 * - 그 외: 멤버 feature_permissions(명시 거부) 또는 직급 위임
 */
export function canAccessCompanyApp(
  appId: PublishedCompanyAppId,
  input: CompanyAppAccessInput | null | undefined
): boolean {
  if (!input) return false;
  if (isOrgAdmin(input.role)) return true;

  const member: AccessMember = {
    role: input.role,
    customRole: input.customRole,
    permissions: input.permissions ?? input.customRole?.permissions ?? null,
  };

  const featureState = resolveMemberFeatureAccess(appId, input.feature_permissions);
  if (featureState === 'granted') return true;
  if (featureState === 'denied') return false;

  return roleGrantsCompanyApp(appId, member);
}

export function countGrantedCompanyAppUsage(
  featurePermissions: Record<string, boolean> | null | undefined
): number {
  return COMPANY_APP_USAGE_ASSIGNMENT_OPTIONS.filter((opt) =>
    Boolean(featurePermissions?.[opt.key])
  ).length;
}

export function buildCompanyAppAccessInputFromStorageUser(
  activeUser: {
    role?: string | null;
    customRole?: { permissions?: Record<string, boolean> | string[] | null } | null;
    feature_permissions?: Record<string, boolean> | null;
  } | null
): CompanyAppAccessInput | null {
  if (!activeUser) return null;
  return {
    role: activeUser.role,
    customRole: activeUser.customRole ?? null,
    permissions: normalizeRolePermissions(activeUser.customRole?.permissions ?? null),
    feature_permissions: activeUser.feature_permissions ?? null,
  };
}
