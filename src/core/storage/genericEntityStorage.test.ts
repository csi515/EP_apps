import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveGenericEntityRecord,
  listGenericEntityRecords,
  deleteGenericEntityRecord,
  type GenericEntityRecord,
} from './genericEntityStorage';

// 모의 브라우저 localStorage 환경 세팅
const mockStorage = new Map<string, string>();
(global as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage.get(key) || null,
    setItem: (key: string, val: string) => mockStorage.set(key, val),
    removeItem: (key: string) => mockStorage.delete(key),
  },
};

describe('Generic Entity Storage Engine (Step 4)', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('로컬 폴백 환경에서 제네릭 엔터티(recipe_bom) 레코드를 저장하고 조회할 수 있다', async () => {
    const orgId = 'org-test-123';
    const entityType = 'recipe_bom';

    const sampleBom: GenericEntityRecord<{ menuName: string; cost: number; ingredients: string[] }> = {
      organizationId: orgId,
      entityType,
      recordKey: 'MENU-001',
      payload: {
        menuName: '아메리카노',
        cost: 450,
        ingredients: ['원두 20g', '정제수 300ml'],
      },
    };

    const saved = await saveGenericEntityRecord(sampleBom);
    assert.ok(saved.id);
    assert.equal(saved.recordKey, 'MENU-001');
    assert.equal(saved.payload.menuName, '아메리카노');

    // 목록 조회
    const list = await listGenericEntityRecords<{ menuName: string }>(orgId, entityType);
    assert.equal(list.length, 1);
    assert.equal(list[0].payload.menuName, '아메리카노');

    // recordKey 필터 조회
    const filtered = await listGenericEntityRecords(orgId, entityType, { recordKey: 'MENU-001' });
    assert.equal(filtered.length, 1);

    const nonExistent = await listGenericEntityRecords(orgId, entityType, { recordKey: 'MENU-999' });
    assert.equal(nonExistent.length, 0);
  });

  it('모의 Supabase 클라이언트가 주어지면 DB 호출을 우선 수행한다', async () => {
    const orgId = 'org-db-456';
    const entityType = 'digital_contract';

    const dbTable: any[] = [];
    const mockSupabase = {
      from: (tableName: string) => ({
        upsert: (payload: any) => ({
          select: () => ({
            single: async () => {
              dbTable.push(payload);
              return { data: payload, error: null };
            },
          }),
        }),
        select: () => ({
          eq: (col: string, val: string) => ({
            eq: (col2: string, val2: string) => ({
              order: async () => ({
                data: dbTable.filter(
                  (r) => r.organization_id === val && r.entity_type === val2
                ),
                error: null,
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        }),
      }),
    };

    const contractRecord = {
      organizationId: orgId,
      entityType,
      recordKey: 'CONT-2026-01',
      payload: {
        customerName: '홍길동',
        totalAmount: 1500000,
        signedAt: '2026-10-18T00:00:00Z',
      },
    };

    const saved = await saveGenericEntityRecord(contractRecord, mockSupabase);
    assert.ok(saved.id);
    assert.equal(saved.recordKey, 'CONT-2026-01');

    // DB 테이블에 들어갔는지 검증
    assert.equal(dbTable.length, 1);
    assert.equal(dbTable[0].organization_id, orgId);
    assert.equal(dbTable[0].entity_type, entityType);
  });

  it('레코드를 삭제할 수 있다', async () => {
    const orgId = 'org-test-del';
    const entityType = 'treatment_chart';

    const item = await saveGenericEntityRecord({
      organizationId: orgId,
      entityType,
      recordKey: 'CHART-01',
      payload: { notes: '초진 상담' },
    });

    let list = await listGenericEntityRecords(orgId, entityType);
    assert.equal(list.length, 1);

    await deleteGenericEntityRecord(orgId, entityType, item.id!);

    list = await listGenericEntityRecords(orgId, entityType);
    assert.equal(list.length, 0);
  });
});
