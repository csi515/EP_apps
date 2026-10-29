import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createSessionToken,
  getLocalAuthPool,
  hashSessionToken,
  type LocalAuthUserRow,
  type LocalMembershipRow,
} from './db';
import { hashPassword, verifyPassword } from './passwords';
import { getJwtTtlSeconds, signAccessJwt, verifyAccessJwt } from './jwt';
import {
  applyCors,
  clearLoginRateLimit,
  clearSessionCookie,
  clientIp,
  getSessionTokenFromRequest,
  getSessionTtlSeconds,
  getSessionTtlSqlInterval,
  isLoginRateLimited,
  setSessionCookie,
  writeAuthAudit,
} from './security';

type JsonBody = Record<string, unknown>;

async function readJson(req: IncomingMessage): Promise<JsonBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as JsonBody;
  } catch {
    return {};
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

async function resolveUserFromToken(token: string | null): Promise<LocalAuthUserRow | null> {
  if (!token) return null;
  const pool = await getLocalAuthPool();
  const tokenHash = hashSessionToken(token);
  const bySession = await pool.query<LocalAuthUserRow>(
    `
    SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active, u.must_change_password
    FROM app.sessions s
    JOIN app.users u ON u.id = s.user_id
    WHERE s.token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND u.is_active = TRUE
  `,
    [tokenHash]
  );
  if (bySession.rows[0]) return bySession.rows[0];

  const jwt = verifyAccessJwt(token);
  if (!jwt) return null;
  const byJwt = await pool.query<LocalAuthUserRow>(
    `
    SELECT id, email, full_name, password_hash, is_active, must_change_password
    FROM app.users
    WHERE id = $1::uuid AND is_active = TRUE
  `,
    [jwt.userId]
  );
  return byJwt.rows[0] ?? null;
}

function toPublicUser(row: LocalAuthUserRow & { must_change_password?: boolean | number }) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    must_change_password: Boolean(row.must_change_password),
  };
}

async function listMemberships(userId: string): Promise<LocalMembershipRow[]> {
  const pool = await getLocalAuthPool();
  const result = await pool.query<LocalMembershipRow>(
    `
    SELECT
      m.id AS membership_id,
      m.organization_id,
      m.role::text AS role,
      m.staff_id,
      m.parent_customer_id,
      m.is_current_context,
      m.organization_role_id,
      r.name AS organization_role_name,
      r.permissions AS organization_role_permissions,
      m.feature_permissions AS feature_permissions,
      o.name AS organization_name,
      o.industry_type AS organization_industry_type,
      o.slug AS organization_slug,
      o.settings AS organization_settings,
      o.is_active AS organization_is_active,
      o.public_code AS organization_public_code
    FROM core.organization_members m
    JOIN core.organizations o ON o.id = m.organization_id
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.user_id = $1::uuid
      AND m.deleted_at IS NULL
      AND m.is_active = TRUE
      AND o.is_active = TRUE
    ORDER BY m.is_current_context DESC, o.name ASC
  `,
    [userId]
  );
  return result.rows;
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function dbUnavailableMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ECONNREFUSED|enotfound|connect|timeout/i.test(msg)) {
    return (
      '로컬 Postgres에 연결할 수 없습니다. `npm run db:up` 으로 Docker Postgres를 기동한 뒤 ' +
      '`npm run db:seed` 를 실행해 주세요.'
    );
  }
  return msg || '로컬 인증 서버 오류';
}

async function requireUser(req: IncomingMessage, res: ServerResponse) {
  const user = await resolveUserFromToken(getSessionTokenFromRequest(req));
  if (!user) {
    sendJson(res, 401, { error: '로그인이 필요합니다.' });
    return null;
  }
  return user;
}

