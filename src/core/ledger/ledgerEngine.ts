/**
 * 불변 복식부기 원장 엔진 (Append-Only Immutable Ledger).
 *
 * 포인트, 예치금, 외상매출금, 선수금 등의 금액 변동을 UPDATE 대신
 * 차변(DEBIT) / 대변(CREDIT) 전표로만 누적(Append-Only)하여
 * 금융권 수준의 잔액 무결성과 완전한 거래 역추적성을 보장합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

export type AccountType =
  | 'point'
  | 'deposit'
  | 'receivable'
  | 'deferred_revenue'
  | 'general';

export type EntryType = 'DEBIT' | 'CREDIT';

export interface LedgerEntry {
  id?: string;
  organizationId: string;
  accountType: AccountType;
  referenceEntityType: string; // 'customer', 'vendor', 'order', 'invoice'
  referenceEntityId: string;
  entryType: EntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

/**
 * 계정 유형별 잔액 계산 성격
 * - ASSET (자산: receivable, general): DEBIT 증가, CREDIT 감소
 * - LIABILITY (부채/선수금: deposit, deferred_revenue, point): CREDIT 증가, DEBIT 감소
 */
export function isCreditNormalAccount(accountType: AccountType): boolean {
  return accountType === 'deposit' || accountType === 'deferred_revenue' || accountType === 'point';
}

/**
 * 전표 목록으로부터 순 잔액(Net Balance) 계산
 */
export function calculateNetBalance(
  entries: readonly LedgerEntry[],
  accountType: AccountType
): number {
  const isCreditNormal = isCreditNormalAccount(accountType);

  return entries.reduce((acc, entry) => {
    if (isCreditNormal) {
      // 대변(CREDIT) 시 증가, 차변(DEBIT) 시 감소
      return entry.entryType === 'CREDIT' ? acc + entry.amount : acc - entry.amount;
    } else {
      // 차변(DEBIT) 시 증가, 대변(CREDIT) 시 감소
      return entry.entryType === 'DEBIT' ? acc + entry.amount : acc - entry.amount;
    }
  }, 0);
}

/**
 * 신규 원장 전표 생성 (잔액 자동 산출)
 */
export function createLedgerEntry(
  currentBalance: number,
  params: {
    organizationId: string;
    accountType: AccountType;
    referenceEntityType: string;
    referenceEntityId: string;
    entryType: EntryType;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
  }
): { entry: LedgerEntry; newBalance: number } {
  if (params.amount <= 0) {
    throw new Error('전표 금액은 0보다 커야 합니다.');
  }

  const isCreditNormal = isCreditNormalAccount(params.accountType);
  let newBalance = currentBalance;

  if (isCreditNormal) {
    newBalance = params.entryType === 'CREDIT' ? currentBalance + params.amount : currentBalance - params.amount;
  } else {
    newBalance = params.entryType === 'DEBIT' ? currentBalance + params.amount : currentBalance - params.amount;
  }

  const entry: LedgerEntry = {
    organizationId: params.organizationId,
    accountType: params.accountType,
    referenceEntityType: params.referenceEntityType,
    referenceEntityId: params.referenceEntityId,
    entryType: params.entryType,
    amount: params.amount,
    balanceAfter: newBalance,
    description: params.description,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString(),
  };

  return { entry, newBalance };
}

/**
 * 결제 취소 / 환불 시 기존 전표를 삭제하지 않고 '역분개(Reversal Entry)' 전표 생성
 */
export function createReversalEntry(
  originalEntry: LedgerEntry,
  currentBalance: number,
  reason: string
): { reversalEntry: LedgerEntry; newBalance: number } {
  // 원래 전표의 반대 entryType 적용 (DEBIT <-> CREDIT)
  const oppositeType: EntryType = originalEntry.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT';

  const { entry, newBalance } = createLedgerEntry(currentBalance, {
    organizationId: originalEntry.organizationId,
    accountType: originalEntry.accountType,
    referenceEntityType: originalEntry.referenceEntityType,
    referenceEntityId: originalEntry.referenceEntityId,
    entryType: oppositeType,
    amount: originalEntry.amount,
    description: `[역분개 취소] ${originalEntry.description} (사유: ${reason})`,
    metadata: {
      ...(originalEntry.metadata || {}),
      reversal_of_entry_id: originalEntry.id,
      reversal_reason: reason,
    },
  });

  return { reversalEntry: entry, newBalance };
}
