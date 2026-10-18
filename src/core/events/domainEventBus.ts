/**
 * Moa-v2 Core In-App Domain Event Bus.
 *
 * 비용 0원, 외부 의존성(Redis/Kafka/Pusher 등) 없이 인메모리 이벤트 전파 및
 * Transactional Outbox 연동을 지원하는 경량 이벤트 버스.
 *
 * 핵심 보장:
 * 1. 테넌트 격리 (Tenant Isolation): 구독 시 tenantId를 지정하여 타 테넌트 이벤트 수신 차단.
 * 2. 에러 격리 (Fault Boundary): 한 핸들러의 예외가 다른 핸들러나 발행자에게 전파되지 않음.
 * 3. 느슨한 결합 (Decoupled EDA): Capability는 서로를 직접 참조하지 않고 이벤트 규약만으로 반응.
 * 4. 트랜잭셔널 아웃박스 브릿지 (Outbox Bridge): 영속 비동기 처리가 필요한 이벤트는 Outbox로 안전 릴레이.
 */

import type {
  DomainEvent,
  DomainEventHandler,
  DomainEventSubscriptionOptions,
  OutboxForwarder,
  PublishOptions,
  PublishResult,
} from './types';

interface InternalSubscription {
  id: string;
  eventType: string | '*';
  handler: DomainEventHandler<any>;
  options: DomainEventSubscriptionOptions;
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `evt_${now}_${rand}`;
}

export class DomainEventBus {
  private subscriptions: Map<string, InternalSubscription[]> = new Map();
  private wildcardSubscriptions: InternalSubscription[] = [];
  private outboxForwarders: Set<OutboxForwarder> = new Set();
  private recentEvents: DomainEvent<unknown>[] = [];
  private maxHistorySize: number = 200;
  private idCounter: number = 0;

