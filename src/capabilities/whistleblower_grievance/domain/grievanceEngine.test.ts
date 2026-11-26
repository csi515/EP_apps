import assert from 'node:assert/strict';
import {
  canAuthorMutateGrievance,
  canViewGrievanceContent,
  generateTicketCode,
  hashAccessPin,
  verifyAccessPin,
  validateGrievanceSubmission,
  generateBlindReceiptToken,
  sanitizeGrievanceSubmission,
  getMaskedGrievanceAuthor,
  transitionGrievanceStatus,
  type AnonymousGrievanceRecord,
} from './grievanceEngine';

function baseRecord(
  overrides: Partial<AnonymousGrievanceRecord> = {}
): AnonymousGrievanceRecord {
  return {
    id: 'g-test',
    ticket_code: 'G-0099',
    category: 'GENERAL_GRIEVANCE',
    subject_title: '테스트 건의',
    incident_content: '도메인 테스트용 본문입니다.',
    evidence_attached: false,
    status: 'SUBMITTED',
    submitted_at: '2026-01-01T00:00:00.000Z',
    visibility: 'anonymous',
    author_user_id: null,
    ...overrides,
  };
}

/** core.inquire_anonymous_grievance 가 반환하는 grievance JSON에 author_user_id 없음 */
function assertInquirePayloadNonIdentifying(grievance: Record<string, unknown>) {
  assert.equal('author_user_id' in grievance, false);
  assert.equal('access_pin_hash' in grievance, false);
}

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

  const namedKept = sanitizeGrievanceSubmission({
    visibility: 'named',
    author_user_id: 'u-named',
  });
  assert.equal(namedKept.author_user_id, 'u-named', '기명 제보 시 author 유지');

  const masked = getMaskedGrievanceAuthor({ visibility: 'anonymous', author_user_id: null });
  assert.match(masked, /익명 제보자/, '감사 로그 마스킹 확인');
  const maskedNamed = getMaskedGrievanceAuthor({ visibility: 'named', author_user_id: 'user-uuid-abc' });
  assert.match(maskedNamed, /임직원/, '기명 제보자 마스킹');

  assert.equal(
    canViewGrievanceContent({
      record: { author_user_id: null, visibility: 'anonymous' },
      viewerUserId: 'u1',
      canManageAll: false,
    }),
    false,
    '익명은 목록 RLS 외 일반 뷰어 열람 불가'
  );

  assert.equal(
    canAuthorMutateGrievance({
      record: { author_user_id: 'u1', visibility: 'named', status: 'SUBMITTED' },
      viewerUserId: 'u1',
    }),
    true
  );
  assert.equal(
    canAuthorMutateGrievance({
      record: { author_user_id: 'u1', visibility: 'named', status: 'RESOLVED' },
      viewerUserId: 'u1',
    }),
    false
  );
  assert.equal(
    canAuthorMutateGrievance({
      record: { author_user_id: 'u1', visibility: 'named', status: 'SUBMITTED' },
      viewerUserId: 'u2',
    }),
    false
  );
  assert.equal(
    canAuthorMutateGrievance({
      record: { author_user_id: null, visibility: 'anonymous', status: 'SUBMITTED' },
      viewerUserId: 'u1',
    }),
    false
  );

  // --- 수명주기: 접수 → 조사 → 종결 / 기각 ---
  let record = baseRecord();
  assert.equal(transitionGrievanceStatus(record, 'RESOLVED', '완료').ok, false);

  const investigating = transitionGrievanceStatus(record, 'UNDER_INVESTIGATION');
  assert.equal(investigating.ok, true);
  record = investigating.ok ? investigating.record : record;
  assert.equal(record.status, 'UNDER_INVESTIGATION');

  const resolved = transitionGrievanceStatus(record, 'RESOLVED', '조치 완료 회신');
  assert.equal(resolved.ok, true);
  assert.equal(resolved.ok && resolved.record.status, 'RESOLVED');
  assert.ok(resolved.ok && resolved.record.resolved_at);
  assert.equal(
    transitionGrievanceStatus(resolved.ok ? resolved.record : record, 'DISMISSED', '불가').ok,
    false,
    '종결 후 추가 전이 불가'
  );

  let dismissedSeed = baseRecord();
  const dismissed = transitionGrievanceStatus(dismissedSeed, 'DISMISSED', '사실관계 불명확');
  assert.equal(dismissed.ok, true);
  assert.equal(dismissed.ok && dismissed.record.status, 'DISMISSED');
  assert.equal(transitionGrievanceStatus(dismissedSeed, 'DISMISSED', '   ').ok, false);

  assertInquirePayloadNonIdentifying({
    id: 'g1',
    ticket_code: 'G-0001',
    visibility: 'anonymous',
    category: 'GENERAL_GRIEVANCE',
    subject_title: 't',
    incident_content: 'c',
    status: 'UNDER_INVESTIGATION',
    investigation_feedback: null,
    submitted_at: '2026-01-01T00:00:00.000Z',
    resolved_at: null,
  });

  console.log('grievanceEngine.test.ts: all tests passed including blind tokenization.');
}

void run();
