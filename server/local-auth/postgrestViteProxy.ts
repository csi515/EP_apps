import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * supabase-js → /rest/v1/* 를 사내 PostgREST 루트로 전달.
 * Vite server.proxy 만으로는 Authorization/Prefer 헤더가 깨지는 경우가 있어 명시 프록시 사용.
 */
export function postgrestViteProxyPlugin(): Plugin {
  const targetBase = (
    process.env.EP_POSTGREST_URL ||
    process.env.VITE_POSTGREST_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '');

  return {
    name: 'ep-postgrest-proxy',
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
          if (!req.url?.startsWith('/rest/v1')) {
            next();
            return;
          }
          try {
            const destPath = req.url.replace(/^\/rest\/v1/, '') || '/';
            const method = (req.method || 'GET').toUpperCase();
            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (!value || key === 'host' || key === 'connection' || key === 'content-length') {
                continue;
              }
              headers[key] = Array.isArray(value) ? value.join(',') : value;
            }
            const body =
              method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
            const upstream = await fetch(`${targetBase}${destPath}`, {
              method,
              headers,
              body,
            });
            res.statusCode = upstream.status;
            upstream.headers.forEach((value, key) => {
              if (key === 'transfer-encoding' || key === 'content-encoding') return;
              res.setHeader(key, value);
            });
            res.end(Buffer.from(await upstream.arrayBuffer()));
          } catch (err) {
            console.error(
              '[ep-postgrest-proxy]',
              err instanceof Error ? err.message : err
            );
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'PostgREST proxy failed', target: targetBase }));
          }
        }
      );
      console.info(`[ep-postgrest-proxy] /rest/v1 → ${targetBase}`);
    },
  };
}
