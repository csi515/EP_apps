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
  email: string;
  /** 동일 역할로 로그인 가능한 추가 이메일 */
  aliases: ReadonlyArray<{
    userId: string;
    membershipId: string;
    email: string;
  }>;
  password: string;
  fullName: string;
  /** UI에서 기대하는 역할 표기(일부) */
  expectedRoleHints: readonly string[];
};

export const LOCAL_AUTH_ROLE_ACCOUNTS: readonly LocalAuthRoleAccount[] = [
  {
    role: 'owner',
    userId: '11111111-1111-4111-8111-111111111111',
    membershipId: '33333333-3333-4333-8333-333333333333',
    email: 'owner@ep.local',
    aliases: [
      {
        userId: '11111111-1111-4111-8111-11111111111a',
        membershipId: '33333333-3333-4333-8333-33333333333a',
        email: 'test@ep.local',
      },
    ],
    password: 'EpTest123!',
    fullName: 'EP 대표(owner)',
    expectedRoleHints: ['사업주', '대표', 'owner'],
  },
  {
    role: 'admin',
    userId: '11111111-1111-4111-8111-111111111112',
    membershipId: '33333333-3333-4333-8333-333333333334',
    email: 'admin@ep.local',
    aliases: [],
    password: 'EpTest123!',
    fullName: 'EP 관리자(admin)',
    expectedRoleHints: ['관리자', 'admin'],
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

/** @deprecated 단일 owner 시드 — LOCAL_AUTH_ROLE_ACCOUNTS[0] + LOCAL_AUTH_ORG 사용 */
export const LOCAL_AUTH_SEED = {
  ...LOCAL_AUTH_ORG,
  userId: LOCAL_AUTH_ROLE_ACCOUNTS[0].userId,
  email: 'test@ep.local',
  password: LOCAL_AUTH_ROLE_ACCOUNTS[0].password,
  fullName: LOCAL_AUTH_ROLE_ACCOUNTS[0].fullName,
  membershipId: LOCAL_AUTH_ROLE_ACCOUNTS[0].membershipId,
  role: LOCAL_AUTH_ROLE_ACCOUNTS[0].role,
} as const;
