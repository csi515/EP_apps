/**
 * EP_apps 로컬 검증용 권한 프로파일.
 * - 프리셋 직급(personal_plant_ops.roles)
 * - 직무 기능 권한(MemberList FEATURE_ASSIGNMENT_OPTIONS)
 * - 총무/시설 관리자 템플릿
 *
 * Vite config가 이 모듈을 로드하므로 @/ alias / src domain 의존을 두지 않는다.
 */

const ROLE_PERMISSION_KEYS = [
  'billing_invoices',
  'attendance',
  'booking',
  'passes',
  'statistics',
  'members_manage',
  'members:manage',
  'roles:assign',
  'seat_room',
  'rental_equipment',
  'policies',
  'resources_manage',
  'resources:manage',
  'grievances_manage',
  'feedbacks:read_all',
  'ownership:transfer',
  'shuttle:manage',
  'volunteer:manage',
  'meal_survey:manage',
  'office_supply_request:manage',
  'rnd_portal:access',
] as const;

type RolePermissionKey = (typeof ROLE_PERMISSION_KEYS)[number];
type RolePermissionMap = Record<RolePermissionKey, boolean>;

const EMPTY_ROLE_PERMISSIONS: RolePermissionMap = {
  billing_invoices: false,
  attendance: true,
  booking: true,
  passes: true,
  statistics: false,
  members_manage: false,
  'members:manage': false,
  'roles:assign': false,
  seat_room: false,
  rental_equipment: false,
  policies: false,
  resources_manage: false,
  'resources:manage': false,
  grievances_manage: false,
  'feedbacks:read_all': false,
  'ownership:transfer': false,
  'shuttle:manage': false,
  'volunteer:manage': false,
  'meal_survey:manage': false,
  'office_supply_request:manage': false,
  'rnd_portal:access': false,
};

const GENERAL_AFFAIRS_ROLE_TEMPLATE = {
  name: '총무/시설 관리자',
  permissions: {
    'members:manage': true,
    'roles:assign': true,
    seat_room: true,
    booking: true,
    rental_equipment: true,
    billing_invoices: false,
    attendance: true,
    passes: true,
    policies: false,
    statistics: false,
    resources_manage: true,
    grievances_manage: false,
    'shuttle:manage': true,
    'volunteer:manage': true,
    'meal_survey:manage': true,
    'office_supply_request:manage': true,
    'rnd_portal:access': false,
  },
} as const;

const SHARED_PASSWORD = 'EpTest123!';

function allTrue(): RolePermissionMap {
  return Object.fromEntries(ROLE_PERMISSION_KEYS.map((k) => [k, true])) as RolePermissionMap;
}

/** 프리셋 토큰 → RolePermissionMap (epRoleSeed 규칙 축약본) */
export function mapTokensToPermissionMap(tokens: readonly string[]): RolePermissionMap {
  const next: RolePermissionMap = { ...EMPTY_ROLE_PERMISSIONS };
  if (tokens.includes('*')) return allTrue();

  const hasPrefix = (prefix: string) =>
    tokens.some((t) => t === prefix || t.startsWith(`${prefix}:`) || t === `${prefix}:*`);

  if (
    tokens.includes('booking:book') ||
    tokens.includes('booking:*') ||
    hasPrefix('booking')
  ) {
    next.booking = true;
  }
  if (hasPrefix('resources') || tokens.includes('booking:*')) {
    next.booking = true;
    next.seat_room = true;
    next.rental_equipment = true;
    next.resources_manage = true;
    next['resources:manage'] = true;
  }
  if (hasPrefix('research_project') || tokens.includes('rnd_portal:access')) {
    next['rnd_portal:access'] = true;
  }
  if (hasPrefix('whistleblower_grievance') || tokens.includes('feedbacks:*')) {
    next.grievances_manage = true;
    next['feedbacks:read_all'] = true;
  }
  if (hasPrefix('shuttle') || hasPrefix('vehicle_shuttle') || hasPrefix('shuttle_dispatch')) {
    next['shuttle:manage'] = true;
  }
  if (hasPrefix('volunteer')) next['volunteer:manage'] = true;
  if (hasPrefix('meal_survey')) next['meal_survey:manage'] = true;
  if (hasPrefix('office_supply')) next['office_supply_request:manage'] = true;

  const grantsDelegationAdmin = tokens.some((t) => {
    if (t === 'mbo:*' || t === 'approval_workflow:*' || t === 'task_pipeline:*') return true;
    return /^(mbo|approval_workflow|task_pipeline):(update|manage|approve)\b/.test(t);
  });
  if (grantsDelegationAdmin) {
    next['roles:assign'] = true;
    next['members:manage'] = true;
    next.members_manage = true;
    next.policies = true;
  }
  if (tokens.includes('roles:assign') || tokens.includes('members:manage')) {
    next['roles:assign'] = true;
    next['members:manage'] = true;
    next.members_manage = true;
  }
  return next;
}

