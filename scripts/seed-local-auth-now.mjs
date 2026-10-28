/**
 * app/core 개발 시드(*@ep.local).
 * 사전: npm run db:migrate:domain
 */
process.env.EP_LOCAL_AUTH_SEED_MODE = process.env.EP_LOCAL_AUTH_SEED_MODE || 'dev';

import {
  ensureLocalAuthSeeds,
  getLocalAuthDatabaseUrl,
  getLocalAuthDriver,
  getLocalAuthPool,
  resetLocalAuthPoolForTests,
} from '../server/local-auth/db.ts';

await resetLocalAuthPoolForTests();
console.log('driver=', getLocalAuthDriver(), 'url=', getLocalAuthDatabaseUrl());
const pool = await getLocalAuthPool();
await ensureLocalAuthSeeds();

const users = await pool.query(
  `SELECT u.email, m.role::text AS role, r.name AS org_role
   FROM app.users u
   JOIN core.organization_members m ON m.user_id = u.id AND m.deleted_at IS NULL
   LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
   ORDER BY m.role, u.email`
);
console.table(users.rows);
console.log(`driver=${pool.driver} seeded ${users.rows.length} memberships`);
await pool.end();
