import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateSopDocNo,
  generateHazardDocNo,
  formatRevisionNo,
  getNextSequenceNumber,
  computeRiskScore,
} from '../src/capabilities/sop_risk_assessment/domain/sopNumberingAndAuditEngine';

function testDesktopSopRiskMatrixSpecification(): void {
  // 1. 도메인 채번 엔진 검증
  assert.equal(generateSopDocNo('MNT', 1), 'SOP-MNT-001');
  assert.equal(generateHazardDocNo('SOP-MNT-001', 1), 'RA-MNT-001-H01');
  assert.equal(formatRevisionNo(2), 'Rev.02');
  assert.equal(getNextSequenceNumber(['SOP-MNT-001_Rev.02'], 'MNT'), 2);

  const calcCrit = computeRiskScore(5, 5);
  assert.equal(calcCrit.score, 25);
  assert.equal(calcCrit.level, 'critical');

  // 2. 컴포넌트 코드 구현 명세 검증
  const compPath = resolve(
    process.cwd(),
    'src/capabilities/sop_risk_assessment/components/DesktopSopRiskMatrixView.tsx'
  );
  const compSource = readFileSync(compPath, 'utf-8');

  // 와이드 매트릭스 컬럼 존재 확인
  assert.ok(compSource.includes('작업 표준 단계 (SOP Action)'), '작업 표준 단계 컬럼이 있어야 합니다.');
  assert.ok(compSource.includes('유해·위험요인 (Hazard)'), '유해위험요인 컬럼이 있어야 합니다.');
  assert.ok(compSource.includes('초기 위험도'), '초기 위험도 컬럼이 있어야 합니다.');
  assert.ok(compSource.includes('핵심 안전조치 및 SOP 통제기준'), '핵심 안전조치 및 SOP 컬럼이 있어야 합니다.');
  assert.ok(compSource.includes('필수 보호구'), '필수 보호구 컬럼이 있어야 합니다.');
  assert.ok(compSource.includes('개선후 위험도'), '개선후 위험도 컬럼이 있어야 합니다.');

  // 절대 금지 행위 (Red Card) 존재 확인
  assert.ok(compSource.includes('Life-Critical Prohibited Actions'), '절대 금지 행위 경고 박스가 있어야 합니다.');

  // 제·개정 이력 (Audit Trail) 및 자동 채번 모달 존재 확인
  assert.ok(compSource.includes('신규 공정 표준(SOP) 등록 & 채번'), '자동 채번 등록 모달이 있어야 합니다.');
  assert.ok(compSource.includes('작업표준 개정 기안 (Audit Trail 승인)'), '개정 기안 모달이 있어야 합니다.');
  assert.ok(compSource.includes('제·개정 이력 추적 (Audit Trail History)'), '이력 추적 모달이 있어야 합니다.');

  console.log('desktopSopRiskMatrix.test.ts: ok');
}

testDesktopSopRiskMatrixSpecification();
