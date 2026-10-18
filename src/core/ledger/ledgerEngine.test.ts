import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLedgerEntry,
  createReversalEntry,
  calculateNetBalance,
  type LedgerEntry,
} from './ledgerEngine';

describe('Append-Only Immutable Ledger Engine (Phase 2)', () => {
  it('포인트(부채성/CreditNormal) 충전 및 사용에 따른 잔액 변화를 계산한다', () => {
    let balance = 0;
    const entries: LedgerEntry[] = [];

    // 1. 10,000 포인트 충전 (CREDIT)
    const step1 = createLedgerEntry(balance, {
      organizationId: 'org-1',
      accountType: 'point',
      referenceEntityType: 'customer',
      referenceEntityId: 'cust-1',
      entryType: 'CREDIT',
      amount: 10000,
      description: '회원가입 기념 포인트 적립',
    });
    balance = step1.newBalance;
    entries.push(step1.entry);

    assert.equal(balance, 10000);
    assert.equal(step1.entry.balanceAfter, 10000);

    // 2. 3,000 포인트 사용 (DEBIT)
    const step2 = createLedgerEntry(balance, {
      organizationId: 'org-1',
      accountType: 'point',
      referenceEntityType: 'customer',
      referenceEntityId: 'cust-1',
      entryType: 'DEBIT',
      amount: 3000,
      description: '교재 구매 시 포인트 결제 차감',
    });
    balance = step2.newBalance;
    entries.push(step2.entry);

    assert.equal(balance, 7000);
    assert.equal(step2.entry.balanceAfter, 7000);

    // 3. 전표 전체 합산 검증
    const verifiedBalance = calculateNetBalance(entries, 'point');
    assert.equal(verifiedBalance, 7000);
  });

  it('환불/취소 발생 시 기존 전표 삭제 없이 역분개(Reversal Entry)를 발행하여 원복한다', () => {
    // 3,000원 결제 차감 전표
    const originalEntry: LedgerEntry = {
      id: 'entry-uuid-1',
      organizationId: 'org-1',
      accountType: 'point',
      referenceEntityType: 'customer',
      referenceEntityId: 'cust-1',
      entryType: 'DEBIT',
      amount: 3000,
      balanceAfter: 7000,
      description: '교재 구매 시 포인트 결제 차감',
    };

    const currentBalance = 7000;
    const { reversalEntry, newBalance } = createReversalEntry(
      originalEntry,
      currentBalance,
      '고객 주문 단순 변심 취소'
    );

    assert.equal(reversalEntry.entryType, 'CREDIT'); // DEBIT의 반대
    assert.equal(reversalEntry.amount, 3000);
    assert.equal(newBalance, 10000); // 7000 + 3000 = 10000 원복
    assert.ok(reversalEntry.description.includes('[역분개 취소]'));
    assert.equal(reversalEntry.metadata?.reversal_of_entry_id, 'entry-uuid-1');
  });

  it('외상매출금(자산성/DebitNormal) 발생 및 수납을 올바르게 처리한다', () => {
    let balance = 0;

    // 1. 외상매출금 50,000원 발생 (DEBIT)
    const step1 = createLedgerEntry(balance, {
      organizationId: 'org-1',
      accountType: 'receivable',
      referenceEntityType: 'invoice',
      referenceEntityId: 'inv-101',
      entryType: 'DEBIT',
      amount: 50000,
      description: '10월 정기 레슨 청구',
    });
    balance = step1.newBalance;
    assert.equal(balance, 50000);

    // 2. 고객 입금으로 외상매출금 50,000원 해소 (CREDIT)
    const step2 = createLedgerEntry(balance, {
      organizationId: 'org-1',
      accountType: 'receivable',
      referenceEntityType: 'invoice',
      referenceEntityId: 'inv-101',
      entryType: 'CREDIT',
      amount: 50000,
      description: '계좌 입금 확인 완료',
    });
    balance = step2.newBalance;
    assert.equal(balance, 0); // 미수금 0원 완료
  });
});
