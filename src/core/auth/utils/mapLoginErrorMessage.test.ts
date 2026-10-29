import assert from 'node:assert/strict';
import { mapLoginErrorMessage } from './mapLoginErrorMessage';

async function runTests() {
  assert.match(
    mapLoginErrorMessage('Invalid login credentials'),
    /이메일 또는 비밀번호가 올바르지 않습니다/
  );
  assert.match(mapLoginErrorMessage('User not found'), /등록되지 않은 계정/);
  assert.match(mapLoginErrorMessage('Too many requests'), /너무 많습니다/);
  assert.equal(mapLoginErrorMessage('네트워크 오류'), '네트워크 오류');
  assert.match(mapLoginErrorMessage(null), /관리자에게 계정 발급/);
  console.log('mapLoginErrorMessage tests passed');
}

void runTests();
