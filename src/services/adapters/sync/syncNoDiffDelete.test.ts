/**
 * 회귀: stale 캐시 persist가 다른 기기의 원격 row를 diff-delete 하지 않는다.
 * 명시적(사용자) 삭제 tombstone만 원격에 반영된다.
 * 실행: npm run test:sync-no-diff-delete
 */
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from '../storageKeys';
import { setOrganizationId } from '../storageContext';
import { confirmServerCommit, markPendingFromSnapshot, maxPendingRevision } from '../pendingMutations';
import { syncTable, type CoreClient } from './corePersistSyncTable';

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}

type Row = { id: string; organization_id: string; [k: string]: unknown };

/** 최소 supabase 유사 클라이언트 — upsert / delete().eq().in() 만 지원 */
function createFakeRemote(initial: Row[]) {
  const rows = new Map(initial.map((r) => [r.id, r]));
  const client = {
    from: () => ({
      upsert: async (row: Row) => {
        rows.set(row.id, row);
        return { error: null };
      },
      select: () => ({
        eq: async (_col: string, org: string) => ({
          data: [...rows.values()].filter((r) => r.organization_id === org).map((r) => ({ id: r.id })),
          error: null,
        }),
      }),
      delete: () => {
        const filters: { org?: string } = {};
        const builder = {
          eq: (_col: string, org: string) => {
            filters.org = org;
            return builder;
          },
          in: async (_col: string, ids: string[]) => {
            for (const id of ids) {
              const row = rows.get(id);
              if (row && (!filters.org || row.organization_id === filters.org)) rows.delete(id);
            }
            return { error: null };
          },
        };
        return builder;
      },
    }),
  };
  return { client: client as unknown as CoreClient, rows };
}

async function persistCustomersFromDeviceA(
  client: CoreClient,
  orgId: string,
  localStudents: { id: string; name: string }[]
): Promise<boolean> {
  return syncTable(
    client,
    'customers',
    orgId,
    localStudents.map((s) => s.id),
    async () => {
      for (const s of localStudents) {
        await client.from('customers').upsert({ id: s.id, organization_id: orgId, name: s.name } as never);
      }
      return true;
    },
    {
      cachePresent: true,
      context: 'customers',
      tombstoneKeys: [STORAGE_KEYS.STUDENTS, STORAGE_KEYS.PARENTS],
    }
  );
}

async function run() {
  installMemoryLocalStorage();
  const orgId = 'org-1';
  setOrganizationId(orgId);

  // 원격: 공유 학생 s1 + 기기 B가 방금 만든 s2
  const { client, rows } = createFakeRemote([
    { id: 's1', organization_id: orgId, name: '학생1' },
    { id: 's2', organization_id: orgId, name: '기기B 신규' },
    { id: 'x9', organization_id: 'org-other', name: '타 조직' },
  ]);

  // 기기 A: s2 가 없는 stale 캐시에서 s1만 수정
  const staleCache = [{ id: 's1', name: '학생1' }];
  const edited = [{ id: 's1', name: '학생1 (수정)' }];
  markPendingFromSnapshot(STORAGE_KEYS.STUDENTS, staleCache, edited);

  assert.equal(await persistCustomersFromDeviceA(client, orgId, edited), true);
  confirmServerCommit(STORAGE_KEYS.STUDENTS, maxPendingRevision(STORAGE_KEYS.STUDENTS));
  assert.ok(rows.has('s2'), '기기 B의 신규 원격 row는 stale 캐시 sync 후에도 살아남아야 한다');
  assert.equal(rows.get('s1')?.name, '학생1 (수정)');

  // 기기 A: 사용자가 s1을 명시적으로 삭제 → 원격 반영
  markPendingFromSnapshot(STORAGE_KEYS.STUDENTS, edited, []);
  assert.equal(await persistCustomersFromDeviceA(client, orgId, []), true);
  assert.equal(rows.has('s1'), false, '명시적 삭제는 원격에 전파되어야 한다');
  assert.ok(rows.has('s2'), '삭제는 tombstone 대상만 — s2 유지');
  assert.ok(rows.has('x9'), '타 조직 row 불변');

  console.log('syncNoDiffDelete.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