async function assertOrgManager(
  userId: string,
  organizationId: string
): Promise<{ ok: true; role: string } | { ok: false; status: number; error: string }> {
  const pool = await getLocalAuthPool();
  const row = await pool.query<{ role: string }>(
    `
    SELECT role::text AS role FROM core.organization_members
    WHERE user_id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL
  `,
    [userId, organizationId]
  );
  const role = row.rows[0]?.role;
  if (!role) return { ok: false, status: 403, error: '조직 멤버가 아닙니다.' };
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, status: 403, error: '직급/권한 관리 권한이 없습니다.' };
  }
  return { ok: true, role };
}

function matchOrgRolesPath(pathname: string): { orgId: string } | null {
  const m = /^\/organizations\/([^/]+)\/roles\/?$/.exec(pathname);
  if (!m) return null;
  return { orgId: decodeURIComponent(m[1]!) };
}

function matchMemberAssignPath(pathname: string): { memberId: string } | null {
  const m = /^\/members\/([^/]+)\/role\/?$/.exec(pathname);
  if (!m) return null;
  return { memberId: decodeURIComponent(m[1]!) };
}

function matchMemberFeaturePath(pathname: string): { memberId: string } | null {
  const m = /^\/members\/([^/]+)\/feature-permissions\/?$/.exec(pathname);
  if (!m) return null;
  return { memberId: decodeURIComponent(m[1]!) };
}

function matchOrgMembersPath(pathname: string): { orgId: string } | null {
  const m = /^\/organizations\/([^/]+)\/members\/?$/.exec(pathname);
  if (!m) return null;
  return { orgId: decodeURIComponent(m[1]!) };
}

function matchOrgPath(pathname: string): { orgId: string } | null {
  const m = /^\/organizations\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  return { orgId: decodeURIComponent(m[1]!) };
}

