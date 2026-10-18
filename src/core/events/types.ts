/**
 * Moa-v2 Core Domain Event Bus Types.
 * Capability 간 직접 결합을 제거하고 느슨한 이벤트 주도 아키텍처(EDA)를 제공한다.
 */

export interface DomainEvent<TPayload = unknown> {
  /** 이벤트 고유 ID (UUID) */
  readonly eventId: string;
  /** 도메인 이벤트 식별자 (예: 'attendance.checked_in', 'passes.deducted') */
  readonly eventType: string;
  /** 멀티테넌트 격리를 위한 조직/사업장 ID */
  readonly tenantId: string;
  /** 이벤트 발생 시각 (ISO 8601) */
  readonly occurredAt: string;
  /** 이벤트 세부 데이터 */
  readonly payload: TPayload;
  /** 추적 및 감사용 메타데이터 (actorId, correlationId, source 등) */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type DomainEventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>
) => void | Promise<void>;

export interface DomainEventSubscriptionOptions {
  /** 특정 테넌트의 이벤트만 수신하도록 필터링 (미지정 시 모든 테넌트 수신) */
  tenantId?: string;
  /** 1회 수신 후 자동 구독 해제 여부 (기본값: false) */
  once?: boolean;
  /** 핸들러 실행 우선순위 (높은 숫자일수록 먼저 실행, 기본값: 0) */
  priority?: number;
  /** 개별 핸들러 실행 실패 시 호출될 에러 핸들러 (선택) */
  onError?: (error: unknown, event: DomainEvent<unknown>) => void;
  /** 디버깅용 구독자 설명/이름 */
  subscriberName?: string;
}

export interface PublishResult {
  /** 발행된 이벤트 ID */
  eventId: string;
  /** 이벤트 타입 */
  eventType: string;
  /** 매칭된 총 구독자 수 */
  subscriberCount: number;
  /** 정상 처리된 구독자 수 */
  successCount: number;
  /** 실패한 구독자 수 */
  failureCount: number;
  /** 구독자 실행 중 발생한 에러 목록 (오류 격리) */
  errors: Array<{
    subscriberId: string;
    subscriberName?: string;
    error: unknown;
  }>;
  /** Outbox로 릴레이 여부 */
  forwardedToOutbox: boolean;
}

export interface PublishOptions {
  /** Outbox에 영속 릴레이할지 여부 (기본값: false) */
  forwardToOutbox?: boolean;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
}

export type OutboxForwarder = (
  event: DomainEvent<unknown>
) => void | Promise<void>;
