/**
 * 사내용 최소 부트스트랩: owner 1명 + 조직 1개 (app/core).
 * 직급은 초기 설정 UI에서만 생성. *@ep.local 금지.
 */
import { randomUUID } from 'node:crypto';
import { hashPassword } from './passwords';

type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

export type CorpBootstrapConfig = {
  /** 로그인 아이디 (문자열). 미지정 시 ownerEmail 사용 */
  ownerLoginId?: string;
  ownerEmail: string | null;
  ownerPassword: string;
  ownerFullName: string;
  organizationName: string;
  organizationSlug?: string;
  industryType?: string;
  mustChangePassword?: boolean;
};

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`사내 부트스트랩에 ${name} 환경변수가 필요합니다.`);
  return v;
}

export function readCorpBootstrapConfigFromEnv(): CorpBootstrapConfig {
  const loginId =
    process.env.EP_CORP_OWNER_LOGIN_ID?.trim() ||
    process.env.EP_CORP_OWNER_EMAIL?.trim() ||
    '';
  if (!loginId) {
    throw new Error('사내 부트스트랩에 EP_CORP_OWNER_LOGIN_ID 또는 EP_CORP_OWNER_EMAIL이 필요합니다.');
  }
  const emailRaw = process.env.EP_CORP_OWNER_EMAIL?.trim() || null;
  return {
    ownerLoginId: loginId.toLowerCase(),
    ownerEmail: emailRaw && emailRaw.includes('@') ? emailRaw.toLowerCase() : null,
    ownerPassword: requireEnv('EP_CORP_OWNER_PASSWORD'),
    ownerFullName: process.env.EP_CORP_OWNER_NAME?.trim() || '조직 소유자',
    organizationName: process.env.EP_CORP_ORG_NAME?.trim() || '사내 조직',
    organizationSlug: process.env.EP_CORP_ORG_SLUG?.trim() || 'corp',
    industryType: process.env.EP_CORP_INDUSTRY_TYPE?.trim() || 'personal_plant_ops',
    mustChangePassword: String(process.env.EP_CORP_MUST_CHANGE_PASSWORD ?? 'true')
      .trim()
      .toLowerCase() !== 'false',
  };
}

export async function ensureCorpBootstrap(
  client: Queryable,
  config: CorpBootstrapConfig
): Promise<{ created: boolean; organizationId: string; ownerUserId: string }> {
  const loginId = (config.ownerLoginId || config.ownerEmail || '').trim().toLowerCase();
  if (!loginId) {
    throw new Error('사내 부트스트랩에 로그인 아이디가 필요합니다.');
  }
  if (config.ownerEmail && /@ep\.local$/i.test(config.ownerEmail)) {
    throw new Error('사내 부트스트랩에 *@ep.local 계정은 사용할 수 없습니다.');
  }

  const existingUser = await client.query<{ id: string }>(
    `
    SELECT id FROM app.users
    WHERE LOWER(login_id) = LOWER($1)
       OR ($2::text IS NOT NULL AND email IS NOT NULL AND LOWER(email) = LOWER($2))
    ORDER BY CASE WHEN LOWER(login_id) = LOWER($1) THEN 0 ELSE 1 END
    LIMIT 1
  `,
    [loginId, config.ownerEmail]
  );

  let ownerUserId = existingUser.rows[0]?.id;
  const passwordHash = hashPassword(config.ownerPassword);
  const mustChange = config.mustChangePassword !== false;

  if (!ownerUserId) {
    ownerUserId = randomUUID();
    await client.query(
      `
      INSERT INTO app.users (id, email, login_id, password_hash, full_name, is_active, must_change_password)
      VALUES ($1::uuid, $2, $3, $4, $5, TRUE, $6)
    `,
      [
        ownerUserId,
        config.ownerEmail,
        loginId,
        passwordHash,
        config.ownerFullName,
        mustChange,
      ]
    );
  } else {
    await client.query(
      `
      UPDATE app.users
      SET full_name = $1, login_id = $2, email = COALESCE($3, email),
          password_hash = $4, is_active = TRUE, must_change_password = $5
      WHERE id = $6::uuid
    `,
      [
        config.ownerFullName,
        loginId,
        config.ownerEmail,
        passwordHash,
        mustChange,
        ownerUserId,
      ]
    );
  }

  const existingOrg = await client.query<{ id: string }>(
    `
    SELECT o.id
    FROM core.organizations o
    JOIN core.organization_members m ON m.organization_id = o.id
    WHERE m.user_id = $1::uuid AND m.role = 'owner' AND m.deleted_at IS NULL
    ORDER BY o.created_at ASC
    LIMIT 1
  `,
    [ownerUserId]
  );

  let organizationId = existingOrg.rows[0]?.id;
  let created = false;

  if (!organizationId) {
    organizationId = randomUUID();
    await client.query(
      `
      INSERT INTO core.organizations (id, name, industry_type, slug, settings, is_active, public_code)
      VALUES ($1::uuid, $2, $3, $4, '{}'::jsonb, TRUE, '')
    `,
      [
        organizationId,
        config.organizationName,
        config.industryType ?? 'personal_plant_ops',
        config.organizationSlug ?? 'corp',
      ]
    );
    await client.query(
      `
      INSERT INTO core.organization_members (
        id, organization_id, user_id, role, is_current_context, feature_permissions, is_active
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'owner'::core.member_role, TRUE, '{}'::jsonb, TRUE)
    `,
      [randomUUID(), organizationId, ownerUserId]
    );
    created = true;
  }

  return { created, organizationId, ownerUserId };
}