export type LocalPermissionProfile = {
  slug: string;
  email: string;
  fullName: string;
  /** MemberRole 컬럼 (게이트용) */
  memberRole: 'owner' | 'admin' | 'manager' | 'staff';
  userId: string;
  membershipId: string;
  orgRoleId: string | null;
  orgRoleName: string | null;
  permissions: RolePermissionMap;
  featurePermissions: Record<string, boolean>;
  /** 검증 시 반드시 true 여야 하는 키 */
  expectTrue: readonly string[];
  password: string;
};

const PRESET_RANKS: {
  slug: string;
  name: string;
  tokens: readonly string[];
  memberRole: LocalPermissionProfile['memberRole'];
  email: string;
  userSuffix: string;
}[] = [
  // 직급 추천안 명칭 (직책명과 분리). 계정 이메일은 검증 호환용으로 유지.
  {
    slug: 'rank-ceo',
    name: '임원',
    tokens: ['*'],
    memberRole: 'owner',
    email: 'ceo@ep.local',
    userSuffix: '201',
  },
  {
    slug: 'rank-hq',
    name: '부장',
    tokens: [
      'approval_workflow:*',
      'mbo:*',
      'task_pipeline:*',
      'research_project:*',
      'resources:*',
    ],
    memberRole: 'manager',
    email: 'hq@ep.local',
    userSuffix: '202',
  },
  {
    slug: 'rank-center',
    name: '차장',
    tokens: [
      'approval_workflow:*',
      'mbo:*',
      'task_pipeline:*',
      'research_project:update',
    ],
    memberRole: 'manager',
    email: 'center@ep.local',
    userSuffix: '203',
  },
  {
    slug: 'rank-teamlead',
    name: '과장',
    tokens: [
      'approval_workflow:submit',
      'approval_workflow:view',
      'mbo:update',
      'task_pipeline:*',
    ],
    memberRole: 'manager',
    email: 'teamlead@ep.local',
    userSuffix: '204',
  },
  {
    slug: 'rank-cell',
    name: '대리',
    tokens: ['task_pipeline:update', 'mbo:view', 'approval_workflow:submit'],
    memberRole: 'staff',
    email: 'cell@ep.local',
    userSuffix: '205',
  },
  {
    slug: 'rank-member',
    name: '사원',
    tokens: [
      'booking:book',
      'whistleblower_grievance:create',
      'mbo:view',
      'research_project:view',
    ],
    memberRole: 'staff',
    email: 'member@ep.local',
    userSuffix: '206',
  },
];

const FEATURE_SPECIALISTS: {
  slug: string;
  email: string;
  label: string;
  key: string;
  userSuffix: string;
}[] = [
  {
    slug: 'feat-resources',
    email: 'resources@ep.local',
    label: '공용자원/총무 담당',
    key: 'resources:manage',
    userSuffix: '301',
  },
  {
    slug: 'feat-volunteer',
    email: 'volunteer@ep.local',
    label: '봉사활동 담당',
    key: 'volunteer:manage',
    userSuffix: '302',
  },
  {
    slug: 'feat-grievance',
    email: 'grievance@ep.local',
    label: '노경 건의함 담당',
    key: 'grievances_manage',
    userSuffix: '303',
  },
  {
    slug: 'feat-shuttle',
    email: 'shuttle@ep.local',
    label: '통근 셔틀 담당',
    key: 'shuttle:manage',
    userSuffix: '304',
  },
  {
    slug: 'feat-supply',
    email: 'supply@ep.local',
    label: '사무 소모품 담당',
    key: 'office_supply_request:manage',
    userSuffix: '305',
  },
  {
    slug: 'feat-meal',
    email: 'meal@ep.local',
    label: '식수인원 조사 담당',
    key: 'meal_survey:manage',
    userSuffix: '306',
  },
  {
    slug: 'feat-safety',
    email: 'safety@ep.local',
    label: '현장 안전/SOP 담당',
    key: 'safety:manage',
    userSuffix: '307',
  },
];

function uid(suffix: string): string {
  return `11111111-1111-4111-8111-111111111${suffix}`;
}
function mid(suffix: string): string {
  return `33333333-3333-4333-8333-333333333${suffix}`;
}
function rid(suffix: string): string {
  return `44444444-4444-4444-8444-444444444${suffix}`;
}

