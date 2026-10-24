import assert from 'node:assert/strict';
import {
  parseResourceLockError,
  getResourceLockErrorMessage,
} from './resourceLockErrors';

// 1. CAPACITY_EXCEEDED 매핑 검증
{
  const res1 = parseResourceLockError(new Error('CAPACITY_EXCEEDED: 정원(10명)이 모두 마감되었습니다.'));
  assert.equal(res1.code, 'CAPACITY_EXCEEDED');
  assert.equal(res1.message, '정원이 마감되어 예약할 수 없습니다. (동시 신청 정원 초과)');

  const res2 = parseResourceLockError('SCHEDULE_CAPACITY_EXCEEDED: 정원이 초과되었습니다.');
  assert.equal(res2.code, 'CAPACITY_EXCEEDED');
}

// 2. PASS_NOT_USABLE 매핑 검증
{
  const res1 = parseResourceLockError(new Error('PASS_NOT_USABLE: 잔여 횟수가 부족합니다. (현재 0회, 요청 1회)'));
  assert.equal(res1.code, 'PASS_NOT_USABLE');
  assert.equal(res1.message, '잔여 횟수가 부족하거나 사용할 수 없는 이용권입니다.');

  const res2 = parseResourceLockError(new Error('PASS_NOT_USABLE: 유효기간이 만료된 이용권입니다.'));
  assert.equal(res2.code, 'PASS_NOT_USABLE');

  const res3 = parseResourceLockError('No remaining pass count');
  assert.equal(res3.code, 'PASS_NOT_USABLE');
}

// 3. INSUFFICIENT_STOCK 매핑 검증
{
  const res1 = parseResourceLockError(new Error('INSUFFICIENT_STOCK: 재고가 부족합니다. (현재: 0, 요청: 1)'));
  assert.equal(res1.code, 'INSUFFICIENT_STOCK');
  assert.equal(res1.message, '재고가 부족합니다.');

  const msg = getResourceLockErrorMessage(new Error('재고가 부족합니다. (현재 2)'));
  assert.equal(msg, '재고가 부족합니다.');
}

// 4. ALREADY_BOOKED 매핑 검증
{
  const res = parseResourceLockError('ALREADY_BOOKED: 해당 고객은 이미 이 일정에 예약되어 있습니다.');
  assert.equal(res.code, 'ALREADY_BOOKED');
  assert.equal(res.message, '이미 해당 일정에 예약 내역이 존재합니다.');
}

// 5. PERMISSION / AUTH 매핑 검증
{
  const resAuth = parseResourceLockError('Not authenticated');
  assert.equal(resAuth.code, 'NOT_AUTHENTICATED');
  assert.equal(resAuth.message, '로그인이 필요합니다.');

  const resPerm = parseResourceLockError('Permission denied');
  assert.equal(resPerm.code, 'PERMISSION_DENIED');
  assert.equal(resPerm.message, '해당 작업을 수행할 권한이 없습니다.');
}

console.log('resourceLockErrors.test.ts: ok (all error codes mapped cleanly)');
