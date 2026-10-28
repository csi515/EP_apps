/**
 * 사내/스테이징용 Auth API 단독 기동 (Vite 미들웨어와 분리).
 *
 *   node --env-file=.env --import tsx server/local-auth/standalone.ts
 *   npm run auth:serve
 *
 * env: DATABASE_URL | EP_LOCAL_AUTH_DATABASE_URL, PORT|AUTH_API_PORT,
 *      CORS_ORIGIN, SESSION_TTL, TRUST_PROXY, EP_LOCAL_AUTH_SEED_MODE
 */
import http from 'node:http';
import { getLocalAuthDatabaseUrl, getLocalAuthDriver, getLocalAuthPool } from './db';
import { handleLocalAuthRequest } from './routes';

const PORT = Number(process.env.AUTH_API_PORT || process.env.PORT || 8787);
const PREFIX = '/api/local-auth';

async function main(): Promise<void> {
  await getLocalAuthPool();

  const server = http.createServer((req, res) => {
    const url = req.url || '/';
    if (!url.startsWith(PREFIX)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    const stripped = url.slice(PREFIX.length) || '/';
    req.url = stripped.startsWith('/') ? stripped : `/${stripped}`;
    void handleLocalAuthRequest(req, res, () => undefined);
  });

  server.listen(PORT, () => {
    console.info(
      `[local-auth] standalone listening on :${PORT}${PREFIX} ` +
        `(driver=${getLocalAuthDriver()}, db=${getLocalAuthDatabaseUrl()})`
    );
  });
}

main().catch((err) => {
  console.error('[local-auth] standalone failed', err);
  process.exit(1);
});
