/**
 * 연구개발그룹 MBO 시연용 idempotent 시드 팩.
 * 시연 로그인: rndlead / EpTest123!
 */
import { hashPassword } from './passwords';
import { LOCAL_AUTH_ORG } from './seed';
import { mapTokensToPermissionMap } from './permissionProfiles';

type QueryResult<T> = { rows: T[] };
type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
};

export const RND_DEMO_PASSWORD = 'EpTest123!';
export const RND_DEMO_LEAD_LOGIN = 'rndlead';

const ORG_ID = LOCAL_AUTH_ORG.organizationId;

function uid(suffix: string): string {
  return `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa${suffix}`;
}
function mid(suffix: string): string {
  return `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb${suffix}`;
}
function rid(suffix: string): string {
  return `cccccccc-cccc-4ccc-8ccc-ccccccccc${suffix}`;
}
function did(suffix: string): string {
  return `dddddddd-dddd-4ddd-8ddd-ddddddddd${suffix}`;
}
function dmid(suffix: string): string {
  return `eeeeeeee-eeee-4eee-8eee-eeeeeeeee${suffix}`;
}
function sid(suffix: string): string {
  return `ffffffff-ffff-4fff-8fff-fffffffff${suffix}`;
}
function oid(suffix: string): string {
  return `55555555-5555-4555-8555-555555555${suffix}`;
}
function pid(suffix: string): string {
  return `66666666-6666-4666-8666-666666666${suffix}`;
}
function lid(suffix: string): string {
  return `77777777-7777-4777-8777-777777777${suffix}`;
}

/** 기존 permissionProfiles 직급 id (ensureLocalAuthSeeds 이후 존재) */
const EXISTING_ROLE = {
  hq: '44444444-4444-4444-8444-444444444202', // 부장
  teamlead: '44444444-4444-4444-8444-444444444204', // 과장
  member: '44444444-4444-4444-8444-444444444206', // 사원
} as const;

const ROLE_CEO = {
  id: rid('501'),
  name: '대표이사',
  rankOrder: 100,
  permissions: mapTokensToPermissionMap(['*']),
};

const DEPTS = {
  hq: {
    id: did('501'),
    name: '본사',
    unitKind: '회사',
    parentId: null as string | null,
    depth: 1,
  },
  rndGroup: {
    id: did('502'),
    name: '연구개발그룹',
    unitKind: '그룹',
    parentId: did('501'),
    depth: 2,
  },
  rndTeam: {
    id: did('503'),
    name: '연구개발1팀',
    unitKind: '팀',
    parentId: did('502'),
    depth: 3,
  },
} as const;

type DemoPerson = {
  loginId: string;
  fullName: string;
  userId: string;
  membershipId: string;
  staffId: string;
  memberRole: 'owner' | 'admin' | 'manager' | 'staff';
  orgRoleId: string;
  departmentId: string;
  deptMemberId: string;
  scopeType: 'DESCENDANTS' | 'SELF_ONLY';
};

const PEOPLE: readonly DemoPerson[] = [
  {
    loginId: 'rndceo',
    fullName: '김대표',
    userId: uid('501'),
    membershipId: mid('501'),
    staffId: sid('501'),
    memberRole: 'owner',
    orgRoleId: ROLE_CEO.id,
    departmentId: DEPTS.hq.id,
    deptMemberId: dmid('501'),
    scopeType: 'DESCENDANTS',
  },
  {
    loginId: 'rndhead',
    fullName: '박그룹장',
    userId: uid('502'),
    membershipId: mid('502'),
    staffId: sid('502'),
    memberRole: 'manager',
    orgRoleId: EXISTING_ROLE.hq,
    departmentId: DEPTS.rndGroup.id,
    deptMemberId: dmid('502'),
    scopeType: 'DESCENDANTS',
  },
  {
    loginId: RND_DEMO_LEAD_LOGIN,
    fullName: '이리더',
    userId: uid('503'),
    membershipId: mid('503'),
    staffId: sid('503'),
    memberRole: 'manager',
    orgRoleId: EXISTING_ROLE.teamlead,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('503'),
    scopeType: 'DESCENDANTS',
  },
  {
    loginId: 'rnd01',
    fullName: '최연구',
    userId: uid('504'),
    membershipId: mid('504'),
    staffId: sid('504'),
    memberRole: 'staff',
    orgRoleId: EXISTING_ROLE.member,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('504'),
    scopeType: 'SELF_ONLY',
  },
  {
    loginId: 'rnd02',
    fullName: '한지원',
    userId: uid('505'),
    membershipId: mid('505'),
    staffId: sid('505'),
    memberRole: 'staff',
    orgRoleId: EXISTING_ROLE.member,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('505'),
    scopeType: 'SELF_ONLY',
  },
  {
    loginId: 'rnd03',
    fullName: '오민재',
    userId: uid('506'),
    membershipId: mid('506'),
    staffId: sid('506'),
    memberRole: 'staff',
    orgRoleId: EXISTING_ROLE.member,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('506'),
    scopeType: 'SELF_ONLY',
  },
  {
    loginId: 'rnd04',
    fullName: '윤서연',
    userId: uid('507'),
    membershipId: mid('507'),
    staffId: sid('507'),
    memberRole: 'staff',
    orgRoleId: EXISTING_ROLE.member,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('507'),
    scopeType: 'SELF_ONLY',
  },
  {
    loginId: 'rnd05',
    fullName: '정태호',
    userId: uid('508'),
    membershipId: mid('508'),
    staffId: sid('508'),
    memberRole: 'staff',
    orgRoleId: EXISTING_ROLE.member,
    departmentId: DEPTS.rndTeam.id,
    deptMemberId: dmid('508'),
    scopeType: 'SELF_ONLY',
  },
];