  /**
   * 특정 이벤트 타입에 핸들러를 등록한다.
   * @returns 구독 해제 함수(Unsubscribe callback)
   */
  public subscribe<TPayload = unknown>(
    eventType: string,
    handler: DomainEventHandler<TPayload>,
    options: DomainEventSubscriptionOptions = {}
  ): () => void {
    const subId = `sub_${++this.idCounter}`;
    const sub: InternalSubscription = {
      id: subId,
      eventType,
      handler,
      options,
    };

    const existing = this.subscriptions.get(eventType) ?? [];
    existing.push(sub);
    // priority 내림차순 정렬 (높은 숫자 우선)
    existing.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));
    this.subscriptions.set(eventType, existing);

    return () => {
      this.unsubscribe(eventType, subId);
    };
  }

  /**
   * 모든 이벤트를 수신하는 와일드카드 구독자를 등록한다. (감사 로깅, 모니터링 등)
   */
  public subscribeAll(
    handler: DomainEventHandler<unknown>,
    options: DomainEventSubscriptionOptions = {}
  ): () => void {
    const subId = `wildcard_${++this.idCounter}`;
    const sub: InternalSubscription = {
      id: subId,
      eventType: '*',
      handler,
      options,
    };

    this.wildcardSubscriptions.push(sub);
    this.wildcardSubscriptions.sort(
      (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0)
    );

    return () => {
      this.wildcardSubscriptions = this.wildcardSubscriptions.filter((s) => s.id !== subId);
    };
  }

  /**
   * 개별 구독 해제
   */
  private unsubscribe(eventType: string, subId: string): void {
    const existing = this.subscriptions.get(eventType);
    if (!existing) return;

    const filtered = existing.filter((s) => s.id !== subId);
    if (filtered.length === 0) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.set(eventType, filtered);
    }
  }

  /**
   * Outbox 포워더 등록 (선택적 영속화 릴레이)
   */
  public registerOutboxForwarder(forwarder: OutboxForwarder): () => void {
    this.outboxForwarders.add(forwarder);
    return () => {
      this.outboxForwarders.delete(forwarder);
    };
  }

  /**
   * 도메인 이벤트를 발행한다. (간편 형식)
   */
  public async publish<TPayload = unknown>(
    eventType: string,
    payload: TPayload,
    context: {
      tenantId: string;
      eventId?: string;
      occurredAt?: string;
      metadata?: Record<string, unknown>;
    } & PublishOptions
  ): Promise<PublishResult> {
    const event: DomainEvent<TPayload> = {
      eventId: context.eventId || generateEventId(),
      eventType,
      tenantId: context.tenantId,
      occurredAt: context.occurredAt || new Date().toISOString(),
      payload,
      metadata: context.metadata,
    };

    return this.publishEvent(event, {
      forwardToOutbox: context.forwardToOutbox,
      metadata: context.metadata,
    });
  }

  /**
   * 완성된 DomainEvent 객체를 직접 발행한다.
   */
  public async publishEvent<TPayload = unknown>(
    event: DomainEvent<TPayload>,
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    // 1. 히스토리 버퍼에 기록
    this.recordHistory(event);

    // 2. 일치하는 구독자 수집
    const specificSubs = this.subscriptions.get(event.eventType) ?? [];
    const allCandidates = [...specificSubs, ...this.wildcardSubscriptions];

    // 3. 테넌트 필터링 및 priority 정렬
    const eligibleSubs = allCandidates.filter((sub) => {
      if (sub.options.tenantId && sub.options.tenantId !== event.tenantId) {
        return false;
      }
      return true;
    });

    eligibleSubs.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));

    // 4. once 구독자 자동 정리 준비
    const onceSubIds = eligibleSubs.filter((s) => s.options.once).map((s) => ({
      id: s.id,
      eventType: s.eventType,
    }));

    for (const item of onceSubIds) {
      if (item.eventType === '*') {
        this.wildcardSubscriptions = this.wildcardSubscriptions.filter((s) => s.id !== item.id);
      } else {
        this.unsubscribe(item.eventType, item.id);
      }
    }

    // 5. 안전한 핸들러 병렬/순차 실행 (Fault Boundary)
    const errors: PublishResult['errors'] = [];
    let successCount = 0;

    const executions = eligibleSubs.map(async (sub) => {
      try {
        await sub.handler(event);
        successCount++;
      } catch (err) {
        errors.push({
          subscriberId: sub.id,
          subscriberName: sub.options.subscriberName,
          error: err,
        });
        if (typeof sub.options.onError === 'function') {
          try {
            sub.options.onError(err, event);
          } catch {
            // onError 자체의 에러는 무시하여 버스 생존 보장
          }
        }
      }
    });

    await Promise.allSettled(executions);

    // 6. Outbox 릴레이 (요청 시 또는 등록된 포워더 실행)
    let forwardedToOutbox = false;
    if (options.forwardToOutbox && this.outboxForwarders.size > 0) {
      const outboxExecutions = Array.from(this.outboxForwarders).map(async (forwarder) => {
        try {
          await forwarder(event);
        } catch (fErr) {
          errors.push({
            subscriberId: 'outbox_forwarder',
            subscriberName: 'TransactionalOutboxBridge',
            error: fErr,
          });
        }
      });
      await Promise.allSettled(outboxExecutions);
      forwardedToOutbox = true;
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      subscriberCount: eligibleSubs.length,
      successCount,
      failureCount: errors.length,
      errors,
      forwardedToOutbox,
    };
  }

  /**
   * 최근 발행된 이벤트 이력 조회 (디버깅 / 테스트용)
   */
  public getRecentEvents(limit: number = 50, tenantId?: string): DomainEvent<unknown>[] {
    let list = this.recentEvents;
    if (tenantId) {
      list = list.filter((e) => e.tenantId === tenantId);
    }
    return list.slice(-limit);
  }

  /**
   * 특정 이벤트 타입의 구독자 수 조회
   */
  public getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return (this.subscriptions.get(eventType) ?? []).length;
    }
    let count = this.wildcardSubscriptions.length;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  /**
   * 모든 구독과 히스토리를 초기화한다. (테스트 스위트용 격리)
   */
  public clear(): void {
    this.subscriptions.clear();
    this.wildcardSubscriptions = [];
    this.outboxForwarders.clear();
    this.recentEvents = [];
    this.idCounter = 0;
  }

  private recordHistory(event: DomainEvent<unknown>): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxHistorySize) {
      this.recentEvents.shift();
    }
  }
}

/**
 * 전역 싱글톤 이벤트 버스 인스턴스
 */
export const domainEventBus = new DomainEventBus();
