/**
 * 제네릭 도메인 이벤트 봉투.
 * Core는 이벤트 이름 문자열만 전달하고 Capability 업무 규칙을 알지 않는다.
 */
export interface DomainEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly name: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly occurredAt: string;
  readonly idempotencyKey?: string;
  readonly payload: TPayload;
}

export function createDomainEventEnvelope<TPayload extends Record<string, unknown>>(
  input: Omit<DomainEventEnvelope<TPayload>, 'id' | 'occurredAt'> & { id?: string; occurredAt?: string },
): DomainEventEnvelope<TPayload> {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    tenantId: input.tenantId,
    actorId: input.actorId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
  };
}