function deptPath(dept: { id: string; parentId: string | null }): string {
  if (!dept.parentId) return `/${dept.id}/`;
  if (dept.parentId === DEPTS.hq.id) return `/${DEPTS.hq.id}/${dept.id}/`;
  return `/${DEPTS.hq.id}/${DEPTS.rndGroup.id}/${dept.id}/`;
}

function currentPeriodYm(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function upsertDemoUser(
  client: Queryable,
  person: DemoPerson
): Promise<void> {
  const passwordHash = hashPassword(RND_DEMO_PASSWORD);
  const loginId = person.loginId.toLowerCase();
  const byId = await client.query<{ id: string }>(
    `SELECT id FROM app.users WHERE id = $1::uuid`,
    [person.userId]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE app.users
      SET login_id = $1, email = NULL, password_hash = $2, full_name = $3, is_active = TRUE
      WHERE id = $4::uuid
    `,
      [loginId, passwordHash, person.fullName, person.userId]
    );
    return;
  }
  const byLogin = await client.query<{ id: string }>(
    `SELECT id FROM app.users WHERE LOWER(login_id) = LOWER($1)`,
    [loginId]
  );
  if (byLogin.rows[0]) {
    await client.query(
      `
      UPDATE app.users
      SET password_hash = $1, full_name = $2, is_active = TRUE
      WHERE id = $3::uuid
    `,
      [passwordHash, person.fullName, byLogin.rows[0].id]
    );
    return;
  }
  await client.query(
    `
    INSERT INTO app.users (id, email, login_id, password_hash, full_name, is_active)
    VALUES ($1::uuid, NULL, $2, $3, $4, TRUE)
  `,
    [person.userId, loginId, passwordHash, person.fullName]
  );
}

async function upsertCeoRole(client: Queryable): Promise<string> {
  const permissionsJson = JSON.stringify({
    ...ROLE_CEO.permissions,
    'roles:assign': true,
    'members:manage': true,
    members_manage: true,
    'ownership:transfer': true,
    'rnd_portal:access': true,
  });
  const byId = await client.query<{ id: string }>(
    `SELECT id FROM core.organization_roles WHERE id = $1::uuid`,
    [ROLE_CEO.id]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_roles
      SET name = $1, rank_order = $2, permissions = $3::jsonb, tenant_id = $4::uuid
      WHERE id = $5::uuid
    `,
      [ROLE_CEO.name, ROLE_CEO.rankOrder, permissionsJson, ORG_ID, ROLE_CEO.id]
    );
    return ROLE_CEO.id;
  }
  const byName = await client.query<{ id: string }>(
    `
    SELECT id FROM core.organization_roles
    WHERE tenant_id = $1::uuid AND name = $2
  `,
    [ORG_ID, ROLE_CEO.name]
  );
  if (byName.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_roles
      SET rank_order = $1, permissions = $2::jsonb
      WHERE id = $3::uuid
    `,
      [ROLE_CEO.rankOrder, permissionsJson, byName.rows[0].id]
    );
    return byName.rows[0].id;
  }
  await client.query(
    `
    INSERT INTO core.organization_roles (id, tenant_id, name, rank_order, permissions)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
  `,
    [ROLE_CEO.id, ORG_ID, ROLE_CEO.name, ROLE_CEO.rankOrder, permissionsJson]
  );
  return ROLE_CEO.id;
}

async function upsertDepartments(client: Queryable): Promise<void> {
  for (const dept of [DEPTS.hq, DEPTS.rndGroup, DEPTS.rndTeam]) {
    const path = deptPath(dept);
    await client.query(
      `
      INSERT INTO core.departments (
        id, organization_id, parent_id, name, path, depth, unit_kind
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7
      )
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            parent_id = EXCLUDED.parent_id,
            path = EXCLUDED.path,
            depth = EXCLUDED.depth,
            unit_kind = EXCLUDED.unit_kind,
            updated_at = NOW()
    `,
      [
        dept.id,
        ORG_ID,
        dept.parentId,
        dept.name,
        path,
        dept.depth,
        dept.unitKind,
      ]
    );
  }
}

async function upsertStaffAndMembership(
  client: Queryable,
  person: DemoPerson
): Promise<string> {
  await client.query(
    `
    INSERT INTO core.staff (
      id, organization_id, user_id, name, email, status, department_id
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4, NULL, 'active', $5::uuid
    )
    ON CONFLICT (id) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          department_id = EXCLUDED.department_id,
          status = 'active',
          updated_at = NOW()
  `,
    [person.staffId, ORG_ID, person.userId, person.fullName, person.departmentId]
  );

  const byId = await client.query<{ id: string }>(
    `SELECT id FROM core.organization_members WHERE id = $1::uuid`,
    [person.membershipId]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_members
      SET organization_id = $1::uuid, user_id = $2::uuid, role = $3::core.member_role,
          staff_id = $4::uuid, organization_role_id = $5::uuid,
          is_current_context = TRUE, is_active = TRUE, deleted_at = NULL
      WHERE id = $6::uuid
    `,
      [
        ORG_ID,
        person.userId,
        person.memberRole,
        person.staffId,
        person.orgRoleId,
        person.membershipId,
      ]
    );
    return person.membershipId;
  }

  const byPair = await client.query<{ id: string }>(
    `
    SELECT id FROM core.organization_members
    WHERE organization_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
  `,
    [ORG_ID, person.userId]
  );
  if (byPair.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_members
      SET role = $1::core.member_role, staff_id = $2::uuid,
          organization_role_id = $3::uuid, is_current_context = TRUE, is_active = TRUE
      WHERE id = $4::uuid
    `,
      [person.memberRole, person.staffId, person.orgRoleId, byPair.rows[0].id]
    );
    return byPair.rows[0].id;
  }

  await client.query(
    `
    INSERT INTO core.organization_members (
      id, organization_id, user_id, role, staff_id, parent_customer_id,
      is_current_context, organization_role_id, feature_permissions, is_active
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4::core.member_role, $5::uuid, NULL,
      TRUE, $6::uuid, '{}'::jsonb, TRUE
    )
  `,
    [
      person.membershipId,
      ORG_ID,
      person.userId,
      person.memberRole,
      person.staffId,
      person.orgRoleId,
    ]
  );
  return person.membershipId;
}

async function upsertDeptMember(
  client: Queryable,
  person: DemoPerson,
  membershipId: string
): Promise<void> {
  await client.query(
    `
    INSERT INTO core.department_members (
      id, organization_id, department_id, member_id, scope_type
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5
    )
    ON CONFLICT (department_id, member_id) DO UPDATE
      SET scope_type = EXCLUDED.scope_type
  `,
    [
      person.deptMemberId,
      ORG_ID,
      person.departmentId,
      membershipId,
      person.scopeType,
    ]
  );
}

async function upsertProjectCategories(client: Queryable): Promise<void> {
  const seeds: Array<[string, string, string, number]> = [
    ['research', '연구', '#4f46e5', 10],
    ['quality', '품질', '#059669', 20],
    ['technology', '기술', '#0284c7', 30],
    ['patent', '특허', '#c026d3', 40],
    ['safety', '안전', '#dc2626', 50],
  ];
  for (const [key, label, color, sort] of seeds) {
    await client.query(
      `
      INSERT INTO core.project_categories (
        organization_id, category_key, label, color, sort_order, is_active, created_by
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, TRUE, $6::uuid
      )
      ON CONFLICT (organization_id, category_key) DO NOTHING
    `,
      [ORG_ID, key, label, color, sort, PEOPLE[0].userId]
    );
  }
}

type ObjectiveSeed = {
  id: string;
  parentId: string | null;
  level: 'company' | 'department' | 'individual';
  departmentId: string | null;
  departmentName: string | null;
  owner: DemoPerson;
  title: string;
  description: string;
  weight: number;
  progressRate: number;
  projectId: string;
  logId: string;
  logProgress: number;
  achievements: string;
  issues: string;
  nextSteps: string;
};

function buildObjectives(): ObjectiveSeed[] {
  const ceo = PEOPLE[0];
  const lead = PEOPLE[2];
  const s1 = PEOPLE[3];
  const s2 = PEOPLE[4];
  const s3 = PEOPLE[5];
  const companyId = oid('501');
  const deptId = oid('502');
  return [
    {
      id: companyId,
      parentId: null,
      level: 'company',
      departmentId: null,
      departmentName: null,
      owner: ceo,
      title: '2026 신소재 상용화 KPI',
      description: '연구소 핵심 신소재의 양산 전환과 품질 안정화',
      weight: 100,
      progressRate: 28,
      projectId: pid('501'),
      logId: lid('501'),
      logProgress: 28,
      achievements: '파일럿 라인 조건 확정, 고객 샘플 2건 출하',
      issues: '원자재 리드타임 변동',
      nextSteps: '양산 조건서 1차 확정 및 원가 시뮬레이션',
    },
    {
      id: deptId,
      parentId: companyId,
      level: 'department',
      departmentId: DEPTS.rndTeam.id,
      departmentName: DEPTS.rndTeam.name,
      owner: lead,
      title: '그룹 목표: 핵심 소재 양산 전환율 80%',
      description: '연구개발1팀 주관 양산 전환 과제',
      weight: 50,
      progressRate: 35,
      projectId: pid('502'),
      logId: lid('502'),
      logProgress: 35,
      achievements: '공정 파라미터 DOE 완료, 전환율 42% 달성',
      issues: '수율 편차 구간 존재',
      nextSteps: '수율 안정화 실험 2차 및 표준작업서 초안',
    },
    {
      id: oid('503'),
      parentId: deptId,
      level: 'individual',
      departmentId: DEPTS.rndTeam.id,
      departmentName: DEPTS.rndTeam.name,
      owner: s1,
      title: '소재 조성 최적화 및 특성 평가',
      description: '조성비 최적화와 물성 데이터 확보',
      weight: 40,
      progressRate: 40,
      projectId: pid('503'),
      logId: lid('503'),
      logProgress: 40,
      achievements: '조성 후보 3종 평가 완료',
      issues: '고온 특성 편차',
      nextSteps: '재현성 실험 및 데이터 정리',
    },
    {
      id: oid('504'),
      parentId: deptId,
      level: 'individual',
      departmentId: DEPTS.rndTeam.id,
      departmentName: DEPTS.rndTeam.name,
      owner: s2,
      title: '파일럿 공정 조건 표준화',
      description: '파일럿 라인 표준 조건서 작성',
      weight: 30,
      progressRate: 30,
      projectId: pid('504'),
      logId: lid('504'),
      logProgress: 30,
      achievements: '표준작업서 초안 작성',
      issues: '설비 가동 슬롯 부족',
      nextSteps: '설비 담당과 일정 조율',
    },
    {
      id: oid('505'),
      parentId: deptId,
      level: 'individual',
      departmentId: DEPTS.rndTeam.id,
      departmentName: DEPTS.rndTeam.name,
      owner: s3,
      title: '고객 샘플 대응 및 피드백 반영',
      description: '고객 요구사항 반영 샘플 제작',
      weight: 30,
      progressRate: 25,
      projectId: pid('505'),
      logId: lid('505'),
      logProgress: 25,
      achievements: '고객 A 피드백 1차 반영',
      issues: '스펙 변경 요청 추가',
      nextSteps: '2차 샘플 일정 확정',
    },
  ];
}

async function upsertMboTree(client: Queryable): Promise<void> {
  const periodYm = currentPeriodYm();
  const year = periodYm.slice(0, 4);
  const startDate = `${year}-01-01`;
  const targetDate = `${year}-12-31`;
  const objectives = buildObjectives();

  for (const obj of objectives) {
    await client.query(
      `
      INSERT INTO core.mbo_objectives (
        id, organization_id, parent_id, level, department_id, department_name,
        owner_id, owner_name, title, description, success_criteria,
        status, start_date, target_date, weight, progress_rate,
        target_value, visibility_type, is_sample, revision
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, $6,
        $7::uuid, $8, $9, $10, $11,
        'in_progress', $12::date, $13::date, $14, $15,
        $16, 'PUBLIC', FALSE, 1
      )
      ON CONFLICT (id) DO UPDATE
        SET parent_id = EXCLUDED.parent_id,
            level = EXCLUDED.level,
            department_id = EXCLUDED.department_id,
            department_name = EXCLUDED.department_name,
            owner_id = EXCLUDED.owner_id,
            owner_name = EXCLUDED.owner_name,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            start_date = EXCLUDED.start_date,
            target_date = EXCLUDED.target_date,
            weight = EXCLUDED.weight,
            progress_rate = EXCLUDED.progress_rate,
            target_value = EXCLUDED.target_value,
            visibility_type = EXCLUDED.visibility_type,
            is_sample = FALSE,
            deleted_at = NULL,
            updated_at = NOW()
    `,
      [
        obj.id,
        ORG_ID,
        obj.parentId,
        obj.level,
        obj.departmentId,
        obj.departmentName,
        obj.owner.userId,
        obj.owner.fullName,
        obj.title,
        obj.description,
        obj.description,
        startDate,
        targetDate,
        obj.weight,
        obj.progressRate,
        obj.level === 'department' ? 80 : obj.level === 'company' ? 100 : 50,
      ]
    );

    await client.query(
      `
      INSERT INTO core.mbo_projects (
        id, organization_id, objective_id, title, description,
        owner_id, owner_name, status, start_date, target_date,
        evaluation_period, progress_rate, revision
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4, $5,
        $6::uuid, $7, 'in_progress', $8::date, $9::date,
        $10, $11, 1
      )
      ON CONFLICT (id) DO UPDATE
        SET title = EXCLUDED.title,
            description = EXCLUDED.description,
            owner_id = EXCLUDED.owner_id,
            owner_name = EXCLUDED.owner_name,
            status = EXCLUDED.status,
            start_date = EXCLUDED.start_date,
            target_date = EXCLUDED.target_date,
            evaluation_period = EXCLUDED.evaluation_period,
            progress_rate = EXCLUDED.progress_rate,
            updated_at = NOW()
    `,
      [
        obj.projectId,
        ORG_ID,
        obj.id,
        `${obj.title} 실행`,
        obj.description,
        obj.owner.userId,
        obj.owner.fullName,
        startDate,
        targetDate,
        `${year}-Q4`,
        obj.progressRate,
      ]
    );

    await client.query(
      `
      INSERT INTO core.mbo_progress_logs (
        id, organization_id, project_id, author_id, author_name,
        log_date, period_ym, progress_rate, achievements,
        issues_and_actions, next_steps
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5,
        CURRENT_DATE, $6, $7, $8, $9, $10
      )
      ON CONFLICT (id) DO UPDATE
        SET progress_rate = EXCLUDED.progress_rate,
            achievements = EXCLUDED.achievements,
            issues_and_actions = EXCLUDED.issues_and_actions,
            next_steps = EXCLUDED.next_steps,
            period_ym = EXCLUDED.period_ym,
            author_name = EXCLUDED.author_name,
            updated_at = NOW()
    `,
      [
        obj.logId,
        ORG_ID,
        obj.projectId,
        obj.owner.userId,
        obj.owner.fullName,
        periodYm,
        obj.logProgress,
        obj.achievements,
        obj.issues,
        obj.nextSteps,
      ]
    );

    // unique (org, project, period) — if id differs, update existing period row
    await client.query(
      `
      UPDATE core.mbo_progress_logs
      SET progress_rate = $1,
          achievements = $2,
          issues_and_actions = $3,
          next_steps = $4,
          author_id = $5::uuid,
          author_name = $6,
          updated_at = NOW()
      WHERE organization_id = $7::uuid
        AND project_id = $8::uuid
        AND period_ym = $9
        AND id <> $10::uuid
    `,
      [
        obj.logProgress,
        obj.achievements,
        obj.issues,
        obj.nextSteps,
        obj.owner.userId,
        obj.owner.fullName,
        ORG_ID,
        obj.projectId,
        periodYm,
        obj.logId,
      ]
    );
  }
}

/** 연구개발그룹 조직·인원·MBO 시연 데이터를 멱등 시드한다. */
export async function seedRndDemoPack(client: Queryable): Promise<void> {
  const ceoRoleId = await upsertCeoRole(client);
  await upsertDepartments(client);

  for (const person of PEOPLE) {
    const resolved =
      person.loginId === 'rndceo'
        ? { ...person, orgRoleId: ceoRoleId }
        : person;
    await upsertDemoUser(client, resolved);
    const membershipId = await upsertStaffAndMembership(client, resolved);
    await upsertDeptMember(client, resolved, membershipId);
  }

  await upsertProjectCategories(client);
  await upsertMboTree(client);
}
