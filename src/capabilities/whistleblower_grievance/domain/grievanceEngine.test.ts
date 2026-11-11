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

async function run() {
  assert.equal(generateTicketCode(42), 'G-0042');

  const pin = '9876';
  const hashed = await hashAccessPin(pin);
  assert.equal(await verifyAccessPin('9876', hashed), true);
  assert.equal(await verifyAccessPin('1234', hashed), false);
  assert.match(hashed, /^[0-9a-f]{64}$/);

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
    validateGrievanceSubmission('제목', '내용은 충분히 길게 작성되었습니다.', '12', 'anonymous')
      .isValid,
    false
  );
  assert.equal(
    validateGrievanceSubmission('기명 건의', '내용은 충분히 길게 작성되었습니다.', '', 'named')
      .isValid,
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

  const token = await generateBlindReceiptToken('G-0042', '9876');
  assert.ok(token.startsWith('TKN-'), '영수증 토큰 형식 확인');
  assert.equal(token, await generateBlindReceiptToken('G-0042', '9876'), '동일 PIN 일관성');
  assert.notEqual(
    token,
    await generateBlindReceiptToken('G-0042', '1234'),
    '다른 PIN 고유성'
  );

  const sanitized = sanitizeGrievanceSubmission({
    ticket_code: 'G-0042',
    visibility: 'anonymous',
    author_user_id: 'secret_user_123',
  });
  assert.equal(sanitized.author_user_id, null, '익명 제보 시 author_user_id 제거');

  const masked = getMaskedGrievanceAuthor({ visibility: 'anonymous', author_user_id: null });
  assert.match(masked, /익명 제보자/, '감사 로그 마스킹 확인');

  console.log('grievanceEngine.test.ts: all tests passed including blind tokenization.');
}

void run();
