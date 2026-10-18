import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStateMachine } from './finiteStateMachine';

describe('Declarative Finite State Machine Engine (Phase 3)', () => {
  type BookingState = 'REQUESTED' | 'CONFIRMED' | 'IN_USE' | 'COMPLETED' | 'CANCELLED';
  type BookingEvent = 'APPROVE' | 'START_USE' | 'COMPLETE' | 'CANCEL';

  interface BookingContext {
    isDepositPaid: boolean;
    cancelCutoffPassed: boolean;
  }

  const bookingFsm = createStateMachine<BookingState, BookingEvent, BookingContext>({
    domain: 'booking',
    initialState: 'REQUESTED',
    finalStates: ['COMPLETED', 'CANCELLED'],
    transitions: [
      {
        from: 'REQUESTED',
        to: 'CONFIRMED',
        event: 'APPROVE',
        allowedRoles: ['owner', 'admin', 'manager'],
        guard: (ctx) => ctx.isDepositPaid || '보증금이 입금되지 않아 승인할 수 없습니다.',
      },
      {
        from: 'CONFIRMED',
        to: 'IN_USE',
        event: 'START_USE',
        allowedRoles: ['owner', 'admin', 'staff', 'customer'],
      },
      {
        from: 'IN_USE',
        to: 'COMPLETED',
        event: 'COMPLETE',
        allowedRoles: ['owner', 'admin', 'staff'],
      },
      {
        from: 'REQUESTED',
        to: 'CANCELLED',
        event: 'CANCEL',
      },
      {
        from: 'CONFIRMED',
        to: 'CANCELLED',
        event: 'CANCEL',
        guard: (ctx) => !ctx.cancelCutoffPassed || '취소 가능 기한(이용 1시간 전)이 지나 취소할 수 없습니다.',
      },
    ],
  });

  it('올바른 역할과 가드 조건을 충족하면 상태가 정상 전이된다', () => {
    const res = bookingFsm.transition(
      'REQUESTED',
      'APPROVE',
      { isDepositPaid: true, cancelCutoffPassed: false },
      { actorRole: 'manager' }
    );

    assert.equal(res.success, true);
    assert.equal(res.fromState, 'REQUESTED');
    assert.equal(res.toState, 'CONFIRMED');
  });

  it('비인가 역할이 전이를 시도하면 거부된다', () => {
    const res = bookingFsm.transition(
      'REQUESTED',
      'APPROVE',
      { isDepositPaid: true, cancelCutoffPassed: false },
      { actorRole: 'customer' } // 고객은 승인 권한 없음
    );

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('실행 권한이 없습니다'));
    assert.equal(res.toState, 'REQUESTED');
  });

  it('가드 조건이 실패하면 설명 메시지와 함께 전이가 차단된다', () => {
    const res = bookingFsm.transition(
      'REQUESTED',
      'APPROVE',
      { isDepositPaid: false, cancelCutoffPassed: false }, // 보증금 미납
      { actorRole: 'admin' }
    );

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('보증금이 입금되지 않아 승인할 수 없습니다'));
  });

  it('불가능한 전이(이미 완료된 건의 취소)는 원천 차단된다', () => {
    const res = bookingFsm.transition(
      'COMPLETED',
      'CANCEL',
      { isDepositPaid: true, cancelCutoffPassed: false }
    );

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('이벤트를 실행할 수 없습니다'));
  });

  it('사용 가능한 전이 목록을 정확히 반환한다', () => {
    const available = bookingFsm.getAvailableTransitions('CONFIRMED');
    assert.equal(available.length, 2);
    const events = available.map((r) => r.event);
    assert.ok(events.includes('START_USE'));
    assert.ok(events.includes('CANCEL'));
  });
});
