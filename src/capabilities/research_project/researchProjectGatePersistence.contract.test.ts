/**
 * 연구과제 DB 경계 계약 — 게이트 결정 원자 RPC 없음, RLS·도메인 엔진이 fail-closed SoT.
 * PG 스모크: `can_decide_research_gate` (034); 게이트 status는 researchProjectEngine + 결재 동기화.
 * 실행: npm run test:research-project-gate-persistence
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const migration034 = readFileSync(
  join(root, 'migrations/domain/034_research_project_rls_rpc.sql'),
  'utf8',
);
const approvalAtomic = readFileSync(
  join(root, 'migrations/domain/015_approval_step_atomic.sql'),
  'utf8',
);

assert.ok(migration034.includes('core.can_decide_research_gate'), 'gate decide permission RPC in 034');
assert.ok(migration034.includes('research_project_gates'), 'gate table RLS in 034');
assert.ok(
  !/process_research_gate_atomic|decide_research_gate_atomic/i.test(migration034),
  'no dedicated atomic research-gate transition RPC — domain engine must reject illegal transitions',
);
assert.ok(
  approvalAtomic.includes('process_approval_step_atomic'),
  'electronic gate path uses approval atomic RPC; sync via researchProjectApproval',
);

console.log(
  '[research-project-gate-persistence] ok — PG smoke note: verify can_decide_research_gate + RLS on stack; gate status illegal transitions covered by test:research-project-engine',
);