import assert from 'node:assert/strict';
import {
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
} from './grievanceEngine';

function run() {
  // 1. 티켓 코드
  assert.equal(generateTicketCode(42), 'G-0042');

  // 2. PIN 해시 및 검증
  const pin = '9876';
  const hashed = hashAccessPin(pin);
  assert.equal(verifyAccessPin('9876', hashed), true);
  assert.equal(verifyAccessPin('1234', hashed), false);

  // 3. 유효성 검증
  assert.equal(
    validateGrievanceSubmission(
      '야간 초과근무 수당 미지급 건',
      '지난달 주말 근무 8시간에 대한 수당이 정산서에서 누락되었습니다.',
      '1234'
    ).isValid,
    true
  );
  assert.equal(
    validateGrievanceSubmission('제목', '내용부족', '1234').isValid,
    false // 10자 미만
  );
  assert.equal(
    validateGrievanceSubmission('제목', '내용은 충분히 길게 작성되었습니다.', '12').isValid,
    false // PIN 4자리 미만
  );

  console.log('grievanceEngine.test.ts: ok');
}

run();
