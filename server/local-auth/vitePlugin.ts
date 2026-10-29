import type { Plugin } from 'vite';
import { createLocalAuthConnectHandler } from './routes';
import {
  getLocalAuthDatabaseUrl,
  getLocalAuthDriver,
  getLocalAuthPool,
} from './db';
import { LOCAL_AUTH_ROLE_ACCOUNTS } from './seed';
import { LOCAL_PERMISSION_PROFILES } from './permissionProfiles';

/**
 * Vite 개발 서버에 /api/local-auth 미들웨어를 붙입니다.
 * 기본: Docker Postgres. EP_LOCAL_AUTH_DRIVER=pglite 로 임베디드 대체 가능.
 */
export function localAuthPlugin(): Plugin {
  return {
    name: 'ep-local-auth',
    configureServer(server) {
      void getLocalAuthPool()
        .then(async (pool) => {
          const count = await pool.query<{ c: string }>(
            `SELECT COUNT(*)::text AS c FROM app.users`
          );
          const emails = [
            ...LOCAL_AUTH_ROLE_ACCOUNTS.map((a) => a.email),
            ...LOCAL_PERMISSION_PROFILES.slice(0, 3).map((p) => p.email),
          ].join(', ');
          const target =
            getLocalAuthDriver() === 'pglite'
              ? 'pglite(embedded)'
              : getLocalAuthDatabaseUrl();
          console.info(
            `[local-auth] ${pool.driver} ready (${target}) ` +
              `${count.rows[0]?.c ?? 0} users. e.g. ${emails}, …`
          );
        })
        .catch((err) => {
          console.warn(
            `[local-auth] DB not ready (driver=${getLocalAuthDriver()}, ` +
              `${getLocalAuthDatabaseUrl()}): ${err instanceof Error ? err.message : err}. ` +
              `Docker: npm run db:up && npm run db:seed  |  No Docker: EP_LOCAL_AUTH_DRIVER=pglite`
          );
        });

      server.middlewares.use('/api/local-auth', createLocalAuthConnectHandler());
    },
  };
}
