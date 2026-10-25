import assert from 'node:assert/strict';
import {
  canViewGrievanceContent,
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
  generateBlindReceiptToken,
  sanitizeGrievanceSubmission,
  getMaskedGrievanceAuthor,
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

  
  // 익명성 기술 보증 (Blind Tokenization & Zero-Knowledge Sanitization)
  const token = generateBlindReceiptToken('G-0042', '9876');
  assert.ok(token.startsWith('TKN-'), '영수증 토큰 형식 확인');
  assert.equal(token, generateBlindReceiptToken('G-0042', '9876'), '동일 PIN에 대한 일관성 확인');
  assert.notEqual(token, generateBlindReceiptToken('G-0042', '1234'), '다른 PIN에 대한 고유성 확인');

  const sanitized = sanitizeGrievanceSubmission({
    ticket_code: 'G-0042',
    visibility: 'anonymous',
    author_user_id: 'secret_user_123',
  });
  assert.equal(sanitized.author_user_id, null, '익명 제보 시 author_user_id 완벽 격리/제거');

  const masked = getMaskedGrievanceAuthor({ visibility: 'anonymous', author_user_id: null });
  assert.match(masked, /익명 제보자/, '감사 로그 마스킹 확인');

  console.log('grievanceEngine.test.ts: all tests passed including blind tokenization.');
}

run();
