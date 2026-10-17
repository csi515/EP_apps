/**
 * Network Status & Offline Observer Unit Tests
 * 
 * 실행: npx tsx src/shared/pwa/networkStatus.test.ts
 */

import assert from 'node:assert/strict';
import {
  getNetworkStatus,
  handleNetworkStateChange,
  subscribeNetworkStatus,
  clearNetworkListeners,
} from './networkStatus';

function runNetworkStatusTests() {
  console.log('Running networkStatus unit tests...');

  clearNetworkListeners();

  // 1. 초기 상태 확인
  const initial = getNetworkStatus();
  assert.equal(typeof initial.isOnline, 'boolean');
  assert.ok(initial.lastChangedAt > 0);

  // 2. 이벤트 발행 및 콜백 전달 검증
  const events: boolean[] = [];
  const unsubscribe = subscribeNetworkStatus((isOnline) => {
    events.push(isOnline);
  });

  handleNetworkStateChange(false);
  assert.equal(getNetworkStatus().isOnline, false);
  assert.deepEqual(events, [false]);

  handleNetworkStateChange(true);
  assert.equal(getNetworkStatus().isOnline, true);
  assert.deepEqual(events, [false, true]);

  // 3. 리스너 구독 해제
  unsubscribe();
  handleNetworkStateChange(false);
  assert.equal(events.length, 2, '구독 해제 후에는 이벤트가 전달되지 않아야 함');

  // 정리
  handleNetworkStateChange(true);
  clearNetworkListeners();

  console.log('networkStatus.test.ts: ok (all network observer tests passed)');
}

runNetworkStatusTests();
