/**
 * 세션 쿠키·rate limit·감사 로그 헬퍼
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export const SESSION_COOKIE_NAME = 'ep_local_session';

const SESSION_TTL_SECONDS = (() => {
  const raw = Number(process.env.SESSION_TTL ?? process.env.EP_LOCAL_AUTH_SESSION_TTL ?? '');
  if (Number.isFinite(raw) && raw > 60) return Math.floor(raw);
  return 14 * 24 * 60 * 60;
})();

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function getSessionTtlSqlInterval(): string {
  return `${SESSION_TTL_SECONDS} seconds`;
}

type RateBucket = { count: number; resetAt: number };
const loginBuckets = new Map<string, RateBucket>();

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = Number(process.env.EP_LOCAL_AUTH_LOGIN_RATE_MAX ?? 20);

export function clientIp(req: IncomingMessage): string {
  const trust = String(process.env.TRUST_PROXY ?? '').trim().toLowerCase();
  if (trust === '1' || trust === 'true') {
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0]!.trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/** 로그인 실패/시도 rate limit. true면 차단. */
export function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = loginBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    loginBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

export function clearLoginRateLimit(key: string): void {
  loginBuckets.delete(key);
}

function cookieSecure(): boolean {
  const raw = String(process.env.EP_LOCAL_AUTH_COOKIE_SECURE ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function getSessionTokenFromRequest(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME]?.trim() || null;
}

export function setSessionCookie(res: ServerResponse, token: string): void {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (cookieSecure()) parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const next = parts.join('; ');
  if (!prev) {
    res.setHeader('Set-Cookie', next);
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev.map(String), next]);
  } else {
    res.setHeader('Set-Cookie', [String(prev), next]);
  }
}

export function clearSessionCookie(res: ServerResponse): void {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (cookieSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const originCfg = process.env.CORS_ORIGIN?.trim();
  if (!originCfg) return true;
  const origin = req.headers.origin;
  const allowed = originCfg.split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else if (allowed.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  return true;
}

type AuditClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

export async function writeAuthAudit(
  client: AuditClient,
  input: {
    eventType: string;
    actorUserId?: string | null;
    targetUserId?: string | null;
    organizationId?: string | null;
    detail?: Record<string, unknown>;
    ip?: string | null;
  }
): Promise<void> {
  try {
    await client.query(
      `
      INSERT INTO app.auth_audit_log (
        event_type, actor_user_id, target_user_id, organization_id, detail_json, ip
      ) VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5::jsonb, $6)
    `,
      [
        input.eventType,
        input.actorUserId ?? null,
        input.targetUserId ?? null,
        input.organizationId ?? null,
        JSON.stringify(input.detail ?? {}),
        input.ip ?? null,
      ]
    );
  } catch (err) {
    console.warn('[local-auth] audit write failed', err);
  }
}
