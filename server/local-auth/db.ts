import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { hashPassword } from './passwords';
import { LOCAL_AUTH_ORG, LOCAL_AUTH_ROLE_ACCOUNTS, LOCAL_AUTH_SEED } from './seed';
import {
  LOCAL_ORG_ROLE_DEFS,
  LOCAL_PERMISSION_PROFILES,
} from './permissionProfiles';
import { applyDomainMigrations } from './domainMigrate';
import {
  ensureCorpBootstrap,
  readCorpBootstrapConfigFromEnv,
} from './corpBootstrap';
import { hashSessionToken } from './jwt';

const { Pool } = pg;

const DEFAULT_DATABASE_URL = 'postgresql://ep:ep@127.0.0.1:54329/ep_local';
const SEARCH_PATH = 'app, core, public';

type QueryResult<T> = { rows: T[] };
type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<QueryResult<T>>;
};

type PoolLike = Queryable & {
  connect: () => Promise<Queryable & { release: () => void }>;
  end: () => Promise<void>;
  driver: 'postgres' | 'pglite';
};

let pool: PoolLike | null = null;
let readyPromise: Promise<PoolLike> | null = null;

export function getLocalAuthDatabaseUrl(): string {
  return (
    process.env.EP_LOCAL_AUTH_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    DEFAULT_DATABASE_URL
  );
}

export function getLocalAuthDriver(): 'postgres' | 'pglite' {
  const raw = String(process.env.EP_LOCAL_AUTH_DRIVER ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'pglite' || raw === 'embedded') return 'pglite';
  return 'postgres';
}

/** dev = *@ep.local 시드 | corp = owner+조직만 | none = 시드 없음 */
export function getLocalAuthSeedMode(): 'dev' | 'corp' | 'none' {
  const raw = String(process.env.EP_LOCAL_AUTH_SEED_MODE ?? 'dev')
    .trim()
    .toLowerCase();
  if (raw === 'corp' || raw === 'corporate') return 'corp';
  if (raw === 'none' || raw === 'off' || raw === '0') return 'none';
  return 'dev';
}

async function ensureSchema(client: Queryable): Promise<void> {
  await applyDomainMigrations(client);
  await client.query(`SET search_path TO ${SEARCH_PATH}`);
}

async function withSearchPath(client: Queryable): Promise<void> {
  await client.query(`SET search_path TO ${SEARCH_PATH}`);
}

async function upsertUser(
  client: Queryable,
  account: { userId: string; email: string; password: string; fullName: string }
): Promise<void> {
  const passwordHash = hashPassword(account.password);
  const byId = await client.query<{ id: string }>(
    `SELECT id FROM app.users WHERE id = $1::uuid`,
    [account.userId]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE app.users
      SET email = $1, password_hash = $2, full_name = $3, is_active = TRUE
      WHERE id = $4::uuid
    `,
      [account.email, passwordHash, account.fullName, account.userId]
    );
    return;
  }

  const byEmail = await client.query<{ id: string }>(
    `SELECT id FROM app.users WHERE LOWER(email) = LOWER($1)`,
    [account.email]
  );
  if (byEmail.rows[0] && byEmail.rows[0].id !== account.userId) {
    await client.query(
      `
      UPDATE app.users
      SET password_hash = $1, full_name = $2, is_active = TRUE
      WHERE id = $3::uuid
    `,
      [passwordHash, account.fullName, byEmail.rows[0].id]
    );
    return;
  }

  await client.query(
    `
    INSERT INTO app.users (id, email, password_hash, full_name, is_active)
    VALUES ($1::uuid, $2, $3, $4, TRUE)
  `,
    [account.userId, account.email, passwordHash, account.fullName]
  );
}

async function upsertMembership(
  client: Queryable,
  membership: {
    membershipId: string;
    organizationId: string;
    userId: string;
    role: string;
    organizationRoleId?: string | null;
    featurePermissions?: Record<string, boolean>;
  }
): Promise<void> {
  const orgRoleId = membership.organizationRoleId ?? null;
  const featureJson = JSON.stringify(membership.featurePermissions ?? {});

  const byId = await client.query<{ id: string }>(
    `SELECT id FROM core.organization_members WHERE id = $1::uuid`,
    [membership.membershipId]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_members
      SET organization_id = $1::uuid, user_id = $2::uuid, role = $3::core.member_role,
          is_current_context = TRUE, is_active = TRUE, deleted_at = NULL,
          organization_role_id = $4::uuid, feature_permissions = $5::jsonb
      WHERE id = $6::uuid
    `,
      [
        membership.organizationId,
        membership.userId,
        membership.role,
        orgRoleId,
        featureJson,
        membership.membershipId,
      ]
    );
    return;
  }

  const byPair = await client.query<{ id: string }>(
    `
    SELECT id FROM core.organization_members
    WHERE organization_id = $1::uuid AND user_id = $2::uuid AND deleted_at IS NULL
  `,
    [membership.organizationId, membership.userId]
  );
  if (byPair.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_members
      SET role = $1::core.member_role, is_current_context = TRUE, is_active = TRUE,
          organization_role_id = $2::uuid, feature_permissions = $3::jsonb
      WHERE id = $4::uuid
    `,
      [membership.role, orgRoleId, featureJson, byPair.rows[0].id]
    );
    return;
  }

  await client.query(
    `
    INSERT INTO core.organization_members (
      id, organization_id, user_id, role, staff_id, parent_customer_id,
      is_current_context, organization_role_id, feature_permissions, is_active
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4::core.member_role, NULL, NULL, TRUE, $5::uuid, $6::jsonb, TRUE
    )
  `,
    [
      membership.membershipId,
      membership.organizationId,
      membership.userId,
      membership.role,
      orgRoleId,
      featureJson,
    ]
  );
}

async function upsertOrgRole(
  client: Queryable,
  role: {
    id: string;
    organizationId: string;
    name: string;
    permissions: Record<string, boolean>;
    rankOrder?: number;
  }
): Promise<void> {
  const permissionsJson = JSON.stringify(role.permissions);
  const rankOrder = role.rankOrder ?? 100;
  const byId = await client.query<{ id: string }>(
    `SELECT id FROM core.organization_roles WHERE id = $1::uuid`,
    [role.id]
  );
  if (byId.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_roles
      SET name = $1, permissions = $2::jsonb, tenant_id = $3::uuid, rank_order = $4
      WHERE id = $5::uuid
    `,
      [role.name, permissionsJson, role.organizationId, rankOrder, role.id]
    );
    return;
  }

  const byName = await client.query<{ id: string }>(
    `
    SELECT id FROM core.organization_roles
    WHERE tenant_id = $1::uuid AND name = $2
  `,
    [role.organizationId, role.name]
  );
  if (byName.rows[0]) {
    await client.query(
      `
      UPDATE core.organization_roles
      SET permissions = $1::jsonb, rank_order = $2
      WHERE id = $3::uuid
    `,
      [permissionsJson, rankOrder, byName.rows[0].id]
    );
    return;
  }

  await client.query(
    `
    INSERT INTO core.organization_roles (id, tenant_id, name, rank_order, permissions)
    VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
  `,
    [role.id, role.organizationId, role.name, rankOrder, permissionsJson]
  );
}

