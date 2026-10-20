import { domainEventBus } from './domainEventBus';
import type { DomainEventEnvelope } from './domainEvent';

export type EventHandler<TPayload extends Record<string, unknown> = Record<string, unknown>> = (
  event: DomainEventEnvelope<TPayload>,
) => void | Promise<void>;

/** Core 디스패처. 구독자 예외는 기존 버스의 allSettled 경계에서 격리된다. */
export interface IEventBus {
  publish<TPayload extends Record<string, unknown>>(event: DomainEventEnvelope<TPayload>): Promise<void>;
  subscribe<TPayload extends Record<string, unknown>>(
    name: string,
    handler: EventHandler<TPayload>,
  ): () => void;
}

export const coreEventBus: IEventBus = {
  async publish(event) {
    await domainEventBus.publish(event.name, event.payload, {
      tenantId: event.tenantId,
      metadata: {
        actorId: event.actorId,
        envelopeId: event.id,
        idempotencyKey: event.idempotencyKey,
      },
    });
  },
  subscribe(name, handler) {
    return domainEventBus.subscribe(name, async (legacy) => {
      const metadata = legacy.metadata ?? {};
      const envelope: DomainEventEnvelope = {
        id: String(metadata.envelopeId ?? legacy.eventId),
        name: legacy.eventType,
        tenantId: legacy.tenantId,
        actorId: String(metadata.actorId ?? ''),
        occurredAt: legacy.occurredAt,
        idempotencyKey: metadata.idempotencyKey ? String(metadata.idempotencyKey) : undefined,
        payload: (legacy.payload && typeof legacy.payload === 'object' ? legacy.payload : {}) as Record<string, unknown>,
      };
      await (handler as EventHandler)(envelope);
    });
  },
};