function buildRankProfiles(): LocalPermissionProfile[] {
  return PRESET_RANKS.map((rank, index) => {
    const permissions = mapTokensToPermissionMap(rank.tokens);
    if (index === 0 || rank.tokens.includes('*')) {
      permissions['roles:assign'] = true;
      permissions['members:manage'] = true;
      permissions.members_manage = true;
      permissions['ownership:transfer'] = true;
      permissions['rnd_portal:access'] = true;
    }
    const expectTrue =
      rank.tokens.includes('*')
        ? (['roles:assign', 'resources:manage', 'rnd_portal:access'] as const)
        : (Object.entries(permissions)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .slice(0, 8) as string[]);

    return {
      slug: rank.slug,
      email: rank.email,
      fullName: `EP ${rank.name}`,
      memberRole: rank.memberRole,
      userId: uid(rank.userSuffix),
      membershipId: mid(rank.userSuffix),
      orgRoleId: rid(rank.userSuffix),
      orgRoleName: rank.name,
      permissions,
      featurePermissions: {},
      expectTrue,
      password: SHARED_PASSWORD,
    };
  });
}

function buildFeatureProfiles(): LocalPermissionProfile[] {
  return FEATURE_SPECIALISTS.map((feat) => {
    const permissions: RolePermissionMap = { ...EMPTY_ROLE_PERMISSIONS };
    // RolePermissionMap에 있는 키만 맵에 반영, safety:manage는 feature만
    if (feat.key in permissions || feat.key === 'resources:manage') {
      if (feat.key === 'resources:manage') {
        permissions.resources_manage = true;
        permissions['resources:manage'] = true;
        permissions.booking = true;
        permissions.seat_room = true;
      } else if (feat.key === 'grievances_manage') {
        permissions.grievances_manage = true;
        permissions['feedbacks:read_all'] = true;
      } else if (feat.key === 'volunteer:manage') {
        permissions['volunteer:manage'] = true;
      } else if (feat.key === 'shuttle:manage') {
        permissions['shuttle:manage'] = true;
      } else if (feat.key === 'office_supply_request:manage') {
        permissions['office_supply_request:manage'] = true;
      } else if (feat.key === 'meal_survey:manage') {
        permissions['meal_survey:manage'] = true;
      }
    }
    return {
      slug: feat.slug,
      email: feat.email,
      fullName: `EP ${feat.label}`,
      memberRole: 'staff' as const,
      userId: uid(feat.userSuffix),
      membershipId: mid(feat.userSuffix),
      orgRoleId: null,
      orgRoleName: null,
      permissions,
      featurePermissions: { [feat.key]: true },
      expectTrue: [feat.key],
      password: SHARED_PASSWORD,
    };
  });
}

function buildSpecialProfiles(): LocalPermissionProfile[] {
  const gaPerms = {
    ...EMPTY_ROLE_PERMISSIONS,
    ...GENERAL_AFFAIRS_ROLE_TEMPLATE.permissions,
    members_manage: true,
    resources_manage: true,
    'resources:manage': true,
  } as RolePermissionMap;

  const mboPerms = mapTokensToPermissionMap(['mbo:*', 'approval_workflow:*']);

  return [
    {
      slug: 'tmpl-ga',
      email: 'ga@ep.local',
      fullName: `EP ${GENERAL_AFFAIRS_ROLE_TEMPLATE.name}`,
      memberRole: 'admin',
      userId: uid('401'),
      membershipId: mid('401'),
      orgRoleId: rid('401'),
      orgRoleName: GENERAL_AFFAIRS_ROLE_TEMPLATE.name,
      permissions: gaPerms,
      featurePermissions: {
        'resources:manage': true,
        'shuttle:manage': true,
        'volunteer:manage': true,
        'meal_survey:manage': true,
        'office_supply_request:manage': true,
      },
      expectTrue: ['roles:assign', 'resources:manage', 'shuttle:manage'],
      password: SHARED_PASSWORD,
    },
    {
      slug: 'tmpl-mbo',
      email: 'mbo@ep.local',
      fullName: 'EP MBO 승인자',
      memberRole: 'manager',
      userId: uid('402'),
      membershipId: mid('402'),
      orgRoleId: rid('402'),
      orgRoleName: 'MBO 승인자',
      permissions: mboPerms,
      featurePermissions: {},
      expectTrue: ['roles:assign', 'members:manage'],
      password: SHARED_PASSWORD,
    },
  ];
}

/** 세부 권한 프로파일(직급·직무·템플릿). MemberRole 기본 계정과 별도. */
export const LOCAL_PERMISSION_PROFILES: readonly LocalPermissionProfile[] = [
  ...buildRankProfiles(),
  ...buildFeatureProfiles(),
  ...buildSpecialProfiles(),
];

export const LOCAL_ORG_ROLE_DEFS = LOCAL_PERMISSION_PROFILES.filter((p) => p.orgRoleId && p.orgRoleName).map(
  (p) => ({
    id: p.orgRoleId!,
    name: p.orgRoleName!,
    permissions: p.permissions,
  })
);
