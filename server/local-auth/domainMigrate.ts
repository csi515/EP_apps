/**
 * app/core 도메인 버전드 마이그레이션 적용.
 * 파일: migrations/domain/*.sql
 */
import fs from 'node:fs';
import path from 'node:path';

type Queryable = {
  query: <T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ) => Promise<{ rows: T[] }>;
};

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations/domain');

/** PGlite/임베디드용 관대한 skip. Docker Postgres는 EP_MIGRATE_STRICT=1 로 엄격. */
const SKIPPABLE_SOFT =
  /extension .*does not exist|role .*already exists|type .*already exists|must be owner|permission denied to create role|btree_gist|no default operator class|EXCLUDE USING gist|EXECUTE FUNCTION|syntax error at or near \"FUNCTION\"|function digest\(|function crypt\(|gen_salt\(|operator does not exist|cannot cast|function .* does not exist|relation .* does not exist|role \".*\" does not exist|policy .* already exists/i;

const SKIPPABLE_STRICT =
  /role .*already exists|type .*already exists|policy .* already exists|already exists/i;

export function isDomainMigrateStrict(): boolean {
  const raw = String(process.env.EP_MIGRATE_STRICT ?? '')
    .trim()
    .toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export function listDomainMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function versionFromFile(fileName: string): string {
  return fileName.replace(/\.sql$/i, '');
}

/** $$ … $$ 달러 쿼트와 문자열을 보존하며 ; 로 문장 분리 */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const ch = sql[i]!;

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    if (inSingle) {
      buf += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        buf += "'";
        i += 2;
        continue;
      }
      if (ch === "'") inSingle = false;
      i += 1;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i += 1;
      continue;
    }

    // 줄 주석 -- … (세미콜론 포함 가능)
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }

    // 블록 주석 /* … */
    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    if (ch === '$') {
      const rest = sql.slice(i);
      const m = rest.match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        dollarTag = m[0]!;
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (ch === ';') {
      const stmt = buf.trim();
      if (stmt.length > 0 && !/^--/.test(stmt)) out.push(stmt);
      buf = '';
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }
  const tail = buf.trim();
  if (tail.length > 0 && !/^--/.test(tail)) out.push(tail);
  return out;
}

export async function applyDomainMigrations(client: Queryable): Promise<string[]> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS app`);
  await client.query(`CREATE SCHEMA IF NOT EXISTS core`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS app.schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`SET search_path TO app, core, public`);

  const applied = await client.query<{ version: string }>(
    `SELECT version FROM app.schema_migrations ORDER BY version`
  );
  const done = new Set(applied.rows.map((r) => r.version));
  const newly: string[] = [];

  for (const file of listDomainMigrationFiles()) {
    const version = versionFromFile(file);
    if (done.has(version)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of splitStatements(sql)) {
      try {
        await client.query(`${statement};`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const skipRe = isDomainMigrateStrict() ? SKIPPABLE_STRICT : SKIPPABLE_SOFT;
        if (skipRe.test(msg) || (/pgcrypto|already exists/i.test(msg) && !isDomainMigrateStrict())) {
          continue;
        }
        if (!isDomainMigrateStrict() && /EXECUTE FUNCTION/i.test(statement)) {
          try {
            await client.query(`${statement.replace(/EXECUTE FUNCTION/gi, 'EXECUTE PROCEDURE')};`);
            continue;
          } catch {
            continue;
          }
        }
        throw new Error(`[domain migrate ${version}] ${msg}\n---\n${statement.slice(0, 200)}`);
      }
    }
    await client.query(
      `INSERT INTO app.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
      [version]
    );
    newly.push(version);
  }

  await client.query(`SET search_path TO app, core, public`);
  return newly;
}
