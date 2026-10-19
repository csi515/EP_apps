import assert from 'node:assert/strict';
import {
  canViewGrievanceContent,
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
} from './grievanceEngine';

function run() {
  assert.equal(generateTicketCode(42), 'G-0042');

  const pin = '9876';
  const hashed = hashAccessPin(pin);
  assert.equal(verifyAccessPin('9876', hashed), true);
  assert.equal(verifyAccessPin('1234', hashed), false);

  assert.equal(
    validateGrievanceSubmission(
      '야간 초과근무 수당 미지급 건',
      '지난달 주말 근무 8시간에 대한 수당이 정산서에서 누락되었습니다.',
      '1234',
      'anonymous'
    ).isValid,
    true
  );
  assert.equal(
    validateGrievanceSubmission('제목', '내용부족', '1234', 'anonymous').isValid,
    false
  );
  assert.equal(
    validateGrievanceSubmission('제목', '내용은 충분히 길게 작성되었습니다.', '12', 'anonymous').isValid,
    false
  );
  assert.equal(
    validateGrievanceSubmission('기명 건의', '내용은 충분히 길게 작성되었습니다.', '', 'named').isValid,
    true
  );

  assert.equal(
    canViewGrievanceContent({
      record: { author_user_id: 'u1', visibility: 'named' },
      viewerUserId: 'u1',
      canManageAll: false,
    }),
    true
  );
  assert.equal(
    canViewGrievanceContent({
      record: { author_user_id: 'u1', visibility: 'named' },
      viewerUserId: 'u2',
      canManageAll: false,
    }),
    false
  );
  assert.equal(
    canViewGrievanceContent({
      record: { author_user_id: 'u1', visibility: 'named' },
      viewerUserId: 'u2',
      canManageAll: true,
    }),
    true
  );

  console.log('grievanceEngine.test.ts: ok');
}

run();
