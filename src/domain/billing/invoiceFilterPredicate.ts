/**
 * Invoice Filter Predicate — 순수 함수 기반 청구서 필터링 엔진
 * 
 * [가드레일 준수]:
 * 1. 레거시 저장소(StorageService) 미호출 — 순수 인메모리 데이터 필터링.
 * 2. 신규 경계 준수 — @/core/customer, @/industries/* 절대 미참조.
 * 3. 엄격한 타입 정의 — any 타입 캐스팅 0건. Supabase / 도메인 모델 기반.
 * 4. 시간 독립성(Pure Determinism) — 기준 시각 now 주입을 통해 overdue 테스트 격리.
 */
import type { Database } from '@/lib/supabase/database.types';

export type PaymentRow = Database['core']['Tables']['payments']['Row'];

/**
 * 필터 판정 대상 아이템 인터페이스.
 * Supabase DB row 및 클라이언트 도메인 모델(TuitionInvoice)을 모두 수용 가능한 엄격한 타입.
 */
export interface InvoiceFilterItem {
  id: string;
  yearMonth: string;
  status?: string | null;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount?: number | null;
  studentName?: string | null;
  customerName?: string | null;
  dueDate?: string | null;
}

export type InvoiceStatusFilter =
  | 'ALL'
  | 'all'
  | 'unpaid'
  | 'paid'
  | 'overdue'
  | 'pending'
  | 'cancelled'
  | string;

export interface InvoiceFilterOptions {
  selectedMonth?: string | null;
  statusFilter?: InvoiceStatusFilter | null;
  searchQuery?: string | null;
}

/**
 * 미수금/미납 잔액이 남아있는지 평가하는 도메인 표준 판정 함수
 * 조건: (unpaid_amount > 0 OR status IN ('unpaid', 'partial', 'overdue'))
 */
export function hasOutstandingBalance(
  invoice: Pick<InvoiceFilterItem, 'totalAmount' | 'paidAmount' | 'unpaidAmount' | 'status'>
): boolean {
  const unpaid = invoice.unpaidAmount ?? Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const status = (invoice.status ?? '').toLowerCase().trim();
  return unpaid > 0 || status === 'unpaid' || status === 'partial' || status === 'overdue';
}

/**
 * 단일 청구서가 주어진 필터 조건에 부합하는지 평가하는 순수 판정 함수.
 * 
 * @param invoice 판정 대상 청구서
 * @param options 필터 옵션 (월, 상태, 검색어)
 * @param now 기준 시각 (overdue 판정용, 테스트 격리성을 위해 외부 주입 가능)
 */
export function matchesInvoiceFilter(
  invoice: InvoiceFilterItem,
  options: InvoiceFilterOptions = {},
  now: Date | string = new Date()
): boolean {
  // 1. 연월 필터
  if (options.selectedMonth && options.selectedMonth !== 'ALL' && options.selectedMonth !== 'all') {
    if (invoice.yearMonth !== options.selectedMonth) {
      return false;
    }
  }

  // 2. 검색어 필터 (학생/고객명)
  if (options.searchQuery?.trim()) {
    const q = options.searchQuery.trim().toLowerCase();
    const candidateName = (invoice.studentName ?? invoice.customerName ?? '').toLowerCase();
    if (!candidateName.includes(q)) {
      return false;
    }
  }

  // 3. 상태 필터
  const statusFilter = options.statusFilter ?? 'ALL';
  const normalizedFilter = statusFilter.trim().toLowerCase();

  if (normalizedFilter === 'all' || normalizedFilter === '') {
    return true;
  }

  const unpaid = invoice.unpaidAmount ?? Math.max(0, invoice.totalAmount - invoice.paidAmount);

  if (normalizedFilter === 'unpaid') {
    return hasOutstandingBalance(invoice);
  }

  if (normalizedFilter === 'paid') {
    return unpaid === 0 || invoice.status?.toLowerCase() === 'paid';
  }

  if (normalizedFilter === 'overdue') {
    if (unpaid <= 0) return false;
    if (!invoice.dueDate) return false;

    const baseDate = typeof now === 'string' ? new Date(now) : now;
    const dueDate = new Date(invoice.dueDate);

    // 날짜 유효성 확인
    if (Number.isNaN(baseDate.getTime()) || Number.isNaN(dueDate.getTime())) {
      return false;
    }

    return baseDate.getTime() > dueDate.getTime();
  }

  // 기타 명시적 상태값 (pending, cancelled 등)
  return invoice.status?.toLowerCase() === normalizedFilter;
}

/**
 * 청구서 목록을 필터 조건에 맞게 추출하는 순수 고차 함수.
 */
export function filterInvoices<T extends InvoiceFilterItem>(
  invoices: readonly T[],
  options: InvoiceFilterOptions = {},
  now: Date | string = new Date()
): T[] {
  return invoices.filter((item) => matchesInvoiceFilter(item, options, now));
}
