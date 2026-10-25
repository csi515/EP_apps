import assert from 'node:assert/strict';
import {
  getRecentItems,
  recordRecentItem,
  clearRecentItems,
} from './coreRecentStore';

// Mock localStorage for Node/tsx runtime
const store: Record<string, string> = {};
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

function run() {
  clearRecentItems();
  assert.deepEqual(getRecentItems(), [], '기본적으로 빈 배열 반환');

  recordRecentItem({
    id: 'item-1',
    title: '김철수 고객',
    subtitle: '010-1234-5678',
    route: '/roster/item-1',
    category: 'customer',
  });

  recordRecentItem({
    id: 'item-2',
    title: '골프 1개월권',
    subtitle: '200,000원',
    route: '/passes/item-2',
    category: 'pass',
  });

  let items = getRecentItems();
  assert.equal(items.length, 2, '2개 항목 기록');
  assert.equal(items[0].id, 'item-2', '최신 항목이 맨 앞');
  assert.equal(items[1].id, 'item-1');

  // 동일 route 갱신
  recordRecentItem({
    id: 'item-1',
    title: '김철수 고객 (수정)',
    subtitle: '010-9999-8888',
    route: '/roster/item-1',
    category: 'customer',
  });

  items = getRecentItems();
  assert.equal(items.length, 2, '중복 route 제거 후 2개 유지');
  assert.equal(items[0].title, '김철수 고객 (수정)', '최신 항목으로 이동');

  clearRecentItems();
  assert.equal(getRecentItems().length, 0, '전체 삭제 확인');

  console.log('coreRecentStore.test.ts: ok');
}

run();
