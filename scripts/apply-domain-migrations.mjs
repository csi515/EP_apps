/**
 * 사내/로컬 PostgreSQL에 app/core 도메인 마이그레이션 적용.
 */
import pg from 'pg';
import {
  applyDomainMigrations,
  listDomainMigrationFiles,
} from '../server/local-auth/domainMigrate.ts';

const url =
  process.env.EP_LOCAL_AUTH_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  'postgresql://ep:ep@127.0.0.1:54329/ep_local';

const pool = new pg.Pool({ connectionString: url, max: 2 });
const client = await pool.connect();
try {
  console.info('[domain-migrate] files:', listDomainMigrationFiles().join(', ') || '(none)');
  const newly = await applyDomainMigrations(client);
  console.info(
    newly.length
      ? `[domain-migrate] applied: ${newly.join(', ')}`
      : '[domain-migrate] already up to date'
  );
} finally {
  client.release();
  await pool.end();
}
