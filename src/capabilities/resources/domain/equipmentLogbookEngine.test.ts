import assert from 'node:assert/strict';
import {
  calculateOperatingHours,
  generateEquipmentLogbookFromReservation,
  signEquipmentLogbook,
} from './equipmentLogbookEngine';

function run() {
  console.log('[test:equipment-logbook] running tests...');

  // 1. 가동 시간 계산 검증
  {
    // 09:00 ~ 12:00 -> 3.0시간
    const h1 = calculateOperatingHours('2026-10-18T09:00:00Z', '2026-10-18T12:00:00Z');
    assert.equal(h1, 3.0);

    // 13:30 ~ 15:00 -> 1.5시간
    const h2 = calculateOperatingHours('2026-10-18T13:30:00Z', '2026-10-18T15:00:00Z');
    assert.equal(h2, 1.5);
  }

  // 2. 예약 연동 사용일지 자동 생성 검증
  {
    const log = generateEquipmentLogbookFromReservation({
      reservationId: 'res-101',
      resourceId: 'eq-sem-01',
      equipmentName: 'FE-SEM 전계방출형 주사전자현미경',
      assetTagNumber: 'RND-EQ-2024-001',
      startsAt: '2026-10-18T10:00:00Z',
      endsAt: '2026-10-18T13:00:00Z',
      researcherId: 'staff-99',
      researcherName: '김수석',
      projectName: '이차전지 표면 미세구조 분석 과제',
    });

    assert.ok(log.id.startsWith('log-'));
    assert.equal(log.reservationId, 'res-101');
    assert.equal(log.equipmentName, 'FE-SEM 전계방출형 주사전자현미경');
    assert.equal(log.assetTagNumber, 'RND-EQ-2024-001');
    assert.equal(log.operatingHours, 3.0);
    assert.equal(log.usageDate, '2026-10-18');
    assert.equal(log.researcherName, '김수석');
    assert.equal(log.projectName, '이차전지 표면 미세구조 분석 과제');
    assert.equal(log.equipmentStatus, 'normal');
    assert.equal(log.isSigned, false);

    // 3. 연구원 사용 후 이상유무 체크 및 전자 서명 완료 검증
    const signedLog = signEquipmentLogbook(log, {
      status: 'normal',
      signedAt: '2026-10-18T13:05:00Z',
    });
    assert.equal(signedLog.isSigned, true);
    assert.equal(signedLog.equipmentStatus, 'normal');
    assert.equal(signedLog.signedAt, '2026-10-18T13:05:00Z');

    // 이상 발생 시 메모 기록
    const issueLog = signEquipmentLogbook(log, {
      status: 'issue',
      issueNotes: '전자빔 진공 챔버 압력 상승 경고등 점등',
    });
    assert.equal(issueLog.equipmentStatus, 'issue');
    assert.equal(issueLog.issueNotes, '전자빔 진공 챔버 압력 상승 경고등 점등');
  }

  console.log('equipmentLogbookEngine.test.ts: all assertions passed!');
}

run();
