/**
 * Invoice Filter Predicate — 단위 및 불변식 테스트
 * 실행: npx tsx src/domain/billing/invoiceFilterPredicate.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  matchesInvoiceFilter,
  filterInvoices,
  hasOutstandingBalance,
  type InvoiceFilterItem,
} from './invoiceFilterPredicate';

const sampleInvoices: InvoiceFilterItem[] = [
  {
    id: 'inv-1',
    yearMonth: '2026-10',
    status: 'pending',
    totalAmount: 150000,
    paidAmount: 0,
    unpaidAmount: 150000,
    studentName: '김민수',
    customerName: '김민수',
    dueDate: '2026-10-15T23:59:59Z',
  },
  {
    id: 'inv-2',
    yearMonth: '2026-10',
    status: 'paid',
    totalAmount: 200000,
    paidAmount: 200000,
    unpaidAmount: 0,
    studentName: '이서연',
    customerName: '이서연',
    dueDate: '2026-10-10T23:59:59Z',
  },
  {
    id: 'inv-3',
    yearMonth: '2026-09',
    status: 'overdue',
    totalAmount: 100000,
    paidAmount: 0,
    unpaidAmount: 100000,
    studentName: '박도윤',
    customerName: '박도윤',
    dueDate: '2026-09-25T23:59:59Z',
  },
  {
    id: 'inv-4',
    yearMonth: '2026-10',
    status: 'partial',
    totalAmount: 300000,
    paidAmount: 100000,
    unpaidAmount: 200000,
    studentName: '최하은',
    customerName: '최하은',
    dueDate: '2026-10-28T23:59:59Z',
  },
];

function runTests() {
  console.log('Running invoiceFilterPredicate tests...');

  // 1. 연월(yearMonth) 필터
  const octInvoices = filterInvoices(sampleInvoices, { selectedMonth: '2026-10' });
  assert.equal(octInvoices.length, 3, '2026-10 청구서 3건');
  assert.deepEqual(octInvoices.map((i) => i.id), ['inv-1', 'inv-2', 'inv-4']);

  const sepInvoices = filterInvoices(sampleInvoices, { selectedMonth: '2026-09' });
  assert.equal(sepInvoices.length, 1, '2026-09 청구서 1건');
  assert.equal(sepInvoices[0]?.id, 'inv-3');

  // 2. 전체('ALL' / 'all') 필터
  assert.equal(filterInvoices(sampleInvoices, { statusFilter: 'ALL' }).length, 4);
  assert.equal(filterInvoices(sampleInvoices, { statusFilter: 'all' }).length, 4);
  assert.equal(filterInvoices(sampleInvoices, {}).length, 4);

  // 3. 미납('unpaid') 필터
  const unpaidInvoices = filterInvoices(sampleInvoices, { statusFilter: 'unpaid' });
  assert.equal(unpaidInvoices.length, 3, '미납 청구서 3건 (inv-1, inv-3, inv-4)');
  assert.deepEqual(unpaidInvoices.map((i) => i.id), ['inv-1', 'inv-3', 'inv-4']);

  // 4. 완납('paid') 필터
  const paidInvoices = filterInvoices(sampleInvoices, { statusFilter: 'paid' });
  assert.equal(paidInvoices.length, 1, '완납 청구서 1건 (inv-2)');
  assert.equal(paidInvoices[0]?.id, 'inv-2');

  // 5. 연체('overdue') 필터 — 시간 독립성(Pure Determinism) 주입 검증
  // 기준 시점 A: 2026-10-01 (inv-1 기한 전, inv-3 기한 지남)
  const dateBeforeDue = '2026-10-01T00:00:00Z';
  assert.equal(
    matchesInvoiceFilter(sampleInvoices[0]!, { statusFilter: 'overdue' }, dateBeforeDue),
    false,
    '2026-10-01 시점에 inv-1(기한: 10-15)은 연체가 아님'
  );
  assert.equal(
    matchesInvoiceFilter(sampleInvoices[2]!, { statusFilter: 'overdue' }, dateBeforeDue),
    true,
    '2026-10-01 시점에 inv-3(기한: 09-25)은 연체'
  );

  // 기준 시점 B: 2026-10-20 (inv-1 기한 지남, inv-4 기한 전)
  const dateAfterDue = '2026-10-20T00:00:00Z';
  assert.equal(
    matchesInvoiceFilter(sampleInvoices[0]!, { statusFilter: 'overdue' }, dateAfterDue),
    true,
    '2026-10-20 시점에 inv-1(기한: 10-15)은 연체'
  );
  assert.equal(
    matchesInvoiceFilter(sampleInvoices[1]!, { statusFilter: 'overdue' }, dateAfterDue),
    false,
    'inv-2는 dueDate가 지났어도 unpaidAmount=0 완납이므로 연체 아님'
  );

  // 6. 검색어 필터
  const searchMin = filterInvoices(sampleInvoices, { searchQuery: '민수' });
  assert.equal(searchMin.length, 1);
  assert.equal(searchMin[0]?.id, 'inv-1');

  const searchCase = filterInvoices(
    [
      {
        id: 'inv-en',
        yearMonth: '2026-10',
        totalAmount: 1000,
        paidAmount: 1000,
        studentName: 'Alice Johnson',
      },
    ],
    { searchQuery: 'ALICE' }
  );
  assert.equal(searchCase.length, 1, '대소문자 무시 검색 성공');

  // 7. 복합 조건 (연월 + 미납 + 검색어)
  const composite = filterInvoices(sampleInvoices, {
    selectedMonth: '2026-10',
    statusFilter: 'unpaid',
    searchQuery: '하은',
  });
  assert.equal(composite.length, 1);
  assert.equal(composite[0]?.id, 'inv-4');

  // 8. hasOutstandingBalance 서버/도메인 표준 조건 단언 검증
  assert.equal(hasOutstandingBalance({ totalAmount: 100000, paidAmount: 0, status: 'unpaid' }), true);
  assert.equal(hasOutstandingBalance({ totalAmount: 100000, paidAmount: 50000, status: 'partial' }), true);
  assert.equal(hasOutstandingBalance({ totalAmount: 100000, paidAmount: 0, status: 'overdue' }), true);
  assert.equal(hasOutstandingBalance({ totalAmount: 100000, paidAmount: 80000, unpaidAmount: 20000, status: 'none' }), true);
  assert.equal(hasOutstandingBalance({ totalAmount: 100000, paidAmount: 100000, unpaidAmount: 0, status: 'paid' }), false);

  // 9. 가드레일 정적 검사: as any 미작성 확인
  const fileContent = readFileSync(
    join(process.cwd(), 'src/domain/billing/invoiceFilterPredicate.ts'),
    'utf8'
  );
  assert.equal(
    /\bas\s+any\b/.test(fileContent),
    false,
    'invoiceFilterPredicate.ts must not contain "as any"'
  );
  assert.equal(
    /:\s*any\b/.test(fileContent),
    false,
    'invoiceFilterPredicate.ts must not contain ": any"'
  );
  assert.equal(
    /from\s+['"]@\/core\/customer/.test(fileContent),
    false,
    'invoiceFilterPredicate.ts must not import from @/core/customer'
  );
  assert.equal(
    /from\s+['"]@\/industries/.test(fileContent),
    false,
    'invoiceFilterPredicate.ts must not import from @/industries'
  );

  console.log('All invoiceFilterPredicate tests passed successfully!');
}

runTests();
