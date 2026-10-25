import assert from 'node:assert/strict';
import {
  formatPhoneNumber,
  formatBizNo,
  formatBirthdate,
  formatCurrency,
} from './SmartInput';

function run() {
  // 전화번호 포맷터
  assert.equal(formatPhoneNumber('01012345678'), '010-1234-5678');
  assert.equal(formatPhoneNumber('0101234567'), '010-123-4567');
  assert.equal(formatPhoneNumber('0212345678'), '02-1234-5678');
  assert.equal(formatPhoneNumber('021234567'), '02-123-4567');
  assert.equal(formatPhoneNumber('010-abc-1234-5678'), '010-1234-5678');

  // 사업자번호 포맷터
  assert.equal(formatBizNo('1234567890'), '123-45-67890');
  assert.equal(formatBizNo('12345'), '123-45');

  // 생년월일 포맷터
  assert.equal(formatBirthdate('19990101'), '1999-01-01');
  assert.equal(formatBirthdate('20241231'), '2024-12-31');

  // 금액 포맷터
  assert.equal(formatCurrency(1000000), '1,000,000');
  assert.equal(formatCurrency('50000'), '50,000');
  assert.equal(formatCurrency('0'), '0');
  assert.equal(formatCurrency('invalid'), '');

  console.log('SmartInput.test.ts: ok');
}

run();
