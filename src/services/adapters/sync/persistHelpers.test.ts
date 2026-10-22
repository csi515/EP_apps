/**
 * sync persistHelpers — 부분 upsert 실패 전파 unit test
 * 실행: npm run test:sync-persist-helpers
 */
import assert from 'node:assert/strict';
import {
  runRowUpserts,
  upsertThenDiffDelete,
  upsertThenDiffDeleteByKeys,
} from './persistHelpers';

async function run() {
  // runRowUpserts: 전부 성공 → true
  {
    const ok = await runRowUpserts(
      [1, 2, 3],
      () => false,
      async () => ({ error: null }),
      () => {
        throw new Error('should not log');
      }
    );
    assert.equal(ok, true);
  }

  // runRowUpserts: 중간 실패해도 나머지 계속, 결과는 false
  {
    const seen: number[] = [];
    const ok = await runRowUpserts(
      [1, 2, 3],
      () => false,
      async (n) => {
        seen.push(n);
        return { error: n === 2 ? new Error('row 2 failed') : null };
      },
      () => undefined
    );
    assert.equal(ok, false);
    assert.deepEqual(seen, [1, 2, 3], '실패 후에도 나머지 row 계속');
  }

  // upsertThenDiffDelete: upsert 실패 시 delete 호출 없이 false
  {
    let deleteCalled = false;
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: ['a', 'b'],
      tombstoneIds: ['c'],
      upsertAll: async () => false,
      deleteIds: async () => {
        deleteCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, false);
    assert.equal(deleteCalled, false);
  }

  // upsertThenDiffDelete: tombstone만 삭제 (재추가된 id 제외) → true
  {
    let deleted: string[] = [];
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: ['a', 'b'],
      tombstoneIds: ['c', 'b'],
      upsertAll: async () => true,
      deleteIds: async (ids) => {
        deleted = ids;
        return { error: null };
      },
    });
    assert.equal(ok, true);
    assert.deepEqual(deleted, ['c'], '로컬에 다시 존재하는 b는 삭제하지 않는다');
  }

  // upsertThenDiffDelete: tombstone 없으면 원격에만 있는 row도 삭제하지 않는다
  {
    let deleteCalled = false;
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: ['a'],
      tombstoneIds: [],
      upsertAll: async () => true,
      deleteIds: async () => {
        deleteCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, true);
    assert.equal(deleteCalled, false);
  }

  // upsertThenDiffDelete: delete 실패 → false (pending 유지)
  {
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: [],
      tombstoneIds: ['x'],
      upsertAll: async () => true,
      deleteIds: async () => ({ error: new Error('boom') }),
    });
    assert.equal(ok, false);
  }

  // stale snapshot: cache.has만으로는 삭제하지 않는다
  {
    let deleteCalled = false;
    const ok = await upsertThenDiffDelete({
      context: 'stale-schedules',
      cachePresent: true,
      snapshotComplete: false,
      currentIds: ['booking-a'],
      tombstoneIds: ['booking-b'],
      upsertAll: async () => true,
      deleteIds: async () => {
        deleteCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, true);
    assert.equal(deleteCalled, false, '원격 예약 B를 삭제하면 안 된다');
  }

  // upsertThenDiffDeleteByKeys: upsert 실패 → false, delete 생략
  {
    let deleteKeyCalled = false;
    const ok = await upsertThenDiffDeleteByKeys({
      context: 'test-keys',
      cachePresent: true,
      currentKeys: ['p:s'],
      isExplicitDelete: () => true,
      upsertAll: async () => false,
      fetchRemoteKeys: async () => {
        throw new Error('fetch should not run');
      },
      deleteKey: async () => {
        deleteKeyCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, false);
    assert.equal(deleteKeyCalled, false);
  }

  // upsertThenDiffDeleteByKeys: 원격에만 있는 key라도 명시적 삭제 대상만 지운다
  {
    const deleted: string[] = [];
    const ok = await upsertThenDiffDeleteByKeys({
      context: 'test-keys',
      cachePresent: true,
      currentKeys: ['p:s'],
      isExplicitDelete: (key) => key === 'p:gone',
      upsertAll: async () => true,
      fetchRemoteKeys: async () => ({ keys: ['p:s', 'p:gone', 'other-device:new'], error: null }),
      deleteKey: async (key) => {
        deleted.push(key);
        return { error: null };
      },
    });
    assert.equal(ok, true);
    assert.deepEqual(deleted, ['p:gone']);
  }

  console.log('persistHelpers.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
