/**
 * SOP 수명주기 PG 직접 스모크 (PostgREST 없이도 RPC 검증).
 * 037 적용 후: node --env-file-if-exists=.env --import tsx scripts/verify-sop-risk-lifecycle-pg.mjs
 *
 * env:
 *   DATABASE_URL / EP_LOCAL_AUTH_DATABASE_URL
 *   EP_STAGING_EMAIL (login_id 또는 email, 기본 rndceo)
 */
import pg from 'pg';

function resolveDbUrl() {
  const preferred =
    process.env.EP_SOP_SMOKE_DATABASE_URL?.trim() ||
    process.env.EP_LOCAL_AUTH_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    '';
  // 로컬 네이티브 PG: 테이블/함수 소유·권한 이슈를 피해 superuser로 검증 (비밀번호 ep)
  if (!preferred || /:\/\/ep:ep@/i.test(preferred)) {
    return (
      process.env.EP_SOP_SMOKE_DATABASE_URL?.trim() ||
      'postgresql://postgres:ep@127.0.0.1:54329/ep_local'
    );
  }
  return preferred;
}

const url = resolveDbUrl();
const loginId = (process.env.EP_STAGING_EMAIL || 'rndceo').trim().toLowerCase();

function fail(msg, detail) {
  console.error(msg, detail ?? '');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
const client = await pool.connect();

try {
  await client.query('SET search_path TO app, core, public');

  let userRes = await client.query(
    `SELECT id, email, login_id FROM app.users
     WHERE lower(coalesce(login_id, email)) = $1
        OR lower(email) = $1
     LIMIT 1`,
    [loginId]
  );
  let user = userRes.rows[0];
  if (!user?.id) {
    // 시드 계정명이 환경마다 다를 수 있어 owner 멤버십으로 폴백
    const ownerRes = await client.query(
      `SELECT u.id, u.email, u.login_id
       FROM core.organization_members m
       JOIN app.users u ON u.id = m.user_id
       WHERE m.role = 'owner' AND m.is_active = true AND m.deleted_at IS NULL
       ORDER BY m.joined_at ASC NULLS LAST
       LIMIT 1`
    );
    user = ownerRes.rows[0];
  }
  if (!user?.id) fail('user not found', loginId);

  const memRes = await client.query(
    `SELECT organization_id FROM core.organization_members
     WHERE user_id = $1::uuid AND is_active = true AND deleted_at IS NULL
     ORDER BY joined_at ASC NULLS LAST
     LIMIT 1`,
    [user.id]
  );
  const orgId = memRes.rows[0]?.organization_id;
  if (!orgId) fail('no membership', user.id);

  // session-level (is_local=false): node-pg 기본 autocommit에서 트랜잭션 로컬 설정이 유지되지 않음
  await client.query(`SELECT set_config('app.user_id', $1, false)`, [String(user.id)]);
  const uidCheck = await client.query(`SELECT app.current_user_id() AS uid`);
  if (!uidCheck.rows[0]?.uid) fail('app.current_user_id() empty after set_config', uidCheck.rows[0]);
  console.info('context', { userId: user.id, orgId, loginId });

  const docNo = `SOP-PG-${Date.now().toString().slice(-8)}`;
  const ins = await client.query(
    `INSERT INTO core.risk_assessments (
       organization_id, department_id, document_no, title, process_name,
       current_version, status, created_by, snapshot_payload
     ) VALUES (
       $1::uuid, NULL, $2, 'pg-smoke-sop', 'pg-smoke-sop',
       1, 'DRAFT', $3::uuid, $4::jsonb
     ) RETURNING id`,
    [
      orgId,
      docNo,
      user.id,
      JSON.stringify({
        steps: [],
        prohibitedActions: [],
        deptCode: 'PG',
        deptName: 'PG',
        intendedReviewerId: user.id,
        intendedApproverId: user.id,
        rejectionHistory: [],
      }),
    ]
  );
  const assessmentId = ins.rows[0].id;
  console.info('draft', assessmentId, docNo);

  await client.query(`SELECT core.submit_risk_assessment_for_review($1::uuid, $2::uuid)`, [
    assessmentId,
    user.id,
  ]);
  console.info('submit ok');

  await client.query(
    `SELECT core.approve_risk_assessment_step($1::uuid, 2, $2, $3, $4::uuid)`,
    [assessmentId, 'pg review', 'data:image/png;base64,pg-r', user.id]
  );
  console.info('approve review ok');

  await client.query(
    `SELECT core.approve_risk_assessment_step($1::uuid, 3, $2, $3, NULL)`,
    [assessmentId, 'pg final', 'data:image/png;base64,pg-a']
  );
  console.info('approve final ok');

  const st1 = await client.query(
    `SELECT status, current_version FROM core.risk_assessments WHERE id = $1::uuid`,
    [assessmentId]
  );
  if (st1.rows[0]?.status !== 'APPROVED') fail('expected APPROVED', st1.rows[0]);

  const rp1 = await client.query(
    `SELECT id FROM core.risk_assessment_worker_repledges
     WHERE assessment_id = $1::uuid AND worker_user_id = $2::uuid
       AND required_version = 1 AND pledged_at IS NULL
     LIMIT 1`,
    [assessmentId, user.id]
  );
  if (!rp1.rows[0]?.id) fail('repledge v1 missing');
  await client.query(`SELECT core.complete_risk_assessment_repledge($1::uuid, $2)`, [
    rp1.rows[0].id,
    'data:image/png;base64,pg-rp1',
  ]);
  console.info('repledge v1 ok');

  await client.query(`SELECT core.revise_risk_assessment($1::uuid, $2, $3)`, [
    assessmentId,
    'PERIODIC',
    'pg smoke revise reason',
  ]);
  console.info('revise ok');

  await client.query(`SELECT core.submit_risk_assessment_for_review($1::uuid, $2::uuid)`, [
    assessmentId,
    user.id,
  ]);
  await client.query(
    `SELECT core.approve_risk_assessment_step($1::uuid, 2, $2, $3, $4::uuid)`,
    [assessmentId, 'pg review2', 'data:image/png;base64,pg-r2', user.id]
  );
  await client.query(
    `SELECT core.approve_risk_assessment_step($1::uuid, 3, $2, $3, NULL)`,
    [assessmentId, 'pg final2', 'data:image/png;base64,pg-a2']
  );
  console.info('re-approve ok');

  const rp2 = await client.query(
    `SELECT id FROM core.risk_assessment_worker_repledges
     WHERE assessment_id = $1::uuid AND worker_user_id = $2::uuid
       AND required_version = 2 AND pledged_at IS NULL
     LIMIT 1`,
    [assessmentId, user.id]
  );
  if (!rp2.rows[0]?.id) fail('repledge v2 missing');
  await client.query(`SELECT core.complete_risk_assessment_repledge($1::uuid, $2)`, [
    rp2.rows[0].id,
    'data:image/png;base64,pg-rp2',
  ]);
  console.info('repledge v2 ok');

  const final = await client.query(
    `SELECT status, current_version FROM core.risk_assessments WHERE id = $1::uuid`,
    [assessmentId]
  );
  console.info('final', final.rows[0]);
  if (final.rows[0]?.status !== 'APPROVED' || final.rows[0]?.current_version < 2) {
    fail('unexpected final state', final.rows[0]);
  }

  console.info('sop risk lifecycle PG smoke passed');
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
} finally {
  client.release();
  await pool.end();
}
