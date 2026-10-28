/**
 * 사내용 최소 부트스트랩 (owner + 조직). *@ep.local 금지.
 * env: EP_CORP_OWNER_EMAIL, EP_CORP_OWNER_PASSWORD, EP_CORP_ORG_NAME, …
 */
import { getLocalAuthPool, resetLocalAuthPoolForTests } from '../server/local-auth/db.ts';
import {
  ensureCorpBootstrap,
  readCorpBootstrapConfigFromEnv,
} from '../server/local-auth/corpBootstrap.ts';

process.env.EP_LOCAL_AUTH_SEED_MODE = 'none';

const config = readCorpBootstrapConfigFromEnv();
const pool = await getLocalAuthPool();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result = await ensureCorpBootstrap(client, config);
  await client.query('COMMIT');
  console.info(
    `[corp-bootstrap] ${result.created ? 'created' : 'exists'} ` +
      `org=${result.organizationId} owner=${result.ownerUserId} email=${config.ownerEmail}`
  );
} catch (err) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw err;
} finally {
  client.release();
  await resetLocalAuthPoolForTests();
}