/** Vite connect / standalone: /api/local-auth/* (pathname은 prefix 제거 후) */
export async function handleLocalAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  _next: (err?: unknown) => void
): Promise<void> {
  try {
    applyCors(req, res);
    await getLocalAuthPool();

    const method = (req.method || 'GET').toUpperCase();
    const rawUrl = req.url || '/';
    const pathname = rawUrl.split('?')[0] || '/';
    const ip = clientIp(req);

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'POST' && pathname === '/login') {
      const body = await readJson(req);
      const email = String(body.email ?? '')
        .trim()
        .toLowerCase();
      const password = String(body.password ?? '');
      const rateKey = `${ip}:${email || 'unknown'}`;
      if (isLoginRateLimited(rateKey)) {
        const pool = await getLocalAuthPool();
        await writeAuthAudit(pool, {
          eventType: 'login_rate_limited',
          detail: { email },
          ip,
        });
        sendJson(res, 429, { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }
      if (!email || !password) {
        sendJson(res, 400, { error: '이메일과 비밀번호를 입력해 주세요.' });
        return;
      }

      const pool = await getLocalAuthPool();
      const userRes = await pool.query<LocalAuthUserRow>(
        `
        SELECT id, email, full_name, password_hash, is_active, must_change_password
        FROM app.users
        WHERE LOWER(email) = LOWER($1)
      `,
        [email]
      );
      const user = userRes.rows[0];

      if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
        await writeAuthAudit(pool, {
          eventType: 'login_failed',
          targetUserId: user?.id ?? null,
          detail: { email },
          ip,
        });
        sendJson(res, 401, { error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        return;
      }

      clearLoginRateLimit(rateKey);
      const jwt = signAccessJwt({
        userId: user.id,
        email: user.email,
        fullName: user.full_name ?? undefined,
        expiresInSeconds: getJwtTtlSeconds(),
      });
      // 세션 테이블에는 JWT 해시 저장(로그아웃·폐기용). 클라이언트 access_token = JWT.
      await pool.query(
        `
        INSERT INTO app.sessions (user_id, token_hash, expires_at)
        VALUES ($1::uuid, $2, NOW() + ($3::text)::interval)
        ON CONFLICT (token_hash) DO UPDATE
          SET user_id = EXCLUDED.user_id,
              expires_at = EXCLUDED.expires_at,
              revoked_at = NULL
      `,
        [user.id, hashSessionToken(jwt), getSessionTtlSqlInterval()]
      );
      setSessionCookie(res, jwt);
      await writeAuthAudit(pool, {
        eventType: 'login_success',
        actorUserId: user.id,
        detail: { email },
        ip,
      });

      sendJson(res, 200, {
        access_token: jwt,
        user: toPublicUser(user),
        expires_in: getSessionTtlSeconds(),
      });
      return;
    }

    if (method === 'POST' && pathname === '/logout') {
      const token = getSessionTokenFromRequest(req);
      if (token) {
        const pool = await getLocalAuthPool();
        const user = await resolveUserFromToken(token);
        await pool.query(
          `UPDATE app.sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
          [hashSessionToken(token)]
        );
        await writeAuthAudit(pool, {
          eventType: 'logout',
          actorUserId: user?.id ?? null,
          ip,
        });
      }
      clearSessionCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'GET' && pathname === '/session') {
      const token = getSessionTokenFromRequest(req);
      const user = await resolveUserFromToken(token);
      if (!user) {
        sendJson(res, 200, { session: null });
        return;
      }
      const pool = await getLocalAuthPool();
      const full = await pool.query<LocalAuthUserRow>(
        `SELECT id, email, full_name, password_hash, is_active, must_change_password FROM app.users WHERE id = $1::uuid`,
        [user.id]
      );
      sendJson(res, 200, {
        session: {
          access_token: token,
          user: toPublicUser(full.rows[0] ?? user),
        },
      });
      return;
    }

    if (method === 'POST' && pathname === '/password/change') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const currentPassword = String(body.current_password ?? '');
      const newPassword = String(body.new_password ?? '');
      if (!currentPassword || newPassword.length < 8) {
        sendJson(res, 400, { error: '현재 비밀번호와 새 비밀번호(8자 이상)가 필요합니다.' });
        return;
      }
      if (!verifyPassword(currentPassword, user.password_hash)) {
        sendJson(res, 401, { error: '현재 비밀번호가 올바르지 않습니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      await pool.query(
        `
        UPDATE app.users
        SET password_hash = $1, must_change_password = FALSE
        WHERE id = $2::uuid
      `,
        [hashPassword(newPassword), user.id]
      );
      await writeAuthAudit(pool, {
        eventType: 'password_changed',
        actorUserId: user.id,
        ip,
      });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'POST' && pathname === '/users/deactivate') {
      const actor = await requireUser(req, res);
      if (!actor) return;
      const body = await readJson(req);
      const targetUserId = String(body.user_id ?? '').trim();
      const organizationId = String(body.organization_id ?? '').trim();
      if (!targetUserId || !organizationId) {
        sendJson(res, 400, { error: 'user_id와 organization_id가 필요합니다.' });
        return;
      }
      const gate = await assertOrgManager(actor.id, organizationId);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      if (targetUserId === actor.id) {
        sendJson(res, 400, { error: '본인 계정은 비활성화할 수 없습니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      await pool.query(`UPDATE app.users SET is_active = FALSE WHERE id = $1::uuid`, [targetUserId]);
      await pool.query(
        `UPDATE app.sessions SET revoked_at = NOW() WHERE user_id = $1::uuid AND revoked_at IS NULL`,
        [targetUserId]
      );
      await writeAuthAudit(pool, {
        eventType: 'user_deactivated',
        actorUserId: actor.id,
        targetUserId,
        organizationId,
        ip,
      });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'GET' && pathname === '/memberships') {
      const user = await requireUser(req, res);
      if (!user) return;
      const rows = await listMemberships(user.id);
      sendJson(res, 200, {
        memberships: rows.map((row) => ({
          membership_id: row.membership_id,
          organization_id: row.organization_id,
          role: row.role,
          staff_id: row.staff_id,
          parent_customer_id: row.parent_customer_id,
          is_current_context: Boolean(row.is_current_context),
          organization_role_id: row.organization_role_id,
          organization_role_name: row.organization_role_name,
          permissions: parseJsonObject(row.organization_role_permissions),
          feature_permissions: parseJsonObject(row.feature_permissions),
          organization_name: row.organization_name,
          organization_industry_type: row.organization_industry_type,
          organization_slug: row.organization_slug,
          organization_settings: parseJsonObject(row.organization_settings),
          organization_is_active: Boolean(row.organization_is_active),
          organization_public_code: row.organization_public_code,
        })),
      });
      return;
    }

    if (method === 'POST' && pathname === '/memberships/active') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const membershipId = String(body.membership_id ?? '').trim();
      if (!membershipId) {
        sendJson(res, 400, { error: 'membership_id가 필요합니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      const owned = await pool.query<{ id: string }>(
        `
        SELECT id FROM core.organization_members
        WHERE id = $1 AND user_id = $2
      `,
        [membershipId, user.id]
      );
      if (!owned.rows[0]) {
        sendJson(res, 404, { error: '멤버십을 찾을 수 없습니다.' });
        return;
      }
      await pool.query(
        `UPDATE core.organization_members SET is_current_context = FALSE WHERE user_id = $1`,
        [user.id]
      );
      await pool.query(
        `UPDATE core.organization_members SET is_current_context = TRUE WHERE id = $1 AND user_id = $2`,
        [membershipId, user.id]
      );
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'POST' && pathname === '/memberships/clear') {
      const user = await requireUser(req, res);
      if (!user) return;
      const pool = await getLocalAuthPool();
      await pool.query(
        `UPDATE core.organization_members SET is_current_context = FALSE WHERE user_id = $1`,
        [user.id]
      );
      sendJson(res, 200, { ok: true });
      return;
    }

    const orgPath = matchOrgPath(pathname);
    if (orgPath && (method === 'PATCH' || method === 'PUT')) {
      const user = await requireUser(req, res);
      if (!user) return;
      const gate = await assertOrgManager(user.id, orgPath.orgId);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      const body = await readJson(req);
      const pool = await getLocalAuthPool();
      const name = body.name != null ? String(body.name).trim() : null;
      const settings =
        body.settings && typeof body.settings === 'object'
          ? (body.settings as Record<string, unknown>)
          : null;
      if (name) {
        await pool.query(
          `UPDATE core.organizations SET name = $1, updated_at = NOW() WHERE id = $2::uuid`,
          [name, orgPath.orgId]
        );
      }
      if (settings) {
        await pool.query(
          `
          UPDATE core.organizations
          SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
              updated_at = NOW()
          WHERE id = $2::uuid
        `,
          [JSON.stringify(settings), orgPath.orgId]
        );
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    // --- 직급 CRUD / 일괄 등록 ---
    const rolesPath = matchOrgRolesPath(pathname);
    if (rolesPath && method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const pool = await getLocalAuthPool();
      const member = await pool.query<{ id: string }>(
        `SELECT id FROM core.organization_members WHERE user_id = $1 AND organization_id = $2`,
        [user.id, rolesPath.orgId]
      );
      if (!member.rows[0]) {
        sendJson(res, 403, { error: '조직 멤버가 아닙니다.' });
        return;
      }
      const roles = await pool.query<{
        id: string;
        name: string;
        rank_order: number;
        permissions: unknown;
      }>(
        `
        SELECT id, name, rank_order, permissions
        FROM core.organization_roles
        WHERE tenant_id = $1
        ORDER BY rank_order ASC, name ASC
      `,
        [rolesPath.orgId]
      );
      sendJson(res, 200, {
        roles: roles.rows.map((r) => ({
          id: r.id,
          name: r.name,
          rank_order: r.rank_order,
          permissions: parseJsonObject(r.permissions),
          description: '',
          is_system: false,
        })),
      });
      return;
    }

    if (rolesPath && (method === 'PUT' || method === 'POST')) {
      const user = await requireUser(req, res);
      if (!user) return;
      const gate = await assertOrgManager(user.id, rolesPath.orgId);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      const body = await readJson(req);
      const rolesRaw = Array.isArray(body.roles) ? body.roles : null;
      if (!rolesRaw || rolesRaw.length === 0) {
        sendJson(res, 400, { error: 'roles 배열이 필요합니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      const replace = body.replace === true || method === 'PUT';
      if (replace) {
        await pool.query(`UPDATE core.organization_members SET organization_role_id = NULL WHERE organization_id = $1`, [
          rolesPath.orgId,
        ]);
        await pool.query(`DELETE FROM core.organization_roles WHERE tenant_id = $1`, [
          rolesPath.orgId,
        ]);
      }

      const saved: Array<{ id: string; name: string; rank_order: number }> = [];
      for (let i = 0; i < rolesRaw.length; i++) {
        const item = rolesRaw[i] as Record<string, unknown>;
        const name = String(item.name ?? '').trim();
        if (!name) continue;
        const rankOrder = Number(item.rank_order ?? item.rankOrder ?? (i + 1) * 10);
        const permissions =
          item.permissions && typeof item.permissions === 'object'
            ? (item.permissions as Record<string, boolean>)
            : {};
        const id = String(item.id ?? '').trim() || randomUUID();

        if (!replace) {
          const byName = await pool.query<{ id: string }>(
            `SELECT id FROM core.organization_roles WHERE tenant_id = $1 AND name = $2`,
            [rolesPath.orgId, name]
          );
          if (byName.rows[0]) {
            await pool.query(
              `
              UPDATE core.organization_roles
              SET rank_order = $1, permissions = $2::jsonb
              WHERE id = $3
            `,
              [rankOrder, JSON.stringify(permissions), byName.rows[0].id]
            );
            saved.push({ id: byName.rows[0].id, name, rank_order: rankOrder });
            continue;
          }
        }

        await pool.query(
          `
          INSERT INTO core.organization_roles (id, tenant_id, name, rank_order, permissions)
          VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (tenant_id, name) DO UPDATE
          SET rank_order = EXCLUDED.rank_order,
              permissions = EXCLUDED.permissions
        `,
          [id, rolesPath.orgId, name, rankOrder, JSON.stringify(permissions)]
        );
        saved.push({ id, name, rank_order: rankOrder });
      }

      await writeAuthAudit(pool, {
        eventType: 'organization_roles_upsert',
        actorUserId: user.id,
        organizationId: rolesPath.orgId,
        detail: { count: saved.length, replace },
        ip,
      });
      sendJson(res, 200, { roles: saved, seeded: saved.length });
      return;
    }

    const orgMembersPath = matchOrgMembersPath(pathname);
    if (orgMembersPath && method === 'GET') {
      const user = await requireUser(req, res);
      if (!user) return;
      const pool = await getLocalAuthPool();
      const member = await pool.query<{ id: string }>(
        `SELECT id FROM core.organization_members WHERE user_id = $1 AND organization_id = $2`,
        [user.id, orgMembersPath.orgId]
      );
      if (!member.rows[0]) {
        sendJson(res, 403, { error: '조직 멤버가 아닙니다.' });
        return;
      }
      const rows = await pool.query<{
        id: string;
        user_id: string;
        role: string;
        organization_role_id: string | null;
        feature_permissions: unknown;
        email: string;
        full_name: string;
      }>(
        `
        SELECT m.id, m.user_id, m.role, m.organization_role_id, m.feature_permissions,
               u.email, u.full_name
        FROM core.organization_members m
        JOIN app.users u ON u.id = m.user_id
        WHERE m.organization_id = $1
        ORDER BY u.full_name ASC
      `,
        [orgMembersPath.orgId]
      );
      sendJson(res, 200, {
        members: rows.rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          organization_role_id: r.organization_role_id,
          feature_permissions: parseJsonObject(r.feature_permissions),
          email: r.email,
          name: r.full_name,
          is_active: true,
        })),
      });
      return;
    }

    const assignPath = matchMemberAssignPath(pathname);
    if (assignPath && method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const roleIdRaw = body.role_id;
      const roleId =
        roleIdRaw === null || roleIdRaw === undefined || roleIdRaw === ''
          ? null
          : String(roleIdRaw);
      const reason = String(body.reason ?? '');
      const pool = await getLocalAuthPool();
      const target = await pool.query<{ organization_id: string; user_id: string }>(
        `SELECT organization_id, user_id FROM core.organization_members WHERE id = $1`,
        [assignPath.memberId]
      );
      if (!target.rows[0]) {
        sendJson(res, 404, { error: '멤버를 찾을 수 없습니다.' });
        return;
      }
      const gate = await assertOrgManager(user.id, target.rows[0].organization_id);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      if (roleId) {
        const roleOk = await pool.query<{ id: string }>(
          `SELECT id FROM core.organization_roles WHERE id = $1 AND tenant_id = $2`,
          [roleId, target.rows[0].organization_id]
        );
        if (!roleOk.rows[0]) {
          sendJson(res, 400, { error: '해당 조직의 직급이 아닙니다.' });
          return;
        }
      }
      await pool.query(
        `UPDATE core.organization_members SET organization_role_id = $1 WHERE id = $2`,
        [roleId, assignPath.memberId]
      );
      await writeAuthAudit(pool, {
        eventType: 'member_role_assigned',
        actorUserId: user.id,
        targetUserId: target.rows[0].user_id,
        organizationId: target.rows[0].organization_id,
        detail: { member_id: assignPath.memberId, role_id: roleId, reason },
        ip,
      });
      sendJson(res, 200, { ok: true, assigned_role_id: roleId });
      return;
    }

    const featurePath = matchMemberFeaturePath(pathname);
    if (featurePath && method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const featureKey = String(body.feature_key ?? '').trim();
      const enabled = Boolean(body.enabled);
      if (!featureKey) {
        sendJson(res, 400, { error: 'feature_key가 필요합니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      const target = await pool.query<{
        organization_id: string;
        user_id: string;
        feature_permissions: unknown;
      }>(
        `SELECT organization_id, user_id, feature_permissions FROM core.organization_members WHERE id = $1`,
        [featurePath.memberId]
      );
      if (!target.rows[0]) {
        sendJson(res, 404, { error: '멤버를 찾을 수 없습니다.' });
        return;
      }
      const gate = await assertOrgManager(user.id, target.rows[0].organization_id);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      const next = {
        ...parseJsonObject(target.rows[0].feature_permissions),
        [featureKey]: enabled,
      };
      await pool.query(
        `UPDATE core.organization_members SET feature_permissions = $1::jsonb WHERE id = $2`,
        [JSON.stringify(next), featurePath.memberId]
      );
      await writeAuthAudit(pool, {
        eventType: 'member_feature_permission',
        actorUserId: user.id,
        targetUserId: target.rows[0].user_id,
        organizationId: target.rows[0].organization_id,
        detail: { feature_key: featureKey, enabled },
        ip,
      });
      sendJson(res, 200, { ok: true, feature_permissions: next });
      return;
    }

    if (method === 'GET' && pathname === '/health') {
      const pool = await getLocalAuthPool();
      const users = await pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM app.users`);
      sendJson(res, 200, {
        ok: true,
        driver: pool.driver,
        users: Number(users.rows[0]?.c ?? 0),
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[local-auth]', err);
    sendJson(res, 503, {
      error: dbUnavailableMessage(err),
    });
  }
}

/** Vite plugin에서 prefix 제거 후 호출 */
export function createLocalAuthConnectHandler() {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    void handleLocalAuthRequest(req, res, next);
  };
}
