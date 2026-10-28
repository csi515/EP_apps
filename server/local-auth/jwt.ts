/**
 * PostgREST용 HS256 JWT (외부 의존 없이 구현)
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

export function getJwtSecret(): string {
  return (
    process.env.EP_JWT_SECRET?.trim() ||
    process.env.PGRST_JWT_SECRET?.trim() ||
    'ep-local-dev-jwt-secret-change-me'
  );
}

export function getJwtTtlSeconds(): number {
  const raw = Number(process.env.EP_JWT_TTL ?? process.env.SESSION_TTL ?? '');
  if (Number.isFinite(raw) && raw > 60) return Math.floor(raw);
  return 14 * 24 * 60 * 60;
}

/** PostgREST role claim = app_user */
export function signAccessJwt(input: {
  userId: string;
  email: string;
  fullName?: string;
  expiresInSeconds?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (input.expiresInSeconds ?? getJwtTtlSeconds());
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: input.userId,
    email: input.email,
    role: 'app_user',
    aud: 'authenticated',
    iat: now,
    exp,
    user_metadata: {
      full_name: input.fullName ?? '',
      sub: input.userId,
    },
  };
  const body = `${b64urlJson(header)}.${b64urlJson(payload)}`;
  const sig = createHmac('sha256', getJwtSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyAccessJwt(token: string): {
  userId: string;
  email?: string;
  exp: number;
} | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];
  const body = `${h}.${p}`;
  const expected = createHmac('sha256', getJwtSecret()).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return null;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const json = JSON.parse(
      Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    ) as { sub?: string; email?: string; exp?: number };
    if (!json.sub || !json.exp || json.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: json.sub, email: json.email, exp: json.exp };
  } catch {
    return null;
  }
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
