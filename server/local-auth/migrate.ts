/**
 * ep_auth 버전드 마이그레이션 적용.
 * 파일: migrations/local-auth/*.sql (정렬 순)
 */
import fs from 'node:fs';
import path from 'node:path';

type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations/local-auth');

export function listLocalAuthMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function versionFromFile(fileName: string): string {
  return fileName.replace(/\.sql$/i, '');
}

/** Docker init.sql 호환 + 버전드 마이그레이션. search_path=ep_auth 로 쿼리 가능하게 설정. */
export async function applyLocalAuthMigrations(client: Queryable): Promise<string[]> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ep_auth`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ep_auth.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`SET search_path TO ep_auth, public`);

  const applied = await client.query<{ version: string }>(
    `SELECT version FROM ep_auth.schema_migrations ORDER BY version`
  );
  const done = new Set(applied.rows.map((r) => r.version));
  const newly: string[] = [];

  for (const file of listLocalAuthMigrationFiles()) {
    const version = versionFromFile(file);
    if (done.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) {
      try {
        await client.query(`${statement};`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/extension .*pgcrypto|does not exist/i.test(msg) && /pgcrypto/i.test(statement)) {
          continue;
        }
        throw err;
      }
    }
    await client.query(
      `INSERT INTO ep_auth.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
      [version]
    );
    newly.push(version);
  }

  await client.query(`SET search_path TO ep_auth, public`);
  return newly;
}

/** public에 남은 레거시 테이블이 있으면 ep_auth로 이관(1회성). */
export async function migrateLegacyPublicTablesIfNeeded(client: Queryable): Promise<void> {
  await client.query(`SET search_path TO ep_auth, public`);
  const legacy = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'app_users'
    ) AS exists
  `);
  if (!legacy.rows[0]?.exists) return;

  const inAuth = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'ep_auth' AND table_name = 'app_users'
    ) AS exists
  `);
  if (!inAuth.rows[0]?.exists) return;

  const countAuth = await client.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM ep_auth.app_users`
  );
  if (Number(countAuth.rows[0]?.c ?? 0) > 0) return;

  // 데이터만 복사 (스키마는 마이그레이션이 이미 생성)
  await client.query(`
    INSERT INTO ep_auth.app_users (id, email, password_hash, full_name, is_active, created_at)
    SELECT id, email, password_hash, full_name, is_active, created_at FROM public.app_users
    ON CONFLICT (id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO ep_auth.organizations (id, name, industry_type, slug, settings_json, is_active, public_code, created_at, updated_at)
    SELECT id, name, industry_type, slug, settings_json, is_active, public_code, created_at, updated_at FROM public.organizations
    ON CONFLICT (id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO ep_auth.organization_roles (id, organization_id, name, permissions_json)
    SELECT id, organization_id, name, permissions_json FROM public.organization_roles
    ON CONFLICT (id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO ep_auth.organization_members (
      id, organization_id, user_id, role, staff_id, parent_customer_id,
      is_current_context, organization_role_id, feature_permissions_json
    )
    SELECT id, organization_id, user_id, role, staff_id, parent_customer_id,
      is_current_context, organization_role_id, feature_permissions_json
    FROM public.organization_members
    ON CONFLICT (id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO ep_auth.app_sessions (token, user_id, expires_at, created_at)
    SELECT token, user_id, expires_at, created_at FROM public.app_sessions
    ON CONFLICT (token) DO NOTHING
  `);
}