async function resolveUserIdByEmail(
  client: Queryable,
  email: string
): Promise<string | null> {
  const row = await client.query<{ id: string }>(
    `SELECT id FROM app.users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return row.rows[0]?.id ?? null;
}

export async function ensureLocalAuthSeeds(client?: Queryable): Promise<void> {
  const poolLike = client ? null : await getLocalAuthPool();
  const ownedClient = client ? null : await poolLike!.connect();
  const c = client ?? ownedClient!;
  try {
    await withSearchPath(c);
    await c.query('BEGIN');

    const org = await c.query<{ id: string }>(
      `SELECT id FROM core.organizations WHERE id = $1::uuid`,
      [LOCAL_AUTH_ORG.organizationId]
    );
    if (!org.rows[0]) {
      await c.query(
        `
        INSERT INTO core.organizations (id, name, industry_type, slug, settings, is_active, public_code)
        VALUES ($1::uuid, $2, $3, $4, '{}'::jsonb, TRUE, 'EPTEST')
      `,
        [
          LOCAL_AUTH_ORG.organizationId,
          LOCAL_AUTH_ORG.organizationName,
          LOCAL_AUTH_ORG.industryType,
          LOCAL_AUTH_ORG.organizationSlug,
        ]
      );
    } else {
      await c.query(
        `
        UPDATE core.organizations
        SET name = $1, industry_type = $2, slug = $3, is_active = TRUE, updated_at = NOW()
        WHERE id = $4::uuid
      `,
        [
          LOCAL_AUTH_ORG.organizationName,
          LOCAL_AUTH_ORG.industryType,
          LOCAL_AUTH_ORG.organizationSlug,
          LOCAL_AUTH_ORG.organizationId,
        ]
      );
    }

    for (const account of LOCAL_AUTH_ROLE_ACCOUNTS) {
      await upsertUser(c, {
        userId: account.userId,
        email: account.email,
        password: account.password,
        fullName: account.fullName,
      });
      const userId = (await resolveUserIdByEmail(c, account.email)) ?? account.userId;
      await upsertMembership(c, {
        membershipId: account.membershipId,
        organizationId: LOCAL_AUTH_ORG.organizationId,
        userId,
        role: account.role,
      });

      for (const alias of account.aliases) {
        await upsertUser(c, {
          userId: alias.userId,
          email: alias.email,
          password: account.password,
          fullName: `${account.fullName} (alias)`,
        });
        const resolvedAliasId =
          (await resolveUserIdByEmail(c, alias.email)) ?? alias.userId;
        await upsertMembership(c, {
          membershipId: alias.membershipId,
          organizationId: LOCAL_AUTH_ORG.organizationId,
          userId: resolvedAliasId,
          role: account.role,
        });
      }
    }

    for (const roleDef of LOCAL_ORG_ROLE_DEFS) {
      await upsertOrgRole(c, {
        id: roleDef.id,
        organizationId: LOCAL_AUTH_ORG.organizationId,
        name: roleDef.name,
        permissions: roleDef.permissions,
      });
    }

    for (const profile of LOCAL_PERMISSION_PROFILES) {
      await upsertUser(c, {
        userId: profile.userId,
        email: profile.email,
        password: profile.password,
        fullName: profile.fullName,
      });
      const userId = (await resolveUserIdByEmail(c, profile.email)) ?? profile.userId;
      await upsertMembership(c, {
        membershipId: profile.membershipId,
        organizationId: LOCAL_AUTH_ORG.organizationId,
        userId,
        role: profile.memberRole,
        organizationRoleId: profile.orgRoleId,
        featurePermissions: profile.featurePermissions,
      });
    }

    await c.query('COMMIT');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    if (ownedClient && 'release' in ownedClient) {
      (ownedClient as { release: () => void }).release();
    }
  }
}

function wrapPgPool(next: pg.Pool): PoolLike {
  return {
    driver: 'postgres',
    query: async <T,>(text: string, params?: unknown[]) => {
      const client = await next.connect();
      try {
        await client.query(`SET search_path TO ${SEARCH_PATH}`);
        const result = await client.query(text, params);
        return { rows: result.rows as T[] };
      } finally {
        client.release();
      }
    },
    connect: async () => {
      const client = await next.connect();
      await client.query(`SET search_path TO ${SEARCH_PATH}`);
      return {
        query: async <T,>(text: string, params?: unknown[]) => {
          const result = await client.query(text, params);
          return { rows: result.rows as T[] };
        },
        release: () => client.release(),
      };
    },
    end: async () => {
      await next.end();
    },
  };
}

async function createPglitePool(): Promise<PoolLike> {
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir =
    process.env.EP_LOCAL_AUTH_PGLITE_DIR?.trim() ||
    path.resolve(process.cwd(), 'data', 'corp-domain-pglite');
  fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  const db = new PGlite(dataDir);

  const queryable: Queryable = {
    query: async <T,>(text: string, params?: unknown[]) => {
      await db.query(`SET search_path TO ${SEARCH_PATH}`);
      const result = await db.query(text, params ?? []);
      return { rows: (result.rows ?? []) as T[] };
    },
  };

  return {
    driver: 'pglite',
    query: queryable.query,
    connect: async () => ({
      query: queryable.query,
      release: () => undefined,
    }),
    end: async () => {
      await db.close();
    },
  };
}

async function applySeedMode(client: Queryable): Promise<void> {
  const mode = getLocalAuthSeedMode();
  if (mode === 'none') return;
  if (mode === 'corp') {
    await withSearchPath(client);
    await ensureCorpBootstrap(client, readCorpBootstrapConfigFromEnv());
    return;
  }
  await ensureLocalAuthSeeds(client);
}

async function initPool(): Promise<PoolLike> {
  const driver = getLocalAuthDriver();
  let next: PoolLike;

  if (driver === 'pglite') {
    next = await createPglitePool();
  } else {
    const connectionString = getLocalAuthDatabaseUrl();
    const pgPool = new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30_000,
    });
    const probe = await pgPool.connect();
    probe.release();
    next = wrapPgPool(pgPool);
  }

  const client = await next.connect();
  try {
    await ensureSchema(client);
    await applySeedMode(client);
  } finally {
    client.release();
  }

  pool = next;
  return next;
}

/** DB 풀 준비 (스키마·시드 포함). 기본은 Docker Postgres. */
export async function getLocalAuthPool(): Promise<PoolLike> {
  if (pool) return pool;
  if (!readyPromise) {
    readyPromise = initPool().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

export async function resetLocalAuthPoolForTests(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => undefined);
  }
  pool = null;
  readyPromise = null;
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export { hashSessionToken };

export type LocalAuthUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string;
  is_active: boolean | number;
  must_change_password?: boolean | number;
};

export type LocalMembershipRow = {
  membership_id: string;
  organization_id: string;
  role: string;
  staff_id: string | null;
  parent_customer_id: string | null;
  is_current_context: boolean | number;
  organization_role_id: string | null;
  organization_role_name: string | null;
  organization_role_permissions: Record<string, unknown> | string | null;
  feature_permissions_json: Record<string, unknown> | string;
  organization_name: string;
  organization_industry_type: string;
  organization_slug: string | null;
  organization_settings: Record<string, unknown> | string;
  organization_is_active: boolean | number;
  organization_public_code: string | null;
};

export { LOCAL_AUTH_SEED };
