/** 로컬 개발·브라우저 검증용 고정 시드 (Supabase 없이) */

export const LOCAL_AUTH_ORG = {
  organizationId: '22222222-2222-4222-8222-222222222222',
  organizationName: 'EP 테스트 사업장',
  organizationSlug: 'ep-test-plant',
  industryType: 'personal_plant_ops',
} as const;

/** EP_apps 사업장 멤버십에 쓰는 MemberRole (학원/고객 포털 역할 제외) */
export type LocalAuthRoleAccount = {
  role: 'owner' | 'admin' | 'manager' | 'staff';
  userId: string;
  membershipId: string;
  /** 로그인 아이디 (문자열). 없으면 email 을 login_id 로 사용 */
  loginId?: string;
  email: string | null;
  /** 동일 역할로 로그인 가능한 추가 계정 */
  aliases: ReadonlyArray<{
    userId: string;
    membershipId: string;
    loginId?: string;
    email: string | null;
  }>;
  password: string;
  fullName: string;
  /** UI에서 기대하는 역할 표기(일부) */
  expectedRoleHints: readonly string[];
};

/**
 * 역할별 고정 계정.
 * 대표(owner)는 rndDemoSeed의 김대표(rndceo)만 쓴다 — EP 대표(owner) 중복 제거.
 */
export const LOCAL_AUTH_ROLE_ACCOUNTS: readonly LocalAuthRoleAccount[] = [
  {
    role: 'admin',
    userId: '11111111-1111-4111-8111-111111111112',
    membershipId: '33333333-3333-4333-8333-333333333334',
    loginId: 'pmcmadmin',
    email: null,
    aliases: [],
    password: 'Pmcm1234!',
    fullName: 'PMCM 관리자',
    expectedRoleHints: ['관리자', 'admin', 'pmcmadmin'],
  },
  {
    role: 'manager',
    userId: '11111111-1111-4111-8111-111111111113',
    membershipId: '33333333-3333-4333-8333-333333333335',
    email: 'manager@ep.local',
    aliases: [],
    password: 'EpTest123!',
    fullName: 'EP 매니저(manager)',
    expectedRoleHints: ['매니저', 'manager'],
  },
  {
    role: 'staff',
    userId: '11111111-1111-4111-8111-111111111114',
    membershipId: '33333333-3333-4333-8333-333333333336',
    email: 'staff@ep.local',
    aliases: [],
    password: 'EpTest123!',
    fullName: 'EP 직원(staff)',
    expectedRoleHints: ['직원', 'staff'],
  },
] as const;

/** 로컬 기본 owner = 김대표(rndceo). rndDemoSeed PEOPLE[0] 와 동일 UUID */
export const LOCAL_AUTH_SEED = {
  ...LOCAL_AUTH_ORG,
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa501',
  email: null as string | null,
  loginId: 'rndceo',
  password: 'EpTest123!',
  fullName: '김대표',
  membershipId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb501',
  role: 'owner' as const,
} as const;
