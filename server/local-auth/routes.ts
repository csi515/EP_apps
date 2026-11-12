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
    SELECT u.id, u.email, u.login_id, u.full_name, u.password_hash, u.is_active, u.must_change_password
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
    SELECT id, email, login_id, full_name, password_hash, is_active, must_change_password
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
    login_id: row.login_id ?? row.email,
    full_name: row.full_name,
    must_change_password: Boolean(row.must_change_password),
  };
}

async function assertCanManageMembers(
  userId: string,
  organizationId: string
): Promise<{ ok: true; role: string } | { ok: false; status: number; error: string }> {
  const pool = await getLocalAuthPool();
  const row = await pool.query<{
    role: string;
    feature_permissions: unknown;
    role_permissions: unknown;
  }>(
    `
    SELECT m.role::text AS role,
           m.feature_permissions,
           r.permissions AS role_permissions
    FROM core.organization_members m
    LEFT JOIN core.organization_roles r ON r.id = m.organization_role_id
    WHERE m.user_id = $1::uuid
      AND m.organization_id = $2::uuid
      AND m.deleted_at IS NULL
      AND m.is_active = TRUE
  `,
    [userId, organizationId]
  );
  const member = row.rows[0];
  if (!member) return { ok: false, status: 403, error: '조직 멤버가 아닙니다.' };
  if (member.role === 'owner' || member.role === 'admin') {
    return { ok: true, role: member.role };
  }
  const feature = parseJsonObject(member.feature_permissions);
  const rolePerms = parseJsonObject(member.role_permissions);
  const allowed =
    feature['members:manage'] === true ||
    feature.members_manage === true ||
    rolePerms['members:manage'] === true ||
    rolePerms.members_manage === true;
  if (!allowed) {
    return { ok: false, status: 403, error: '임직원 등록·관리 권한이 없습니다.' };
  }
  return { ok: true, role: member.role };
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

function matchMemberPasswordPath(pathname: string): { memberId: string } | null {
  const m = /^\/members\/([^/]+)\/password\/?$/.exec(pathname);
  if (!m) return null;
  return { memberId: decodeURIComponent(m[1]!) };
}

function matchMemberActivePath(pathname: string): { memberId: string } | null {
  const m = /^\/members\/([^/]+)\/active\/?$/.exec(pathname);
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
      const loginId = String(body.login_id ?? body.email ?? '')
        .trim()
        .toLowerCase();
      const password = String(body.password ?? '');
      const rateKey = `${ip}:${loginId || 'unknown'}`;
      if (isLoginRateLimited(rateKey)) {
        const pool = await getLocalAuthPool();
        await writeAuthAudit(pool, {
          eventType: 'login_rate_limited',
          detail: { login_id: loginId },
          ip,
        });
        sendJson(res, 429, { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
        return;
      }
      if (!loginId || !password) {
        sendJson(res, 400, { error: '아이디와 비밀번호를 입력해 주세요.' });
        return;
      }

      const pool = await getLocalAuthPool();
      const userRes = await pool.query<LocalAuthUserRow>(
        `
        SELECT id, email, login_id, full_name, password_hash, is_active, must_change_password
        FROM app.users
        WHERE LOWER(login_id) = LOWER($1)
           OR (email IS NOT NULL AND LOWER(email) = LOWER($1))
        ORDER BY CASE WHEN LOWER(login_id) = LOWER($1) THEN 0 ELSE 1 END
        LIMIT 1
      `,
        [loginId]
      );
      const user = userRes.rows[0];

      if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
        await writeAuthAudit(pool, {
          eventType: 'login_failed',
          targetUserId: user?.id ?? null,
          detail: { login_id: loginId },
          ip,
        });
        sendJson(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        return;
      }

      clearLoginRateLimit(rateKey);
      const jwt = signAccessJwt({
        userId: user.id,
        email: user.email ?? user.login_id ?? loginId,
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
        detail: { login_id: loginId },
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
        `SELECT id, email, login_id, full_name, password_hash, is_active, must_change_password FROM app.users WHERE id = $1::uuid`,
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
        is_active: boolean | number;
        email: string | null;
        login_id: string;
        full_name: string | null;
        department_id: string | null;
        department_name: string | null;
        department_path: string | null;
        scope_type: string | null;
      }>(
        `
        SELECT m.id, m.user_id, m.role::text AS role, m.organization_role_id, m.feature_permissions,
               m.is_active, u.email, u.login_id, u.full_name,
               dm.department_id, d.name AS department_name, d.path AS department_path, dm.scope_type
        FROM core.organization_members m
        JOIN app.users u ON u.id = m.user_id
        LEFT JOIN LATERAL (
          SELECT dm2.department_id, dm2.scope_type
          FROM core.department_members dm2
          WHERE dm2.member_id = m.id AND dm2.organization_id = m.organization_id
          ORDER BY CASE dm2.scope_type
            WHEN 'DESCENDANTS' THEN 0
            WHEN 'GLOBAL' THEN 1
            ELSE 2
          END
          LIMIT 1
        ) dm ON TRUE
        LEFT JOIN core.departments d ON d.id = dm.department_id
        WHERE m.organization_id = $1 AND m.deleted_at IS NULL
        ORDER BY COALESCE(u.full_name, u.login_id) ASC
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
          login_id: r.login_id,
          name: r.full_name,
          is_active: r.is_active !== false,
          department_id: r.department_id,
          department_name: r.department_name,
          department_path: r.department_path,
          department_scope_type: r.scope_type,
        })),
      });
      return;
    }

    if (orgMembersPath && method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const gate = await assertCanManageMembers(user.id, orgMembersPath.orgId);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      const body = await readJson(req);
      const loginId = String(body.login_id ?? '')
        .trim()
        .toLowerCase();
      const password = String(body.password ?? '');
      const fullName = String(body.full_name ?? '').trim();
      const baseRole = String(body.base_role ?? 'staff').trim() || 'staff';
      const organizationRoleIdRaw = body.organization_role_id;
      const organizationRoleId =
        organizationRoleIdRaw === null ||
        organizationRoleIdRaw === undefined ||
        organizationRoleIdRaw === ''
          ? null
          : String(organizationRoleIdRaw);
      const departmentIdRaw = body.department_id;
      const departmentId =
        departmentIdRaw === null || departmentIdRaw === undefined || departmentIdRaw === ''
          ? null
          : String(departmentIdRaw);
      const scopeType = String(body.scope_type ?? 'SELF_ONLY').trim() || 'SELF_ONLY';

      if (loginId.length < 2) {
        sendJson(res, 400, { error: '아이디는 2자 이상이어야 합니다.' });
        return;
      }
      if (password.length < 8) {
        sendJson(res, 400, { error: '비밀번호는 8자 이상이어야 합니다.' });
        return;
      }
      if (baseRole === 'owner') {
        sendJson(res, 400, { error: '대표이사(owner) 역할은 직접 발급할 수 없습니다.' });
        return;
      }
      if (!['staff', 'manager', 'admin'].includes(baseRole)) {
        sendJson(res, 400, { error: '기본 역할이 올바르지 않습니다.' });
        return;
      }
      if (!['GLOBAL', 'DESCENDANTS', 'SELF_ONLY'].includes(scopeType)) {
        sendJson(res, 400, { error: '잘못된 부서 스코프입니다.' });
        return;
      }

      const pool = await getLocalAuthPool();
      const exists = await pool.query<{ id: string }>(
        `
        SELECT id FROM app.users
        WHERE LOWER(login_id) = LOWER($1)
           OR (email IS NOT NULL AND LOWER(email) = LOWER($1))
      `,
        [loginId]
      );
      if (exists.rows[0]) {
        sendJson(res, 409, { error: '이미 사용 중인 아이디입니다.' });
        return;
      }
      if (organizationRoleId) {
        const roleOk = await pool.query<{ id: string }>(
          `SELECT id FROM core.organization_roles WHERE id = $1 AND tenant_id = $2`,
          [organizationRoleId, orgMembersPath.orgId]
        );
        if (!roleOk.rows[0]) {
          sendJson(res, 400, { error: '유효하지 않은 직급입니다.' });
          return;
        }
      }
      if (departmentId) {
        const deptOk = await pool.query<{ id: string }>(
          `SELECT id FROM core.departments WHERE id = $1 AND organization_id = $2`,
          [departmentId, orgMembersPath.orgId]
        );
        if (!deptOk.rows[0]) {
          sendJson(res, 400, { error: '유효하지 않은 부서입니다.' });
          return;
        }
      }

      const userId = randomUUID();
      const staffId = randomUUID();
      const memberId = randomUUID();
      const passwordHash = hashPassword(password);

      await pool.query(
        `
        INSERT INTO app.users (id, login_id, email, password_hash, full_name, must_change_password, is_active)
        VALUES ($1::uuid, $2, NULL, $3, $4, TRUE, TRUE)
      `,
        [userId, loginId, passwordHash, fullName || null]
      );
      await pool.query(
        `
        INSERT INTO core.staff (id, organization_id, user_id, name, email, status, department_id)
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, NULL, 'active', $5::uuid)
      `,
        [staffId, orgMembersPath.orgId, userId, fullName || loginId, departmentId]
      );
      await pool.query(
        `
        INSERT INTO core.organization_members (
          id, organization_id, user_id, role, staff_id, organization_role_id, is_active, feature_permissions
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::core.member_role, $5::uuid, $6::uuid, TRUE, '{}'::jsonb)
      `,
        [memberId, orgMembersPath.orgId, userId, baseRole, staffId, organizationRoleId]
      );
      if (departmentId) {
        await pool.query(
          `
          INSERT INTO core.department_members (organization_id, department_id, member_id, scope_type)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
          ON CONFLICT (department_id, member_id) DO UPDATE SET scope_type = EXCLUDED.scope_type
        `,
          [orgMembersPath.orgId, departmentId, memberId, scopeType]
        );
      }
      await writeAuthAudit(pool, {
        eventType: 'member_provisioned',
        actorUserId: user.id,
        targetUserId: userId,
        organizationId: orgMembersPath.orgId,
        detail: {
          login_id: loginId,
          member_id: memberId,
          staff_id: staffId,
          base_role: baseRole,
          organization_role_id: organizationRoleId,
          department_id: departmentId,
        },
        ip,
      });

      sendJson(res, 201, {
        user_id: userId,
        member_id: memberId,
        staff_id: staffId,
        login_id: loginId,
        full_name: fullName || null,
        must_change_password: true,
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

    const passwordPath = matchMemberPasswordPath(pathname);
    if (passwordPath && method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const newPassword = String(body.password ?? body.new_password ?? '');
      if (newPassword.length < 8) {
        sendJson(res, 400, { error: '비밀번호는 8자 이상이어야 합니다.' });
        return;
      }
      const pool = await getLocalAuthPool();
      const target = await pool.query<{
        organization_id: string;
        user_id: string;
        role: string;
      }>(
        `SELECT organization_id, user_id, role::text AS role FROM core.organization_members WHERE id = $1 AND deleted_at IS NULL`,
        [passwordPath.memberId]
      );
      if (!target.rows[0]) {
        sendJson(res, 404, { error: '멤버를 찾을 수 없습니다.' });
        return;
      }
      const gate = await assertCanManageMembers(user.id, target.rows[0].organization_id);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      if (target.rows[0].role === 'owner') {
        sendJson(res, 403, { error: '대표이사의 비밀번호는 이 경로로 재설정할 수 없습니다.' });
        return;
      }
      await pool.query(
        `
        UPDATE app.users
        SET password_hash = $1, must_change_password = TRUE
        WHERE id = $2::uuid
      `,
        [hashPassword(newPassword), target.rows[0].user_id]
      );
      await writeAuthAudit(pool, {
        eventType: 'password_reset_by_admin',
        actorUserId: user.id,
        targetUserId: target.rows[0].user_id,
        organizationId: target.rows[0].organization_id,
        detail: { member_id: passwordPath.memberId },
        ip,
      });
      sendJson(res, 200, { ok: true, must_change_password: true });
      return;
    }

    const activePath = matchMemberActivePath(pathname);
    if (activePath && method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      const body = await readJson(req);
      const isActive = body.is_active !== false && body.is_active !== 'false';
      const pool = await getLocalAuthPool();
      const target = await pool.query<{
        organization_id: string;
        user_id: string;
        role: string;
      }>(
        `SELECT organization_id, user_id, role::text AS role FROM core.organization_members WHERE id = $1 AND deleted_at IS NULL`,
        [activePath.memberId]
      );
      if (!target.rows[0]) {
        sendJson(res, 404, { error: '멤버를 찾을 수 없습니다.' });
        return;
      }
      const gate = await assertCanManageMembers(user.id, target.rows[0].organization_id);
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error });
        return;
      }
      if (target.rows[0].role === 'owner') {
        sendJson(res, 403, { error: '대표이사는 비활성화할 수 없습니다.' });
        return;
      }
      if (target.rows[0].user_id === user.id) {
        sendJson(res, 400, { error: '본인 계정은 비활성화할 수 없습니다.' });
        return;
      }
      await pool.query(
        `UPDATE core.organization_members SET is_active = $1 WHERE id = $2`,
        [isActive, activePath.memberId]
      );
      await pool.query(`UPDATE app.users SET is_active = $1 WHERE id = $2::uuid`, [
        isActive,
        target.rows[0].user_id,
      ]);
      await writeAuthAudit(pool, {
        eventType: isActive ? 'member_reactivated' : 'member_deactivated',
        actorUserId: user.id,
        targetUserId: target.rows[0].user_id,
        organizationId: target.rows[0].organization_id,
        detail: { member_id: activePath.memberId, is_active: isActive },
        ip,
      });
      sendJson(res, 200, { ok: true, is_active: isActive });
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
