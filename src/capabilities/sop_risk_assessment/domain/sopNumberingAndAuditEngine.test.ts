import assert from 'node:assert/strict';
import {
  generateSopDocNo,
  generateHazardDocNo,
  formatRevisionNo,
  formatDocNoWithRevision,
  getNextSequenceNumber,
  computeRiskScore,
} from './sopNumberingAndAuditEngine';

function testDocNumbering(): void {
  // 1. SOP 문서번호 채번 검증
  assert.equal(generateSopDocNo('MNT', 1), 'SOP-MNT-001');
  assert.equal(generateSopDocNo('prd1', 14), 'SOP-PRD1-014');
  assert.equal(generateSopDocNo('RND', 99), 'SOP-RND-099');

  // 2. 위험성평가 관리번호 채번 검증
  assert.equal(generateHazardDocNo('SOP-MNT-001', 1), 'RA-MNT-001-H01');
  assert.equal(generateHazardDocNo('SOP-MNT-001', 12), 'RA-MNT-001-H12');

  // 3. 개정 차수 포맷 검증
  assert.equal(formatRevisionNo(0), 'Rev.00');
  assert.equal(formatRevisionNo(1), 'Rev.01');
  assert.equal(formatRevisionNo(2), 'Rev.02');
  assert.equal(formatDocNoWithRevision('SOP-MNT-001', 2), 'SOP-MNT-001_Rev.02');

  // 4. 다음 일련번호 계산 (Auto sequence increment)
  const existing = ['SOP-MNT-001_Rev.02', 'SOP-MNT-002_Rev.00', 'SOP-PRD1-001_Rev.01'];
  assert.equal(getNextSequenceNumber(existing, 'MNT'), 3);
  assert.equal(getNextSequenceNumber(existing, 'PRD1'), 2);
  assert.equal(getNextSequenceNumber(existing, 'RND'), 1);

  // 5. 위험도 매트릭스 계산 검증
  const critical = computeRiskScore(5, 4);
  assert.equal(critical.score, 20);
  assert.equal(critical.level, 'critical');

  const high = computeRiskScore(3, 4);
  assert.equal(high.score, 12);
  assert.equal(high.level, 'high');

  const medium = computeRiskScore(2, 3);
  assert.equal(medium.score, 6);
  assert.equal(medium.level, 'medium');

  const low = computeRiskScore(1, 2);
  assert.equal(low.score, 2);
  assert.equal(low.level, 'low');

  console.log('sopNumberingAndAuditEngine.test.ts: ok');
}

testDocNumbering();
