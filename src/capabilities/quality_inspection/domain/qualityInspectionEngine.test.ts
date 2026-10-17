import assert from 'node:assert/strict';
import {
  evaluateInspectionSamples,
  type InspectionStandard,
} from './qualityInspectionEngine';

function run() {
  const standard: InspectionStandard = {
    id: 'std-1',
    itemName: '정밀 볼트 M8',
    processStage: 'final',
    inspectionItem: '외경 치수',
    unit: 'mm',
    targetValue: 8.0,
    minThreshold: 7.9,
    maxThreshold: 8.1,
    sampleSize: 5,
  };

  // 1. 전수 합격 샘플 (모두 7.9 ~ 8.1 범위 이내)
  const passSamples = [8.01, 7.98, 8.02, 8.00, 7.99];
  const passRes = evaluateInspectionSamples(passSamples, standard);

  assert.equal(passRes.judgment, 'pass');
  assert.equal(passRes.defectCount, 0);
  assert.equal(passRes.defectRatePercent, 0);
  assert.equal(passRes.count, 5);
  assert.ok(passRes.cpk !== undefined && passRes.cpk > 1.0); // 우수한 공정능력

  // 2. 불합격 샘플 (상한 또는 하한 이탈)
  const failSamples = [8.01, 7.88, 8.12, 8.00, 7.95]; // 7.88(하한 이탈), 8.12(상한 이탈)
  const failRes = evaluateInspectionSamples(failSamples, standard);

  assert.equal(failRes.judgment, 'fail');
  assert.equal(failRes.defectCount, 2);
  assert.equal(failRes.defectRatePercent, 40.0);
  assert.equal(failRes.min, 7.88);
  assert.equal(failRes.max, 8.12);

  // 3. 빈 샘플 방어
  const emptyRes = evaluateInspectionSamples([], standard);
  assert.equal(emptyRes.count, 0);
  assert.equal(emptyRes.judgment, 'pass');

  console.log('qualityInspectionEngine.test.ts: ok');
}

run();
