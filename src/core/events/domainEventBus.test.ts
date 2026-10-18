/**
 * Moa-v2 Core In-App Domain Event Bus Specification & Contract Test
 *
 * 검증 대상:
 * 1. 기본 발행 및 구독 정상 동작
 * 2. 멀티테넌트 격리 (다른 테넌트의 이벤트 차단)
 * 3. 오류 격리 (한 구독자의 예외가 다른 구독자나 버스에 전파되지 않음)
 * 4. 우선순위 (priority) 실행 순서 보장
 * 5. 생명주기 (unsubscribe, once: true 자동 해제)
 * 6. 와일드카드 (*) 전역 감사/로깅 구독
 * 7. Transactional Outbox 포워더 릴레이
 * 8. Capability 간 연쇄 동작 (출석 -> 수강권 차감 -> 잔여 1회 감지 -> 리텐션 마케팅 트리거)
 */

import assert from 'node:assert/strict';
import {
  DomainEventBus,
  DOMAIN_EVENT_NAMES,
  type AttendanceCheckedInPayload,
  type PassDeductedPayload,
  type PassLowBalancePayload,
  type PassExhaustedPayload,
  type RetentionTriggerCampaignPayload,
  type DomainEvent,
} from './index';

async function runTests(): Promise<void> {
  console.log('🧪 [Test Suite] Core Domain Event Bus & Decoupled EDA Invariants\n');

  // ----------------------------------------------------
  // Test 1: 기본 발행 및 구독
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 1: 기본 이벤트 발행 및 구독');
    const bus = new DomainEventBus();
    const received: string[] = [];

    const unsub = bus.subscribe<{ message: string }>('test.event', (event) => {
      received.push(event.payload.message);
    });

    const result = await bus.publish('test.event', { message: 'hello world' }, { tenantId: 'tenant-1' });

    assert.equal(result.subscriberCount, 1);
    assert.equal(result.successCount, 1);
    assert.equal(result.failureCount, 0);
    assert.deepEqual(received, ['hello world']);

    unsub();
    assert.equal(bus.getSubscriptionCount('test.event'), 0);
    console.log('    ✓ 통과');
  }

  // ----------------------------------------------------
  // Test 2: 멀티테넌트 격리
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 2: 테넌트 격리 (Tenant A vs Tenant B)');
    const bus = new DomainEventBus();
    const tenantAEvents: string[] = [];
    const tenantBEvents: string[] = [];
    const globalEvents: string[] = [];

    bus.subscribe<{ val: string }>(
      'tenant.test',
      (e) => tenantAEvents.push(e.payload.val),
      { tenantId: 'org-alpha' }
    );

    bus.subscribe<{ val: string }>(
      'tenant.test',
      (e) => tenantBEvents.push(e.payload.val),
      { tenantId: 'org-beta' }
    );

    bus.subscribe<{ val: string }>(
      'tenant.test',
      (e) => globalEvents.push(e.payload.val)
      // tenantId 생략 -> 모든 테넌트 수신
    );

    // Alpha 테넌트 이벤트 발행
    await bus.publish('tenant.test', { val: 'alpha-1' }, { tenantId: 'org-alpha' });
    // Beta 테넌트 이벤트 발행
    await bus.publish('tenant.test', { val: 'beta-1' }, { tenantId: 'org-beta' });

    assert.deepEqual(tenantAEvents, ['alpha-1'], 'Tenant A는 자신의 이벤트만 수신해야 함');
    assert.deepEqual(tenantBEvents, ['beta-1'], 'Tenant B는 자신의 이벤트만 수신해야 함');
    assert.deepEqual(globalEvents, ['alpha-1', 'beta-1'], '글로벌 구독자는 모든 테넌트 이벤트를 수신함');
    console.log('    ✓ 통과: 테넌트 간 이벤트 오염 원천 차단 확인');
  }

  // ----------------------------------------------------
  // Test 3: 오류 격리 (Fault Boundary)
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 3: 오류 격리 (Fault Isolation)');
    const bus = new DomainEventBus();
    const logs: string[] = [];

    // 정상 구독자 1
    bus.subscribe('flaky.event', () => {
      logs.push('sub1:ok');
    });

    // 실패하는 고장난 구독자 2
    bus.subscribe('flaky.event', () => {
      logs.push('sub2:throws');
      throw new Error('Database connection pool timeout in bad subscriber!');
    }, {
      subscriberName: 'FaultyService',
      onError: (err) => {
        logs.push(`sub2:handled:${(err as Error).message}`);
      },
    });

    // 정상 구독자 3
    bus.subscribe('flaky.event', () => {
      logs.push('sub3:ok');
    });

    const result = await bus.publish('flaky.event', { foo: 'bar' }, { tenantId: 't1' });

    assert.equal(result.subscriberCount, 3);
    assert.equal(result.successCount, 2);
    assert.equal(result.failureCount, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].subscriberName, 'FaultyService');
    assert.ok(logs.includes('sub1:ok'));
    assert.ok(logs.includes('sub3:ok'));
    assert.ok(logs.includes('sub2:handled:Database connection pool timeout in bad subscriber!'));
    console.log('    ✓ 통과: 실패한 구독자가 발생해도 다른 구독자와 버스 전체가 정상 작동함');
  }

  // ----------------------------------------------------
  // Test 4: 우선순위 (Priority Ordering)
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 4: 우선순위 (Priority) 정렬 순서');
    const bus = new DomainEventBus();
    const executionOrder: string[] = [];

    bus.subscribe('priority.event', () => executionOrder.push('low'), { priority: 1 });
    bus.subscribe('priority.event', () => executionOrder.push('critical'), { priority: 100 });
    bus.subscribe('priority.event', () => executionOrder.push('medium'), { priority: 10 });

    await bus.publish('priority.event', {}, { tenantId: 't1' });

    assert.deepEqual(executionOrder, ['critical', 'medium', 'low']);
    console.log('    ✓ 통과: priority가 높은 핸들러가 먼저 실행됨');
  }

  // ----------------------------------------------------
  // Test 5: 1회성 구독 (once: true) & 해제
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 5: 1회성 구독 (once: true) 자동 정리');
    const bus = new DomainEventBus();
    let count = 0;

    bus.subscribe('once.event', () => {
      count++;
    }, { once: true });

    await bus.publish('once.event', {}, { tenantId: 't1' });
    await bus.publish('once.event', {}, { tenantId: 't1' });
    await bus.publish('once.event', {}, { tenantId: 't1' });

    assert.equal(count, 1, 'once: true 구독자는 최초 1회만 호출되어야 함');
    assert.equal(bus.getSubscriptionCount('once.event'), 0);
    console.log('    ✓ 통과');
  }

  // ----------------------------------------------------
  // Test 6: 와일드카드 전역 구독 & 히스토리 조회
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 6: 와일드카드 (*) 구독 및 히스토리 버퍼');
    const bus = new DomainEventBus();
    const auditLogs: string[] = [];

    const unsubWildcard = bus.subscribeAll((event) => {
      auditLogs.push(`${event.eventType}:${event.tenantId}`);
    });

    await bus.publish('auth.login', {}, { tenantId: 't1' });
    await bus.publish('billing.paid', {}, { tenantId: 't2' });

    assert.deepEqual(auditLogs, ['auth.login:t1', 'billing.paid:t2']);

    const history = bus.getRecentEvents(10);
    assert.equal(history.length, 2);
    assert.equal(history[0].eventType, 'auth.login');
    assert.equal(history[1].eventType, 'billing.paid');

    unsubWildcard();
    await bus.publish('other.event', {}, { tenantId: 't1' });
    assert.equal(auditLogs.length, 2, '와일드카드 해제 후 추가 수신 없어야 함');
    console.log('    ✓ 통과');
  }

  // ----------------------------------------------------
  // Test 7: Transactional Outbox 포워더 릴레이
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 7: Outbox 릴레이 브릿지');
    const bus = new DomainEventBus();
    const outboxQueue: DomainEvent<unknown>[] = [];

    bus.registerOutboxForwarder((event) => {
      outboxQueue.push(event);
    });

    // forwardToOutbox: false -> 릴레이 안 됨
    const res1 = await bus.publish('local.calc', { x: 1 }, { tenantId: 't1', forwardToOutbox: false });
    assert.equal(res1.forwardedToOutbox, false);
    assert.equal(outboxQueue.length, 0);

    // forwardToOutbox: true -> Outbox 릴레이
    const res2 = await bus.publish('payment.completed', { amount: 50000 }, { tenantId: 't1', forwardToOutbox: true });
    assert.equal(res2.forwardedToOutbox, true);
    assert.equal(outboxQueue.length, 1);
    assert.equal(outboxQueue[0].eventType, 'payment.completed');
    console.log('    ✓ 통과');
  }

  // ----------------------------------------------------
  // Test 8: Capability 간 연쇄 반응 (Decoupled EDA Workflow)
  // 시나리오: 출석 체크 -> 수강권 차감 -> 잔여 1회 도달 -> 리텐션 마케팅 트리거
  // ----------------------------------------------------
  {
    console.log('  ▶ Test 8: Decoupled Multi-Capability EDA 연쇄 워크플로우');
    const bus = new DomainEventBus();

    // 인메모리 수강권 상태 시뮬레이션
    let studentPass = {
      id: 'pass-999',
      studentId: 'student-42',
      remainingCount: 2,
    };

    const triggeredMarketingCampaigns: RetentionTriggerCampaignPayload[] = [];

    // [Passes Capability 구독기]: attendance.checked_in 수신 시 수강권 차감 처리
    bus.subscribe<AttendanceCheckedInPayload>(
      DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
      async (event) => {
        const { studentId, passId } = event.payload;
        if (studentId === studentPass.studentId) {
          studentPass.remainingCount -= 1;
          const remaining = studentPass.remainingCount;
          const isExhausted = remaining <= 0;

          // passes.deducted 발행
          await bus.publish<PassDeductedPayload>(
            DOMAIN_EVENT_NAMES.PASS_DEDUCTED,
            {
              passId: passId || studentPass.id,
              studentId,
              deductedCount: 1,
              remainingCount: remaining,
              passType: 'COUNT_BASED',
              isExhausted,
            },
            { tenantId: event.tenantId }
          );

          // 잔여 1회 이하이면 passes.low_balance 발행
          if (remaining <= 1 && remaining > 0) {
            await bus.publish<PassLowBalancePayload>(
              DOMAIN_EVENT_NAMES.PASS_LOW_BALANCE,
              {
                passId: passId || studentPass.id,
                studentId,
                remainingCount: remaining,
                threshold: 1,
              },
              { tenantId: event.tenantId }
            );
          } else if (isExhausted) {
            await bus.publish<PassExhaustedPayload>(
              DOMAIN_EVENT_NAMES.PASS_EXHAUSTED,
              {
                passId: passId || studentPass.id,
                studentId,
                exhaustedAt: new Date().toISOString(),
              },
              { tenantId: event.tenantId }
            );
          }
        }
      },
      { subscriberName: 'Passes_AttendanceSubscriber' }
    );

    // [Retention Marketing Capability 구독기]: passes.low_balance 수신 시 재등록 캠페인 생성
    bus.subscribe<PassLowBalancePayload>(
      DOMAIN_EVENT_NAMES.PASS_LOW_BALANCE,
      async (event) => {
        const payload: RetentionTriggerCampaignPayload = {
          customerId: event.payload.studentId,
          campaignType: 'low_balance',
          context: {
            passId: event.payload.passId,
            remainingCount: event.payload.remainingCount,
            details: '잔여 1회 이용권 보유 회원 대상 재등록 자동 안내',
          },
        };

        triggeredMarketingCampaigns.push(payload);

        // retention.trigger_campaign 발행
        await bus.publish<RetentionTriggerCampaignPayload>(
          DOMAIN_EVENT_NAMES.RETENTION_TRIGGER_CAMPAIGN,
          payload,
          { tenantId: event.tenantId }
        );
      },
      { subscriberName: 'Retention_LowBalanceSubscriber' }
    );

    // 실행: 출석 체크인 1회 발생! (초기 잔여 2회 -> 차감 후 1회 남음)
    console.log('    -> 이벤트 발행: [attendance.checked_in]');
    await bus.publish<AttendanceCheckedInPayload>(
      DOMAIN_EVENT_NAMES.ATTENDANCE_CHECKED_IN,
      {
        attendanceId: 'att-101',
        studentId: 'student-42',
        studentName: '홍길동',
        checkInTime: new Date().toISOString(),
        passId: 'pass-999',
      },
      { tenantId: 'studio-gangnam' }
    );

    // 검증:
    // 1. 패스가 2 -> 1로 차감되었는가?
    assert.equal(studentPass.remainingCount, 1, '수강권이 정상 차감되어 1회가 남아야 함');

    // 2. 리텐션 마케팅 캠페인이 연쇄적으로 트리거되었는가?
    assert.equal(triggeredMarketingCampaigns.length, 1, '리텐션 마케팅 캠페인이 자동으로 1건 트리거되어야 함');
    assert.equal(triggeredMarketingCampaigns[0].customerId, 'student-42');
    assert.equal(triggeredMarketingCampaigns[0].campaignType, 'low_balance');
    assert.equal(triggeredMarketingCampaigns[0].context.remainingCount, 1);

    // 3. 버스의 이벤트 히스토리에 전체 체인이 순서대로 기록되었는가?
    const eventHistory = bus.getRecentEvents(10, 'studio-gangnam').map((e) => e.eventType);
    assert.deepEqual(
      eventHistory,
      [
        'attendance.checked_in',
        'passes.deducted',
        'passes.low_balance',
        'retention.trigger_campaign',
      ],
      '출석 -> 수강권 차감 -> 잔여 1회 -> 리텐션 마케팅 순서로 연쇄 이벤트가 정상 전파되어야 함'
    );

    console.log('    ✓ 통과: 출석 -> 패스 차감 -> 잔여 1회 감지 -> 리텐션 마케팅 트리거 연쇄 완성!');
  }

  console.log('\n✨ All Domain Event Bus tests passed cleanly!\n');
}

runTests().catch((err) => {
  console.error('❌ Domain Event Bus test failed:', err);
  process.exit(1);
});
